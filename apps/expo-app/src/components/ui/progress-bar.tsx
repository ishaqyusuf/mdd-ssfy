import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { View } from 'react-native';

import { Text } from './text';

const progressTrackVariants = cva('w-full overflow-hidden rounded-full bg-muted', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-3.5',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

type ProgressBarProps = Omit<React.ComponentProps<typeof View>, 'children'> &
  VariantProps<typeof progressTrackVariants> & {
    value: number;
    label: string;
    info?: string;
    min?: number;
    max?: number;
    trackClassName?: string;
    fillClassName?: string;
    labelClassName?: string;
    valueClassName?: string;
  };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function ProgressBar({
  value,
  label,
  info,
  min = 0,
  max = 100,
  size,
  className,
  trackClassName,
  fillClassName,
  labelClassName,
  valueClassName,
  ...props
}: ProgressBarProps) {
  const safeMax = Math.max(max, min);
  const safeValue = clamp(value, min, safeMax);
  const total = safeMax - min;
  const percent = total > 0 ? ((safeValue - min) / total) * 100 : 0;
  const visualPercent = total > 0 && percent > 0 ? Math.max(percent, 6) : 0;
  const progressColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6'];
  const colorIndex = Math.min(4, Math.floor(percent / 20));
  const fillColor = progressColors[colorIndex];
  const baseValue = Math.round(safeValue - min);
  const totalValue = Math.round(total);
  const infoText = info ? `${baseValue}/${totalValue} ${info}` : null;

  return (
    <View className={cn('w-full gap-2', className)} {...props}>
      <View className="flex-row items-center justify-between">
        <Text className={cn('text-sm font-medium text-foreground', labelClassName)}>{label}</Text>
        {infoText ? <Text className={cn('text-sm font-semibold text-foreground', valueClassName)}>{infoText}</Text> : null}
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min, max: safeMax, now: safeValue }}
        className={cn(progressTrackVariants({ size }), trackClassName)}
      >
        <View
          className={cn('h-full rounded-full', fillClassName)}
          style={{ width: `${visualPercent}%`, backgroundColor: fillColor }}
        />
      </View>
    </View>
  );
}

export { ProgressBar };
;
