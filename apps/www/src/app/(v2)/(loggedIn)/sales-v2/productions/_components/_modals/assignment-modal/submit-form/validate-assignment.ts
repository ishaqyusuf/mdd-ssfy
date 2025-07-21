import {
    OrderItemProductionAssignments,
    OrderProductionSubmissions,
} from "@/db";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

export function useValidateAssignment(
    form: UseFormReturn<Partial<OrderProductionSubmissions>>,
) {
    return {
        validate() {
            const v = form.getValues();
            let schema: any = null;
            form.clearErrors();
            const assignments: Partial<OrderItemProductionAssignments>[] = [];
            // Object.entries(v.doors).map(([title, door]) => {
            //     let _assignValidator: any = null;
            //     ["lh", "rh"].map((k) => {
            //         const qtyKey = `${k}Qty`;

            //         const qty = parseFloat(door._assignForm[qtyKey]);

            //         if (!isNaN(qty) && qty > 0) {
            //             (v.doors[title] as any)._assignForm[qtyKey] =
            //                 qty as any;

            //             if (!_assignValidator) _assignValidator = {};
            //             const pending = Number(door?.[`${k}Pending`]) || 0;
            //             _assignValidator[qtyKey] = z
            //                 .number({})
            //                 .max(pending)
            //                 .min(0);

            //         }
            //     });
            //     if (_assignValidator) {
            //         assignments.push({
            //             ...v.doors?.[title]?._assignForm,
            //             assignedToId: v.assignToId,
            //         });

            //         if (!schema) schema = {};
            //         schema[title] = z.object({
            //             _assignForm: z.object(_assignValidator),
            //         });
            //     }
            // });
            // if (schema) {
            //     try {
            //         z.object({
            //             doors: z.object(schema),
            //             assignToId: z.number({}).min(1),
            //         }).parse(v);
            //         return assignments;
            //     } catch (error) {
            //         (error as any).issues.map((e) => {

            //             form.setError(e.path.join("."), {
            //                 ...e,
            //             });
            //         });
            //         return false;
            //     }
            // }
            toast.error("Invalid assignment");
            return false;
        },
    };
}
