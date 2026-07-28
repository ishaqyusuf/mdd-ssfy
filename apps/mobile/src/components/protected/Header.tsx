import CartBadge from '@/components/protected/CartBadge'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'

export default function Header({ title }: { title: string }) {
  const router = useRouter()

  return (
    <View className='flex-row items-center justify-between px-4 min-h-10 mb-4'>
      <TouchableOpacity
        onPress={() => router.back()}
        className='items-center justify-center p-2 rounded-full bg-gray-200'
      >
        <Ionicons name='arrow-back' size={20} color='#1f2937' />
      </TouchableOpacity>

      <View className='items-center pointer-events-none flex-1 mx-4'>
        <Text
          className='text-xl font-semibold text-gray-900 tracking-tight'
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <CartBadge />
    </View>
  )
}
