export function shouldUsePasswordMaskTypography(input: {
	value: unknown;
	isPasswordVisible: boolean;
}) {
	return (
		!input.isPasswordVisible &&
		typeof input.value === "string" &&
		input.value.length > 0
	);
}
