import { Icons } from "@/components/_v1/icons";

export default function NoResults() {
    return (
        <div className="h-[calc(100vh-300px)] flex items-center justify-center">
            <div className="flex flex-col items-center">
                <Icons.Transactions2 className="mb-4" />
                <div className="text-center mb-6 space-y-2">
                    <h2 className="font-medium text-lg">No results</h2>
                    <p className="text-[#606060] text-sm">
                        {"There are no transactions imported yet"}
                    </p>
                </div>
            </div>
        </div>
    );
}
