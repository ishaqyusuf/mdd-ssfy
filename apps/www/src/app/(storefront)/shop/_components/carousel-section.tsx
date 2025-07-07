"use client";

import * as React from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";

import { Card, CardContent } from "@gnd/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@gnd/ui/carousel";

import TotalityWork from "./totality-work";

export function CarouselSection() {
    const carousels = [
        {
            title: "Crafting Elegance, One Door at a Time",
            description:
                "Explore our dedication to precision and artistry in every custom door we create. From timeless classics to modern marvels, discover the perfect entryway that reflects your style and vision.",
            img: "https://images.unsplash.com/photo-1537301636683-5ac98e0466a2?q=80&w=1376&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
            title: "Transform Your Space with Bespoke Doors",
            description:
                "Elevate your home or business with our exquisite range of custom doors. Imbued with craftsmanship and attention to detail, each piece is designed to seamlessly blend form and function, leaving a lasting impression on all who enter.",
            img: "https://images.unsplash.com/photo-1628744876657-abd5086695dc?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
            title: "Unparalleled Quality, Unmatched Beauty",
            description:
                "Experience the difference of superior craftsmanship with our bespoke door solutions. Meticulously crafted using premium materials and innovative techniques, our doors stand as a testament to durability, sophistication, and lasting beauty.",
            img: "https://images.unsplash.com/photo-1599243272864-e9dd455966bd?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
            title: "Your Vision, Our Expertise: Custom Door Solutions",
            description:
                "Bring your design dreams to life with our tailored door creations. From intricate designs to unique finishes, our skilled artisans work hand-in-hand with you to craft doors that embody your distinct style and personality.",
            img: "https://images.unsplash.com/photo-1603673298820-40d77252226d?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
        {
            title: "Seamless Integration, Timeless Appeal",
            description:
                "Discover the perfect fusion of form and function with our custom door solutions. Whether it's for residential or commercial spaces, our doors effortlessly blend architectural elegance with practicality, creating inviting entrances that leave a lasting impression.",
            img: "https://images.unsplash.com/photo-1481277542470-605612bd2d61?q=80&w=1406&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        },
    ];

    return (
        <div className="relative">
            <Carousel
                opts={{
                    loop: true,
                }}
                plugins={[
                    Autoplay({
                        delay: 5000,
                    }),
                ]}
                className="w-full"
            >
                <CarouselContent className="">
                    {carousels.map((_, index) => (
                        <CarouselItem className="" key={index}>
                            <div className="relative h-[650px]">
                                <div className="absolute inset-0">
                                    <Image
                                        className="abolute inset-0"
                                        src={_.img}
                                        alt=""
                                        fill
                                        style={{
                                            objectFit: "cover",
                                        }}
                                        priority
                                    />
                                </div>
                                <div className="relative z-10 mb-6 flex h-full w-full items-end p-10 pb-16">
                                    <div className="w-[45%] space-y-4 bg-black/20 p-4 text-white">
                                        <div className="text-6xl  font-extrabold tracking-widest">
                                            {_.title}
                                        </div>
                                        <div className=" whitespace-pre-line text-lg">
                                            {_.description}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
            <TotalityWork />
        </div>
    );
}
