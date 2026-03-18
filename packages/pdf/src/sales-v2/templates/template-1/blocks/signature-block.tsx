import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";

interface SignatureBlockProps {
  label?: string;
}

export function SignatureBlock({ label = "Signature" }: SignatureBlockProps) {
  return (
    <View style={cn(`px-4 mt-4 mb-2`)}>
      <Text style={cn(`text-xs mb-1`)}>{label}</Text>
      <View style={{...cn(`border-b`), height: 40, borderStyle: "dashed" }} />
      <Text style={cn(`text-xs mt-1 text-gray-500`)}>Date: _______________</Text>
    </View>
  );
}
