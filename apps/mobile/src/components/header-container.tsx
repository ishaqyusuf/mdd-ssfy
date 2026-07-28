import { View } from "react-native";

export function HeaderContainer({ children }) {
  return (
    <View className="flex-row items-center gap-4 bg-background px-5 pb-4 pt-14 sticky top-0 z-10">
      {children}
    </View>
  );
}
