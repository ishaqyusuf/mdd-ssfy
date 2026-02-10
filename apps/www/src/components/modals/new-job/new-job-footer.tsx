import { useJobFormParams } from "@/hooks/use-job-form-params";
import { CustomModal } from "../custom-modal";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Button } from "@gnd/ui/button";

export function NewJobFooter() {
    const { step, setParams } = useJobFormParams();
    const handleBack = () => {
        if (step && step > 1) {
            setParams({
                step: step - 1,
            });
        }
    };
    const onClose = () => {
        setParams(null);
    };
    return (
        <CustomModal.Portal>
            <CustomModal.Footer className=" bg-muted/20 sborder-t border-border  flex justify-between items-center shrink-0">
                <Button
                    onClick={step === 1 ? onClose : handleBack}
                    // className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    variant="outline"
                >
                    {step === 1 ? (
                        "Cancel"
                    ) : (
                        <>
                            <ChevronLeft className="size-4" /> Back
                        </>
                    )}
                </Button>
                <div className="flex-1"></div>
                {/* {step === 5 ? (
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
                    >
                        <CheckCircle2 size={18} />
                        Confirm Assignment
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next Step <ChevronRight size={16} />
                    </button>
                )} */}
                <div className="" id="jobActionButton"></div>
            </CustomModal.Footer>
        </CustomModal.Portal>
    );
}

