import { cn } from "../../utils";
import { Button } from "../button";

interface Props {
  onCreate?;
  CreateButton?;
  label?: string;
  className?: string;
}
export function EmptyState(props: Props) {
  const label = props.label || "record";
  return (
    <div className={cn("flex items-center justify-center", props.className)}>
      <div className="flex flex-col items-center ">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">No {label}</h2>
          <p className="text-[#606060] text-sm">
            You haven't created any {label} yet. <br />
            {!props.onCreate || "Go ahead and create your first one."}
          </p>
        </div>

        {props?.CreateButton
          ? props.CreateButton
          : !props.onCreate || (
              <Button variant="outline" onClick={props.onCreate}>
                Create
              </Button>
            )}
      </div>
    </div>
  );
}
