import { useSession } from "@tanstack/react-start/server";

export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "member";
};

type SessionData = {
  user?: SessionUser;
};

const devSessionSecret =
  "development-only-session-secret-change-before-production";

export function useAppSession() {
  return useSession<SessionData>({
    name: "gnd-web-session",
    password: process.env.GND_WEB_SESSION_SECRET ?? devSessionSecret,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
}
