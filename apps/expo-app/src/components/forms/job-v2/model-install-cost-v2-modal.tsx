import {
  InstallCostForm,
  type InstallCostFormProps,
} from "./install-cost-form";

export type ModelInstallCostV2StepProps = InstallCostFormProps;

export function ModelInstallCostV2Step(props: ModelInstallCostV2StepProps) {
  return <InstallCostForm {...props} />;
}
