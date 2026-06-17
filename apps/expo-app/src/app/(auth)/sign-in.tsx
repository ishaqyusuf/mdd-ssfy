import { LoginTemplate0 } from "@/components/login-template-0";
import { LoginTemplate1 } from "@/components/login-template-1";
import { Icon } from "@/components/ui/icon";
import { Modal, useModal } from "@/components/ui/modal";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

const TEMPLATES = [
	{
		id: 0,
		name: "Operator Access",
		description: "Dark ProDesk card with quick access.",
		Component: LoginTemplate0,
	},
	{
		id: 1,
		name: "Wave Sign In",
		description: "High-contrast black and white concept.",
		Component: LoginTemplate1,
	},
];

export default function SignIn() {
	const [activeIndex, setActiveIndex] = useState(0);
	const designsModal = useModal();
	const activeTemplate = TEMPLATES[activeIndex];
	const ActiveComponent = activeTemplate.Component;

	function selectDesign(index: number) {
		setActiveIndex(index);
		designsModal.dismiss();
	}

	return (
		<View className="relative flex-1">
			<ActiveComponent />

			{__DEV__ && (
				<>
					<View className="absolute bottom-8 right-5 z-50">
						<Pressable
							accessibilityLabel="Open login design switcher"
							accessibilityRole="button"
							onPress={designsModal.present}
							className="h-14 min-w-14 flex-row items-center justify-center gap-2 rounded-full border border-border bg-card px-4 shadow-lg shadow-black/20 active:bg-muted"
						>
							<Icon name="LayoutGrid" className="text-foreground" size={20} />
							<Text className="text-sm font-bold text-foreground">Designs</Text>
						</Pressable>
					</View>

					<Modal
						ref={designsModal.ref}
						title="Login designs"
						snapPoints={["42%"]}
					>
						<View className="gap-3 px-5 pb-8 pt-2">
							<Text className="text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
								{TEMPLATES.length} available
							</Text>

							{TEMPLATES.map((template, index) => {
								const isActive = index === activeIndex;

								return (
									<Pressable
										key={template.id}
										accessibilityLabel={`Switch to ${template.name}`}
										accessibilityRole="button"
										accessibilityState={{ selected: isActive }}
										onPress={() => selectDesign(index)}
										className={`min-h-16 flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:bg-muted ${
											isActive
												? "border-primary bg-primary/10"
												: "border-border bg-card"
										}`}
									>
										<View
											className={`h-10 w-10 items-center justify-center rounded-xl ${
												isActive ? "bg-primary/15" : "bg-muted"
											}`}
										>
											<Icon
												name={isActive ? "Check" : "AppWindow"}
												className={
													isActive ? "text-primary" : "text-muted-foreground"
												}
												size={20}
											/>
										</View>
										<View className="flex-1">
											<Text className="text-base font-bold text-foreground">
												{template.name}
											</Text>
											<Text className="mt-0.5 text-xs leading-5 text-muted-foreground">
												{template.description}
											</Text>
										</View>
									</Pressable>
								);
							})}
						</View>
					</Modal>
				</>
			)}
		</View>
	);
}
