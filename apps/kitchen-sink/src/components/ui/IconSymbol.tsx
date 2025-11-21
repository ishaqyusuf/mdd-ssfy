// Fallback for using MaterialIcons on Android and web.

import { cn } from "@/lib/utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<
  SymbolViewProps["name"],
  ComponentProps<typeof MaterialIcons>["name"]
>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "magnifyingglass.circle.fill": "search",
  "tram.fill.tunnel": "filter-list",
  "moon.circle.fill": "dark-mode",
  "sun.and.horizon.fill": "light-mode",
  // "xmark.circle.fill": "x"
  "xmark.circle.fill": "cancel",
  ellipsis: "more-horiz",
  "chevron.left": "chevron-left",
  checkmark: "check",
  archivebox: "archive",
  "gobackward.5": "replay-5",
  "goforward.5": "forward-5",
  play: "play-arrow",
  pause: "pause",
  bookmark: "bookmark-outline",
  "bookmark.fill": "bookmark-add",
  // @ts-ignore
} satisfies IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  className,
}: {
  name: IconSymbolName;
  size?: number;
  className?: string;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      className={cn(className)}
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style}
    />
  );
}
