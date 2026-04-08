import { Icon } from '@/components/ui/icon'
import { useOnboardingStore } from '@store/onboardingStore'
import { PressableOpacity } from 'pressto'
import { Text, View } from 'react-native'

export const SkipBtn = () => {
  const { completeOnboarding } = useOnboardingStore()

  return (
    <View className='self-end'>
      <PressableOpacity
        onPress={() => completeOnboarding(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 2,
          paddingHorizontal: 8,
          borderRadius: 999,
        }}
      >
        <Text className='will-change-variable text-secondary-turquoise text-lg font-semibold'>
          Skip
        </Text>
        <Icon name='ArrowRight' size={20} color='#04bf9d' />
      </PressableOpacity>
    </View>
  )
}
