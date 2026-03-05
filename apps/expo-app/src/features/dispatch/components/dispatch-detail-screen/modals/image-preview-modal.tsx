import { Icon } from "@/components/ui/icon";
import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";

type Props = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
};

export function ImagePreviewModal({ visible, imageUri, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/95">
        <Pressable
          onPress={onClose}
          className="absolute right-4 top-14 z-20 h-10 w-10 items-center justify-center rounded-full bg-black/40"
        >
          <Icon name="X" className="text-white" size={20} />
        </Pressable>

        <Pressable onPress={onClose} className="flex-1 items-center justify-center p-4">
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          ) : null}
        </Pressable>
      </View>
    </Modal>
  );
}
