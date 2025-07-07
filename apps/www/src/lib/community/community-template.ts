import { TemplateDesign } from "@/types/community";

export function transformCommunityTemplate(design) {
    // if (!design) return design;
    if (
        Object.values(design).some(e =>
            Object.values(e as any).some(ev => typeof ev === "object")
        )
    ) {
        let newDesign = {};
        Object.entries(design).map(([sec, dt]) => {
            const secD = {};
            if (dt)
                Object.entries(dt).map(([t, { c, v }]) => {
                    secD[t] = v;
                });
            newDesign[sec] = secD;
            // newDesign[k] = v.k;
        });
        // console.log(design);
        // console.log(newDesign);
        return newDesign;
    }
    return design;
}
