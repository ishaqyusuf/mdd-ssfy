import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

import { useModal } from "@/components/ui/modal";
import { AddJobSheet } from "../forms/job/add-job-sheet";
import { useAddJobStore } from "@/stores/use-add-job-store";

export function AddNewJobFAB() {
  const { openSheet } = useAddJobStore((s) => s.actions);

  const { ref, present, dismiss } = useModal();
  return (
    <>
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className=" bg-primary-deep-blue rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-primary-medium-blue"
          onPress={(e) => {
            present();
          }}
        >
          <MaterialIcons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>

      <AddJobSheet ref={ref} />
    </>
  );
}
