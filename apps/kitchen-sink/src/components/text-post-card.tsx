import { Text, TouchableOpacity, View } from "react-native";

// import type { CardProps } from "./type";
// import { useModal } from "./modal";
import { ItemProps } from "@/components/data-list/blog/item";
export const TextPostCard = ({ item: post }: ItemProps) => {
  // const modal = useModal();
  function openModal() {
    console.log("HELLO SHEET");
    // modal.openSheet(
    //   <View>
    //     <Text>HELLO MODAL</Text>
    //   </View>,
    // );
  }
  return (
    <View className="">
      <TouchableOpacity onPress={openModal}>
        <Text className="text-right text-sm leading-relaxed text-white">
          {post.content
            ?.split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .join("\n")}
        </Text>
      </TouchableOpacity>
      {/* <modal.ModalComponent /> */}
    </View>
  );
};
