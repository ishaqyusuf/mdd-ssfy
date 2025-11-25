import { Image, Text, View } from 'react-native'

export const CategoryListHeader = ({
  title,
  imageUrl,
}: {
  title: string
  imageUrl: string
}) => {
  return (
    <View className='gap-4 pb-4'>
      <Image
        source={{ uri: imageUrl }}
        className='w-full h-50 rounded-lg'
        resizeMode='cover'
      />
      <Text className='text-2xl font-bold'>{title}</Text>
    </View>
  )
}
