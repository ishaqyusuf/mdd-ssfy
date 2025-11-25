import { SkipBtn } from '@/components/onboarding/SkipBtn'
import { onboardingSlides } from '@constants/onboarding/onboarding'
import { useOnboardingStore } from '@store/onboardingStore'
import { PressableScale } from 'pressto'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Onboarding() {
  const { completeOnboarding } = useOnboardingStore()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const currentSlide = onboardingSlides[currentSlideIndex]
  const isLastSlide = currentSlideIndex === onboardingSlides.length - 1

  const nextSlide = () => {
    if (currentSlideIndex < onboardingSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    } else {
      completeOnboarding(true)
    }
  }

  return (
    <SafeAreaView style={{ backgroundColor: '#FFFFFF', flex: 1 }}>
      <View className='flex-1 px-6'>
        <SkipBtn />

        <View className='flex-1'>
          <View className='flex-1'>
            <View className='flex-1'>{currentSlide.image}</View>
          </View>

          <View className='flex-col gap-4 mb-12'>
            <Text className='will-change-variable text-2xl font-semibold'>
              {currentSlide.title}
            </Text>

            <Text className='will-change-variable text-2xl font-bold -mt-2 text-secondary'>
              {currentSlide.secondTitle}
            </Text>
            <Text className='will-change-variable text-base leading-6 opacity-90'>
              {currentSlide.subTitle}
            </Text>
          </View>
        </View>

        <View className='flex-row'>
          <View className='flex-row items-center flex-1'>
            {onboardingSlides.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentSlideIndex(index)}
                className={`will-change-variable h-2 mx-2.5 rounded-xl bg-primary-deep-blue ${index === currentSlideIndex ? 'w-8 opacity-100' : 'w-4 opacity-50'}`}
              />
            ))}
          </View>

          <PressableScale
            onPress={nextSlide}
            style={{
              backgroundColor: '#1a1773',
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
          >
            <Text className='text-white text-base font-medium'>
              {isLastSlide ? 'Get Started' : 'Continue'}
            </Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  )
}
