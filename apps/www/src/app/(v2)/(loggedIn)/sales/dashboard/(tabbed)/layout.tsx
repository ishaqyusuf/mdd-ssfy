import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import ServerTab from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_components/server-tab";

export default function Layout({ children }) {
    return (
        <>
            <ServerTab />
            {children}
        </>
    );
}
