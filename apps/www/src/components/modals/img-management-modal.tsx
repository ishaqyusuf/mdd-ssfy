import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { ImageAsset } from "../product-image-display";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { ImageIcon, Star, StarOff, Trash2 } from "lucide-react";
import { Card, CardContent } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { useRef, useState } from "react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentImages: string[];
    onImagesUpdate: (images: string[]) => void;
    imageDatabase: ImageAsset[];
    onImageUpload: (files: FileList) => Promise<ImageAsset[]>;
    onImageDelete: (imageId: string) => void;
    title?: string;
}
export function ImageManagementModal(props: Props) {
    const {
        imageDatabase = [],
        currentImages = [],
        onImageDelete,
        onClose,
        onImageUpload,
        onImagesUpdate,
    } = props;
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get unique categories and tags from database
    const categories = [
        "all",
        ...Array.from(new Set(imageDatabase.map((img) => img.category))),
    ];
    const allTags = Array.from(
        new Set(imageDatabase.flatMap((img) => img.tags)),
    );

    // Filter images based on search and filters
    const filteredImages = imageDatabase.filter((image) => {
        const matchesSearch =
            image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            image.alt.toLowerCase().includes(searchTerm.toLowerCase()) ||
            image.tags.some((tag) =>
                tag.toLowerCase().includes(searchTerm.toLowerCase()),
            );

        const matchesCategory =
            selectedCategory === "all" || image.category === selectedCategory;

        const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every((tag) => image.tags.includes(tag));

        return matchesSearch && matchesCategory && matchesTags;
    });

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedImages = await onImageUpload(files);
            // Auto-select newly uploaded images
            setSelectedImages((prev) => [
                ...prev,
                ...uploadedImages.map((img) => img.url),
            ]);
        } catch (error) {
            console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleImageSelect = (imageUrl: string) => {
        setSelectedImages((prev) =>
            prev.includes(imageUrl)
                ? prev.filter((url) => url !== imageUrl)
                : [...prev, imageUrl],
        );
    };

    const handleSetPrimary = (imageUrl: string) => {
        const newImages = [
            imageUrl,
            ...currentImages.filter((url) => url !== imageUrl),
        ];
        onImagesUpdate(newImages);
    };

    const handleRemoveImage = (imageUrl: string) => {
        const newImages = currentImages.filter((url) => url !== imageUrl);
        onImagesUpdate(newImages);
    };

    const handleAddSelectedImages = () => {
        const newImages = [...currentImages];
        selectedImages.forEach((imageUrl) => {
            if (!newImages.includes(imageUrl)) {
                newImages.push(imageUrl);
            }
        });
        onImagesUpdate(newImages);
        setSelectedImages([]);
    };

    const handleTagToggle = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
            " " +
            sizes[i]
        );
    };
    return (
        <CustomModal
            onOpenChange={(e) => {
                if (!e) props.onClose();
            }}
            open={props.isOpen}
            title=""
            description=""
            size="2xl"
        >
            <Tabs defaultValue="current" className="min-h-0">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="current">
                        Current Images ({currentImages?.length})
                    </TabsTrigger>
                    <TabsTrigger value="gallery">
                        Image Gallery ({imageDatabase.length})
                    </TabsTrigger>
                    <TabsTrigger value="upload">Upload New</TabsTrigger>
                </TabsList>
            </Tabs>
            <CustomModalContent>
                <Tabs
                    defaultValue="current"
                    className="flex-1 flex flex-col min-h-0"
                >
                    <TabsContent
                        value="current"
                        className="flex-1 overflow-y-auto"
                    >
                        <div className="space-y-4">
                            {currentImages?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No images selected</p>
                                    <p className="text-sm">
                                        Add images from the gallery or upload
                                        new ones
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {currentImages?.map((imageUrl, index) => {
                                        const imageData = imageDatabase?.find(
                                            (img) => img.url === imageUrl,
                                        );
                                        const isPrimary = index === 0;

                                        return (
                                            <Card
                                                key={imageUrl}
                                                className={`relative group ${isPrimary ? "ring-2 ring-blue-500" : ""}`}
                                            >
                                                <CardContent className="p-2">
                                                    <div className="aspect-square relative">
                                                        <img
                                                            src={
                                                                imageUrl ||
                                                                "/placeholder.svg"
                                                            }
                                                            alt={
                                                                imageData?.alt ||
                                                                `Image ${index + 1}`
                                                            }
                                                            className="w-full h-full object-cover rounded-md cursor-pointer"
                                                            onClick={() =>
                                                                setPreviewImage(
                                                                    imageUrl,
                                                                )
                                                            }
                                                        />

                                                        {isPrimary && (
                                                            <div className="absolute top-2 left-2">
                                                                <Badge className="bg-blue-500 text-white text-xs">
                                                                    <Star className="w-3 h-3 mr-1" />
                                                                    Primary
                                                                </Badge>
                                                            </div>
                                                        )}

                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex gap-1">
                                                                {!isPrimary && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        className="h-6 w-6 p-0"
                                                                        onClick={() =>
                                                                            handleSetPrimary(
                                                                                imageUrl,
                                                                            )
                                                                        }
                                                                        title="Set as primary"
                                                                    >
                                                                        <StarOff className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="h-6 w-6 p-0"
                                                                    onClick={() =>
                                                                        handleRemoveImage(
                                                                            imageUrl,
                                                                        )
                                                                    }
                                                                    title="Remove image"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {imageData && (
                                                        <div className="mt-2">
                                                            <p className="text-xs font-medium truncate">
                                                                {
                                                                    imageData.filename
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    imageData
                                                                        .dimensions
                                                                        .width
                                                                }
                                                                ×
                                                                {
                                                                    imageData
                                                                        .dimensions
                                                                        .height
                                                                }
                                                            </p>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </CustomModalContent>
        </CustomModal>
    );
}

