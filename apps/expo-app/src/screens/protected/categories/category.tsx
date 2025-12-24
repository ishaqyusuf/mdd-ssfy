import { ListEmptyComponent } from '@/components/protected/ListEmptyComponent'
import { Category as CategoryType } from '@/types/category-types'
import { Product as ProductType } from '@/types/product-types'
import { CategoryListHeader } from '@components/protected/CategoryListHeader'
import Header from '@components/protected/Header'
import { ProductListItem } from '@components/protected/ProductListItem'
import { CATEGORIES } from '@data/categories-data'
import { PRODUCTS } from '@data/products-data'
import { LegendList } from '@legendapp/list'
import { Redirect, useLocalSearchParams } from 'expo-router'
import { StyleSheet, View } from 'react-native'

export default function Category() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const category = CATEGORIES.find(
    (category: CategoryType) => category.slug === slug
  )
  if (!category) return <Redirect href='/+not-found' />

  const products = PRODUCTS.filter(
    (product: ProductType) => product.category.slug === category.slug
  )

  return (
    <>
      <Header title={category.name} />

      <View className='flex-1'>
        <LegendList
          data={products}
          renderItem={({ item }: { item: ProductType }) => (
            <ProductListItem product={item} />
          )}
          keyExtractor={({ id }) => id.toString()}
          recycleItems
          numColumns={2}
          contentContainerStyle={styles.contentContainer}
          columnWrapperStyle={{ gap: 8 }}
          ListHeaderComponent={() => (
            <CategoryListHeader
              title={category.name}
              imageUrl={category.imageUrl}
            />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={ListEmptyComponent}
        />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
})
