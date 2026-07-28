"use server";

import { tokenize } from "@gnd/utils/tokenizer";

export async function generateToken(data) {
    return tokenize(data);
}

