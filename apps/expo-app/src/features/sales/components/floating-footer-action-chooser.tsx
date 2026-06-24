import { Icon, type IconKeys } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { SalesClickListRow } from "./sales-click-list-row";

export type FloatingFooterActionChooserOption<TValue extends string> = {
	value: TValue;
	title: string;
	subtitle?: string;
	icon: IconKeys;
};

type FloatingFooterActionChooserProps<TValue extends string> = {
	triggerTitle: string;
	triggerSubtitle?: string;
	triggerIcon: IconKeys;
	options: FloatingFooterActionChooserOption<TValue>[];
	onSelect: (value: TValue) => void;
	cancelTitle?: string;
	cancelSubtitle?: string;
};

export function FloatingFooterActionChooser<TValue extends string>({
	triggerTitle,
	triggerSubtitle,
	triggerIcon,
	options,
	onSelect,
	cancelTitle = "Cancel",
	cancelSubtitle = "Close this menu",
}: FloatingFooterActionChooserProps<TValue>) {
	const [open, setOpen] = useState(false);

	const handleSelect = (value: TValue) => {
		setOpen(false);
		onSelect(value);
	};

	return (
		<>
			<Pressable
				onPress={() => setOpen(true)}
				className="rounded-2xl border border-primary/30 bg-primary/5 p-4 active:opacity-80"
			>
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<View className="rounded-full bg-primary p-2">
							<Icon
								name={triggerIcon}
								className="text-primary-foreground"
								size={18}
							/>
						</View>
						<View>
							<Text className="text-base font-semibold text-foreground">
								{triggerTitle}
							</Text>
							{triggerSubtitle ? (
								<Text className="text-xs text-muted-foreground">
									{triggerSubtitle}
								</Text>
							) : null}
						</View>
					</View>
					<Icon
						name="ChevronRight"
						className="text-muted-foreground"
						size={20}
					/>
				</View>
			</Pressable>

			<Modal
				visible={open}
				transparent
				animationType="fade"
				statusBarTranslucent
				onRequestClose={() => setOpen(false)}
			>
				<View style={styles.overlay}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={cancelTitle}
						onPress={() => setOpen(false)}
						style={StyleSheet.absoluteFill}
					/>
					<View style={styles.footerFrame} pointerEvents="box-none">
						<View className="overflow-hidden rounded-[32px] bg-background">
							<View className="mb-4 mt-3 h-1.5 w-12 self-center rounded-full bg-muted-foreground/25" />
							<View className="px-5 pb-5">
								{options.map((option) => (
									<SalesClickListRow
										key={option.value}
										title={option.title}
										subtitle={option.subtitle}
										icon={option.icon}
										onPress={() => handleSelect(option.value)}
									/>
								))}
								<SalesClickListRow
									title={cancelTitle}
									subtitle={cancelSubtitle}
									icon="X"
									onPress={() => setOpen(false)}
								/>
							</View>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	footerFrame: {
		bottom: Platform.OS === "android" ? 20 : 28,
		left: 8,
		position: "absolute",
		right: 8,
	},
	overlay: {
		backgroundColor: "rgba(0, 0, 0, 0.38)",
		flex: 1,
	},
});
