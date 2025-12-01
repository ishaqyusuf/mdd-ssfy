import { MaterialIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useAddJobStore } from "../../../stores/use-add-job-store";
import { AddJobSheet } from "../add-job/add-job-sheet";
import { useModal } from "@/components/ui/modal";

export function AddNewJobFAB() {
  const { openSheet } = useAddJobStore((s) => s.actions);

  const { ref, present } = useModal();
  return (
    <>
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          className=" bg-primary-deep-blue rounded-full w-16 h-16 items-center justify-center shadow-lg active:bg-primary-medium-blue"
          onPress={(e) => {
            openSheet();
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
