"use client";

interface Size {
  id: string;
  name: string;
  dimensions: string;
  price?: number;
}

export function ProductSizeSelector() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Size</h3>
      {/* <div className="grid grid-cols-2 gap-3">
        {sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => onSizeChange(size.id)}
            className={`p-3 border-2 rounded-lg text-left transition-colors ${
              selectedSize === size.id
                ? "border-amber-600 bg-amber-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium text-sm">{size.name}</div>
            <div className="text-xs text-gray-500">{size.dimensions}</div>
            {size.price && (
              <div className="text-xs text-amber-600 font-medium">
                +${size.price}
              </div>
            )}
          </button>
        ))}
      </div> */}
    </div>
  );
}
