import "server-only";

import {
    setWebMasterPasswordLoginAlertHandler,
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

setWebMasterPasswordLoginAlertHandler((input) => {
    void tasks.trigger("notification", {
        channel: "auth_master_password_login_alert",
        author: {
            id: input.userId,
            role: "employee",
        },
        recipients: null,
        testEmailMode: true,
        payload: {
            accountName: input.accountName,
            accountEmail: input.accountEmail,
            appSurface: input.appSurface,
            loginAt: input.loginAt,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            sessionId: input.sessionId,
            actorLabel: "Master password",
            supportEmail: "support@gndprodesk.com",
        },
    });
});

export { webAuth };
