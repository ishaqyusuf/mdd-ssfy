import { FontAwesome, MaterialIcons } from '@expo/vector-icons'
import { Text, View } from 'react-native'

export const ListEmptyComponent = () => {
  return (
    <View className='flex-1 justify-center items-center px-8 py-15 min-h-[400px]'>
      {/* Decorative Icons Grid */}
      <View className='mb-8 relative w-48 h-48 justify-center items-center'>
        {/* Background Circle */}
        <View className='absolute w-40 h-40 bg-gray-100 rounded-full opacity-30' />

        {/* Icon Grid */}
        <View className='flex-row flex-wrap justify-center items-center gap-4'>
          <View className='bg-white p-4 rounded-2xl shadow-sm'>
            <FontAwesome name='shopping-bag' size={40} color='#D1D5DB' />
          </View>
          <View className='bg-white p-4 rounded-2xl shadow-sm'>
            <MaterialIcons name='shopping-cart' size={40} color='#D1D5DB' />
          </View>
          <View className='bg-white p-4 rounded-2xl shadow-sm'>
            <FontAwesome name='star-o' size={40} color='#D1D5DB' />
          </View>
          <View className='bg-white p-4 rounded-2xl shadow-sm'>
            <MaterialIcons name='favorite-border' size={40} color='#D1D5DB' />
          </View>
        </View>

        {/* Large Center Icon */}
        <View className='absolute opacity-10'>
          <FontAwesome name='search' size={120} color='#9CA3AF' />
        </View>
      </View>

      {/* Text Content */}
      <View className='items-center gap-2'>
        <Text className='text-2xl font-bold text-[#333] text-center'>
          No Products Found
        </Text>
        <Text className='text-base text-[#666] text-center leading-6 mt-2'>
          We couldn&apos;t find any products at the moment.
        </Text>
        <Text className='text-base text-[#666] text-center leading-6'>
          Please check back later!
        </Text>
      </View>
    </View>
  )
}
