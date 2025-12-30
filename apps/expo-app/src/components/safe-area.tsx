import { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ComponentProps<typeof View>["style"];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        ...(style || {}),
        paddingTop: insets.top,
      }}
    >
      {children}
    </View>
  );
}
