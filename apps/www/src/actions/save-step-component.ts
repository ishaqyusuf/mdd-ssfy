"use server";

import { prisma } from "@/db";
import { generateRandomString } from "@/lib/utils";
import { dtoStepComponent } from "@/utils/dto-step-component";

import { actionClient } from "./safe-action";
import { stepComponentSchema } from "./schema";
import { revalidatePath } from "next/cache";

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
        return dtoStepComponent(component);
    });
