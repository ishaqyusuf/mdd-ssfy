import { CommunityTabs } from "@/components/community-tabs";

export default async function Layout({ children }) {
    return (
        <div className="pt-6 flex flex-col gap-6">
            <CommunityTabs />
            {children}
        </div>
    );
}
