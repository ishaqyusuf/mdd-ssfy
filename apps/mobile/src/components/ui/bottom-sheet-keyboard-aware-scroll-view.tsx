import {
  createBottomSheetScrollableComponent,
  SCROLLABLE_TYPE,
  type BottomSheetScrollViewMethods,
  type BottomSheetScrollableProps,
} from "@gorhom/bottom-sheet";
import { memo, type ReactElement } from "react";
import type { ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import Reanimated from "react-native-reanimated";

type BottomSheetKeyboardAwareScrollViewProps = ScrollViewProps &
  BottomSheetScrollableProps &
  KeyboardAwareScrollViewProps;

const AnimatedKeyboardAwareScrollView =
  Reanimated.createAnimatedComponent<KeyboardAwareScrollViewProps>(
    KeyboardAwareScrollView,
  );

const BottomSheetKeyboardAwareScrollViewComponent =
  createBottomSheetScrollableComponent<
    BottomSheetScrollViewMethods,
    BottomSheetKeyboardAwareScrollViewProps
  >(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedKeyboardAwareScrollView);

export const BottomSheetKeyboardAwareScrollView = memo(
  BottomSheetKeyboardAwareScrollViewComponent,
) as (props: BottomSheetKeyboardAwareScrollViewProps) => ReactElement;

BottomSheetKeyboardAwareScrollView.displayName =
  "BottomSheetKeyboardAwareScrollView";
