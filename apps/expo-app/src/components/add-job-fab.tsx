import { useJobsContext } from "@/context/jobs-context";
import { Pressable } from "react-native";
import { Icon } from "./ui/icon";
import { _push } from "./static-router";

export function AddJobFab() {
  const { admin } = useJobsContext();

  return (
    <Pressable
      onPress={(e) => {
        _push(admin ? "/assign" : "/(installers)/create");
      }}
      className="absolute bottom-24 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center shadow-lg active:opacity-90"
    >
      <Icon name="Plus" className="text-primary-foreground" size={28} />
    </Pressable>
  );
}
