import { ISalesOrder, WizardKvForm } from "./sales";

export interface ISalesComponentModal {
  components: WizardKvForm;
  item: ISalesOrder;
  rowIndex: number;
}
