import { ProductImageDisplay } from "./product-image-display";

interface Props {}
export function ProductImageGallery(props: Props) {
    return (
        <div className="col-span-2">
            <ProductImageDisplay
                // images={watch("images")}
                images={[]}
                imageDatabase={[]}
                // onImagesUpdate={(images) => setValue("images", images)}
                // imageDatabase={imageDatabase}
                // onImageUpload={onImageUpload}
                // onImageDelete={onImageDelete}
                title="Product Images"
            />
        </div>
    );
}

