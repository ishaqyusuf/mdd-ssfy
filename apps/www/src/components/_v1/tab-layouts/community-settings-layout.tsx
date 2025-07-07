"use client";

import TabbedLayout from "./tabbed-layout";

export default function CommunitySettingsLayoutComponent({
  children,
}: {
  children;
}) {
  return <TabbedLayout tabKey="CommunitySettings">{children}</TabbedLayout>;
}
