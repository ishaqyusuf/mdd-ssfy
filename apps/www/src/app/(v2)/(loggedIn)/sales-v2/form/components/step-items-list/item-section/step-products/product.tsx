import Image from "next/image";
import Img from "@/components/(clean-code)/img";
import { PlaceholderImage } from "@/components/placeholder-image";
import { env } from "@/env.mjs";
import { motion } from "framer-motion";
import SVG from "react-inlinesvg";

import { AspectRatio } from "@gnd/ui/aspect-ratio";

interface ProductImageProps {
    item?;
    aspectRatio?;
}
export function ProductImage({ item, aspectRatio = 4 / 2 }: ProductImageProps) {
    const src = item.product?.img || item?.product?.meta?.cld;
    const svg = (item.product?.meta as any)?.svg;
    const url = item.product?.meta?.url;
    return (
        <Img
            src={src}
            aspectRatio={
                src || url ? (item.isDoor ? 4 / 4 : aspectRatio) : aspectRatio
            }
            alt={item.product?.title}
            svg={svg}
        />
    );
    return (
        <motion.div
            className="relative flex h-full flex-1 flex-col items-center justify-center space-y-2 "
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            {item.product?.img || item?.product?.meta?.cld ? (
                <AspectRatio ratio={item.isDoor ? 4 / 4 : aspectRatio}>
                    <Image
                        src={`${env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/dyke/${
                            item.product?.img || item?.product?.meta?.cld
                        }`}
                        alt={item.product?.title}
                        className="object-contain"
                        // sizes="(min-width: 1024px) 10vw"
                        fill
                        loading="lazy"
                    />
                </AspectRatio>
            ) : (item.product?.meta as any)?.svg ? (
                <AspectRatio ratio={1}>
                    <SVG className="" src={item.product?.meta?.svg} />
                </AspectRatio>
            ) : item.product?.meta?.url ? (
                <AspectRatio ratio={item.isDoor ? 4 / 4 : aspectRatio}>
                    <div className="absolute inset-0 bg-red-400 bg-opacity-0"></div>
                    <object
                        data={item.product?.meta?.url}
                        type={"image/svg+xml"}
                        className=""
                        id="img"
                    />
                </AspectRatio>
            ) : (
                <PlaceholderImage className="rounded-none" asChild />
            )}
        </motion.div>
    );
}
