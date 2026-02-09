import { SearchInput } from "@/components/search-input";
import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { getInitials } from "@gnd/utils";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { useSearch } from "@gnd/ui/hooks/use-search";
export function UserSelectStep() {
    const { data } = useQuery(
        _trpc.hrm.getEmployees.queryOptions({
            // roles: props.admin
            //     ? [role] //["1099 Contractor", "Punchout"]
            //     : [profile?.role?.name!],
            roles: ["1099 Contractor", "Punchout"],
            // size: 100,
        }),
    );
    const users = data?.data || [];
    const { setParams, ...params } = useJobFormParams();
    const { query, results, setQuery, clear } = useSearch({
        items: users,
    });
    return (
        <div className="space-y-4">
            <div className="relative">
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search contractor..."
                />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((user) => (
                    <button
                        key={user.id}
                        onClick={() => {
                            setParams({
                                userId: user.id,
                                step: params.redirectStep || params.step + 1,
                                redirectStep: null,
                            });

                            // handleNext();
                        }}
                        className={`w-full flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:shadow-md ${params.userId === user.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                            {getInitials(user.name) || user.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-foreground">
                                {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {user.role}
                            </p>
                        </div>
                        <ChevronRight
                            size={16}
                            className="text-muted-foreground"
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

