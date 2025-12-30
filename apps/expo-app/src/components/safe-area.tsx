import { StyleProp, View, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewProps>;
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
