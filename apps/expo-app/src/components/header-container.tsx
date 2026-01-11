import { View } from "react-native";

export function HeaderContainer({ children }) {
  return (
    <View className="flex-row items-center px-5 pt-14 pb-4 bg-background/95 border-b border-border sticky top-0 z-10 gap-4">
      {children}
    </View>
  );
}
