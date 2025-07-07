"use server";

import { prisma } from "@/db";
import { capitalizeFirstLetter } from "@/lib/utils";

export async function getHomeTemplateSuggestions() {
  const _ls = await prisma.autoCompletes.findMany({
    where: {
      type: "unit-template",
    },
    select: {
      id: true,
      fieldName: true,
      value: true,
    },
  });
  const suggestions: any = {};
  const updates: string[] = [];
  await Promise.all(
    _ls.map(async (l) => {
      let fn = l.fieldName
        .split("_")
        .map((spl, index) => (index == 0 ? spl : capitalizeFirstLetter(spl)))
        .join("");
      if (!suggestions[fn]) {
        suggestions[fn] = _ls
          .filter((_) => _.fieldName == l.fieldName)
          .map((f) => f.value);
      }
    })
  );
  //   console.log(updates);
  return suggestions;
}
