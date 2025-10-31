import { Image } from "expo-image";
import { Button, Platform, ScrollView, StyleSheet, View } from "react-native";

import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";

export default function HomeScreen() {
  const [showAppOptions, setShowAppOptions] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | undefined>(
    undefined
  );
  const pickImageAsync = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowAppOptions(true);
    } else {
      alert("You did not select any image.");
    }
  };
  const links = [
    "fikri-products",
    "obytes",
    "obytes/onboarding",
    "obytes/login",
    "obytes/ui",
    "media-player",
    "posts",
  ];
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      // headerImage={
      //   <Image
      //     source={require("@/assets/images/partial-react-logo.png")}
      //     style={styles.reactLogo}
      //   />
      // }
    >
      <ScrollView>
        {links.map((href) => (
          <ThemedText key={href} type="link">
            <Link href={`/${href}` as any}>{href?.split("-").join(" ")}</Link>
          </ThemedText>
        ))}
      </ScrollView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: "center",
  },
});
