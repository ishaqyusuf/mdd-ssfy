import React, { useEffect, useRef, useState } from "react";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";

interface TextWithTooltipProps {
    text: string | number;
    className?: string;
}

export function TextWithTooltip({ text, className }: TextWithTooltipProps) {
    const [isTruncated, setIsTruncated] = useState<boolean>(false);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                const { scrollWidth, clientWidth } = textRef.current;
                setIsTruncated(scrollWidth > clientWidth);
            }
        };

        checkTruncation();
        window.addEventListener("resize", checkTruncation);

        return () => {
            window.removeEventListener("resize", checkTruncation);
        };
    }, []);

    // REMiNDER: check if that is the correct way to handle this
    if (!isTruncated)
        return (
            <div ref={textRef} className={`truncate ${className}`}>
                {text}
            </div>
        );

    return (
        <TooltipProvider disableHoverableContent delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* <div className="inline-flex"> */}
                    <div ref={textRef} className={`truncate ${className}`}>
                        {text}
                    </div>
                    {/* {String(text)?.slice(-5)} */}
                    {/* </div> */}
                </TooltipTrigger>
                <TooltipContent className="max-w-[20vw]">{text}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export default TextWithTooltip;
