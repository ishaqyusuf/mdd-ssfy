import { useRouter } from 'expo-router'
import LottieView from 'lottie-react-native'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'

export default function SplashScreenComponent() {
  const animationRef = useRef<LottieView>(null)
  const router = useRouter()

  useEffect(() => {
    animationRef.current?.play()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <LottieView
        ref={animationRef}
        source={require('@img/onboarding/lottie/splash-screen.json')}
        autoPlay
        loop={false}
        style={{ flex: 1 }}
        onAnimationFinish={() => {
          console.log('Animation finished')
          router.replace('/onboarding')
        }}
      />
    </View>
  )
}
