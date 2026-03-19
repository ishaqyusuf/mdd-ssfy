import { Image, Text, View } from "@react-pdf/renderer";

import { cn } from "@gnd/utils/react-pdf";
import { sum } from "@gnd/utils";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";

export default function SalesPrintDoorItems({
  printData: sale,
  index,
  baseUrl,
}: any & { index: number; baseUrl?: string }) {
  const { orderedPrinting } = sale;
  const doors = orderedPrinting?.[index]?.nonShelf;
  if (!doors) return null;

  const resolveImageSrc = (src?: string | null) => {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
    if (!baseUrl) return src;
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
    return `${normalizedBase}${normalizedSrc}`;
  };

  const width = (span, lns) =>
    !span
      ? `${100 - Number(sum(lns, "colSpan") * 5)}%`
      : `${Number(span) * 5}%`;

  // wm[String(span)];
  return (
    <View style={cn("flex-col border-x text-sm")}>
      <Text
        wrap={false}
        style={cn("text-sm p-1 uppercase text-left ", {
          // fontWeight: 700,
        })}
      >
        {doors?.sectionTitle}
      </Text>

      {!doors.details?.length || (
        <View style={cn("flex text-xs uppercase flex-wrap")}>
          {doors.details
            .filter(
              (d) => d.value && !["Height"].includes(d.step?.title as string),
            )
            .map((detail, i) => (
              <View
                wrap={false}
                key={i}
                style={cn(
                  "col-span-2 border-b w-1/2 flex",
                  i % 2 == 1 ? "border-l" : "",
                )}
              >
                <View
                  style={{
                    ...cn("col-span-3 p-1 w-1/3 border-r font-bold"),
                  }}
                >
                  <Text>{detail.step.title}</Text>
                </View>
                <View style={cn("p-1 w-2/3 font-medium")}>
                  <Text>{detail.value}</Text>
                </View>
              </View>
            ))}
        </View>
      )}
      {doors.lines?.length ? (
        <View style={cn("flex-col")}>
          <View style={cn("flex border-t")}>
            {doors.itemCells.map((cell, i) => (
              <View
                key={i}
                style={{
                  ...cn(
                    cell.cellStyle,
                    "p-1 font-semibold uppercase ",
                    i == doors.itemCells.length - 1 ? "" : "border-r ",
                  ),
                  // flex: cell.colSpan,
                  width: width(cell.colSpan, doors.itemCells),
                  backgroundColor: hexToRgba(colorsObject.black, 0.2),
                }}
              >
                <Text>{cell.title}</Text>
              </View>
            ))}
          </View>

          {doors.lines.map((line, i) => (
            <View
              wrap={false}
              key={i}
              style={cn("flex border-b font-medium text-xs")}
            >
              {line.map((ld, ldi) => (
                <View
                  key={ldi}
                  style={{
                    ...cn(
                      "p-1",
                      ld.style,
                      ldi == line.length - 1 ? "" : "border-r uppercase",
                    ),

                    // flex: ld.colSpan,
                    width: width(ld?.colSpan, line),
                  }}
                >
                  {ld.value === "as-above" ? (
                    <Text style={{ textAlign: "center" }}>✔</Text>
                  ) : Array.isArray(ld.value) ? (
                    ld.value.map((val, vi) => <Text key={vi}>{val}</Text>)
                  ) : (
                    (() => {
                      const imageSrc = resolveImageSrc(ld.image);
                      return (
                        <View style={cn("flex-col")}>
                          {/* {imageSrc ? (
                            <Image
                              src={imageSrc}
                              style={{
                                width: 40,
                                height: 40,
                                objectFit: "contain",
                                marginBottom: 2,
                              }}
                            />
                          ) : null} */}
                          <Text>{ld.value}</Text>
                        </View>
                      );
                    })()
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
