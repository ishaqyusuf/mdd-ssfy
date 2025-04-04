import { StepComponentMeta } from "@/app/(clean-code)/(sales)/types";
import { paymentMethods } from "@/utils/constants";
import { z } from "zod";

export const changeSalesChartTypeSchema = z.enum(["sales"]);

export const createCustomerSchema = z
    .object({
        profileId: z.string(),
        id: z.number().optional(),
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
        customerType: z.enum(["Personal", "Business"]),
        existingCustomers: z.array(z.any()).default(undefined),
    })
    .superRefine((data, ctx) => {
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
