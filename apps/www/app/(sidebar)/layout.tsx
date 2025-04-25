import { SideBar } from "@/components/sidebar/sidebar";

export default function Layout({ children }) {
    return (
        <SideBar>
            <div className="flex h-full w-full items-center justify-center">
                {/* <h1 className="text-2xl font-bold"></h1> */}
                {children}
            </div>
        </SideBar>
    );
}
