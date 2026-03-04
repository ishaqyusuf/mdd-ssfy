import { Platform, StyleProp, View, ViewProps } from "react-native";
import { _insets } from "./static-trpc";

export function SafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewProps>;
}) {
  // const insets = useSafeAreaInsets();
  return (
    // <View className="flex-1">
    <View
      style={{
        ...(style || ({} as any)),
        paddingTop: Platform.select({
          android: _insets?.top,
        }),
        flex: 1,
      }}
    >
      {children}
    </View>
    // </View>
  );
}
