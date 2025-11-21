import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { generateRandomNumber, selectRandomItem } from "@/lib/utils";
import { ThemedView } from "@/components/ThemedView";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { colorsObject, hexToRgba } from "@/lib/colors";
import { StatusBar } from "expo-status-bar";
import Slider from "@react-native-community/slider";
import { usePlayerStore } from "@/store/media-player";
import { MaterialCommunityIcons } from "@expo/vector-icons";
export default function FikriProducts() {
  const [refreshing] = useState(false);
  const trpc = useTRPC();
  const { data, error } = useQuery(
    trpc.podcasts.hello.queryOptions({
      message: "Hello---",
    })
  );

  const products = [...Array(20)].map((_, id) => ({
    id,
    title: `Product - ${id}`,
    status: selectRandomItem("Published", "Draft", "Inactive"),
    type: selectRandomItem(["Item", "Service"]),
    price: generateRandomNumber(3),
  }));
  const p = usePlayerStore();
  const [position, setPosition] = useState(0);
  return (
    <ThemedView
      className="flex-1 flex-col flex"
      style={{}}
      // refreshControl={
      //   <RefreshControl onRefresh={() => {}} refreshing={refreshing} />
      // }
    >
      <StatusBar hidden={false} style="light" />
      <ThemedView className="flex-1  flex-col">
        <ScrollView className="">
          {[...Array(40)].map((a, i) => (
            <ThemedView className="px-4" key={i}>
              <ThemedText>Example note {i}</ThemedText>
              <MaterialCommunityIcons
                name="star-outline"
                size={24}
                color="white"
              />
            </ThemedView>
          ))}
          <View className="pb-56" />
        </ScrollView>
      </ThemedView>
      <ThemedView
        style={{
          backgroundColor: "transparent",
        }}
        className="absolute w-full bottom-0 flex flex-col"
      >
        <View className="bg-black/80 absolute inset-0" />
        {/* <ProductSearchSection />
        <ThemedText>
          {JSON.stringify({
            data,
            error,
            url: getBaseUrl(),
          })}
        </ThemedText>
        {products?.map((product) => (
          <ProductItem product={product} key={product.id} />
        ))} */}
        <View className="flex flex-col mx-4">
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={0}
            maximumValue={100}
            value={position}
            minimumTrackTintColor="#1EB1FC"
            maximumTrackTintColor="#ccc"
            thumbTintColor="white"
            onValueChange={setPosition}
          />
          <View className="flex-row">
            <Text className="text-muted-foreground font-bold text-xs">
              00:00:02
            </Text>
            <View className="flex-1" />
            <Text className="text-muted-foreground font-bold text-xs">
              00:03:02
            </Text>
            <View className="flex-1" />
            <Text className="text-muted-foreground font-bold text-xs">
              00:03:02
            </Text>
          </View>
        </View>
        <View className="flex flex-row gap-4 items-center justify-center">
          <Pressable
            onPress={(e) => {
              // setOpened(!opened);
            }}
            className=""
          >
            <IconSymbol
              name="gobackward.5"
              color={hexToRgba(colorsObject.gray, 0.9)}
              // className={cn(opened ? "rotate-180" : "rotate-90")}
              size={42}
            />
          </Pressable>
          <ThemedView>
            <Pressable
              onPress={(e) => {
                // setOpened(!opened);
              }}
              className=""
            >
              <IconSymbol
                name="play"
                color={hexToRgba(colorsObject.gray, 0.9)}
                // className={cn(opened ? "rotate-180" : "rotate-90")}
                size={74}
              />
            </Pressable>
          </ThemedView>
          <Pressable
            onPress={(e) => {
              // setOpened(!opened);
            }}
            className=""
          >
            <IconSymbol
              name="goforward.5"
              color={hexToRgba(colorsObject.gray, 0.9)}
              // className={cn(opened ? "rotate-180" : "rotate-90")}
              size={42}
            />
          </Pressable>
        </View>
        <View className="py-8 px-4 flex flex-row justify-between">
          <Pressable
            onPress={(e) => {
              // setOpened(!opened);
            }}
            className=""
          >
            <IconSymbol
              name="bookmark"
              color={hexToRgba(colorsObject.gray, 0.9)}
              // className={cn(opened ? "rotate-180" : "rotate-90")}
              size={24}
            />
          </Pressable>
          <Pressable
            onPress={(e) => {
              // setOpened(!opened);
            }}
            className=""
          >
            <IconSymbol
              name="bookmark.fill"
              color={hexToRgba(colorsObject.gray, 0.9)}
              // className={cn(opened ? "rotate-180" : "rotate-90")}
              size={24}
            />
          </Pressable>
        </View>
      </ThemedView>
    </ThemedView>
  );
}
