import { createContext, useContext, useEffect, useState } from "react";
import {
    GetSalesEmail,
    getSalesEmailUseCase,
} from "../../use-case/sales-email-use-case";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendEmail } from "@/modules/email/send";
import { toast } from "sonner";

// let ctx = null;

export const useMailboxContext = (id, type) => {
    useEffect(() => {
        // if (ctx?.id == id) return;
        getSalesEmailUseCase(id, type).then((data) => {
            setData(data || ({} as any));
        });
    }, []);
    const [data, setData] = useState<GetSalesEmail>({} as any);
    // if (ctx?.id == id) return ctx as typeof resp;
    const form = useForm({
        resolver: zodResolver(
            z.object({
                body: z.string(),
                attachment: z.string(),
            }),
        ),
        defaultValues: {
            body: "",
            subject: "",
            attachment: "",
        },
    });
    const resp = {
        ...data,
        form,
        updateEmail(email) {
            setData((d) => {
                return {
                    ...d,
                    data: {
                        ...d.data,
                        email,
                        noEmail: false,
                    },
                };
            });
        },
        async __sendEmail() {
            const t = await form.trigger();
            if (t) {
                const dta = form.getValues();
                const subject = dta.subject || data.sendProfile.subject;
                const resp = await sendEmail({
                    body: dta.body,
                    replyTo: data.sendProfile.replyTo,
                    from: data.sendProfile?.from,
                    to: data.data.email || data.data.fallbackEmail,
                    attachments: [dta.attachment]
                        ?.map((a) => {
                            const findA = data.data?.attachables?.find(
                                (_a) => _a.label == (a as any),
                            );

                            return {
                                folder: findA?.folder,
                                url: findA?.url,
                                fileName: findA?.fileName,
                            };
                        })
                        ?.filter((s) => s.url),
                    subject,
                    data: data.composeData,
                });
                if (resp?.error) toast?.error(resp?.error);
                if (resp?.success) toast.success(resp.success);
            }
        },
    };
    return resp;
};
const MailboxContext = createContext<ReturnType<typeof useMailboxContext>>(
    null as any,
);
export const MailboxProvider = MailboxContext.Provider;

export const useMailbox = () => useContext(MailboxContext);
