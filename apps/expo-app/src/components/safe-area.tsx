import { Platform, type StyleProp, View, type ViewStyle } from "react-native";
import { _insets } from "./static-trpc";

export function SafeArea({
	children,
	style,
}: {
	children: React.ReactNode;
	style?: StyleProp<ViewStyle>;
}) {
	// const insets = useSafeAreaInsets();
	return (
		// <View className="flex-1">
		<View
			style={[
				style,
				{
					paddingTop: Platform.select({
						android: _insets?.top,
					}),
					flex: 1,
				},
			]}
		>
			{children}
		</View>
		// </View>
	);
}
