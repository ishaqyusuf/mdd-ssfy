import { Card } from "@gnd/ui/card";
import { Loader2 } from "lucide-react";

export function SquareTokenCheckoutSkeleton() {
    return (
        <Card className="p-8 shadow-lg">
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-20 animate-pulse" />
                    <Loader2 className="w-16 h-16 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
                <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Validating Payment
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Please wait while we verify your payment token...
                    </p>
                </div>
            </div>
        </Card>
    );
}

