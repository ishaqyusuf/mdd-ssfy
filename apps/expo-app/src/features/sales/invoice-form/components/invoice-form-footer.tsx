import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import type { InvoiceFormStep } from "../types";

export function InvoiceFormFooter({
	step,
	canGoBack,
	isSaving,
	validationError,
	onBack,
	onSaveDraft,
	onContinue,
	onSaveFinal,
	onOpenItemsSheet,
	finalActionLabel = "Create Invoice",
	hidden = false,
}: {
	step: InvoiceFormStep;
	canGoBack: boolean;
	isSaving: boolean;
	validationError?: string | null;
	onBack: () => void;
	onSaveDraft: () => void;
	onContinue: () => void;
	onSaveFinal: () => void;
	onOpenItemsSheet?: (() => void) | null;
	finalActionLabel?: string;
	hidden?: boolean;
}) {
	const isReview = step === "review";
	const animatedProgress = useRef(new Animated.Value(hidden ? 1 : 0)).current;

	useEffect(() => {
		Animated.timing(animatedProgress, {
			toValue: hidden ? 1 : 0,
			duration: 180,
			useNativeDriver: true,
		}).start();
	}, [animatedProgress, hidden]);

	const translateY = animatedProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 88],
	});
	const opacity = animatedProgress.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0],
	});
	const runFooterAction = (action: () => void) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
			() => undefined,
		);
		action();
	};

	return (
		<Animated.View
			pointerEvents={hidden ? "none" : "auto"}
			style={{ opacity, transform: [{ translateY }] }}
		>
			<View className="bg-background px-4 pb-4 border-t border-muted pt-2">
				{validationError ? (
					<View className="mb-3 bg-red-50 px-3 py-2">
						<Text className="text-xs font-semibold text-red-700">
							{validationError}
						</Text>
					</View>
				) : null}
				<View className="flex-row items-center gap-2">
					{canGoBack ? (
						<Button
							variant="ghost"
							className="h-11 px-3"
							onPress={() => runFooterAction(onBack)}
						>
							<Text>Back</Text>
						</Button>
					) : null}
					<Button
						variant="ghost"
						className="h-11 flex-1 px-3"
						disabled={isSaving}
						onPress={() => runFooterAction(onSaveDraft)}
					>
						<Icon name="FileText" className="text-foreground" size={16} />
						<Text>{isSaving ? "Saving..." : "Save Draft"}</Text>
					</Button>
					<Button
						className="h-11 flex-1 rounded-lg px-3"
						disabled={isSaving}
						onPress={() => runFooterAction(isReview ? onSaveFinal : onContinue)}
					>
						<Text>{isReview ? finalActionLabel : "Continue"}</Text>
						<Icon
							name={isReview ? "ReceiptText" : "ArrowRight"}
							className="text-primary-foreground"
							size={16}
						/>
					</Button>
					{onOpenItemsSheet ? (
						<Button
							variant="ghost"
							className="h-11 w-11 rounded-lg px-0"
							disabled={isSaving}
							onPress={() => runFooterAction(onOpenItemsSheet)}
						>
							<Icon
								name="ClipboardList"
								className="text-foreground"
								size={18}
							/>
						</Button>
					) : null}
				</View>
			</View>
		</Animated.View>
	);
}
