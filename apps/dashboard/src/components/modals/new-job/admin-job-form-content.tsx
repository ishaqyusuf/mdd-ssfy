import { useJobRole } from "@/hooks/use-job-role";

export function AdminJobFormContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const jobRole = useJobRole();
    if (!jobRole.isAdmin) return null;
    return children;
}
