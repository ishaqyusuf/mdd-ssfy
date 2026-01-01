export function Debug({ children }) {
  const testEmails = process.env.EXPO_PUBLIC_EMAIL?.split(",");
  if (!testEmails?.length) return null;
  return <>{children}</>;
}
