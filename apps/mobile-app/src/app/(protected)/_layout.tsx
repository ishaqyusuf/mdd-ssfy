import { Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ProtectedLayout() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen
          name='cart'
          options={{
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 1],
            sheetGrabberVisible: true,
            headerShadowVisible: false,
            contentStyle: {
              height: '100%',
            },
          }}
        />
        <Stack.Screen
          name='search'
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='categories'
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name='product'
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaView>
  )
}
