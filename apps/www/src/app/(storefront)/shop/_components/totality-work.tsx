"use client";

import { LucidePhone, LucideTimer } from "lucide-react";
import Image from "next/image";

export default function TotalityWork() {
    const list = [
        {
            title: "Ontime Deadline",
            description:
                "We guarantee on-time delivery, keeping your project on track and ensuring your deadlines are met.",
            Icon: LucideTimer,
        },
        {
            title: "Fulltime Support",
            description:
                "We offer continuous support around the clock,  ensuring assistance whenever you need it.",
            Icon: LucidePhone,
        },
    ];
    return (
        <div className="absolute font-sans bg-white z-10 bottom-0 right-0 mx-8 w-[45%] grid grid-cols-2 gap-4">
            <div className="p-4 pt-8 space-y-4 col-span-1 overflow-hidden">
                <p className="text-2xl  font-bold tracking-wide">
                    Totality in work
                </p>
                <div className="h-full rounded overflow-hidden shadow-sm w-full relative">
                    <Image
                        className=""
                        src={
                            "https://gndmillwork.com/wp-content/uploads/2020/09/images-5Panel-Rockport-300x300.jpg"
                        }
                        alt=""
                        fill
                        style={{
                            objectFit: "cover",
                        }}
                        priority
                    />
                </div>
            </div>
            <div className="bg-accent space-y-4 p-4 py-8  col-span-1">
                {list.map((item, i) => (
                    <div key={i} className="flex space-x-4">
                        <div>
                            <item.Icon className="w-10 h-10" />
                        </div>

                        <div className="space-y-4">
                            <p className="text-2xl mb-2">{item.title}</p>
                            <p className="text-muted-foreground tracking-wide">
                                {item.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
