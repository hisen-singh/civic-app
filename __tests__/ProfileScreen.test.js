import renderer, { act } from "react-test-renderer";
import ProfileScreen from "../screens/ProfileScreen";
import { IssueService } from "../services/IssueService";
import { useAuth } from "../contexts/AuthContext";
import { getDoc } from "firebase/firestore";
import { useRoute } from "@react-navigation/native";

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
    useRoute: jest.fn(),
    useFocusEffect: (cb) => {
      React.useEffect(() => {
        cb();
      }, []);
    },
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../services/AuthService", () => ({
  AuthService: { logout: jest.fn() },
}));

jest.mock("../services/IssueService", () => ({
  IssueService: {
    getUserStats: jest.fn(),
  },
}));

jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock("../config/firebaseConfig", () => ({
  db: {},
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

describe("ProfileScreen Param Flows", () => {
  const mockUser = {
    uid: "self_123",
    email: "self@example.com",
    displayName: "Self User",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser, logout: jest.fn() });
    IssueService.getUserStats.mockResolvedValue({
      reported: 5,
      supported: 2,
      solved: 1,
      roadsSolved: 1,
      ecoSolved: 0,
    });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        rank: 10,
        followerCount: 42,
        followingCount: 5,
        trustScore: 100,
      }),
    });
  });

  test("loads self profile when no route params are provided", async () => {
    useRoute.mockReturnValue({ params: {} });

    let tree;
    await act(async () => {
      tree = renderer.create(<ProfileScreen />);
    });

    expect(IssueService.getUserStats).toHaveBeenCalledWith("self_123");

    const root = tree.root;
    // Check if "Edit Profile" or "Settings" button exists (indicates self profile)
    // Wait, the test is to ensure IssueService gets called with correct ID.
    // And to make sure it loads.
    expect(
      root.findAllByProps({ children: "Self User" }).length,
    ).toBeGreaterThan(0);
  });

  test("always loads the signed-in user's profile, even if userId params exist", async () => {
    // Since the main-branch UI swap, other-user profiles render through
    // PublicProfileScreen; ProfileScreen itself is always the self profile.
    useRoute.mockReturnValue({ params: { userId: "other_456" } });
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        rank: 5,
        followerCount: 100,
        followingCount: 20,
        trustScore: 500,
        displayName: "Other User",
      }),
    });

    let tree;
    await act(async () => {
      tree = renderer.create(<ProfileScreen />);
    });

    // Self profile is fetched regardless of the params
    expect(IssueService.getUserStats).toHaveBeenCalledWith("self_123");

    const root = tree.root;
    expect(
      root.findAllByProps({ children: "Self User" }).length,
    ).toBeGreaterThan(0);
  });
});
