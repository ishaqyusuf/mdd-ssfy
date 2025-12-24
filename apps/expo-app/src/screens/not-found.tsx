import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input-2";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { TouchableOpacity, View } from "react-native";

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <View className="flex-1 bg-white justify-center items-center px-8">
        <View className="grid w-full gap-4">
          <Label>Input</Label>
          <Input placeholder="Type something..." className="w-full" />
        </View>
        <Button variant="outline">
          <Text>Submit</Text>
        </Button>
        {/* 404 Illustration */}
        <View className="mb-10 relative w-full h-64 justify-center items-center">
          {/* Background Circles */}
          <View className="absolute w-56 h-56 bg-gray-100 rounded-full opacity-30" />
          <View className="absolute w-40 h-40 bg-blue-100 rounded-full opacity-20" />

          {/* Large 404 Text */}
          <View className="absolute">
            <Text className="text-9xl font-bold text-gray-200">404</Text>
          </View>

          {/* Floating Icons */}
          <View className="absolute top-10 left-8 bg-white p-3 rounded-full shadow-md">
            <FontAwesome name="question-circle" size={32} color="#F59E0B" />
          </View>
          <View className="absolute top-16 right-12 bg-white p-3 rounded-full shadow-md">
            <MaterialIcons name="error-outline" size={32} color="#EF4444" />
          </View>
          <View className="absolute bottom-20 left-16 bg-white p-3 rounded-full shadow-md">
            <FontAwesome name="map-signs" size={28} color="#3B82F6" />
          </View>
          <View className="absolute bottom-24 right-8 bg-white p-3 rounded-full shadow-md">
            <MaterialIcons name="search-off" size={32} color="#8B5CF6" />
          </View>

          {/* Center Icon */}
          <View className="absolute bg-white p-6 rounded-full shadow-lg">
            <FontAwesome name="compass" size={48} color="#10B981" />
          </View>
        </View>

        {/* Text Content */}
        <View className="items-center gap-3 mb-10">
          <Text className="text-3xl font-bold text-[#333] text-center">
            Page Not Found
          </Text>
          <Text className="text-base text-[#666] text-center leading-6 px-4">
            Oops! The page you&apos;re looking for doesn&apos;t exist.
          </Text>
          <Text className="text-base text-[#666] text-center leading-6">
            It might have been moved or deleted.
          </Text>
        </View>

        {/* Home Button */}
        <Link href="/" asChild>
          <TouchableOpacity className="bg-[#1BC464] px-8 py-4 rounded-2xl shadow-lg active:opacity-80">
            <View className="flex-row items-center gap-2">
              <FontAwesome name="home" size={20} color="white" />
              <Text className="text-white text-lg font-bold">Go Back Home</Text>
            </View>
          </TouchableOpacity>
        </Link>

        {/* Additional Help Text */}
        <Text className="text-sm text-[#999] text-center mt-8">
          Need help? Contact our support team
        </Text>
      </View>
    </>
  );
}
