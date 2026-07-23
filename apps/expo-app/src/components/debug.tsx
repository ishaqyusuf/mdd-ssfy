export function Debug({ children }) {
  if (!__DEV__) return null;

  const testEmails = process.env.EXPO_PUBLIC_EMAIL?.split(",");
  if (!testEmails?.length) return null;
  return <>{children}</>;
}
