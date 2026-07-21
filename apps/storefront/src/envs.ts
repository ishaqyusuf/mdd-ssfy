export function getBaseUrl() {
  return `${process.env.NEXT_PUBLIC_APP_URL}`;
  //   if (process.env.NODE_ENV === "development") {
  //     return "http://localhost:3500";
  //   }
  //   return "https://gndprodesk.com";
}
