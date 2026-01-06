import { Text, View } from "react-native";

export function Var() {
  return (
    <View>
      <Text className="text-foreground">
        Variant: {process.env.APP_VARIANT}
      </Text>
    </View>
  );
}
