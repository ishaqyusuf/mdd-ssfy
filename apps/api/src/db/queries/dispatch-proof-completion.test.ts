import { describe, expect, test } from "bun:test";
import {
	buildDispatchSignatureSvg,
	canResignPackingSlip,
	completeDispatchWithProofSchema,
	createDispatchCompletionProof,
	decodePngSignatureDataUrl,
	getDispatchCompletionPayloadFingerprint,
	getDispatchCompletionProof,
	getDispatchProofFilename,
	isDispatchCompletionProofStale,
	mergeDispatchCompletionProof,
} from "./dispatch-proof-completion";

describe("dispatch proof completion", () => {
	test("keeps one resumable proof stage for the same request", () => {
		const payloadFingerprint = "fingerprint-request-1";
		const started = createDispatchCompletionProof(
			{ source: "mobile" },
			"dispatch:42:request-1",
			new Date("2026-07-23T10:00:00.000Z"),
			payloadFingerprint,
		);
		started.signaturePathname = "dispatch/42/proof/signature.svg";
		started.attachments.push({
			clientId: "photo-1.jpg",
			pathname: "dispatch/42/proof/photo-1.jpg",
		});

		const meta = mergeDispatchCompletionProof({ source: "mobile" }, started);
		const resumed = createDispatchCompletionProof(
			meta,
			"dispatch:42:request-1",
			new Date("2026-07-23T11:00:00.000Z"),
			payloadFingerprint,
		);

		expect(resumed).toEqual(started);
		expect(getDispatchCompletionProof(meta)).toEqual(started);
	});

	test("a new request supersedes an unfinished stage without reusing proof", () => {
		const previous = createDispatchCompletionProof({}, "dispatch:42:request-1");
		previous.signaturePathname = "old-signature.svg";
		const next = createDispatchCompletionProof(
			mergeDispatchCompletionProof({}, previous),
			"dispatch:42:request-2",
		);

		expect(next.requestId).toBe("dispatch:42:request-2");
		expect(next.signaturePathname).toBeUndefined();
		expect(next.attachments).toEqual([]);
	});

	test("expires an abandoned proof lease without treating active work as stale", () => {
		const completion = createDispatchCompletionProof(
			{},
			"dispatch:42:request-1",
			new Date("2026-07-23T10:00:00.000Z"),
		);

		expect(
			isDispatchCompletionProofStale(
				completion,
				new Date("2026-07-23T10:14:59.999Z"),
			),
		).toBe(false);
		expect(
			isDispatchCompletionProofStale(
				completion,
				new Date("2026-07-23T10:15:00.000Z"),
			),
		).toBe(true);
	});

	test("preserves the five-minute completed packing re-sign window", () => {
		const deliveredAt = new Date("2026-07-23T10:00:00.000Z");

		expect(
			canResignPackingSlip(
				{ status: "completed", deliveredAt },
				new Date("2026-07-23T10:05:00.000Z"),
			),
		).toBe(true);
		expect(
			canResignPackingSlip(
				{ status: "completed", deliveredAt },
				new Date("2026-07-23T10:05:00.001Z"),
			),
		).toBe(false);
		expect(
			canResignPackingSlip(
				{
					status: "completed",
					deliveredAt: new Date("2026-07-23T10:10:00.000Z"),
				},
				new Date("2026-07-23T10:00:00.000Z"),
			),
		).toBe(false);
	});

	test("validates bounded image proof and a safe signature path", () => {
		const parsed = completeDispatchWithProofSchema.parse({
			dispatchId: 42,
			requestId: "dispatch:42:request-1",
			signaturePath: "M 1.0 2.0 L 3.0 4.0",
			attachments: [
				{
					clientId: "photo-1.jpg",
					fileName: "photo.jpg",
					contentType: "image/jpeg",
					base64: "cHJvb2Y=",
				},
			],
		});

		expect(parsed.attachments).toHaveLength(1);
		expect(() =>
			completeDispatchWithProofSchema.parse({
				dispatchId: 42,
				requestId: "dispatch:42:request-1",
				signaturePath: 'M 1 2"/><script>',
			}),
		).toThrow();
		expect(() =>
			completeDispatchWithProofSchema.parse({
				dispatchId: 42,
				requestId: "dispatch:42:request-1",
				signaturePath: "M 1 2 L 3 4",
				attachments: [
					{
						clientId: "photo-1",
						fileName: "one.jpg",
						contentType: "image/jpeg",
						base64: "cHJvb2Y=",
					},
					{
						clientId: "photo-1",
						fileName: "two.jpg",
						contentType: "image/jpeg",
						base64: "cHJvb2Yy",
					},
				],
			}),
		).toThrow("client ids must be unique");
		expect(() =>
			completeDispatchWithProofSchema.parse({
				dispatchId: 42,
				requestId: "dispatch:42:request-1",
				signaturePath: "M 1 2 L 3 4",
				attachments: [
					{
						clientId: "photo.svg",
						fileName: "photo.svg",
						contentType: "image/svg+xml",
						base64: "PHN2Zz4=",
					},
				],
			}),
		).toThrow();
	});

	test("uses deterministic proof filenames and server-built SVG", () => {
		expect(
			getDispatchProofFilename(
				"dispatch:42:request-1",
				"attachment",
				"photo-1.jpg",
			),
		).toBe("dispatch-42-request-1-photo-1.jpg");
		expect(getDispatchProofFilename("dispatch:42:request-1", "signature")).toBe(
			"dispatch-42-request-1-signature.svg",
		);
		expect(buildDispatchSignatureSvg("M 1 2 L 3 4")).toContain(
			'd="M 1 2 L 3 4"',
		);
	});

	test("decodes only bounded PNG signature data URLs", () => {
		const pngBuffer = Buffer.concat([
			Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
			Buffer.from("signature"),
		]);
		const png = pngBuffer.toString("base64");
		expect(decodePngSignatureDataUrl(`data:image/png;base64,${png}`)).toEqual(
			pngBuffer,
		);
		expect(() =>
			decodePngSignatureDataUrl(`data:image/jpeg;base64,${png}`),
		).toThrow("PNG");
	});

	test("round-trips canonical document ids in resumable proof metadata", () => {
		const completion = createDispatchCompletionProof(
			{},
			"dispatch:42:request-docs",
		);
		completion.signaturePathname = "https://blob/signature.svg";
		completion.signatureDocumentId = "doc-signature";
		completion.attachments.push({
			clientId: "photo-1",
			pathname: "https://blob/photo.jpg",
			documentId: "doc-photo",
		});

		expect(
			getDispatchCompletionProof(mergeDispatchCompletionProof({}, completion)),
		).toEqual(completion);
	});

	test("binds one request id to byte-equivalent proof content", () => {
		const first = {
			signaturePath: "M 1 2 L 3 4",
			attachments: [
				{
					clientId: "photo-1",
					fileName: "photo.jpg",
					contentType: "image/jpeg" as const,
					base64: "cHJvb2Y=",
				},
			],
		};
		const fingerprint = getDispatchCompletionPayloadFingerprint(first);
		const completion = createDispatchCompletionProof(
			{},
			"dispatch:42:fingerprint",
			new Date(),
			fingerprint,
		);

		expect(
			createDispatchCompletionProof(
				mergeDispatchCompletionProof({}, completion),
				"dispatch:42:fingerprint",
				new Date(),
				getDispatchCompletionPayloadFingerprint(first),
			),
		).toEqual(completion);
		expect(() =>
			createDispatchCompletionProof(
				mergeDispatchCompletionProof({}, completion),
				"dispatch:42:fingerprint",
				new Date(),
				getDispatchCompletionPayloadFingerprint({
					...first,
					signaturePath: "M 9 9 L 10 10",
				}),
			),
		).toThrow("different proof content");
	});

	test("rejects unverifiable legacy checkpoints for the same request", () => {
		const legacy = createDispatchCompletionProof(
			{},
			"dispatch:42:legacy-request",
		);
		legacy.signaturePathname = "dispatch/42/legacy-signature.svg";

		expect(() =>
			createDispatchCompletionProof(
				mergeDispatchCompletionProof({}, legacy),
				"dispatch:42:legacy-request",
				new Date(),
				"new-fingerprint",
			),
		).toThrow("predate content fingerprinting");
	});
});
