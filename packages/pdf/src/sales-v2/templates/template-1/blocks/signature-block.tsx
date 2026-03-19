import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";

interface SignatureBlockProps {
  label?: string;
}

export function SignatureBlock({
  label = "Customer Signature & date",
}: SignatureBlockProps) {
  return (
    <View wrap={false} style={cn(`px-4 mt-4 mb-2`)}>
      <View style={cn(`flex-row justify-between`)}>
        <View style={{ width: "70%" }}>
          <View
            style={{ ...cn(`border-b`), height: 40, borderStyle: "dashed" }}
          />
          <Text style={cn(`mt-1 text-sm italic font-semibold`)}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
