import SideBarLayout from "@/app/(sidebar)/layout";

export default async function Layout({ children }) {
    return <SideBarLayout>{children}</SideBarLayout>;
}
