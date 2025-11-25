import { useOnboardingStore } from '@/store/onboardingStore'
import { PressableOpacity } from 'pressto'
import { Text, View } from 'react-native'

export default function SignIn() {
  const { completeOnboarding } = useOnboardingStore()

  return (
    <View className='flex-1 items-center justify-center'>
      <Text className='will-change-variable text-2xl font-bold'>SignIn</Text>
      <PressableOpacity
        onPress={() => completeOnboarding(false)}
        style={{
          backgroundColor: 'red',
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 2,
          paddingHorizontal: 8,
          borderRadius: 999,
        }}
      >
        <Text className='will-change-variable text-white text-lg font-semibold'>
          Reset Onboarding
        </Text>
      </PressableOpacity>
    </View>
  )
}
