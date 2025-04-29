import {
    SalesDispatchStatus,
    StepComponentMeta,
} from "@/app/(clean-code)/(sales)/types";
import { DeliveryOption } from "@/types/sales";
import { paymentMethods } from "@/utils/constants";
import { Qty } from "@/utils/sales-control-util";
import { z } from "zod";

export const changeSalesChartTypeSchema = z.enum(["sales"]);

export const createCustomerSchema = z
    .object({
        profileId: z.string().optional().nullable(),
        id: z.number().optional(),
        customerId: z.number().optional(),
        // resolutionRequired: z.boolean().refine((val) => val == true, {
        //     message: "resolution required",
        // }),
        addressOnly: z.boolean().nullable().optional(),
        phoneNo: z.string().optional(),
        phoneNo2: z.string().optional(),
        email: z.string().optional(),
        address1: z.string().optional().nullable(),
        address2: z.string().optional(),
        name: z.string().optional(),
        businessName: z.string().optional(),
        addressId: z.number().optional(),
        zip_code: z.string().optional(),
        taxCode: z.string().optional(),
        country: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        taxProfileId: z.number().optional(),
        netTerm: z.string().optional(),
        customerType: z.enum(["Personal", "Business"]).optional(),
        existingCustomers: z
            .array(z.any())
            .nullable()
            .optional()
            .default(undefined),
    })
    .superRefine((data, ctx) => {
        if (data.addressOnly) return;
        if (!data.profileId)
            ctx.addIssue({
                path: ["profileId"],
                message: "Profile is required!",
                code: "custom",
            });
        if (data.customerType === "Personal" && !data.name) {
            ctx.addIssue({
                path: ["name"],
                message: "Name is required for Individual customers",
                code: "custom",
            });
        }
        if (data.existingCustomers?.length) {
            ctx.addIssue({
                path: ["existingCustomers"],
                message: "Resolve conflict customer",
                code: "custom",
            });
        }
        if (data.customerType === "Business" && !data.businessName) {
            ctx.addIssue({
                path: ["businessName"],
                message: "Business Name is required for Business customers",
                code: "custom",
            });
        }
    });
export const createPaymentSchemaOld = z
    .object({
        paymentMethod: z.enum([
            "link",
            "terminal",
            "check",
            "cash",
            "zelle",
            "credit-card",
            "wire",
        ]),
        amount: z.number(),
        checkNo: z.string().optional(),
        deviceId: z.string().optional(),
        enableTip: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.paymentMethod === "check" && !data.checkNo) {
            ctx.addIssue({
                path: ["checkNo"],
                message: "Check No is required",
                code: "custom",
            });
        }
        if (data.paymentMethod === "terminal" && !data.deviceId) {
            ctx.addIssue({
                path: ["deviceId"],
                message: "Device Id is required",
                code: "custom",
            });
        } else {
        }
    });
export const stepComponentSchema = z.object({
    id: z.number().optional(),
    img: z.string().optional(),
    name: z.string(),
    productCode: z.string().optional(),
    custom: z.boolean().optional().default(false),
    stepId: z.number().optional(),
    meta: z.object({}).optional() as z.ZodType<StepComponentMeta>,
});
export const updateComponentPricingSchema = z.object({
    stepId: z.number(),
    stepProductUid: z.string(),
    pricings: z.array(
        z.object({
            id: z.number().optional(),
            dependenciesUid: z.string().optional(),
            price: z.number().optional(),
        }),
    ),
});
export const createPaymentSchema = z
    .object({
        salesIds: z.array(z.number()),
        orderNos: z.array(z.string()),
        accountNo: z.string().optional(),
        paymentMethod: z.enum(paymentMethods),
        amount: z.number(),
        checkNo: z.string().optional(),
        deviceId: z.string().optional(),
        deviceName: z.string().optional(),
        enableTip: z.boolean().optional(),
        terminalPaymentSession: z
            .object({
                status: z.string(),
                squarePaymentId: z.string().optional(),
                squareCheckoutId: z.string().optional(),
            })
            .optional(),
    })
    .superRefine((data, ctx) => {
        if (data.paymentMethod === "check" && !data.checkNo) {
            ctx.addIssue({
                path: ["checkNo"],
                message: "Check No is required",
                code: "custom",
            });
        }
        if (data.paymentMethod === "terminal" && !data.deviceId) {
            ctx.addIssue({
                path: ["deviceId"],
                message: "Device Id is required",
                code: "custom",
            });
        } else {
        }
    });
export const updateDispatchStatusSchema = z.object({
    orderId: z.number(),
    deliveryId: z.number(),
    status: z.string() as z.ZodType<SalesDispatchStatus>,
    oldStatus: z.string() as z.ZodType<SalesDispatchStatus>,
});
export const createSalesDispatchItemsSchema = z.object({
    deliveryMode: z.string(),
    orderId: z.number(),
    deliveryId: z.number(),
    status: z.string().optional() as z.ZodType<SalesDispatchStatus>,
    items: z.record(
        z.object({
            orderItemId: z.number(),
            available: z.object({
                lh: z.number().nullable().optional(),
                rh: z.number().nullable().optional(),
                qty: z.number().nullable().optional(),
            }),
            qty: z.object({
                lh: z.number().nullable().optional(),
                rh: z.number().nullable().optional(),
                qty: z.number().nullable().optional(),
            }),
            submissionId: z.number(),
            status: z.string().optional() as z.ZodType<SalesDispatchStatus>,
            itemUid: z.string(),
            totalItemQty: z.number(),
        }),
    ),
});
export const createSalesDispatchSchema = z.object({
    id: z.number().optional(),
    deliveryMode: z.string() as z.ZodType<DeliveryOption>,
    status: z.string() as z.ZodType<SalesDispatchStatus>,
    orderId: z.number(),
    driverId: z.number().optional(),
    deliveryDate: z.date().optional(),
    packingList: z.boolean().optional(),
});
export const createSubmissionSchema = z
    .object({
        pending: z.object({
            lh: z.number().nullable().optional(),
            rh: z.number().nullable().optional(),
            qty: z.number().nullable().optional(),
        }),
        qty: z.object({
            lh: z.number().nullable().optional(),
            rh: z.number().nullable().optional(),
            qty: z.number().nullable().optional(),
        }),
        assignmentId: z.number(),
        note: z.string().optional(),
        salesId: z.number(),
        itemId: z.number(),
        submittedById: z.number(),
        itemUid: z.string(),
    })
    .superRefine(qtySuperRefine);
export const deleteSalesAssignmentSubmissionSchema = z.object({
    submissionId: z.number().optional(),
    assignmentId: z.number().optional(),
    salesId: z.number(),
    itemUid: z.string().optional(),
});
export const createAssignmentSchema = z
    .object({
        pending: z.object({
            lh: z.number().nullable().optional(),
            rh: z.number().nullable().optional(),
            qty: z.number().nullable().optional(),
        }),
        qty: z.object({
            lh: z.number().nullable().optional(),
            rh: z.number().nullable().optional(),
            qty: z.number().nullable().optional(),
        }),
        assignedToId: z.any().optional().nullable(),
        shelfItemId: z.any().optional().nullable(),
        dueDate: z.date().optional().nullable(),
        salesDoorId: z.number().nullable().optional(),
        salesId: z.number(),
        itemsTotal: z.number(),
        itemUid: z.string(),
        token: z.string().optional(),
        salesItemId: z.number(),
    })
    .superRefine(qtySuperRefine);
function qtySuperRefine(data, ctx) {
    let totalQty = 0;
    // console.log(data?.pending?.);

    ["qty", "lh", "rh"].map((a) => {
        let val = +data.qty?.[a] || 0;
        if (a == "qty" && (data.qty.lh || data.qty.rh)) {
        } else totalQty += val;
        if (val) {
            if (val > data.pending?.[a])
                ctx.addIssue({
                    path: [`qty.${a}`],
                    message: "Qty can not be more than pending",
                    code: "custom",
                });
        }
    });

    if (totalQty == 0)
        ctx.addIssue({
            path: [],
            message: "Qty required",
            code: "custom",
        });
    if (totalQty > data?.pending?.qty)
        ctx.addIssue({
            path: [],
            message: "Qty overload",
            code: "custom",
        });
}
