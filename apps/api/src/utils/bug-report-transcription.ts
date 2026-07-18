export type BugReportTranscriptionConfig = {
	apiKey: string;
	endpoint: string;
	model: string;
	provider: "groq";
};

export type BugReportAudioDocumentInput = {
	url: string;
	filename?: string | null;
	mimeType?: string | null;
};

export type BugReportTranscriptionResult = {
	text: string;
	provider: BugReportTranscriptionConfig["provider"];
	model: string;
};

type FetchLike = typeof fetch;

type TranscriptionEnv = {
	[key: string]: string | undefined;
	GROQ_API_KEY?: string;
	GROQ_WHISPER_MODEL?: string;
	GROQ_AUDIO_TRANSCRIPTIONS_URL?: string;
};

export function getBugReportTranscriptionConfig(
	env: TranscriptionEnv = process.env,
): BugReportTranscriptionConfig | null {
	const apiKey = env.GROQ_API_KEY?.trim();
	if (!apiKey) return null;

	return {
		apiKey,
		endpoint:
			env.GROQ_AUDIO_TRANSCRIPTIONS_URL?.trim() ||
			"https://api.groq.com/openai/v1/audio/transcriptions",
		model: env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3-turbo",
		provider: "groq",
	};
}

export function isBugReportTranscriptionConfigured(
	env: TranscriptionEnv = process.env,
) {
	return Boolean(getBugReportTranscriptionConfig(env));
}

export async function transcribeBugReportAudioDocument(
	document: BugReportAudioDocumentInput,
	options?: {
		config?: BugReportTranscriptionConfig | null;
		fetcher?: FetchLike;
	},
): Promise<BugReportTranscriptionResult> {
	const config = options?.config ?? getBugReportTranscriptionConfig();
	if (!config) {
		throw new Error("Bug report transcription is not configured.");
	}

	const fetcher = options?.fetcher ?? fetch;
	const audioResponse = await fetcher(document.url);
	if (!audioResponse.ok) {
		throw new Error("Unable to download bug report voice note.");
	}

	const mimeType =
		document.mimeType ||
		audioResponse.headers.get("content-type") ||
		"audio/webm";
	const audio = new Blob([await audioResponse.arrayBuffer()], {
		type: mimeType,
	});
	const formData = new FormData();
	formData.append("file", audio, document.filename || "bug-report-voice.webm");
	formData.append("model", config.model);
	formData.append("response_format", "json");
	formData.append("temperature", "0");

	const response = await fetcher(config.endpoint, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${config.apiKey}`,
		},
		body: formData,
	});
	const payload = (await response.json().catch(() => null)) as {
		text?: string;
		error?: {
			message?: string;
		};
	} | null;

	if (!response.ok) {
		throw new Error(
			payload?.error?.message || "Bug report voice transcription failed.",
		);
	}

	const text = payload?.text?.trim();
	if (!text) {
		throw new Error("Bug report voice transcription returned no text.");
	}

	return {
		text,
		provider: config.provider,
		model: config.model,
	};
}

export function mergeBugReportTranscriptionMeta(
	meta: unknown,
	patch: Record<string, unknown>,
) {
	return {
		...(meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}),
		...patch,
	};
}

export function buildBugReportEvidenceCaption(
	existingDescription: string | null | undefined,
	transcriptionText: string,
) {
	const description = existingDescription?.trim();
	const transcript = transcriptionText.trim();
	if (!description) return transcript;
	if (!transcript || description.includes(transcript)) return description;

	return `${description}\n\nVoice transcript:\n${transcript}`;
}
