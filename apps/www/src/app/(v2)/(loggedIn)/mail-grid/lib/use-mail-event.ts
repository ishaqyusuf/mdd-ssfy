import { toast } from "sonner";
import { EmailTriggerEventType } from "../templates/events";
import { _event, EmailEventProps } from "./email-event";

export function useMailEvent() {
    return {
        async notify(e: EmailTriggerEventType, data: EmailEventProps) {
            try {
                await _event(e, data);
                toast.success(`${e} dispatched successfully`);
            } catch (error) {
                if (error instanceof Error) {
                    toast.error(error.message);
                }
            }
        },
    };
}
export async function notify(e: EmailTriggerEventType, data: EmailEventProps) {
    try {
        await _event(e, data);
        toast.success(`${e} dispatched successfully`);
    } catch (error) {
        if (error instanceof Error) {
            toast.error(error.message);
        }
    }
}
