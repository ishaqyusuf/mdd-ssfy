// apps/expo-app/src/components/forms/job/job-select-project-list.tsx
import { Text, View, TouchableOpacity } from "react-native";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { LegendList } from "@legendapp/list";
import { getColorFromName, hexToRgba } from "@gnd/utils/colors";
import { getJobType } from "@/lib/job";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";

// 1. Make ProjectListItem a "dumb" component that only receives props.

// 2. Move the state management and logic to the parent component.
export function JobSelectCoWorkerList({ items }) {
  const { users, admin, tab } = useJobFormContext();

  const customProjectItem = {
    id: -1,
    name: "None",
    description: "No Co-worker applied",
  } as any;

  return (
    <View className="flex flex-1 flex-col px-4 space-y-3">
      {tab !== "assign-to" && <ListItem item={customProjectItem} />}

      <LegendList
        // data={users?.data!}
        data={items}
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
function ListItem({ item }: any) {
  const isCustom = item.id === -1;
  const {
    // selec,
    form,
    formData: { coWorker, worker },
    navigateBack,
    setTab,
    tabHistory,
    tab,
    action,
  } = useJobFormContext();
  const isWorker = tab == "assign-to";
  const w = isWorker ? worker : coWorker;
  const isSelected = w?.id === item.id;
  const initials = item?.name
    ?.split(" ")
    .map((n) => n[0])
    ?.filter((a, i) => i < 2)
    .join("");
  const { mutate: reAssignMutation, isPending: isReAssigning } = useMutation(
    _trpc.jobs.reAssignJob.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
  return (
    <TouchableOpacity
      onPress={(e) => {
        if (action === "re-assign") {
          reAssignMutation({
            jobId: form,
          });
          return;
        }
        const value =
          item.id > 0
            ? item
            : {
                id: null,
                name: "",
              };

        form.setValue(isWorker ? "worker" : "coWorker", value);
        if (isWorker) {
          form.setValue("type", getJobType(item?.role));
        }
        setTimeout(() => {
          if (isWorker && tabHistory?.length === 1) {
            setTab("project");
          } else navigateBack();
        }, 500);
      }} // Use the passed-in onPress handler
      className={cn(
        "group relative flex-row items-center gap-4  p-4 rounded-3xl border-2 transition-all my-1 ",
        isSelected
          ? "bg-primary/30 border-primary"
          : "border-transparent bg-card"
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
