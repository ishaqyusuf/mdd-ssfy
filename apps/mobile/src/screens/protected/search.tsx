import Header from '@/components/protected/Header'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <>
      <Header title='Search' />
      <View className='bg-gray-200 rounded-2xl flex-row items-center mx-4 px-4 gap-3 border border-gray-200 mb-4'>
        <Ionicons name='search' size={20} color='#9CA3AF' />
        <TextInput
          placeholder='Search products...'
          value={searchQuery}
          onChangeText={setSearchQuery}
          className='flex-1 text-base text-gray-900'
          placeholderTextColor='#99a1af'
          autoFocus
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name='close-circle' size={20} color='#99a1af' />
          </Pressable>
        )}
      </View>

      {/* LegendList */}
    </>
  )
}
