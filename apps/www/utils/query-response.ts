import { PageDataMeta } from "@/types/type";

export async function queryResponse<T>(data: T, query?) {
    return {
        data,
        meta: {} as PageDataMeta,
    };
}
