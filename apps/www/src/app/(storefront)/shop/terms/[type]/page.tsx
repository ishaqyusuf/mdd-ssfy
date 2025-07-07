import { mdxComponents } from "@/app/(storefront-admin)/storefront-admin/blogs/mdx-components";
import { userId } from "@/app/(v1)/_actions/utils";
import MDX from "@/components/common/mdx";
import { Shell } from "@/components/shell";
import { prisma } from "@/db";
import { nextId } from "@/lib/nextId";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function TermsPage({ params }) {
    const term = await prisma.blogs.findUnique({
        where: {
            slug: params.type,
        },
    });
    if (!term) {
        await prisma.blogs.create({
            data: {
                // id: await nextId(prisma.blogs),
                authorId: 1,
                slug: params.type,
                title: params.type,
                content: ``,
                meta: {},
                type: "terms",
            },
        });
        revalidatePath("/terms/[type]");
        redirect(`/terms/${params.type}`);
    }
    return (
        <Shell className="mx-auto max-w-6xl py-10 prose prose-slate lg:prose-xl">
            <MDX source={term.content} components={mdxComponents.terms} />
        </Shell>
    );
}
