import { SideBar } from "@/components/sidebar/sidebar";

export default function Layout({ children }) {
    return (
        <SideBar>
            <div className="flex h-full w-full items-center justify-center">
                {children}
            </div>
        </SideBar>
    );
}
