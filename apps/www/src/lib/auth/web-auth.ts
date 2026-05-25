import "server-only";

import {
    setWebNewDeviceLoginAlertHandler,
    webAuth,
} from "@gnd/auth/better-auth/www";
import { tasks } from "@trigger.dev/sdk/v3";

setWebNewDeviceLoginAlertHandler((input) => {
    void tasks.trigger("notification", {
        channel: "auth_new_device_login",
        author: {
            id: input.userId,
            role: "employee",
        },
        recipients: null,
        payload: {
            accountName: input.accountName,
            accountEmail: input.accountEmail,
            appSurface: input.appSurface,
            deviceLabel: input.deviceLabel,
            deviceKey: input.deviceKey,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            loginAt: input.loginAt,
            supportEmail: "support@gndprodesk.com",
        },
    });
});

export { webAuth };
