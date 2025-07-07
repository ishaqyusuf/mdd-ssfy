import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import ServerTab from "../_components/server-tab";

export default function Layout({ children }) {
    return (
        <>
            <ServerTab />
            {children}
        </>
    );
}
