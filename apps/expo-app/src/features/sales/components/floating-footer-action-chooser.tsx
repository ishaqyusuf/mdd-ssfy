import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { Icon, type IconKeys } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import type { ReactNode } from "react";
import { useState } from "react";
import { View } from "react-native";
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
	renderTrigger?: (props: { open: () => void }) => ReactNode;
};

export function FloatingFooterActionChooser<TValue extends string>({
	triggerTitle,
	triggerSubtitle,
	triggerIcon,
	options,
	onSelect,
	cancelTitle = "Cancel",
	cancelSubtitle = "Close this menu",
	renderTrigger,
}: FloatingFooterActionChooserProps<TValue>) {
	const [open, setOpen] = useState(false);
	const openSheet = () => setOpen(true);

	const handleSelect = (value: TValue) => {
		setOpen(false);
		onSelect(value);
	};

	return (
		<>
			{renderTrigger ? (
				renderTrigger({ open: openSheet })
			) : (
				<Pressable
					haptic
					onPress={openSheet}
					className="rounded-2xl border border-primary/30 bg-primary/5 p-4 active:opacity-90"
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
			)}

			<FloatingBottomSheet
				visible={open}
				onClose={() => setOpen(false)}
				accessibilityLabel={triggerTitle}
			>
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
			</FloatingBottomSheet>
		</>
	);
}
