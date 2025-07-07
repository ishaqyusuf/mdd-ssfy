import { Metadata } from "next";
import { CarouselSection } from "./_components/carousel-section";
import WhyUsSection from "./_components/why-use";

export const metadata: Metadata = {
    title: "GND Millwork - shop",
};
export default function shopPage({}) {
    return (
        <div>
            <CarouselSection />
            <WhyUsSection />
        </div>
    );
}
