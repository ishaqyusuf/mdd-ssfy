"use client";

import { useState } from "react";
import { Package, Edit, Star, ImageIcon } from "lucide-react";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
// import { ImageManagementModal } from "./image-management-modal";
// import type { ImageAsset } from "../types/inventory";

export interface ImageAsset {
    id: string;
    url: string;
    filename: string;
    alt: string;
    tags: string[];
    category: string;
    size: number;
    dimensions: {
        width: number;
        height: number;
    };
    uploadedAt: Date;
    uploadedBy: string;
}
interface ProductImageDisplayProps {
    images?: string[];
    onImagesUpdate?: (images: string[]) => void;
    imageDatabase?: ImageAsset[];
    onImageUpload?: (files: FileList) => Promise<ImageAsset[]>;
    onImageDelete?: (imageId: string) => void;
    title?: string;
    className?: string;
    showEditButton?: boolean;
    maxDisplay?: number;
}

export function ProductImageDisplay({
    images,
    onImagesUpdate,
    imageDatabase,
    onImageUpload,
    onImageDelete,
    title = "Product Images",
    className = "",
    showEditButton = true,
    maxDisplay = 4,
}: ProductImageDisplayProps) {
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);

    const displayImages = images.slice(0, maxDisplay);
    const remainingCount = Math.max(0, images.length - maxDisplay);

    return (
        <>
            <div className={`space-y-3 ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{title}</span>
                        {images.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {images.length}
                            </Badge>
                        )}
                    </div>
                    {showEditButton && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsImageModalOpen(true)}
                            className="gap-2"
                        >
                            <Edit className="h-3 w-3" />
                            Manage
                        </Button>
                    )}
                </div>

                {images.length === 0 ? (
                    <Card
                        className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => setIsImageModalOpen(true)}
                    >
                        <CardContent className="p-8">
                            <div className="text-center">
                                <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
                                    <Package className="w-full h-full" />
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                    No images added
                                </p>
                                <p className="text-xs text-gray-500">
                                    Click to add images
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {displayImages.map((image, index) => {
                            const imageData = imageDatabase.find(
                                (img) => img.url === image,
                            );
                            const isPrimary = index === 0;

                            return (
                                <Card
                                    key={image}
                                    className={`relative group cursor-pointer hover:shadow-md transition-all ${
                                        isPrimary ? "ring-2 ring-blue-500" : ""
                                    }`}
                                    onClick={() => setIsImageModalOpen(true)}
                                >
                                    <CardContent className="p-2">
                                        <div className="aspect-square relative">
                                            <img
                                                src={
                                                    image || "/placeholder.svg"
                                                }
                                                alt={
                                                    imageData?.alt ||
                                                    `Product image ${index + 1}`
                                                }
                                                className="w-full h-full object-cover rounded-md"
                                            />

                                            {isPrimary && (
                                                <div className="absolute top-2 left-2">
                                                    <Badge className="bg-blue-500 text-white text-xs">
                                                        <Star className="w-3 h-3 mr-1" />
                                                        Primary
                                                    </Badge>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-md flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="gap-2"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {imageData && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium truncate">
                                                    {imageData.filename}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {imageData.dimensions.width}
                                                    ×
                                                    {
                                                        imageData.dimensions
                                                            .height
                                                    }
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {remainingCount > 0 && (
                            <Card
                                className="relative group cursor-pointer hover:shadow-md transition-all border-2 border-dashed"
                                onClick={() => setIsImageModalOpen(true)}
                            >
                                <CardContent className="p-2">
                                    <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-md">
                                        <div className="text-center">
                                            <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm font-medium text-gray-600">
                                                +{remainingCount}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                more
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* <ImageManagementModal
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                currentImages={images}
                onImagesUpdate={onImagesUpdate}
                imageDatabase={imageDatabase}
                onImageUpload={onImageUpload}
                onImageDelete={onImageDelete}
                title={title}
            /> */}
        </>
    );
}

