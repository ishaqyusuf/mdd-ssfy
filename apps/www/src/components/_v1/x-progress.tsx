import { useEffect, useState } from "react";
import { typedMemo } from "@/lib/hocs/typed-memo";

import { Progress } from "@gnd/ui/progress";

interface Props {
    completed;
    total;
}
function XProgress({ completed, total }: Props) {
    const [percentage, setPercentage] = useState(0);
    const [color, setColor] = useState("gray");

    useEffect(() => {
        const p = ((completed || 0) / (total || 1)) * 100;
        setPercentage(p || 5);
        if (p < 25) {
            setColor("red");
        } else if (p < 50) {
            setColor("yellow");
        } else if (p < 75) {
            setColor("orange");
        } else {
            setColor("green");
        }
    }, [completed, total]);

    return <Progress value={percentage} color={color} className="h-2" />;
}
export default typedMemo(XProgress);

