"use client";

import { useEffect } from "react";
import {
    checkUpdateRequiredStatus,
    updateAccountInfoAction,
} from "@/actions/user-account-update-required-action";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";

import Button from "../common/button";
import FormInput from "../common/controls/form-input";
import { Form } from "@gnd/ui/form";

const schema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address",
    }),
    phoneNo: z.string({
        message: "Phone No is required",
    }),
    name: z.string({
        message: "Name is required",
    }),
});
export default function UserAccountUpdateRequiredModal({}) {
    const session = useSession();
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            id: null,
            name: null,
            email: null,
            phoneNo: null,
            updateRequired: false,
        },
    });
    // const [updateRequired, setUpdateRequired] = useState(false);
    const updateRequired = form.watch("updateRequired");
    useEffect(() => {
        setTimeout(() => {
            // checkUpdateRequiredStatus()
            //     .then(({ name, email = "", id, phoneNo = "" }) => {
            //         if (!name || !email || !phoneNo) {
            //             form.reset({
            //                 id,
            //                 name,
            //                 email,
            //                 phoneNo,
            //                 updateRequired: true,
            //             });
            //         }
            //     })
            //     .catch((e) => {});
        }, 2000);
    }, []);
    async function updateAccount() {
        form.trigger().then(async (e) => {
            // console.log(e);
            if (e) {
                try {
                    const data = form.getValues();
                    // console.log(data);
                    const resp = await updateAccountInfoAction(data);

                    await signIn("credentials", {
                        email: data.email,
                        password: ",./",
                        redirect: false,
                    });
                    window.location.reload();
                } catch (error) {
                    toast.error(
                        "Unable to complete, check data and try again.",
                    );
                }
            }
        });
    }
    return (
        <Dialog open={updateRequired}>
            <DialogContent
                className="sm:max-w-[425px]"
                onOpenAutoFocus={(evt) => evt.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>Account Requires update</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <div className="grid gap-4">
                        <span>{session.data?.user?.name}</span>
                        <FormInput
                            label="Name*"
                            control={form.control}
                            name="name"
                        />
                        <FormInput
                            label="Email*"
                            control={form.control}
                            name="email"
                        />
                        <FormInput
                            label="Phone*"
                            control={form.control}
                            name="phoneNo"
                        />
                    </div>
                </Form>
                <DialogFooter className="flex justify-end">
                    <Button action={updateAccount}>Update</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
