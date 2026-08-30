import renderer, { act } from "react-test-renderer";
import SolveScreen from "../screens/SolveScreen";
import { IssueService } from "../services/IssueService";
import { useAuth } from "../contexts/AuthContext";

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useNavigation: () => ({ navigate: jest.fn() }),
    useFocusEffect: (cb) => {
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../services/IssueService", () => ({
  IssueService: {
    getAllIssues: jest.fn(),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

// SolveScreen pulls in IssueCard -> ReportBottomSheet, which import the real
// firebase config; stub it so no native module (AsyncStorage) is required.
jest.mock("../config/firebaseConfig", () => ({
  app: {},
  auth: {},
  db: {},
  storage: {},
  remoteConfig: { settings: {}, defaultConfig: {} },
}));

import { Animated } from "react-native";

describe("SolveScreen", () => {
  const mockUser = { uid: "user_123" };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    const mockAnim = {
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
      _isUsingNativeDriver: () => false,
    };
    jest.spyOn(Animated, "timing").mockReturnValue(mockAnim);
    jest.spyOn(Animated, "parallel").mockReturnValue(mockAnim);
    jest.spyOn(Animated, "sequence").mockReturnValue(mockAnim);

    useAuth.mockReturnValue({ user: mockUser });
    IssueService.getAllIssues.mockResolvedValue([]);
  });

  afterEach(() => {
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  test("renders correctly and fetches issues on mount", async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<SolveScreen />);
    });

    expect(IssueService.getAllIssues).toHaveBeenCalled();
    const root = tree.root;
    // Check if the FilterPills component is rendered
    const filterPills = root.findAllByType(
      require("../components/ui/FilterPills").default,
    );
    expect(filterPills.length).toBeGreaterThan(0);
  }, 20000);

  test("filters out issues authored by the current user", async () => {
    const mockIssues = [
      {
        id: "1",
        authorId: "other_user",
        status: "Open",
        urgency: "critical",
        location: "Connaught Place, New Delhi",
      },
      {
        id: "2",
        authorId: "user_123",
        status: "Open",
        urgency: "medium", // authored by us
        location: "Karol Bagh, New Delhi",
      },
      {
        id: "3",
        authorId: "other_user",
        status: "Solved",
        urgency: "low", // solved
        location: "Saket, New Delhi",
      },
    ];
    IssueService.getAllIssues.mockResolvedValue(mockIssues);

    let tree;
    await act(async () => {
      tree = renderer.create(<SolveScreen />);
    });

    // The SolveScreen filters for issues NOT authored by the user and NOT solved
    // so only issue "1" should be in the solvable list.
    const root = tree.root;
    // We expect 1 issue card
    const issueCards = root.findAllByType(
      require("../components/IssueCard").default,
    );
    expect(issueCards.length).toBe(1);
    expect(issueCards[0].props.issue.id).toBe("1");
  });
});
