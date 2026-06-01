import { cookies } from "next/headers";

import {
    TABLE_SETTINGS_COOKIE,
    type AllTableSettings,
    type TableId,
    type TableSettings,
    mergeWithDefaults,
} from "@/utils/table-settings";

export async function getInitialTableSettings(
    tableId: TableId,
): Promise<TableSettings> {
    const cookieStore = await cookies();
    const value = cookieStore.get(TABLE_SETTINGS_COOKIE)?.value;

    if (!value) return mergeWithDefaults(undefined, tableId);

    try {
        const settings = JSON.parse(value) as AllTableSettings;
        return mergeWithDefaults(settings[tableId], tableId);
    } catch {
        return mergeWithDefaults(undefined, tableId);
    }
}
