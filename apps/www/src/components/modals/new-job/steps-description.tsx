import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";

export function StepsDescription({}) {
    const { stepCount } = useJobStepInfo();
    const { step = 1 } = useJobFormParams();
    return (
        <span className="flex items-center gap-2 mt-1">
            {[...Array(stepCount)].map((_, i) => (
                <span
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors ${step >= i + 1 ? "bg-primary" : "bg-muted"}`}
                />
            ))}
            <span className="text-xs font-medium text-muted-foreground ml-2">
                Step {step} of {stepCount}
            </span>
        </span>
    );
}

