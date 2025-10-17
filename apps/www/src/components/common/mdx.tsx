// import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc";

const components = {
    h1: (props) => (
        <h1 {...props} className="">
            {props.children}
        </h1>
    ),
};
export default function MDX(
    props,
    // : MDXRemoteProps
) {
    return (
        <div className="">
            {/* <MDXRemote
                {...props}
                components={{
                    // ...components,
                    ...(props.components || {}),
                }}
            ></MDXRemote> */}
        </div>
    );
}
