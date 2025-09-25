import Image from "next/image";
import { PlaceholderImage } from "@/components/placeholder-image";
import { env } from "@/env.mjs";
import { motion } from "framer-motion";
import SVG from "react-inlinesvg";

import { AspectRatio } from "@gnd/ui/aspect-ratio";

interface Props {
    src?: string;
    aspectRatio?;
    svg?;
    url?: string;
    alt?: string;
    noHover?: boolean;
}
export function ComponentImg({
    aspectRatio,
    noHover,
    src,
    svg,
    alt = "no-alt",
    url,
}: Props) {
    const Wrapper = ({ children }) => (
        <motion.div
            className="relative flex h-full flex-1 flex-col items-center justify-center space-y-2 "
            whileHover={noHover ? undefined : { scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {children}
        </motion.div>
    );
    return (
        <Wrapper>
            {/* <AspectRatio ratio={aspectRatio}> */}
            {src ? (
                <div className="m-4 flex flex-col">
                    <div>
                        <Image
                            draggable={false}
                            src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${src}`}
                            alt={alt}
                            // object-cover
                            className="object-scale-down size-full"
                            // sizes="(min-width: 1024px) 10vw"
                            fill
                            loading="lazy"
                        />
                    </div>
                </div>
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
            {/* </AspectRatio> */}
        </Wrapper>
    );
}
