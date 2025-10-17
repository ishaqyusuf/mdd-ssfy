import { cn } from "../../utils";
import { Skeleton } from "../skeleton";

export function FormSkeleton() {
  return (
    <div className="grid py-4 gap-4 grid-cols-2">
      <FormInput />
      <FormInput />
      <FormInput className="col-span-2" />
      <FormInput />
      <div className="col-span-2 flex justify-end">
        <Skeleton className="h-8 w-24"></Skeleton>
      </div>
    </div>
  );
}
function FormInput({ className = "" }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}
