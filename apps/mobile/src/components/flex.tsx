import { View } from "react-native";

export function Flex({ children = null }) {
  return <View className="flex-1">{children}</View>;
}
