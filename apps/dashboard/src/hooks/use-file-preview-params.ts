import { parseAsStringEnum, useQueryStates } from "nuqs";
import { parseAsString, parseAsStringLiteral } from "nuqs/server";

export function useFilePreviewParams() {
    const [params, setParams] = useQueryStates({
        documentId: parseAsString,
        filePath: parseAsString,
        mimeType: parseAsStringEnum(["application/pdf"]),
        view: parseAsStringLiteral(["grid", "list"]).withDefault("grid"),
    });

    return {
        params,
        setParams,
        apiPath: `/api/download/${params.filePath}`,
    };
}

