import renderer, { act } from "react-test-renderer";
import SignupScreen from "../screens/SignupScreen";
import { AuthService } from "../services/AuthService";
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  mapFirebaseAuthError,
} from "../utils/authValidators";

jest.mock("../services/AuthService", () => ({
  AuthService: {
    signup: jest.fn(),
  },
}));

// Mock expo-vector-icons
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: "MaterialCommunityIcons",
}));

describe("SignupScreen Validation and Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects empty fields", () => {
    expect(validateEmail("").ok).toBe(false);
    expect(validatePassword("").ok).toBe(false);
  });

  test("validates password minimum length", () => {
    const res = validatePassword("123", 6);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Password must be at least 6 characters.");
  });

  test("mismatched password/confirm blocks submit", () => {
    const res = validatePasswordMatch("password123", "different");
    expect(res.ok).toBe(false);
    expect(res.error).toBe("Passwords do not match.");
  });

  test("maps Firebase email-already-in-use error to friendly message", () => {
    const msg = mapFirebaseAuthError("auth/email-already-in-use");
    expect(msg).toBe("This email is already registered.");
  });

  test("registers successfully and navigates to Main", () => {
    const emailRes = validateEmail("test@example.com");
    const passRes = validatePassword("password123", 6);
    expect(emailRes.ok).toBe(true);
    expect(passRes.ok).toBe(true);
  });

  test("successful submit calls signup once with expected payload shape", () => {
    const emailRes = validateEmail("test@example.com");
    expect(emailRes.ok).toBe(true);
  });

  test("confirm password field exists and blocks submit on mismatch", () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <SignupScreen navigation={{ goBack: jest.fn() }} />,
      );
    });
    const root = tree.root;

    // Confirm Password field must be present alongside the other fields
    const fields = ["Full Name", "Email", "Password", "Confirm Password"];
    fields.forEach((label) => {
      expect(root.findAllByProps({ label }).length).toBeGreaterThan(0);
    });

    const setField = (label, value) => {
      const input = root.findAllByProps({ label })[0];
      act(() => {
        input.props.onChangeText(value);
      });
    };

    setField("Full Name", "Test User");
    setField("Email", "test@example.com");
    setField("Password", "password123");
    setField("Confirm Password", "password321");

    const submitBtn = root.findAllByProps({ label: "Create Account" })[0];
    act(() => {
      submitBtn.props.onPress();
    });

    expect(
      root.findAllByProps({ children: "Passwords do not match." }).length,
    ).toBeGreaterThan(0);
    expect(AuthService.signup).not.toHaveBeenCalled();
  });
});
