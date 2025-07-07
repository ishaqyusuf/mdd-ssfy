import { cn } from "@/lib/utils";
import ContractorsList from "./_components/contractors-list";

export default async function PayoutLayout({ children }) {
    return (
        <div className="flex">
            <div className={cn("")}>
                <ContractorsList />
            </div>
            <>{children}</>
        </div>
    );
}
