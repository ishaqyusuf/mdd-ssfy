import { useFormContext } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";

export function FormDebugBtn({}) {
  const { trigger, formState } = useFormContext();
  if (process.env.NODE_ENV === "production") return null;
  return (
    // <Env isDev>
    <div className="px-4">
      <Button
        type="button"
        onClick={() => {
          trigger().then((e) => {
            if (e)
              toast({
                title: "Sucess",
                variant: "success",
              });
            else
              toast({
                title: "Error",
                variant: "destructive",
              });
            const { errors } = formState;
            console.log({
              errors,
            });
          });
        }}
      >
        Debug Submit
      </Button>
    </div>
    // </Env>
  );
}
