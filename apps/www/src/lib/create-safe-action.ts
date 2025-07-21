import { _email } from "@/app/(v1)/_actions/_email";
import { userId } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";
import { Err, Ok, Result } from "ts-results";
import { z } from "zod";

import { generateRandomString } from "./utils";

export type FieldErrors<T> = {
    [K in keyof T]?: string[];
};

export type ActionState<TInput, TOutput> = {
    fieldErrors?: FieldErrors<TInput>;
    error?: string | null;
    data?: TOutput;
};

export const createSafeAction = <TInput = any, TOutput = any>(
    handler: (validatedData: TInput) => Promise<TOutput>,
    schema?: z.Schema<TInput>,
) => {
    return async (data: TInput): Promise<Result<TOutput, any>> => {
        const validationResult = schema
            ? schema.safeParse(data)
            : { data, success: true, error: [] as any };
        if (!validationResult.success) {
            return Err({
                fields: (validationResult as any).error.flatten()
                    .fieldErrors as FieldErrors<TInput>,
            });
        }

        try {
            const result = await handler(validationResult.data);
            const resp = Ok(result as TOutput);
            return { ...resp } as any;
        } catch (e) {
            // await _email({
            //     from: env.EMAIL_FROM_ADDRESS,
            //     user: { email: "ishaqyusuf024@gmail.com" },
            //     subject: "Server error",
            //     react: ErrorMail({
            //         body: "lorem" // e as any
            //     })
            // });
            if (e instanceof Error) {
                await prisma.errorLog.create({
                    data: {
                        meta: {
                            error: e.message,
                        } as any,
                        status: "new",
                        userId: await userId(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        // slug: generateRandomString(10),
                    },
                });
            }
            const err = Err({
                message: "Fatal Error",
            });
            return { ...(err as any) };
        }
    };
};
