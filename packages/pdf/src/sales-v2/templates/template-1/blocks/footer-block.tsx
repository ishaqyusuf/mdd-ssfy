import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { FooterData } from "@gnd/sales/print/types";

interface FooterBlockProps {
  footer: FooterData;
}

const DEFAULT_FOOTER_NOTES = [
  "Note: Payments made with Cards will have an additional 3% charge to cover credit cards merchants fees.",
  "1) NO RETURN ON SPECIAL ORDER",
  "2) NO DAMAGED ORDER MAY BE EXCHANGE OR RETURN",
  "3) ONCE SIGN THERE IS NO RETURN OR EXCHANGE.",
];

const BORDER_COLOR = "#9ca3af";

export function FooterBlock({ footer }: FooterBlockProps) {
  const notes = footer.notes.length > 0 ? footer.notes : DEFAULT_FOOTER_NOTES;
  const [leadNote, ...restNotes] = notes;

  return (
    <View style={{ borderColor: BORDER_COLOR }}>
      <View style={cn(`text-right font-bold flex-row`)}>
        <View
          style={{
            ...cn(`border-r flex-col justify-between w-2/3 p-2`),
            borderColor: BORDER_COLOR,
            minHeight: 88,
          }}
        >
          {leadNote ? (
            <Text
              style={cn(`text-left text-xs font-normal italic text-red-600`)}
            >
              {leadNote}
            </Text>
          ) : null}
          {restNotes.length > 0 ? (
            <View style={cn(`p-1 flex-col`)}>
              {restNotes.map((note, i) => (
                <View key={i}>
                  <Text style={cn(`text-left text-xs text-red-600`)}>
                    {note}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ ...cn(`relative text-sm`), width: "45%" }}>
          <View style={cn(`w-full`)}>
            {footer.lines.map((line, i) => (
              <View
                key={i}
                style={{
                  ...cn(`flex-row justify-between`),
                  borderColor: BORDER_COLOR,
                  ...(i > 0 ? cn(`border-t`) : {}),
                }}
              >
                <View
                  style={{
                    ...cn(`bg-slate-200 px-1 py-1.5`),
                    width: "46%",
                  }}
                >
                  <Text
                    style={{
                      ...cn(`${line.bold ? "font-bold" : ""}`),
                      fontSize: line.large ? 10.5 : 9.5,
                    }}
                  >
                    {line.label}
                  </Text>
                </View>
                <View
                  style={{
                    ...cn(`px-1 py-1 text-right`),
                    width: "54%",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      ...cn(`${line.bold ? "font-bold" : ""}`),
                      ...(line.large
                        ? { fontSize: 16, fontWeight: 700 }
                        : { fontSize: 10 }),
                      textAlign: "right",
                    }}
                  >
                    {line.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
