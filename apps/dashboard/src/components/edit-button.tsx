import { Icons } from "@gnd/ui/icons";
import { SubmitButton } from "@gnd/ui/submit-button";

interface Props {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    withText?: boolean;
    // size?: ComponentProps<typeof SubmitButton>["size"];
    size?: "xs" | "sm" | "lg" | "icon";
}
export function EditButton(props: Props) {
    const size = !props.withText
        ? props.size
            ? props.size === "icon"
                ? "icon"
                : `icon-${props.size}`
            : "icon-sm"
        : props.size || "sm";
    const Icon = Icons.Edit;
    return (
        <SubmitButton
            // variant="destructive"
            size={size as any}
            disabled={props.disabled}
            onClick={props.onClick}
            variant={"outline"}
        >
            <div className="flex gap-2 items-center">
                <Icon className="size-4" />
                {props.withText && "Edit"}
            </div>
        </SubmitButton>
    );
}

