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
    "High-quality interior doors, moldings, and hardware for every design.",
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
          title: "Moldings",
          href: "/categories/moldings",
          description: "A variety of moldings to match your style.",
          items: [],
        },
        {
          title: "Hardware",
          href: "/categories/hardware",
          description: "Door handles, knobs, and levers for every door.",
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