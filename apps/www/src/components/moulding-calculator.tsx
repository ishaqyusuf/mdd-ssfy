import { Button } from "@gnd/ui/button";
import { AlertDialog } from "@gnd/ui/composite";
import { Calculator } from "lucide-react";

export function MouldingCalculator({}) {
    return (
        <AlertDialog>
            <AlertDialog.Trigger asChild>
                <Button
                    onClick={() => {
                        // handleCalculatorOpen('5-1/4" Crown Moulding')
                    }}
                    className=""
                    size="xs"
                    variant="secondary"
                    title="Open Calculator"
                >
                    <Calculator size={16} />
                </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content size="lg">
                <AlertDialog.Header>
                    <AlertDialog.Title>Moulding Calculator</AlertDialog.Title>
                </AlertDialog.Header>
            </AlertDialog.Content>
        </AlertDialog>
    );
}

