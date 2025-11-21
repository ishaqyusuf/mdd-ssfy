import { useColorScheme } from "nativewind";
import { TouchableOpacity, View } from "react-native";
import { IconSymbol } from "./ui/IconSymbol";
// import { SunIcon, MoonIcon } from "react-native-heroicons/outline";

export default function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  return (
    <View className="">
      <TouchableOpacity
        onPress={() =>
          setColorScheme(colorScheme === "dark" ? "light" : "dark")
        }
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-800"
      >
        {colorScheme === "dark" ? (
          <IconSymbol name="moon.circle.fill" size={20} color="white" />
        ) : (
          <IconSymbol size={20} name="sun.and.horizon.fill" color="black" />
        )}
      </TouchableOpacity>
    </View>
  );
}
