import { useZodForm } from "@/hooks/use-zod-form";
import { useSession } from "next-auth/react";
import { z } from "zod";

const formSchema = z.object({
    name: z.string(),
    phoneNo: z.string(),
    username: z.string(),
});
export function UserProfileInfo({}) {
    const { data: session } = useSession();
    const form = useZodForm(formSchema, {
        defaultValues: {
            name: session?.user?.name,
            phoneNo: session?.user?.phoneNo,
            username: session?.user?.username,
        },
    });
    return <></>;
}

