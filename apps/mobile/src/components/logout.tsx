import { Icon } from "@/components/ui/icon";
import { TouchableOpacity } from "react-native";
import { useAuthContext } from "@/hooks/use-auth";

export function Logout() {
  const auth = useAuthContext();
  return (
    <TouchableOpacity
      onPress={(e) => {
        auth.onLogout();
      }}
      className="p-2.5 rounded-full active:bg-gray-200 dark:active:bg-gray-700"
    >
      <Icon name="LogOut" size={20} />
    </TouchableOpacity>
  );
}
