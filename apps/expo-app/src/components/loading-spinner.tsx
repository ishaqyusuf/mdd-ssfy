import { ActivityIndicator, View } from "react-native";

export function LoadingSpinner() {
  //   const rotate = useSharedValue(0);

  //   rotate.value = withRepeat(withTiming(360, { duration: 800 }), -1);

  //   const style = useAnimatedStyle(() => ({
  //     transform: [{ rotate: `${rotate.value}deg` }],
  //   }));

  //   return (
  //     <Animated.View
  //       style={style}
  //       className="w-6 h-6 rounded-full border-2 border-border border-t-primary"
  //     />
  //   );
  return (
    <View className="py-4 items-center justify-center">
      <ActivityIndicator size="small" />
    </View>
  );
}
