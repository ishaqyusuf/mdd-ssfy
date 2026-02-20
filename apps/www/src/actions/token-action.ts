"use server";

import {
    tokenize,
    TokenSchemaNames,
    tokenSchemas,
    validateToken,
} from "@gnd/utils/tokenizer";

export async function generateToken(data) {
    return tokenize(data);
}

export async function validateTokenAction(tok, schemaName: TokenSchemaNames) {
    return validateToken(tok, tokenSchemas[schemaName as any]);
}

