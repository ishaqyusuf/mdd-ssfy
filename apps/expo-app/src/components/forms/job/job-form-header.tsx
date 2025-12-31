// apps/expo-app/src/components/forms/job/job-form-header.tsx
import { View, Text, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icon } from '@/components/ui/icon';

export function JobFormHeader() {
  return (
    <BlurView intensity={30} tint="dark" className="w-full">
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-border/30 mt-8">
        <Pressable className="flex size-10 shrink-0 items-center justify-center rounded-full">
          <Icon name="ArrowLeft" size={24} className="text-foreground" />
        </Pressable>
        <Text className="text-lg font-bold leading-tight tracking-wide text-foreground text-center flex-1">
          Add Job
        </Text>
        <Pressable className="flex h-10 items-center justify-center px-2 rounded-full">
          <Text className="text-destructive text-sm font-bold tracking-wide">Cancel</Text>
        </Pressable>
      </View>
    </BlurView>
  );
}
