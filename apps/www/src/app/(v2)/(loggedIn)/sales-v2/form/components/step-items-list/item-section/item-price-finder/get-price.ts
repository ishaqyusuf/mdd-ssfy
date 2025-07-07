"use server";

import { prisma } from "@/db";
import { ItemPriceFinderProps } from ".";
import { camel } from "@/lib/utils";
type Keys = "dykeDoorId" | "moldingId" | "casingId" | "jambSizeId";
export async function getDoorPrices({ ...props }: ItemPriceFinderProps) {
    console.log(props);

    function _or(key: Keys) {
        if (props[key])
            return {
                [key]: props[key],
            };

        return null;
    }
    const doors = props.moldingId
        ? []
        : await prisma.dykeSalesDoors.findMany({
              where: {
                  dimension: props.moldingId ? undefined : props.dimension,
                  housePackageTool: {
                      OR: [
                          _or("dykeDoorId"),
                          // _or("moldingId"),
                          _or("casingId"),
                          _or("jambSizeId"),
                      ].filter(Boolean) as any,
                  },
              },
              include: {
                  housePackageTool: true,
              },
          });
    const moldingTools = !props.moldingId
        ? []
        : await prisma.housePackageTools.findMany({
              where: {
                  moldingId: props.moldingId,
              },
              include: {
                  salesOrderItem: {
                      select: {
                          rate: true,
                          createdAt: true,
                      },
                  },
              },
          });
    // console.log(_d.map((d) => d.salesOrderItem.rate));
    // console.log(props);
    // console.log(doors);

    function getPricings(key: Keys) {
        let title = {
            moldingId: "Moulding",
            dykeDoorId: "Door",
            casingId: "Casing",
            jambSizeId: "Jamb Size",
        }[key];
        let priceKey = `${camel(title == "Moulding" ? "Door" : title)}Price`;

        const pDoors =
            key == "moldingId"
                ? moldingTools?.map((mt) => ({
                      date: mt.salesOrderItem?.createdAt,
                      value: mt.salesOrderItem?.rate,
                  }))
                : doors
                      .filter(
                          (d) =>
                              d.housePackageTool?.[key] == props[key] &&
                              props[key]
                      )
                      .map((d) => ({
                          date: d.createdAt,
                          value: d[priceKey],
                      }));
        return {
            title,
            priceKey,
            priceList: pDoors.filter(
                (p, i) =>
                    pDoors.findIndex((s) => s.value == p.value) == i &&
                    p.value > 0
            ),
        };
    }
    const priceTabs = props.moldingId
        ? [getPricings("moldingId")]
        : [
              getPricings("dykeDoorId"),
              getPricings("casingId"),
              getPricings("jambSizeId"),
          ];
    // console.log(priceTabs);
    // return priceTabs;
    return {
        priceTabs,
        hasPrice: priceTabs.some((p) => p.priceList.length),
    };
}
