import { Text, View } from "react-native";

type Props = {
  status?: string | null;
};

function getStatusClass(status?: string | null) {
  switch (status) {
    case "completed":
      return "bg-green-100 border-green-300 text-green-800";
    case "in progress":
      return "bg-blue-100 border-blue-300 text-blue-800";
    case "cancelled":
      return "bg-red-100 border-red-300 text-red-800";
    case "queue":
    default:
      return "bg-amber-100 border-amber-300 text-amber-800";
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
