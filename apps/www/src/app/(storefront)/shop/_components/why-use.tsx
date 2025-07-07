"use client";
import { Icons } from "@/components/_v1/icons";
import { LucideBadgeHelp, LucideBarChartBig, LucideShield } from "lucide-react";

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/iIGOU39ngNE
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
export default function WhyUsSection() {
    const list = [
        {
            title: "Exceptional Quality",
            note: "Our doors are crafted using the finest materials and techniques, ensuring durability and longevity",
            Icon: LucideShield,
        },
        {
            title: "Tailored Solutions",
            note: "We work closely with you to understand your vision and create custom doors that exceed your expectations.",
            Icon: LucideBarChartBig,
        },
        {
            title: "Timely Delivery",
            note: "With our commitment to on-time deadlines, you can trust us to deliver your project with precision and punctuality.",
            Icon: Icons.time,
        },
        {
            title: "Dedicated Support",
            note: "Our team is here to provide full-time support, guiding you through every step of the process and addressing any questions or concerns you may have.",
            Icon: LucideBadgeHelp,
        },
    ];
    return (
        <section className="w-full min-h-screen flex flex-col justify-center bg-gray-100 dark:bg-gray-800">
            <div className="container px-4 md:px-6">
                <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-5xl sm:mb-16">
                    Why GND Millwork?
                </h2>
                <div className="grid gap-6 py-12 md:grid-cols-2 lg:grid-cols-4">
                    {list.map((item, i) => (
                        <div
                            key={i}
                            className="flex flex-col items-center space-y-4"
                        >
                            <item.Icon className="h-12 w-12" />
                            <h3 className="text-xl font-bold">{item.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {item.note}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
