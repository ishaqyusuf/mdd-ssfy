import { Icon, type IconKeys } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Pressable, View } from "react-native";

type SalesClickListRowProps = {
  title: string;
  subtitle?: string;
  icon: IconKeys;
  selected?: boolean;
  onPress: () => void;
};

export function SalesClickListRow({
  title,
  subtitle,
  icon,
  selected = false,
  onPress,
}: SalesClickListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[64px] border-b border-border/40 px-3 py-4 active:opacity-70"
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${
            selected ? "bg-primary/10" : "bg-muted"
          }`}
        >
          <Icon
            name={icon}
            className={selected ? "text-primary" : "text-muted-foreground"}
            size={18}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-semibold text-foreground"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              className="mt-0.5 text-xs text-muted-foreground"
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Icon name="Check" className="text-primary" size={20} />
        ) : (
          <Icon
            name="ChevronRight"
            className="text-muted-foreground"
            size={17}
          />
        )}
      </View>
    </Pressable>
  );
}
