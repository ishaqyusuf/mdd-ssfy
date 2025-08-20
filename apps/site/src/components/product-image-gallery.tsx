"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@gnd/ui/button";
import { useProduct } from "@/hooks/use-product";
import { AspectRatio } from "@gnd/ui/aspect-ratio";
import Image from "next/image";

interface ProductImageGalleryProps {}

export function ProductImageGallery({}: ProductImageGalleryProps) {
  const ctx = useProduct();
  const images = [
    ...ctx.product.images,
    ...ctx.product.images,
    ...ctx.product.images,
  ];
  const [currentImage, setCurrentImage] = useState(0);
  const productName = ctx.product.name;
  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <AspectRatio ratio={4 / 3}>
          <Image
            role="group"
            aria-roledescription="slide"
            src={images[currentImage]?.url || "/placeholder.svg"}
            alt={`${productName} - Image ${currentImage + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
          />
        </AspectRatio>
        {/* <img
          src={images[currentImage]?.url || "/placeholder.svg"}
          alt={`${productName} - Image ${currentImage + 1}`}
          className="w-full h-full object-cover"
        /> */}
        {images.length > 1 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={prevImage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
              onClick={nextImage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Thumbnail Images */}
      {images.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 ${
                currentImage === index ? "border-amber-600" : "border-gray-200"
              }`}
            >
              <AspectRatio ratio={5 / 6}>
                <Image
                  src={image.url}
                  fill
                  alt={`${productName} thumbnail ${index + 1}`}
                  className=" object-cover"
                />
              </AspectRatio>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
