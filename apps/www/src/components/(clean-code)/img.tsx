import { motion } from "framer-motion";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import Image from "next/image";
import { env } from "@/env.mjs";
import { PlaceholderImage } from "../placeholder-image";
import SVG from "react-inlinesvg";
interface Props {
    src?: string;
    aspectRatio?;
    svg?;
    url?: string;
    alt?: string;
}
export default function Img({ aspectRatio, src, svg, alt, url }: Props) {
    const Wrapper = ({ children }) => (
        <motion.div
            className="flex flex-1 h-full flex-col items-center space-y-2 justify-center relative "
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {children}
        </motion.div>
    );
    return (
        <Wrapper>
            <AspectRatio ratio={aspectRatio}>
                {src ? (
                    <Image
                        src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${src}`}
                        alt={alt}
                        className="object-contain"
                        // sizes="(min-width: 1024px) 10vw"
                        fill
                        loading="lazy"
                    />
                ) : svg ? (
                    <SVG className="" src={svg} />
                ) : url ? (
                    <>
                        <div className="absolute inset-0 bg-red-400 bg-opacity-0"></div>
                        <object
                            data={url}
                            type={"image/svg+xml"}
                            className=""
                            id="img"
                        />
                    </>
                ) : (
                    <PlaceholderImage className="rounded-none" asChild />
                )}
            </AspectRatio>
        </Wrapper>
    );
}
