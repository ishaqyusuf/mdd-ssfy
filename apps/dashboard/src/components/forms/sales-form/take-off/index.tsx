import { cn } from "@gnd/ui/cn";
import { TakeOffItem } from "./take-off-item";
import { TakeOffProvider, useTakeoff } from "./context";

export default function TakeOff({}) {
    return (
        <TakeOffProvider>
            <Content />
        </TakeOffProvider>
    );
}
function Content({}) {
    const { zus, ...ctx } = useTakeoff();
    if (!ctx.sections) return null;
    return (
        <div className="flex flex-col">
            <div className={cn("grid 2xl:grid-cols-2 2xl:gap-4")}>
                {zus.sequence.formItem?.map((uid) => (
                    <TakeOffItem key={uid} uid={uid} />
                ))}
            </div>
        </div>
    );
}
