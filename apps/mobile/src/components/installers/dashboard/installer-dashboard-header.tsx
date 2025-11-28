import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useColorScheme } from 'nativewind';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../ui/text';

type HeaderProps = {
  name: string;
  avatarUrl: string;
};

export function Header({ name, avatarUrl }: HeaderProps) {
  const { colorScheme } = useColorScheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }} className="bg-white dark:bg-gray-900 shadow-sm">
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center space-x-4">
          <Image
            source={{ uri: avatarUrl }}
            className="w-12 h-12 rounded-full"
            transition={200}
          />
          <View>
            <Text className="text-base font-medium text-gray-500 dark:text-gray-400">{`${getGreeting()},`}</Text>
            <Text className="text-xl font-bold text-primary-deep-blue dark:text-white">{name}!</Text>
          </View>
        </View>
        <View className="flex-row items-center space-x-2">
          <TouchableOpacity className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700">
            <Ionicons name="menu" size={22} color={colorScheme === 'dark' ? '#F9FAFB' : '#1F2937'} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2.5 rounded-full bg-red-50 dark:bg-red-500/10 active:bg-red-100 dark:active:bg-red-500/20">
            <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}