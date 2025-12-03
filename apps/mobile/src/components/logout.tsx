import { LogOut } from "lucide-react-native";
import { TouchableOpacity } from "react-native";
import { useColorScheme } from "nativewind";
import { useAuthContext } from "@/hooks/use-auth";

export function Logout() {
  const { colorScheme } = useColorScheme();
  const auth = useAuthContext();
  return (
    <TouchableOpacity
      onPress={(e) => {
        auth.onLogout();
      }}
      className="p-2.5 rounded-full active:bg-gray-200 dark:active:bg-gray-700"
    >
      <LogOut
        // name="menu"
        size={20}
        color={colorScheme === "dark" ? "#F9FAFB" : "#1F2937"}
      />
    </TouchableOpacity>
  );
}
