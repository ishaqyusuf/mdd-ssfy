import { type PropsWithChildren, forwardRef } from "react";
import {
	ScrollView,
	type ScrollViewProps,
	View,
	type ViewProps,
} from "react-native";

type KeyboardProviderProps = PropsWithChildren<{
	navigationBarTranslucent?: boolean;
	preload?: boolean;
	statusBarTranslucent?: boolean;
}>;

export function KeyboardProvider({ children }: KeyboardProviderProps) {
	return children;
}

export type KeyboardAwareScrollViewProps = ScrollViewProps & {
	bottomOffset?: number;
	disableScrollOnKeyboardHide?: boolean;
};

export const KeyboardAwareScrollView = forwardRef<
	ScrollView,
	KeyboardAwareScrollViewProps
>(function ExpoGoKeyboardAwareScrollView(
	{
		bottomOffset: _bottomOffset,
		disableScrollOnKeyboardHide: _disable,
		...props
	},
	ref,
) {
	return <ScrollView ref={ref} {...props} />;
});

type KeyboardStickyViewProps = ViewProps & {
	offset?: { closed?: number; opened?: number };
};

export const KeyboardStickyView = forwardRef<View, KeyboardStickyViewProps>(
	function ExpoGoKeyboardStickyView({ offset: _offset, ...props }, ref) {
		return <View ref={ref} {...props} />;
	},
);
