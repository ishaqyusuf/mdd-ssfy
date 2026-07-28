import { saveSalesSettingUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { createContext, useContext } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useFormDataStore } from "../../../_common/_stores/form-data-store";

export function useSettingsContext() {
	const zus = useFormDataStore();
	const salesSetting = zus?.setting;

	const form = useForm({
		defaultValues: {
			data: salesSetting,
		},
	});
	const arr = useFieldArray({
		control: form.control,
		name: "data.sectionKeys",
		keyName: "_id",
	});
	function createSection(uid) {
		form.setValue(`data.setting.data.route.${uid}`, {
			routeSequence: [{ uid: "" }],
			externalRouteSequence: [],
			config: {
				noHandle: false,
				hasSwing: false,
				addonQty: false,
			},
		});
		arr.append({
			uid,
		});
	}
	return {
		createSection,
		arr,
		form,
		salesSetting,
		zus,
		steps: salesSetting.steps,
		async save() {
			const data = form.getValues();
			const meta = data.data.setting.data;
			await toast.promise(saveSalesSettingUseCase(meta), {
				loading: "Saving...",
				success: "Saved",
				error: (error) =>
					error instanceof Error ? error.message : "Unable to save settings.",
			});
		},
	};
}
type Type = ReturnType<typeof useSettingsContext>;
export const Context = createContext<Type | null>(null);
export const useSettings = () => {
	const context = useContext(Context);
	if (!context) {
		throw new Error("FormSettingsModal context is unavailable.");
	}
	return context;
};
