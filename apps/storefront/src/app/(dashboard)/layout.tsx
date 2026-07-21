"use client";

import { useAuth } from "@/hooks/use-auth";

export default function Layout({ children }) {
  const auth = useAuth();
  if (!auth.id) return;
  return <div className="flex flex-col"> {children}</div>;
}
