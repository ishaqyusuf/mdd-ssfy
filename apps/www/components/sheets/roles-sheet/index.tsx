import { useRolesParams } from "@/hooks/use-roles-params";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { SheetHeader, SheetTitle } from "@gnd/ui/sheet";
import Button from "@/components/common/button";
import { motion } from "framer-motion";
export default function RolesSheet({}) {
    const { params, setParams } = useRolesParams();
    const size = params.roleForm ? "5xl" : "xl";
    return (
        <CustomSheet
            floating
            rounded
            size={size}
            open={!!params.viewRoles}
            onOpenChange={(e) => setParams(null)}
            sheetName="roles"
        >
            <SheetHeader>
                <SheetTitle>Roles</SheetTitle>
            </SheetHeader>
            <div className="flex flex-1 overflow-hidden">
                <CustomSheetContent className="">
                    <div className="">
                        <Button
                            onClick={(e) => {
                                setParams({
                                    roleForm: true,
                                });
                            }}
                        >
                            Form
                        </Button>
                    </div>
                    <div className="h-screen"></div>
                </CustomSheetContent>
                {!params.roleForm || (
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-l-2 bg-red-400 w-full max-w-[600px]"
                    >
                        <CustomSheetContent className="border-l-2 bg-red-400">
                            <div>ABC</div>
                            <Button
                                onClick={(e) => {
                                    setParams({
                                        roleForm: null,
                                    });
                                }}
                            >
                                Close Form
                            </Button>
                        </CustomSheetContent>
                    </motion.div>
                )}
            </div>
        </CustomSheet>
    );
}
