"use client";

import TabbedLayout from "./tabbed-layout";

export default function HrmLayout({ children }: { children }) {
  return <TabbedLayout tabKey="Hrm">{children}</TabbedLayout>;
}
