// "use client";

import SideBarLayout from "@/app/(sidebar)/layout";

export default async function Layout({ children, ...props }) {
    return <SideBarLayout>{children}</SideBarLayout>;
}
