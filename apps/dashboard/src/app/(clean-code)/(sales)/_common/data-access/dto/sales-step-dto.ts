import { StepMeta } from "@/app-deps/(clean-code)/(sales)/types";

export function transformSalesStepMeta<T>(step: T) {
    let stepMeta = (step as any).meta as StepMeta;
    if (!stepMeta) stepMeta = {} as any;

    if (!stepMeta.priceStepDeps) {
        stepMeta.priceStepDeps = Object.entries(
            (stepMeta as any).priceDepencies || {}
        )
            ?.map(([k, v]) => (v ? k : null))
            .filter(Boolean);
    }

    return {
        ...step,
        meta: stepMeta,
    };
}
