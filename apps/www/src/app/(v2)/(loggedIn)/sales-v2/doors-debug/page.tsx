import { prisma } from "@/db";
import Search from "./search";

export default async function DoorsDebug({ searchParams }) {
    const { q, omit } = searchParams;

    const doors = await prisma.dykeShelfProducts.findMany({
        where: {
            AND:
                q || omit
                    ? [
                          {
                              AND: q
                                  ?.split(",")
                                  ?.filter(Boolean)
                                  ?.map((w) => ({
                                      title: {
                                          contains: w,
                                      },
                                  })),
                          },
                          {
                              AND: !omit
                                  ? undefined
                                  : omit
                                        ?.split(",")
                                        ?.filter(Boolean)
                                        ?.map((w) => ({
                                            title: {
                                                not: {
                                                    contains: w,
                                                },
                                            },
                                        })),
                          },
                      ]
                    : undefined,
        },
        take: 25,
    });
    return (
        <div>
            <Search />
            <div className="grid grid-cols-4 gap-4">
                {doors?.map((d) => (
                    <div key={d.id}>{d.title}</div>
                ))}
            </div>
        </div>
    );
}
