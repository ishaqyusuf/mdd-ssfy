import MDX from "@/components/common/mdx";
import getBlogAction from "../../_actions/get-blog-action";
import BlogForm from "./blog-form";
import { realtimeMdx } from "../../_actions/real-time-mdx";
import { mdxComponents } from "../../mdx-components";

export default async function EditBlog(props) {
    const params = await props.params;
    const searchParams = await props.searchParams;
    const [type, slug] = params.slug;
    // if (slug) redirect(`/blogs`);
    let renderSlug = slug || searchParams?.slug;
    const blog = await getBlogAction(slug);
    const content = await realtimeMdx(type, renderSlug, blog.content);
    // console.log(mdxComponents[type]);
    // console.log({ type });

    return (
        <div className="grid grid-cols-2">
            <BlogForm
                renderSlug={renderSlug}
                type={type}
                slug={slug}
                data={blog}
            />
            <div className="max-h-[90vh] prose lg:prose-xl overflow-auto p-4">
                <MDX source={content} components={mdxComponents[type]} />
            </div>
        </div>
    );
}
