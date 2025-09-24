"use server";

import { prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";

import { actionClient } from "./safe-action";
import { stepComponentSchema } from "./schema";
import { revalidatePath } from "next/cache";
import { getStepComponents } from "@api/db/queries/sales-form";

export const saveStepComponent = actionClient
    .schema(stepComponentSchema)
    .metadata({
        name: "save-step-component",
    })
    .action(async ({ parsedInput: { ...input } }) => {
        const { id, stepId, productCode, ...data } = input;
        let component = id
            ? await prisma.dykeStepProducts.update({
                  where: { id },
                  data: {
                      ...data,
                  },
                  include: {
                      door: true,
                      sorts: true,
                      product: true,
                  },
              })
            : await prisma.dykeStepProducts.create({
                  data: {
                      uid: generateRandomString(5),
                      ...data,
                      //   product: {
                      //     create: {
                      //         // custom
                      //     }
                      //   },
                      step: {
                          connect: {
                              id: stepId,
                          },
                      },
                  },
                  include: {
                      door: true,
                      sorts: true,
                      product: true,
                  },
              });
        revalidatePath(`step-components-${stepId}`);
        return (
            await getStepComponents(
                { db: prisma },
                {
                    id: component.id,
                },
            )
        )?.[0];
    });
