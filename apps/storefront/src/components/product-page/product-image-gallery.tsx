import Image from "next/image";

interface ProductImageGalleryProps {
  imageUrl: string;
  name: string;
}

export function ProductImageGallery({ imageUrl, name }: ProductImageGalleryProps) {
  return (
    <div className="relative h-96 w-full">
      <Image
        src={imageUrl}
        alt={name}
        layout="fill"
        objectFit="contain"
        className="rounded-lg"
      />
    </div>
  );
}
