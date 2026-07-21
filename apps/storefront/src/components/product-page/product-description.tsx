interface ProductDescriptionProps {
  description: string;
  longDescription?: string;
}

export function ProductDescription({ description, longDescription }: ProductDescriptionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Product Details</h2>
      <p className="text-muted-foreground">{description}</p>
      {longDescription && <p className="text-muted-foreground">{longDescription}</p>}
    </div>
  );
}
