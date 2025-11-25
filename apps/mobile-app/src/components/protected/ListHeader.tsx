import CartBadge from '@/components/protected/CartBadge'
import { CATEGORIES } from '@/data/categories-data'
import { Ionicons } from '@expo/vector-icons'
import { LegendList } from '@legendapp/list'
import { Link, useRouter } from 'expo-router'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
// import Toast from 'react-native-toast-message'

export const ListHeader = () => {
  const router = useRouter()

  const handleSearch = () => {
    router.push('/search')
  }
  // const showToast = () => {
  //   Toast.show({
  //     type: 'success',
  //     text1: 'Hello',
  //     text2: 'This is some something 👋',
  //   })
  // }

  return (
    <View className='gap-5 mb-5'>
      <View className='flex-row justify-between items-center'>
        <View className='flex-row items-center'>
          <View className='flex-row items-center'>
            <Image
              source={{ uri: 'https://avatar.iran.liara.run/public/34' }}
              className='w-10 h-10 rounded-full mr-2.5'
            />
            <Text>Hello edisleka</Text>
          </View>
        </View>

        <View className='flex-row items-center gap-4'>
          <CartBadge />
        </View>
      </View>

      <Pressable
        className='flex-row items-center bg-gray-200 rounded-2xl px-2 py-1.5 gap-2 border border-gray-200'
        onPress={handleSearch}
      >
        <Ionicons name='search' size={16} color='#9CA3AF' />
        <Text className='text-gray-400 flex-1 text-sm'>Search products...</Text>
      </Pressable>

      <View className='w-full h-50'>
        <Image
          source={require('@img/e-shop/banner.jpg')}
          className='w-full h-full rounded-3xl'
          resizeMode='cover'
        />
      </View>

      <View className=''>
        <Text className='text-xl font-semibold mb-2.5'>Categories</Text>
        <LegendList
          data={CATEGORIES}
          renderItem={({ item }) => (
            <Link href={`/categories/${item.slug}`} asChild>
              <Pressable>
                <Image
                  source={{ uri: item.imageUrl }}
                  className='w-14 h-14 rounded-full mb-2 border border-secondary'
                />
                <Text className='text-xs text-center'>{item.name}</Text>
              </Pressable>
            </Link>
          )}
          keyExtractor={(item) => item.name}
          recycleItems
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 10,
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
  },
  cartContainer: {
    padding: 10,
  },
  signOutButton: {
    // padding: 10,
  },
  heroContainer: {
    width: '100%',
    height: 200,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 20,
  },
  categoriesContainer: {},
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  category: {
    marginRight: 16,
  },

  categoriesListContent: {
    paddingRight: 16,
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: 10,
    backgroundColor: '#1BC464',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
})
