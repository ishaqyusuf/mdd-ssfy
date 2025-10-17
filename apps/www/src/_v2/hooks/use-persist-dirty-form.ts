import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

export default function usePersistDirtyForm() {
    const form = useFormContext();
    const router = useRouter();
    useEffect(() => {
        const dirtyFields = form.formState.dirtyFields;
        const confirmationMessage = "Are you sure you want to leave this page?";
        const dirtyCount = Object.keys(dirtyFields).length;
        const links = document.querySelectorAll("a");
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        };
        const handleClick = (e) => {
            e.preventDefault();
            const alert = confirm(
                "You may have some unsaved changes, Are you sure you want to proceed?"
            );

            if (alert) router.push(e.target.getAttribute("href"));

            // window.removeEventListener("beforeunload", handleBeforeUnload);
            // You may perform additional actions before redirecting
            // router.push(e.target.getAttribute("href"));
        };
        links.forEach((link) => {
            link.removeEventListener("click", handleClick);
        });
        if (dirtyCount) {
            links.forEach((link) => {
                link.addEventListener("click", handleClick);
            });
        }
        return () => {
            links.forEach((link) => {
                link.removeEventListener("click", handleClick);
            });
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [form]);
}
