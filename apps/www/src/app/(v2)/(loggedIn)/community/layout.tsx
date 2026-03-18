import CommunityModals from "@/app-deps/(v2)/(loggedIn)/community/_modals";

export default function CommunityLayout({ children }) {
    return (
        <>
            {children}
            <CommunityModals />
        </>
    );
}
