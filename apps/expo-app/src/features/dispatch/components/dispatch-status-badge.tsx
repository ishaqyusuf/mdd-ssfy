import { Text, View } from "react-native";

type Props = {
  status?: string | null;
};

function getStatusClass(status?: string | null) {
  switch (status) {
    case "completed":
      return "bg-primary border-primary text-primary-foreground";
    case "packed":
      return "bg-emerald-500 border-emerald-500 text-white";
    case "in progress":
      return "bg-secondary border-border text-secondary-foreground";
    case "cancelled":
      return "bg-destructive border-destructive text-destructive-foreground";
    case "queue":
    default:
      return "bg-muted border-border text-muted-foreground";
  }
}

export function DispatchStatusBadge({ status }: Props) {
  return (
    <View
      className={`rounded-full border px-2.5 py-1 ${getStatusClass(status)}`}
    >
      <Text className="text-xs font-semibold capitalize">{status || "queue"}</Text>
    </View>
  );
}
