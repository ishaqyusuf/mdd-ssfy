import { describe, expect, it } from "bun:test";
import { shouldUsePasswordMaskTypography } from "./login-password-style";

describe("login password typography", () => {
	it("keeps the empty password placeholder at normal input size", () => {
		expect(
			shouldUsePasswordMaskTypography({
				value: "",
				isPasswordVisible: false,
			}),
		).toBe(false);
	});

	it("uses the mask typography only for hidden typed passwords", () => {
		expect(
			shouldUsePasswordMaskTypography({
				value: "secret",
				isPasswordVisible: false,
			}),
		).toBe(true);

		expect(
			shouldUsePasswordMaskTypography({
				value: "secret",
				isPasswordVisible: true,
			}),
		).toBe(false);
	});
});
