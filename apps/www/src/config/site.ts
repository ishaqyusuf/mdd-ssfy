import type { FooterItem, MainNavItem } from "@/types";

export type SiteConfig = typeof siteConfig;

const links = {
    twitter: "https://twitter.com/sadmann17",
    github: "https://github.com/sadmann7/skateshop",
    githubAccount: "https://github.com/sadmann7",
    discord: "https://discord.com/users/sadmann7",
    calDotCom: "https://cal.com/sadmann7",
};

export const siteConfig = {
    name: "GND Millwork",
    description: "© 2010-2024 GND Millwork Corp. All Rights Reserved",
    url: "https://skateshop.sadmn.com",
    ogImage: "https://skateshop.sadmn.com/opengraph-image.png",
    links,
    mainNav: [
        {
            title: "Lobby",
            items: [
                {
                    title: "Products",
                    href: "/products",
                    description: "All the products we have to offer.",
                    items: [],
                },
                {
                    title: "Build a Board",
                    href: "/build-a-board",
                    description: "Build your own custom skateboard.",
                    items: [],
                },
                {
                    title: "Blog",
                    href: "/blog",
                    description: "Read our latest blog posts.",
                    items: [],
                },
            ],
        },
        {
            title: "Shipping & Delivery",
            href: "/shipping",
        },
        {
            title: "Shopping",
            href: "/shopping",
        },
        {
            title: "Blog",
            href: "/blog",
        },
        {
            title: "Contact Us",
            href: "/contact-us",
        },
        // ...productCategories.map((category) => ({
        //     title: category.title,
        //     items: [
        //         {
        //             title: "All",
        //             href: `/categories/${slugify(category.title)}`,
        //             description: `All ${category.title}.`,
        //             items: [],
        //         },
        //         ...category.subcategories.map((subcategory) => ({
        //             title: subcategory.title,
        //             href: `/categories/${slugify(category.title)}/${
        //                 subcategory.slug
        //             }`,
        //             description: subcategory.description,
        //             items: [],
        //         })),
        //     ],
        // })),
    ] satisfies MainNavItem[],
    footerNav: [
        {
            title: "Quick Links",
            items: [
                {
                    title: "Home",
                    href: "https://onestopshop.jackblatch.com",
                },
                {
                    title: "About us",
                    href: "https://gnd-corp.jumr.dev",
                },
                {
                    title: "Contact",
                    href: "https://craft.mxkaske.dev",
                },
                {
                    title: "Blog",
                    href: "https://tx.shadcn.com/",
                },
            ],
        },

        {
            title: "Customer Service",
            items: [
                {
                    title: "My Account",
                    href: links.twitter,
                },
                {
                    title: "Terms of service",
                    href: "/terms/tos",
                },
                {
                    title: "Privacy Policy",
                    href: "/terms/privacy",
                },
                {
                    title: "Return Policy",
                    href: "/terms/return",
                },
            ],
        },
    ] satisfies FooterItem[],
};
