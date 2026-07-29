"use server";

import {
	CONTRACTOR_ACCOUNTING_PDF_AUDIENCE,
	tokenize,
} from "@gnd/utils/tokenizer";

export async function generateToken(data) {
	if (data?.audience === CONTRACTOR_ACCOUNTING_PDF_AUDIENCE) {
		throw new Error(
			"Contractor accounting tokens require the protected finance endpoint.",
		);
	}
	return tokenize(data);
}
