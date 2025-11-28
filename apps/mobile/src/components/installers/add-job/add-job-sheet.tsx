import React, { useMemo } from "react";

import { useAddJobStore } from "../../../stores/use-add-job-store";
import { Step1Project } from "./step-1-project";
import { Step2Unit } from "./step-2-unit";
import { Step3Tasks } from "./step-3-tasks";
import { Modal } from "@/components/ui/modal";

export function AddJobSheet({ ref }) {
  const step = useAddJobStore((s) => s.step);
  // const { ref, present, dismiss } = useModal();
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Project />;
      case 2:
        return <Step2Unit />;
      case 3:
        return <Step3Tasks />;
      default:
        return null;
    }
  };
  return (
    <Modal snapPoints={snapPoints} title="Add New Job" ref={ref}>
      {renderStep()}
    </Modal>
  );
}
