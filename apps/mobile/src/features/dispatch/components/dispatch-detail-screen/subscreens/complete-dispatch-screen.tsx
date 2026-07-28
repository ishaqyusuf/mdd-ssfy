import { Icon } from "@/components/ui/icon";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import {
	DispatchCompleteForm,
	type DispatchCompleteInput,
} from "../../dispatch-complete-form";

const COMPLETE_DISPATCH_KEYBOARD_BOTTOM_OFFSET = 80;

type Props = {
	insetsTop: number;
	defaultNoteType?: "dispatch" | "pickup";
	defaultReceivedBy: string;
	isSubmitting: boolean;
	onClose: () => void;
	onSubmit: (input: DispatchCompleteInput) => Promise<void> | void;
};

export function CompleteDispatchScreen({
	insetsTop,
	defaultNoteType,
	defaultReceivedBy,
	isSubmitting,
	onClose,
	onSubmit,
}: Props) {
	return (
		<View className="absolute inset-0 z-80 bg-background">
			<View>
				<View className="bg-background px-4 pb-3">
					<View className="flex-row items-center">
						<Pressable
							onPress={onClose}
							className="h-10 w-10 items-center justify-center rounded-full active:bg-muted"
						>
							<Icon name="ArrowLeft" className="text-foreground" size={20} />
						</Pressable>
						<Text className="flex-1 text-center text-lg font-bold tracking-tight text-foreground">
							Complete Dispatch
						</Text>
						<View className="h-10 w-10" />
					</View>
				</View>
			</View>

			<KeyboardAwareScrollView
				bottomOffset={COMPLETE_DISPATCH_KEYBOARD_BOTTOM_OFFSET}
				disableScrollOnKeyboardHide
				className="flex-1"
				contentContainerClassName="px-4 pb-8 pt-5"
				keyboardDismissMode="interactive"
				keyboardShouldPersistTaps="handled"
			>
				<DispatchCompleteForm
					defaultNoteType={defaultNoteType}
					defaultReceivedBy={defaultReceivedBy}
					isSubmitting={isSubmitting}
					onCancel={onClose}
					onSubmit={onSubmit}
				/>
			</KeyboardAwareScrollView>
		</View>
	);
}
