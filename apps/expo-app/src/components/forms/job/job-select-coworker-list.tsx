// apps/expo-app/src/components/forms/job/job-select-project-list.tsx
import { Text, View, TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { LegendList } from "@legendapp/list";
import { getColorFromName, hexToRgba } from "@gnd/utils/colors";

// 1. Make ProjectListItem a "dumb" component that only receives props.

function ListItem({ item }: any) {
  const isCustom = item.id === -1;
  const {
    // selec,
    form,
    formData: { coWorker },
    navigateBack,
  } = useJobFormContext();
  const isSelected = coWorker?.id === item.id;
  const initials = item?.name
    ?.split(" ")
    .map((n) => n[0])
    ?.filter((a, i) => i < 2)
    .join("");
  return (
    <TouchableOpacity
      onPress={(e) => {
        form.setValue(
          "coWorker",
          item.id > 0
            ? item
            : {
                id: null,
                name: "",
              }
        );
        setTimeout(() => {
          navigateBack();
        }, 500);
      }} // Use the passed-in onPress handler
      className={cn(
        "group relative flex-row items-center gap-4 bg-card p-4 rounded-3xl border-2 transition-all my-1",
        isSelected ? "bg-primary" : "border-transparent bg-accent"
      )}
    >
      <View
        style={{
          backgroundColor: hexToRgba(getColorFromName(initials), 0.4),
          // flex: 1,
          width: 48,
          height: 48,
          borderRadius: 100,
          display: "flex",
          // width: "100%",
        }}
      >
        <View className="flex flex-1 items-center justify-center rounded-full overflow-hidden border border-muted-foreground">
          <Text className="font-bold text-foreground">{initials}</Text>
        </View>
      </View>
      {/* <View
        className={cn(
          "flex items-center justify-center rounded-full bg-muted shrink-0",
          isCustom ? "size-14" : "size-12"
        )}
      >
        <Icon
          name={"Zap"}
          className={cn("text-muted-foreground", isCustom && "text-primary")}
          size={isCustom ? 28 : 24}
        />
      </View> */}
      <View className="flex-1 flex-col justify-center">
        <Text
          className={cn(
            "text-base font-medium ",
            isCustom && "text-lg font-bold",
            isSelected ? "text-primary-foreground" : "text-foreground"
          )}
        >
          {item.name}
        </Text>
        <Text
          className={cn(
            "text-sm",
            isSelected ? "text-primary-foreground/75" : "text-muted-foreground"
          )}
        >
          {item.description || "1099"}
        </Text>
      </View>
      <View
        className={cn(
          "shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors",
          isSelected ? "border-primary bg-primary" : "border-border"
        )}
      >
        <Icon
          name="Check"
          className={cn(
            "text-primary-foreground",
            isSelected ? "opacity-100" : "opacity-0"
          )}
          size={16}
        />
      </View>
    </TouchableOpacity>
  );
}

// 2. Move the state management and logic to the parent component.
export function JobSelectCoWorkerList() {
  const { users } = useJobFormContext();

  const customProjectItem = {
    id: -1,
    name: "None",
    description: "No Co-worker applied",
  } as any;

  return (
    <View className="flex flex-1 flex-col px-4 space-y-3">
      <ListItem item={customProjectItem} />

      <LegendList
        data={users?.data!}
        ListHeaderComponent={
          <View className="mt-4">
            <Text className="px-4 text-xs font-bold text-foreground uppercase tracking-wider mb-1">
              Staffs
            </Text>
          </View>
        }
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <ListItem item={item} />}
      />
    </View>
  );
}
