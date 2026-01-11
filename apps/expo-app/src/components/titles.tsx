import { Text, View } from "react-native";

function BigTitle({ title }) {
  return (
    <View className="px-5 pt-2 pb-4">
      <Text className="text-3xl font-bold text-foreground leading-tight">
        {title}
      </Text>
    </View>
  );
}
interface HeaderTitleProps {
  title: string;
  headline?: string;
  subtitle?: string;
}
function HeaderTitle({ title, headline, subtitle }: HeaderTitleProps) {
  return (
    <View>
      {!headline || (
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {headline}
        </Text>
      )}
      <Text className="text-lg font-bold text-foreground leading-tight">
        {title}
      </Text>
      {!subtitle || (
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </Text>
      )}
    </View>
  );
}
export const Titles = Object.assign(
  {},
  {
    BigTitle,
    HeaderTitle,
  }
);
