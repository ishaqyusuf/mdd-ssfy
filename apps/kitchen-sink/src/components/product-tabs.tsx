import { ScrollView } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { useProductLayoutTabs } from "@/hooks/use-product-layout";
import { Link } from "expo-router";
import { cn } from "@/lib/utils";

export function ProductTabs() {
  const tabs = useProductLayoutTabs();
  return (
    <ScrollView horizontal showsVerticalScrollIndicator={false}>
      <ThemedView className="flex-row border-b border-muted px-2 gap-4">
        {tabs.map((tab, ti) => (
          <TabItem key={ti} {...tab} />
        ))}
        {/* <TabItem>All Products</TabItem>
        <TabItem>Coupons</TabItem>
        <TabItem>Shipping Rate</TabItem>
        <TabItem>Tax Rates</TabItem> */}
      </ThemedView>
    </ScrollView>
  );
}
function TabItem({ title, link, active }) {
  return (
    <ThemedView
      className={cn(
        "p-2 border-b-2 border-b-transparent",
        active && "border-blue-500"
      )}
    >
      <Link href={link}>
        <ThemedText
          type="default"
          className={cn("text-muted-foreground", active && "font-semibold")}
        >
          {title}
        </ThemedText>
      </Link>
    </ThemedView>
  );
}
