import { Image, Text, View } from "@react-pdf/renderer";
import type { PrintSection, RowCell } from "@gnd/sales/print/types";
import { cn } from "../../../../utils/tw";
import { resolveImageSrc } from "../../../shared/utils";

interface ImageGalleryBlockProps {
  sections: PrintSection[];
  baseUrl?: string;
}

type GalleryItem = {
  src: string;
  title: string;
};

const BORDER_COLOR = "#9ca3af";

export function ImageGalleryBlock({
  sections,
  baseUrl,
}: ImageGalleryBlockProps) {
  const items = collectGalleryItems(sections, baseUrl);
  if (!items.length) return null;

  return (
    <View style={{ ...cn(`flex-col border-x border-t text-sm`), borderColor: BORDER_COLOR }}>
      <Text
        wrap={false}
        style={{
          ...cn(`text-sm p-1 uppercase text-left bg-slate-100`),
          fontWeight: 700,
          letterSpacing: 0.3,
        }}
      >
        Image Reference
      </Text>

      <View style={{ ...cn(`flex-row`), flexWrap: "wrap" }}>
        {items.map((item, index) => (
          <View
            key={`${item.src}-${index}`}
            wrap={false}
            style={{
              ...cn(`border-b p-2`),
              borderColor: BORDER_COLOR,
              width: "33.3333%",
              minHeight: 140,
            }}
          >
            <View
              style={{
                ...cn(`border p-2`),
                borderColor: BORDER_COLOR,
                borderRadius: 3,
                backgroundColor: "#ffffff",
                height: 108,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                src={item.src}
                style={{
                  width: 96,
                  height: 96,
                  objectFit: "contain",
                }}
              />
            </View>
            <Text
              style={{
                ...cn(`text-center text-xs uppercase`),
                paddingTop: 6,
                fontWeight: 600,
              }}
            >
              {item.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function collectGalleryItems(
  sections: PrintSection[],
  baseUrl?: string,
): GalleryItem[] {
  const seen = new Set<string>();
  const items: GalleryItem[] = [];

  for (const section of sections) {
    if (!("rows" in section)) continue;

    for (const row of section.rows) {
      const cells = row.cells ?? [];
      const imageCell = cells.find((cell) => cell.image);
      if (!imageCell?.image) continue;

      const src = resolveImageSrc(imageCell.image, baseUrl);
      if (!src || seen.has(src)) continue;

      const title = getImageTitle(cells, imageCell, section.title);
      seen.add(src);
      items.push({ src, title });
    }
  }

  return items;
}

function getImageTitle(
  cells: RowCell[],
  imageCell: RowCell,
  fallback: string,
): string {
  const value = String(imageCell.value ?? "").trim();
  if (value) return value;

  const firstTextCell = cells.find((cell) => String(cell.value ?? "").trim() !== "");
  const firstValue = String(firstTextCell?.value ?? "").trim();
  return firstValue || fallback;
}
