import { createTRPCRouter, publicProcedure } from "../init";
import { getSquareDevices, squareClient } from "@gnd/square";
import { z } from "zod";

export const squareTestRouter = createTRPCRouter({
  test: publicProcedure
    .input(
      z.object({
        deviceId: z.string(),
      })
    )
    .mutation(async (props) => {
      const amount = BigInt(1000);
      // const resp = await client.terminalApi.createTerminalCheckout({
      // const resp = await client.terminalApi.createTerminalCheckout({
      const { checkout, errors } = await squareClient.terminal.checkouts.create(
        {
          idempotencyKey: new Date().toISOString(),
          checkout: {
            amountMoney: {
              amount,
              currency: "USD",
            },
            // note: squareSalesNote(props.orderIds),
            deviceOptions: {
              deviceId: props.input.deviceId,
            },
          },
        }
      );
      return {
        errors,
        checkout,
      };
    }),
});
