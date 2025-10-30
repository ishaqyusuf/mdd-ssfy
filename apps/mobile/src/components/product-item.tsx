import { colorsObject, getColorFromName, hexToRgba } from "@/lib/colors";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { IconSymbol } from "./ui/IconSymbol";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { getIcon } from "@/lib/icon";

interface Props {
  product?;
}

export function ProductItem(props: Props) {
  const [opened, setOpened] = useState(false);
  const icon = getIcon(props.product.status);
  return (
    <ThemedView
      className="m-2 mx-4 rounded-lg bg-red-400!  flex-row flex-1 gap-4 p-4"
      darkColor={colorsObject.ashGray}
    >
      <ThemedView className="size-12 border border-muted rounded-xl"></ThemedView>
      <View className="flex-1">
        <View className="h-16 border-b flex-row border-muted">
          <View className="flex-col flex-1">
            <ThemedText className="font-semibold">
              {props?.product?.title}
            </ThemedText>
            <View className="flex-row gap-2">
              <View
                className="rounded-full items-center flex-row gap-1 px-1.5"
                style={{
                  backgroundColor: getColorFromName(props.product?.status, 0.1),
                }}
              >
                {!icon || (
                  <IconSymbol
                    name={icon}
                    color={getColorFromName(props.product?.status)}
                    size={16}
                  />
                )}
                <ThemedText
                  className="font-semibold"
                  style={{
                    color: getColorFromName(props.product?.status),
                    fontSize: 14,
                  }}
                >
                  {props?.product?.status}
                </ThemedText>
              </View>
              <ThemedText className="text-muted-foreground font-semibold">
                •
              </ThemedText>
              <ThemedText className="text-muted-foreground font-semibold">
                {props?.product?.type}
              </ThemedText>
            </View>
          </View>
          <View className="flex-row items-center">
            <IconSymbol name="ellipsis" size={24} color={colorsObject.gray} />
          </View>
        </View>
        <View
          className={cn(
            "flex-row py-2 gap-4 justify-between items-center",
            opened && "border-b border-muted"
          )}
        >
          <ThemedText className="text-muted-foreground">Price</ThemedText>
          <ThemedText className="font-semibold">
            {props.product.price} USD
          </ThemedText>
          <Pressable
            onPress={(e) => {
              setOpened(!opened);
            }}
            className=""
          >
            <IconSymbol
              name="chevron.right"
              color={hexToRgba(colorsObject.gray, 0.9)}
              className={cn(opened ? "rotate-180" : "rotate-90")}
              size={24}
            />
          </Pressable>
        </View>
        {!opened || (
          <View className="pt-2">
            {[
              ["Total Sales", 10],
              ["Total Revenue", "2.00 USD"],
              ["Created at", "Sept 01, 2025 3:23 PM"],
            ].map(([label, value], i) => (
              <View
                key={i}
                className={cn(
                  "flex-row py-2 gap-4 justify-between items-center"
                )}
              >
                <ThemedText className="text-muted-foreground">
                  {label}
                </ThemedText>
                <ThemedText className="font-semibold">{value}</ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </ThemedView>
  );
}
