export function getAppUrl() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://gndprodesk.com";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
export function getStoreUrl() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://store.gndprodesk.com";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3500";
}

export function getEmailUrl() {
  // if (process.env.NODE_ENV === "development") {
  //   return "http://localhost:3000";
  // }

  return "https://gndprodesk.com";
}

export function getWebsiteUrl() {
  if (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  ) {
    return "https://gndprodesk.com";
  }

  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getCdnUrl() {
  // return "https://cdn.midday.ai";
}

export function getRecipient(email: string | string[]): string | string[] {
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    return [
      "ishaqyusuf024@gmail.com",
      // , "pcruz321@gmail.com"
    ];
  }
  return email;
}
