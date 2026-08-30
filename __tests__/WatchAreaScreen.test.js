import renderer, { act } from "react-test-renderer";
import WatchAreaScreen from "../screens/WatchAreaScreen";
import { useAuth } from "../contexts/AuthContext";
import { getDocs, deleteDoc, updateDoc } from "firebase/firestore";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock("../contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock("../config/firebaseConfig", () => ({
  db: {},
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

jest.mock("react-native-paper", () => {
  const Actual = jest.requireActual("react-native-paper");
  return {
    ...Actual,
    Snackbar: "Snackbar",
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  const MockMapView = (props) => (
    <View {...props} testID="mock-map-view">
      {props.children}
    </View>
  );
  const MockCircle = (props) => <View {...props} testID="mock-circle" />;
  MockMapView.Circle = MockCircle;
  return {
    __esModule: true,
    default: MockMapView,
    Circle: MockCircle,
    PROVIDER_GOOGLE: "google",
  };
});

describe("WatchAreaScreen", () => {
  const mockUser = { uid: "user_123" };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: mockUser });
    getDocs.mockResolvedValue({
      docs: [
        {
          id: "area_1",
          data: () => ({
            userId: "user_123",
            latitude: 40.7128,
            longitude: -74.006,
            radius: 2000,
            active: true,
          }),
        },
      ],
    });
  });

  test("renders correctly and fetches watch areas on mount", async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<WatchAreaScreen />);
    });

    expect(getDocs).toHaveBeenCalled();
    const root = tree.root;
    // Look for the "Tracked Area" text which is rendered for a fetched watch area
    const titles = root.findAllByProps({ children: "TRACKED AREA" });
    expect(titles.length).toBeGreaterThan(0);
  });

  test("toggling watch area status calls updateDoc", async () => {
    let tree;
    await act(async () => {
      tree = renderer.create(<WatchAreaScreen />);
    });

    const root = tree.root;
    // The switch value for area_1 should be true
    const toggleSwitch = root.findAllByProps({ value: true })[0];

    await act(async () => {
      toggleSwitch.props.onValueChange();
    });

    expect(updateDoc).toHaveBeenCalled();
  });

  test("clicking delete prompts or calls deleteDoc directly (mocked handle)", async () => {
    // Alert.alert is tricky to test in renderer without mocking Alert
    jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation((title, msg, buttons) => {
        // Simulate clicking "Remove" (index 1)
        buttons[1].onPress();
      });

    let tree;
    await act(async () => {
      tree = renderer.create(<WatchAreaScreen />);
    });

    const root = tree.root;
    // Find delete button
    const deleteBtn = root.findAll(
      (node) =>
        node.props.style &&
        node.props.style.padding === 8 &&
        node.props.style.marginLeft === 4,
    )[0];

    await act(async () => {
      deleteBtn.props.onPress();
    });

    expect(deleteDoc).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
});
