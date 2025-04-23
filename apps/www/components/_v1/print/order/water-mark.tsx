"use client";

export function WaterMark() {
    return (
        <div
            className="absolute  ml-56 hidden scale-110 text-center font-bold italic opacity-10"
            id="waterMark"
        >
            <div className="relative border-b border-gray-500">
                <p className="text-8xl">GND</p>
                <span className="static bottom-0 left-0 h-1 w-full bg-gray-500"></span>
            </div>
            <div>
                <p></p>
            </div>
            <p className="font-display py-1.5 text-3xl font-normal">
                Millwork Corp
            </p>
        </div>
    );
}

