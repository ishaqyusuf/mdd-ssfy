import { cn } from "@/lib/utils";
import { type StyleProp, View, type ViewStyle } from "react-native";

type Props = {
	children?: React.ReactNode;
	className?: string;
	intensity?: number;
	style?: StyleProp<ViewStyle>;
	tint?: string;
};

export function BlurView({ children, className = "", style }: Props) {
	return (
		<View
			className={cn("rounded-lg bg-foreground/30", className)}
			style={style}
		>
			{children}
		</View>
	);
}
