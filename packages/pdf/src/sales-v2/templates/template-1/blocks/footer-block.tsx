import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type { FooterData } from "@gnd/sales/print/types";

interface FooterBlockProps {
  footer: FooterData;
}

export function FooterBlock({ footer }: FooterBlockProps) {
  return (
    <View>
      <View style={cn(`text-right font-bold flex`)}>
        {/* Left: notes & disclaimers */}
        <View
          style={cn(`border-r border-t flex-col justify-between w-2/3 p-2`)}
        >
          {footer.notes.map((note, i) => (
            <Text key={i} style={cn(`text-left text-xs text-red-600`)}>
              {note}
            </Text>
          ))}
        </View>

        {/* Right: totals */}
        <View style={{...cn(`relative text-sm`), width: "40%" }}>
          <View style={cn(`w-full`)}>
            {footer.lines.map((line, i) => (
              <View
                key={i}
                style={cn(`border-t flex justify-between`)}
              >
                <View style={cn(`bg-slate-200 flex-4 px-1 py-1.5`)}>
                  <Text
                    style={cn(`${line.bold ? "font-bold" : ""} ${line.large ? "text-sm" : ""}`)}
                  >
                    {line.label}
                  </Text>
                </View>
                <View style={cn(`flex-2 px-1 py-1`)}>
                  <Text
                    style={cn(`${line.bold ? "font-bold" : ""} ${line.large ? "text-sm" : ""}`)}
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
