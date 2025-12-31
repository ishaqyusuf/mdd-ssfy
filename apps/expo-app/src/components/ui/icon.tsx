import { cn } from "@/lib/utils";
import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "react-native-css-interop";
import { icons } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { camel } from "@gnd/utils";
import { THEME } from "@/lib/theme";
export type IconProps = LucideProps & {
  as?: LucideIcon;
  name?: keyof typeof icons;
};

function IconImpl({ as: IconComponent, name, ...props }: IconProps) {
  const { colorScheme } = useColorScheme();
  const [, ...colorChunk] =
    props.className
      ?.split(" ")
      ?.reverse()
      ?.find((a) => a?.startsWith("text-"))
      ?.split("-") || [];
  const color = colorChunk?.length ? camel(colorChunk?.join(" ")) : undefined;
  const _themColor =
    colorScheme === "dark" ? THEME.dark[color!] : THEME.light[color!];

  props.style = {
    ...(props.style || ({} as any)),
    color: _themColor || color,
  };
  if (!IconComponent) IconComponent = icons[name as any];
  if (!IconComponent) throw new Error("Invalid icon");
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: "style",
    nativeStyleToProp: {
      height: "size",
      width: "size",
    },
  },
});

/**
 * A wrapper component for Lucide icons with Nativewind `className` support via `cssInterop`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `nativewind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'lucide-react-native';
 * import { Icon } from '@/registry/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Nativewind.
 * @param {number} size - Icon size (defaults to 14).
 * @param {...LucideProps} ...props - Additional Lucide icon props passed to the "as" icon.
 */
function Icon({
  as: IconComponent,
  className,
  size = 14,
  ...props
}: IconProps) {
  return (
    <IconImpl
      as={IconComponent}
      className={cn("text-foreground", className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
