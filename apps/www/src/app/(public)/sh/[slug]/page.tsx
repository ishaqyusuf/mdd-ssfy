import { prisma } from "@/db";
import { resolveShortLinkTargetAndRecordClick } from "@gnd/db/queries";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page(props: {
	params: Promise<{
		slug: string;
	}>;
}) {
	const { slug } = await props.params;
	const targetUrl = await resolveShortLinkTargetAndRecordClick(prisma, slug);

	if (!targetUrl) {
		notFound();
	}

	redirect(targetUrl);
}
