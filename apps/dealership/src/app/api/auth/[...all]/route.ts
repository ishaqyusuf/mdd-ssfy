import { registerDealerAuthEmailNotifications } from "@/lib/auth-email-notifications";
import { registerDealerNewDeviceLoginAlert } from "@/lib/new-device-login-alert";
import { dealerAuth } from "@gnd/auth/better-auth/dealership";
import { toNextJsHandler } from "better-auth/next-js";

registerDealerAuthEmailNotifications();
registerDealerNewDeviceLoginAlert();

export const { GET, POST } = toNextJsHandler(dealerAuth);
