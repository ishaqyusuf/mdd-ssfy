import { Ionicons } from '@expo/vector-icons';
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
  const { colorScheme, toggleColorScheme } = useColorScheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const insets = useSafeAreaInsets();

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
    >
      <View className="flex-row items-center justify-between px-4 py-4">
        <Image
          source={{ uri: avatarUrl }}
          className="w-14 h-14 rounded-full"
          transition={200}
        />

        <View className="flex-1 ml-4">
          <Text className="text-base font-medium text-gray-500 dark:text-gray-400">
            {`${getGreeting()},`}
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {name}!
          </Text>
        </View>

        <View className="flex-row items-center space-x-1">
          <TouchableOpacity
            className="p-2.5 rounded-full active:bg-gray-200 dark:active:bg-gray-700"
            onPress={toggleColorScheme}
          >
            <Ionicons
              name={colorScheme === 'dark' ? 'sunny' : 'moon'}
              size={24}
              color={colorScheme === 'dark' ? '#FBBF24' : '#6B7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity className="p-2.5 rounded-full active:bg-gray-200 dark:active:bg-gray-700">
            <Ionicons
              name="menu"
              size={28}
              color={colorScheme === 'dark' ? '#F9FAFB' : '#1F2937'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
