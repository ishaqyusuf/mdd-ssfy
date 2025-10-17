// import { z } from "zod";
// import { Db } from "./types";
// import { ShippingMethodType } from "@gnd/db";

// // Schemas for Form Validation

// export const flatRateFormSchema = z.object({
//   enabled: z.boolean(),
//   rate: z.number().min(0, "Rate must be non-negative"),
// });

// export const weightBasedRateSchema = z.object({
//   id: z.number().optional(),
//   fromWeight: z.number().min(0),
//   toWeight: z.number().min(0),
//   ratePerUnit: z.number().min(0),
// });

// export const weightBasedFormSchema = z.object({
//   enabled: z.boolean(),
//   baseFee: z.number().min(0),
//   rates: z.array(weightBasedRateSchema),
// });

// export const priceBasedRateSchema = z.object({
//   id: z.number().optional(),
//   fromPrice: z.number().min(0),
//   toPrice: z.number().min(0),
//   shippingFee: z.number().min(0),
// });

// export const priceBasedFormSchema = z.object({
//   enabled: z.boolean(),
//   rates: z.array(priceBasedRateSchema),
// });

// export const shippingZoneSchema = z.object({
//   id: z.number().optional(),
//   name: z.string().min(1, "Zone name is required"),
//   countries: z.string().optional(),
//   states: z.string().optional(),
//   zipCodes: z.string().optional(),
//   rate: z.number().min(0),
// });

// export const zoneBasedFormSchema = z.object({
//   enabled: z.boolean(),
//   zones: z.array(shippingZoneSchema),
// });

// export const perItemFormSchema = z.object({
//   enabled: z.boolean(),
//   rate: z.number().min(0),
// });

// export const dimensionalWeightFormSchema = z.object({
//   enabled: z.boolean(),
//   divisor: z.number().gt(0, "Divisor must be positive"),
//   baseFee: z.number().min(0),
// });

// export const shippingCalculationFormSchema = z.object({
//   flatRate: flatRateFormSchema,
//   weightBased: weightBasedFormSchema,
//   priceBased: priceBasedFormSchema,
//   zoneBased: zoneBasedFormSchema,
//   perItem: perItemFormSchema,
//   dimensionalWeight: dimensionalWeightFormSchema,
// });

// export type ShippingCalculationFormData = z.infer<
//   typeof shippingCalculationFormSchema
// >;

// // Database Functions

// export async function getShippingCalculationConfig(db: Db) {
//   const configs = await db.shippingConfiguration.findMany({
//     include: {
//       flatRate: true,
//       weightBased: { include: { rates: true } },
//       priceBased: { include: { rates: true } },
//       zoneBased: { include: { zones: true } },
//       perItem: true,
//       dimensionalWeight: true,
//     },
//   });

//   // Ensure all methods have a config entry
//   const allMethods = Object.values(ShippingMethodType);
//   let result: any = {};

//   for (const method of allMethods) {
//     let config = configs.find((c) => c.method === method);
//     if (!config) {
//       config = (await db.shippingConfiguration.create({
//         data: {
//           method: method,
//           enabled: false,
//         },
//       })) as any;
//     }
//     if (!config) throw new Error("");
//     switch (method) {
//       case "FLAT_RATE":
//         result.flatRate = {
//           enabled: config.enabled,
//           rate: config.flatRate?.rate ?? 0,
//         };
//         break;
//       case "WEIGHT_BASED":
//         result.weightBased = {
//           enabled: config.enabled,
//           baseFee: config.weightBased?.baseFee ?? 0,
//           rates: config.weightBased?.rates ?? [],
//         };
//         break;
//       case "PRICE_BASED":
//         result.priceBased = {
//           enabled: config.enabled,
//           rates: config.priceBased?.rates ?? [],
//         };
//         break;
//       case "ZONE_BASED":
//         result.zoneBased = {
//           enabled: config.enabled,
//           zones: config.zoneBased?.zones ?? [],
//         };
//         break;
//       case "PER_ITEM":
//         result.perItem = {
//           enabled: config.enabled,
//           rate: config.perItem?.rate ?? 0,
//         };
//         break;
//       case "DIMENSIONAL_WEIGHT":
//         result.dimensionalWeight = {
//           enabled: config.enabled,
//           divisor: config.dimensionalWeight?.divisor ?? 1,
//           baseFee: config.dimensionalWeight?.baseFee ?? 0,
//         };
//         break;
//     }
//   }

//   return result as ShippingCalculationFormData;
// }

// // --- Save Functions ---
// export async function saveFlatRateConfig(
//   db: Db,
//   data: z.infer<typeof flatRateFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "FLAT_RATE" },
//     update: { enabled: data.enabled },
//     create: { method: "FLAT_RATE", enabled: data.enabled },
//   });
//   await db.flatRate.upsert({
//     where: { configId: config.id },
//     update: { rate: data.rate },
//     create: { configId: config.id, rate: data.rate },
//   });
// }

// export async function saveWeightBasedConfig(
//   db: Db,
//   data: z.infer<typeof weightBasedFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "WEIGHT_BASED" },
//     update: { enabled: data.enabled },
//     create: { method: "WEIGHT_BASED", enabled: data.enabled },
//   });
//   const weightBased = await db.weightBased.upsert({
//     where: { configId: config.id },
//     update: { baseFee: data.baseFee },
//     create: { configId: config.id, baseFee: data.baseFee },
//   });
//   // Sync rates
//   await db.weightBasedRate.deleteMany({
//     where: { weightBasedId: weightBased.id },
//   });
//   if (data.rates.length) {
//     await db.weightBasedRate.createMany({
//       data: data.rates.map((r) => ({
//         ...r,
//         weightBasedId: weightBased.id,
//       })) as any,
//     });
//   }
// }

// export async function savePriceBasedConfig(
//   db: Db,
//   data: z.infer<typeof priceBasedFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "PRICE_BASED" },
//     update: { enabled: data.enabled },
//     create: { method: "PRICE_BASED", enabled: data.enabled },
//   });
//   const priceBased = await db.priceBased.upsert({
//     where: { configId: config.id },
//     update: {},
//     create: { configId: config.id },
//   });
//   await db.priceBasedRate.deleteMany({
//     where: { priceBasedId: priceBased.id },
//   });
//   if (data.rates.length) {
//     await db.priceBasedRate.createMany({
//       data: data.rates.map((r) => ({ ...r, priceBasedId: priceBased.id })),
//     });
//   }
// }

// export async function saveZoneBasedConfig(
//   db: Db,
//   data: z.infer<typeof zoneBasedFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "ZONE_BASED" },
//     update: { enabled: data.enabled },
//     create: { method: "ZONE_BASED", enabled: data.enabled },
//   });
//   const zoneBased = await db.zoneBased.upsert({
//     where: { configId: config.id },
//     update: {},
//     create: { configId: config.id },
//   });
//   await db.shippingZone.deleteMany({ where: { zoneBasedId: zoneBased.id } });
//   if (data.zones.length) {
//     await db.shippingZone.createMany({
//       data: data.zones.map((z) => ({ ...z, zoneBasedId: zoneBased.id })),
//     });
//   }
// }

// export async function savePerItemConfig(
//   db: Db,
//   data: z.infer<typeof perItemFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "PER_ITEM" },
//     update: { enabled: data.enabled },
//     create: { method: "PER_ITEM", enabled: data.enabled },
//   });
//   await db.perItem.upsert({
//     where: { configId: config.id },
//     update: { rate: data.rate },
//     create: { configId: config.id, rate: data.rate },
//   });
// }

// export async function saveDimensionalWeightConfig(
//   db: Db,
//   data: z.infer<typeof dimensionalWeightFormSchema>
// ) {
//   const config = await db.shippingConfiguration.upsert({
//     where: { method: "DIMENSIONAL_WEIGHT" },
//     update: { enabled: data.enabled },
//     create: { method: "DIMENSIONAL_WEIGHT", enabled: data.enabled },
//   });
//   await db.dimensionalWeight.upsert({
//     where: { configId: config.id },
//     update: { divisor: data.divisor, baseFee: data.baseFee },
//     create: {
//       configId: config.id,
//       divisor: data.divisor,
//       baseFee: data.baseFee,
//     },
//   });
// }

// // Shipping Calculation Logic
// interface CartItem {
//   quantity: number;
//   price: number;
//   weight: number; // in lbs
//   length: number; // in inches
//   width: number; // in inches
//   height: number; // in inches
// }

// interface ShippingAddress {
//   country: string;
//   state: string;
//   zipCode: string;
// }

// interface CalculationResult {
//   method: ShippingMethodType;
//   cost: number;
//   description: string;
// }

// export async function calculateShipping(
//   db: Db,
//   items: CartItem[],
//   address: ShippingAddress
// ): Promise<{ finalCost: number; breakdown: CalculationResult[] }> {
//   const configs = await getShippingCalculationConfig(db);
//   const breakdown: CalculationResult[] = [];

//   const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
//   const subtotal = items.reduce(
//     (sum, item) => sum + item.price * item.quantity,
//     0
//   );
//   const totalWeight = items.reduce(
//     (sum, item) => sum + item.weight * item.quantity,
//     0
//   );

//   // --- Calculate cost for each enabled method ---

//   if (configs.flatRate.enabled) {
//     breakdown.push({
//       method: ShippingMethodType.FLAT_RATE,
//       cost: configs.flatRate.rate,
//       description: `Flat Rate`,
//     });
//   }

//   if (configs.weightBased.enabled) {
//     const rate = configs.weightBased.rates.find(
//       (r) => totalWeight >= r.fromWeight && totalWeight <= r.toWeight
//     );
//     if (rate) {
//       const cost = configs.weightBased.baseFee + totalWeight * rate.ratePerUnit;
//       breakdown.push({
//         method: ShippingMethodType.WEIGHT_BASED,
//         cost,
//         description: `Weight-based: ${totalWeight}lbs @ $${rate.ratePerUnit}/unit + $${configs.weightBased.baseFee} base fee`,
//       });
//     }
//   }

//   if (configs.priceBased.enabled) {
//     const rate = configs.priceBased.rates.find(
//       (r) => subtotal >= r.fromPrice && subtotal <= r.toPrice
//     );
//     if (rate) {
//       breakdown.push({
//         method: ShippingMethodType.PRICE_BASED,
//         cost: rate.shippingFee,
//         description: `Price-based: Tier $${rate.fromPrice}-$${rate.toPrice}`,
//       });
//     }
//   }

//   if (configs.zoneBased.enabled) {
//     // A more robust implementation would check zip code ranges/patterns and state/country lists.
//     // This is a simplified example.
//     const zone = configs.zoneBased.zones.find(
//       (z) =>
//         z.countries?.split(",").includes(address.country) ||
//         z.states?.split(",").includes(address.state) ||
//         z.zipCodes?.split(",").includes(address.zipCode)
//     );
//     if (zone) {
//       breakdown.push({
//         method: ShippingMethodType.ZONE_BASED,
//         cost: zone.rate,
//         description: `Zone-based: ${zone.name}`,
//       });
//     }
//   }

//   if (configs.perItem.enabled) {
//     breakdown.push({
//       method: ShippingMethodType.PER_ITEM,
//       cost: totalItems * configs.perItem.rate,
//       description: `${totalItems} items @ $${configs.perItem.rate}/item`,
//     });
//   }

//   if (configs.dimensionalWeight.enabled) {
//     const totalDimWeight = items.reduce((sum, item) => {
//       const dimWeight =
//         (item.length * item.width * item.height) /
//         configs.dimensionalWeight.divisor;
//       return sum + Math.max(dimWeight, item.weight) * item.quantity;
//     }, 0);

//     breakdown.push({
//       method: ShippingMethodType.DIMENSIONAL_WEIGHT,
//       cost: configs.dimensionalWeight.baseFee + totalDimWeight, // This is a simplified calculation
//       description: `Dimensional Weight: ${totalDimWeight.toFixed(2)} lbs`,
//     });
//   }

//   // --- Determine Final Cost ---
//   // This is a simple example: sum all applicable costs.
//   // A real-world scenario might use the highest cost, or have more complex rules.
//   const finalCost = breakdown.reduce((sum, result) => sum + result.cost, 0);

//   return { finalCost, breakdown };
// }
