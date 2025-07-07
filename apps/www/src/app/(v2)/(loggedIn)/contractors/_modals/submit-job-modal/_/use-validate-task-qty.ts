import { z } from "zod";
import { useSubmitJobForm } from ".";
import { toast } from "sonner";

export function useValidateTaskQty(form) {
    // const form = useSubmitJobForm();
    return {
        validate() {
            if (form.getValues("job.type") == "installation") {
                const maxQty = form.getValues("home.costing") || {};

                const costData = form.getValues("job.meta.costData") || {};
                // console.log(costData);
                const schem = {};
                let hasCost = false;
                Object.entries(costData).map(([k, v]) => {
                    let maxQ = maxQty[k] || 0;
                    if (typeof maxQ == "string") maxQ = Number(maxQ);

                    if ((v as any)?.qty > 0) {
                        hasCost = true;
                        schem[k] = z.object({
                            qty: z.number({}).max(maxQ).min(0),
                        });
                    }
                });
                const schema = z.object({
                    job: z.object({
                        meta: z.object({
                            costData: z.object({
                                ...schem,
                            }),
                        }),
                    }),
                });
                try {
                    console.log(costData);
                    Object.entries(costData).map(([k, v]) => {
                        v &&
                            typeof (v as any)?.qty === "string" &&
                            (costData[k] = {
                                ...(v as any),
                                qty: Number((v as any).qty),
                            });
                        // k == "undefined" && delete formData.meta.costData[k];
                    });
                    if (hasCost) schema.parse(form.getValues());
                } catch (error) {
                    (error as any).issues.map((e) => {
                        form.setError(e.path.join("."), {
                            ...e,
                        });
                    });
                    toast.error("Some quantity has exceed default value.");
                    return false;
                }
            }
            return true;
        },
    };
}
