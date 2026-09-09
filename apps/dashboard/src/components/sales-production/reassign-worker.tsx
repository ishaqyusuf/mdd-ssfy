"use client";

import { getCachedUsersList } from "@/actions/cache/get-cached-users-list";
import { reassignProductionAction } from "@/actions/reassign-production";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { toast } from "@gnd/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

export function ReassignProductionWorker({salesId, assignmentIds, disabled = false, onUpdated}: {
 salesId: number; assignmentIds: number[]; disabled?: boolean; onUpdated?: () => void;
}) {
 const auth = useAuth();
 const overview = useSalesOverviewQuery();
 const [open, setOpen] = useState(false);
 const users = useQuery({queryKey: ["production-reassignment-workers"], queryFn: () => getCachedUsersList({"user.role": "Production"}), enabled: open, staleTime: 60_000});
 const action = useAction(reassignProductionAction, {
  onSuccess() {
   setOpen(false);
   overview.salesQuery.assignmentUpdated();
   onUpdated?.();
   toast({title: "Remaining work reassigned"});
  },
  onError({error}) {
   toast({title: "Unable to reassign work", description: error.serverError || "Refresh and try again.", variant: "destructive"});
  },
 });
 if (!auth.can.editProduction) return null;
 return <Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
   <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" disabled={disabled || action.isExecuting} aria-label="Change production worker" title={disabled ? "All assigned work has been submitted" : "Change production worker"} onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
    <Icons.Edit className="size-4" />
   </Button>
  </PopoverTrigger>
  <PopoverContent align="end" className="w-64 p-2" onClick={event => event.stopPropagation()} onPointerDown={event => event.stopPropagation()}>
   <p className="px-2 py-1 text-sm font-medium">Assign remaining work to</p>
   <p className="px-2 pb-2 text-xs text-muted-foreground">Submitted work stays with its original worker.</p>
   {users.isPending ? <p className="p-2 text-sm">Loading workers…</p> : users.isError ? <Button variant="ghost" onClick={() => users.refetch()}>Retry loading workers</Button> : <div className="max-h-64 overflow-y-auto">
    {users.data?.length ? users.data.map(user => <Button key={user.id} variant="ghost" className="w-full justify-start" disabled={action.isExecuting} onClick={() => action.execute({salesId, assignmentIds, assignedToId: Number(user.id)})}>{user.name || "Unnamed worker"}</Button>) : <p className="p-2 text-sm">No production workers available.</p>}
   </div>}
  </PopoverContent>
 </Popover>;
}
