import type { NavItem } from "@/types/nav";

interface SiteConfig {
	name: string;
	description: string;
	url: string;
	ogImage: string;
	mainNav: NavItem[];
}

export const siteConfig: SiteConfig = {
	name: "GND Millwork",
	description:
		"Configure and order doors, mouldings, and shelf items using GND Millwork's trusted sales and inventory system.",
	url: "https://gndmillwork.com",
	ogImage: "https://gndmillwork.com/og.jpg",
	mainNav: [
		{
			title: "Shop",
			items: [
				{
					title: "Interior Doors",
					href: "/categories/interior-doors",
					description: "Explore our collection of high-quality interior doors.",
					items: [],
				},
				{
					title: "Mouldings",
					href: "/categories/mouldings",
					description: "Browse mouldings configured through our sales catalog.",
					items: [],
				},
				{
					title: "Shelf Items",
					href: "/categories/shelf-items",
					description: "Browse shelf items available from our shared catalog.",
					items: [],
				},
			],
		},
		{
			title: "Contact Us",
			href: "/contact",
		},
	],
};
