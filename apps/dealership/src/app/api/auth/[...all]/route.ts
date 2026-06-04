import { registerDealerAuthEmailNotifications } from "@/lib/auth-email-notifications";
import { registerDealerMasterPasswordLoginAlert } from "@/lib/master-password-login-alert";
import { registerDealerNewDeviceLoginAlert } from "@/lib/new-device-login-alert";
import { dealerAuth } from "@gnd/auth/better-auth/dealership";
import { toNextJsHandler } from "better-auth/next-js";

registerDealerAuthEmailNotifications();
registerDealerNewDeviceLoginAlert();
registerDealerMasterPasswordLoginAlert();

export const { GET, POST } = toNextJsHandler(dealerAuth);
