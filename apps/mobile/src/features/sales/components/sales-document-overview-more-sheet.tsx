import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import type { NewSalesFormType } from "../invoice-form/types";
import { SalesClickListRow } from "./sales-click-list-row";
import type { SalesDocumentOverviewAction } from "./sales-document-overview-actions";

type SalesDocumentOverviewMoreTab = "actions" | "copy";

type SalesDocumentOverviewMoreSheetProps = {
	visible: boolean;
	actions: SalesDocumentOverviewAction[];
	onClose: () => void;
	onSelect: (action: SalesDocumentOverviewAction) => void;
	onCopy: (as: NewSalesFormType) => void;
};

const titles: Record<SalesDocumentOverviewMoreTab, string> = {
	actions: "More options",
	copy: "Copy",
};

export function SalesDocumentOverviewMoreSheet({
	visible,
	actions,
	onClose,
	onSelect,
	onCopy,
}: SalesDocumentOverviewMoreSheetProps) {
	const [tabHistory, setTabHistory] = useState<SalesDocumentOverviewMoreTab[]>(
		[],
	);
	const transition = useRef(new Animated.Value(1)).current;
	const transitionDirectionRef = useRef(1);
	const tab = tabHistory?.[0] || "actions";
	const isMain = tab === "actions";
	const title = titles?.[tab];

	useEffect(() => {
		if (!visible) {
			setTabHistory([]);
			transition.setValue(1);
		}
	}, [transition, visible]);

	useEffect(() => {
		if (!visible || !(tab in titles)) return;

		transition.setValue(0);
		Animated.timing(transition, {
			toValue: 1,
			duration: 180,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [tab, transition, visible]);

	const animatedTabStyle = {
		opacity: transition,
		transform: [
			{
				translateX: transition.interpolate({
					inputRange: [0, 1],
					outputRange: [transitionDirectionRef.current * 16, 0],
				}),
			},
		],
	};

	const openTab = (nextTab: SalesDocumentOverviewMoreTab) => {
		transitionDirectionRef.current = 1;
		setTabHistory((history) => [nextTab, ...history]);
	};

	const goBack = () => {
		transitionDirectionRef.current = -1;
		setTabHistory((history) => history.slice(1));
	};

	const selectCopyType = (as: NewSalesFormType) => {
		onClose();
		onCopy(as);
	};

	return (
		<FloatingBottomSheet
			visible={visible}
			onClose={onClose}
			accessibilityLabel="Sales document options"
		>
			<View className="px-5 pb-5">
				<View className="mb-2 flex-row items-center justify-center">
					{isMain ? (
						<View className="absolute left-0 h-10 w-10" />
					) : (
						<Pressable
							haptic
							accessibilityRole="button"
							accessibilityLabel="Back"
							onPress={goBack}
							className="absolute left-0 h-10 w-10 items-center justify-center rounded-full active:bg-muted"
						>
							<Icon
								name="ChevronLeft"
								className="text-muted-foreground"
								size={19}
							/>
						</Pressable>
					)}
					<Animated.View style={[animatedTabStyle, { maxWidth: "72%" }]}>
						<Text
							numberOfLines={1}
							ellipsizeMode="tail"
							className="text-center text-base font-bold text-foreground"
						>
							{title}
						</Text>
					</Animated.View>
				</View>

				<Animated.View style={animatedTabStyle}>
					{tab === "actions"
						? actions.map((action) => (
								<SalesClickListRow
									key={action.id}
									title={action.label}
									subtitle={action.subtitle}
									icon={action.icon}
									onPress={() => {
										if (action.id === "copy") {
											openTab("copy");
											return;
										}

										onSelect(action);
									}}
								/>
							))
						: null}

					{tab === "copy" ? (
						<>
							<SalesClickListRow
								title="As Order"
								subtitle="Create an order copy"
								icon="ReceiptText"
								onPress={() => selectCopyType("order")}
							/>
							<SalesClickListRow
								title="As Quote"
								subtitle="Create a quote copy"
								icon="FileText"
								onPress={() => selectCopyType("quote")}
							/>
						</>
					) : null}

					<SalesClickListRow
						title="Cancel"
						subtitle="Close this menu"
						icon="X"
						onPress={onClose}
					/>
				</Animated.View>
			</View>
		</FloatingBottomSheet>
	);
}
