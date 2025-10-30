import { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import FileSystem from "expo-file-system";

import { getTelegramFileUrl } from "@/lib/get-telegram-file";
// import { useModal } from "./modal";
import { ItemProps } from "./data-list/blog/item";

export const PicturePostCard = ({ item: post }: ItemProps) => {
  //   console.log(post.images);

  const [img, mediumImg] = post.img?.reverse();
  const [imageUri, setImageUri] = useState(null);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const loadImage = async () => {
      console.log("FETCHING>>");
      const fileId = mediumImg?.fileId || img?.fileId;

      const filePath = `${FileSystem.documentDirectory}al-ghurobaa/picture/${fileId}.jpg`;
      const fileExists = await FileSystem.getInfoAsync(filePath);
      //   console.log(">>><");
      if (fileExists.exists) {
        setImageUri(filePath);
        console.log("FROM CACHE");
      } else {
        const { status: _status, url } = await getTelegramFileUrl(img?.fileId); // Fetch image URL via tRPC
        console.log(url);
        setStatus(_status);
        await FileSystem.downloadAsync(url, filePath);
        setImageUri(filePath);
        console.log("CACHED");
      }
    };
    loadImage();
  }, []);
  // const modal = useModal();
  function openModal() {
    // modal.open(
    //   <View>
    //     <Text>HELLO MODAL</Text>
    //   </View>
    // );
  }
  return (
    <View>
      {imageUri && (
        <TouchableOpacity
          onPress={openModal}
          className="m-2 overflow-hidden rounded-xl"
        >
          {/* <Text className="text-white">{JSON.stringify(post.images)}</Text> */}
          <Image height={350} source={{ uri: imageUri }} />
        </TouchableOpacity>
      )}
      {/* <Text className="text-white">{imageUri}</Text> */}
      <View className="m-2 mx-4">
        <Text className="text-lg text-white">{post.content}</Text>
      </View>
    </View>
  );

  //   return imageUri ? <Image source={{ uri: imageUri }} /> : <></>;
};
