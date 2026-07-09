import { getServerAuthSession } from "@/lib/auth/session";
import {
    BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
} from "@api/schemas/bug-reports";
import {
    handleUpload,
    type HandleUploadBody,
} from "@vercel/blob/client";

const BUG_REPORT_UPLOAD_PREFIX = "bug-reports/";
const BUG_REPORT_UPLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;
const BUG_REPORT_ALLOWED_CONTENT_TYPES = [
    "video/*",
    "application/octet-stream",
];

function cleanBlobPathname(value: string) {
    return value.replace(/^\/+/, "");
}

function getBlobToken() {
    return process.env.BLOB_READ_WRITE_TOKEN || "";
}

function getErrorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Unable to authorize bug report upload.";
}

export async function POST(request: Request) {
    const body = (await request.json()) as HandleUploadBody;
    const token = getBlobToken();

    if (!token) {
        return Response.json(
            { error: "Vercel Blob upload token is not configured." },
            { status: 500 },
        );
    }

    let actor:
        | {
              userId: number;
          }
        | null = null;

    if (body.type === "blob.generate-client-token") {
        const session = await getServerAuthSession(new Headers(request.headers));

        if (!session?.user?.id) {
            return Response.json(
                { error: "You must be signed in." },
                { status: 401 },
            );
        }

        if (!session.can?.submitBugReport) {
            return Response.json(
                { error: "Bug reporting is not enabled for your account." },
                { status: 403 },
            );
        }

        actor = {
            userId: session.user.id,
        };
    }

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            token,
            async onBeforeGenerateToken(pathname) {
                if (!actor) {
                    throw new Error("Bug report upload is not authorized.");
                }

                const cleanPathname = cleanBlobPathname(pathname);
                const userPrefix = `${BUG_REPORT_UPLOAD_PREFIX}${actor.userId}/`;

                if (!cleanPathname.startsWith(userPrefix)) {
                    throw new Error("Bug report upload path is invalid.");
                }

                return {
                    allowedContentTypes: BUG_REPORT_ALLOWED_CONTENT_TYPES,
                    maximumSizeInBytes: BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
                    validUntil: Date.now() + BUG_REPORT_UPLOAD_TOKEN_TTL_MS,
                    addRandomSuffix: false,
                    allowOverwrite: false,
                    tokenPayload: JSON.stringify({
                        userId: actor.userId,
                        pathname: cleanPathname,
                    }),
                };
            },
            async onUploadCompleted() {
                // Report creation happens through bugReports.create after upload.
            },
        });

        return Response.json(jsonResponse);
    } catch (error) {
        return Response.json({ error: getErrorMessage(error) }, { status: 400 });
    }
}
