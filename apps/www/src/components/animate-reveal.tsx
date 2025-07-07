import { motion } from "framer-motion";
export function AnimateReveal({ children, opened }) {
    return (
        <motion.div
            onAnimationStart={(e) => {
                // setShow(true);
            }}
            onAnimationEnd={(e) => {
                console.log("LEAVING>>");
            }}
            onViewportEnter={(e) => {
                // setShow(true);
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: opened ? 1 : 0,
                scale: opened ? 1 : 0,
            }}
            className="border flex sgap-4 items-center rounded-xl bg-white overflow-hidden border-muted-foreground/50 divide-x divide-muted-foreground/50 shadow-xl relative"
        >
            {children}
        </motion.div>
    );
}
