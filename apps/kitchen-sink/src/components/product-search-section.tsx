import { Pressable, TextInput, View } from "react-native";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { ThemedText } from "./ThemedText";

export function ProductSearchSection() {
  return (
    <ThemedView className="flex-row  gap-4 p-4">
      <View className="flex-row items-center border border-muted-foreground  relative h-11 flex-1 py-2">
        <ThemedView className="absolute  w-12 flex-row justify-center z-10">
          <IconSymbol
            name="magnifyingglass.circle.fill"
            // name="chevron.left.forwardslash.chevron.right"
            color={Colors.dark.icon}
            size={24}
            className=""
          />
        </ThemedView>
        <TextInput
          placeholder="Search"
          className="flex-1  rounded px-4 py-1 h-8 text-muted-foreground placeholder:text-muted-foreground text-base pl-12"
        />
      </View>
      <Pressable className="flex-row gap-2 items-center border px-2 h-11 border-muted-foreground">
        <IconSymbol
          color={Colors.dark.icon}
          //   className="text-white"
          name="tram.fill.tunnel"
          size={18}
        />
        <ThemedText>Filter</ThemedText>
      </Pressable>
    </ThemedView>
  );
}
