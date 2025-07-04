import { OrderItemProductionAssignments } from "@/db";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { IAssignGroupForm } from "./index";

export function useValidateAssignment(form?: UseFormReturn<IAssignGroupForm>) {
    return {
        validate(values?) {
            const v = form?.getValues();

            form.clearErrors();
            const { assignments, schema } = composeAssignments(v);

            if (schema) {
                try {
                    z.object({
                        doors: z.object(schema),
                        assignToId: z.number({}).min(1),
                    }).parse(v);
                    return assignments;
                } catch (error) {
                    (error as any).issues.map((e) => {
                        // console.log(e);

                        form.setError(e.path.join("."), {
                            ...e,
                        });
                    });
                    return false;
                }
            }
            toast.error("Invalid assignment");
            return false;
        },
    };
}
export function composeAssignments(form: IAssignGroupForm) {
    const doors = form.doors;
    let schema: any = null;
    const assignments: Partial<OrderItemProductionAssignments>[] = [];
    Object.entries(doors).map(([title, door]) => {
        let _assignValidator: any = null;
        ["lh", "rh"].map((k) => {
            const qtyKey = `${k}Qty`;

            const qty = parseFloat((door as any)?._assignForm?.[qtyKey]);
            console.log(qty);

            if (!isNaN(qty) && qty > 0) {
                (form.doors[title] as any)._assignForm[qtyKey] = qty as any;

                if (!_assignValidator) _assignValidator = {};
                const pending = Number(door?.[`${k}Pending`]) || 0;
                _assignValidator[qtyKey] = z.number({}).max(pending).min(0);
                console.log({ qty, pending });
            }
        });
        if (_assignValidator) {
            assignments.push({
                ...form.doors?.[title]?._assignForm,
                assignedToId: form.assignToId,
            });

            if (!schema) schema = {};
            schema[title] = z.object({
                _assignForm: z.object(_assignValidator),
            });
        }
    });
    return { assignments, schema };
}
