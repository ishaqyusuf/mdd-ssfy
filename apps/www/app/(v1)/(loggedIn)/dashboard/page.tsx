import { redirect } from "next/navigation";

interface Props {}
export default async function DashboardPage({}: Props) {
    redirect("/dashboard/sales");
    return <></>;
}

