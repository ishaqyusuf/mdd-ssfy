import { registerDealerNewDeviceLoginAlert } from "@/lib/new-device-login-alert";
import { dealerAuth } from "@gnd/auth/better-auth/dealership";
import { toNextJsHandler } from "better-auth/next-js";

registerDealerNewDeviceLoginAlert();

export const { GET, POST } = toNextJsHandler(dealerAuth);
