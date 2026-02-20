import { cn } from "@gnd/ui/cn";
import { getInitials } from "@gnd/utils";
import { Avatar as Avataar } from "@gnd/ui/namespace";
import { getColorFromName } from "@/lib/color";
interface Props {
    url?: string;
    name?: string;
    className?: string;
}
export function Avatar({ url, name, className }: Props) {
    const inital = getInitials(name);
    return (
        <Avataar
            className={cn(
                "rounded-full bg-muted flex items-center justify-center overflow-hidden size-8 text-xs",
                className,
            )}
        >
            {/* <AvatarImage
                                                src={
                                                    dispatch.driver.avatar ||
                                                    "/placeholder.svg"
                                                }
                                            /> */}
            <Avataar.Fallback
                style={{
                    backgroundColor: getColorFromName(inital),
                }}
                className="text-xs text-accent"
            >
                {inital}
            </Avataar.Fallback>
        </Avataar>
    );
    //     <div
    //         className={cn(
    //             "rounded-full bg-muted flex items-center justify-center overflow-hidden",
    //             className,
    //         )}
    //     >
    //         {url ? (
    //             <img src={url} alt={name} className="object-cover" />
    //         ) : (
    //             <span className="text-sm font-medium text-white">{inital}</span>
    //         )}
    //     </div>
    // );
}

export function AvatarGroup({
    users,
}: {
    users: { name: string; url?: string }[];
}) {
    return (
        <div className="flex -space-x-2">
            {users.map((user, index) => (
                <Avatar
                    key={index}
                    url={user.url}
                    name={user.name}
                    className="border-2 border-white dark:border-gray-800"
                />
            ))}
        </div>
    );
}

