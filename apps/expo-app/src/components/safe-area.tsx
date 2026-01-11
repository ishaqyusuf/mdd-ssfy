import { Platform, StyleProp, View, ViewProps } from "react-native";
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
    // <View className="flex-1">
    <View
      style={{
        ...(style || ({} as any)),
        paddingTop: Platform.select({
          android: insets.top,
        }),
        flex: 1,
      }}
    >
      {children}
    </View>
    // </View>
  );
}
