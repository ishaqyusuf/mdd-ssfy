import CommunityModals from "./_modals";

export default function CommunityLayout({ children }) {
    return (
        <>
            {children}
            <CommunityModals />
        </>
    );
}
