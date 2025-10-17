import Modal from "@/components/common/modal";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import { useHeightSettingCtx } from "./ctx";

interface Props {
    ctx: LegacyDykeFormStepType;
}
export default function HeightSettingsModal({ ctx }: Props) {
    const context = useHeightSettingCtx(ctx);
    return (
        <Modal.Content>
            <Modal.Header title="Door Height Settings" />
        </Modal.Content>
    );
}
