import { Text } from "react-native";
import { NeoCard } from "./neo-card";

export function StepEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <NeoCard className="border-dashed bg-muted/40">
      <Text className="text-sm font-semibold text-foreground">{title}</Text>
      <Text className="mt-1 text-xs text-muted-foreground">{description}</Text>
    </NeoCard>
  );
}
