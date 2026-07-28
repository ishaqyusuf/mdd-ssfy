import Header from '@/components/protected/Header'
import { PRODUCTS } from '@/data/products-data'
import { useCartStore } from '@/store/cartStore'
import { CartItemType } from '@/types/cart-types'
import { Product } from '@/types/product-types'
import { LegendList } from '@legendapp/list'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

export default function ProductDetails() {
  const insets = useSafeAreaInsets()
  const { bottom } = insets
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { items, addItem, incrementItem, decrementItem } = useCartStore()
  const product = PRODUCTS.find((product: Product) => product.slug === slug)
  const cartItem = items.find((item: CartItemType) => item.id === product?.id)

  const initialQuantity = cartItem ? cartItem.quantity : 1
  const [quantity, setQuantity] = useState(initialQuantity)

  if (!product) return <Redirect href='/+not-found' />

  const increaseQuantity = () => {
    if (quantity < product.maxQuantity) {
      setQuantity((prev) => prev + 1)
      incrementItem(product.id)
    } else {
      Toast.show({
        text1: 'Maximum quantity reached',
        type: 'warning',
        text2: 'You have reached the maximum quantity of this product',
        position: 'top',
        visibilityTime: 2000,
        autoHide: true,
      })
    }
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
      decrementItem(product.id)
    }
  }

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      quantity: quantity,
      image: product.heroImage,
    })
    Toast.show({
      text1: `${quantity} ${product.title} added to cart`,
      type: 'success',
      position: 'top',
      visibilityTime: 2000,
      autoHide: true,
    })
  }

  const totalPrice = product.price * quantity

  return (
    <View style={{ flex: 1, paddingBottom: bottom }}>
      <Header title={product.title} />

      <View className='flex-1 px-4 gap-4'>
        <View className='bg-surface rounded-lg'>
          <Image
            source={product.heroImage}
            className='w-full h-62'
            resizeMode='contain'
          />
        </View>
        <View className='gap-2'>
          <Text className='text-2xl font-bold'>Title: {product.title}</Text>
          <Text className='text-lg font-bold text-gray-500'>
            Slug: {product.slug}
          </Text>
          <View className='flex-row items-center justify-between'>
            <Text className='font-bold text-black'>
              Unit Price: ${product.price.toFixed(2)}
            </Text>
            <Text className='font-bold text-black'>
              Total Price: ${totalPrice}
            </Text>
          </View>
        </View>
        <LegendList
          data={product.imagesUrl}
          renderItem={({ item }) => (
            <View className='w-24 h-24 rounded-lg overflow-hidden bg-surface p-1'>
              <Image
                source={item}
                className='w-full h-full'
                resizeMode='contain'
              />
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
          }}
        />
      </View>

      <View className='flex-row items-center px-4 gap-4'>
        <Pressable
          className='w-10 h-10 rounded-full items-center justify-center bg-primary'
          onPress={decreaseQuantity}
          disabled={quantity <= 1}
        >
          <Text className='text-2xl font-bold text-surface'>-</Text>
        </Pressable>
        <Text className='text-2xl font-bold'>{quantity}</Text>
        <Pressable
          className='w-10 h-10 rounded-full items-center justify-center bg-primary'
          onPress={increaseQuantity}
          disabled={quantity >= product.maxQuantity}
        >
          <Text className='text-2xl font-bold text-surface'>+</Text>
        </Pressable>

        <Pressable
          className='flex-1 bg-success justify-center items-center rounded-full p-2.5'
          onPress={handleAddToCart}
        >
          <Text className='text-surface font-bold text-lg'>Add to Cart</Text>
        </Pressable>
      </View>
    </View>
  )
}
