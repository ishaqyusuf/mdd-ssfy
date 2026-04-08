import { formatDate, timeAgo } from "@gnd/utils/dayjs";
import { Text, View } from "react-native";
import { Pressable } from "./ui/pressable";
import { getNameInitials } from "@gnd/utils";
import { Status } from "./status";
import { useJobsContext } from "@/context/jobs-context";
import { Icon } from "./ui/icon";
import { cn } from "@/lib/utils";
import { generateJobId } from "@community/utils/job";
import { RouterOutputs } from "@api/trpc/routers/_app";
export type JobItem = RouterOutputs["jobs"]["getJobs"]["data"][number];
export function JobsItem({
  item,
  hideAssigneeName = false,
}: {
  item: JobItem;
  hideAssigneeName?: boolean;
}) {
  const amount = item.amount ? `$${item.amount.toFixed(2)}` : "N/A";
  const isUrgent = false;
  const { admin } = useJobsContext();
  const date = formatDate(item.createdAt);
  return (
    // <View className="px-5">
    <Pressable
      href={`/job/${item.id}`}
      className={`group bg-card rounded-2xl p-5 border  ${
        isUrgent ? "border-destructive" : "border-border"
      } shadow-sm mb-4 mx-4`}
      haptic
      transition
    >
      {/* Header Row */}
      <View className="flex-row justify-between items-start mb-4">
        {/* <View
          className={`flex items-center justify-center rounded-2xl shrink-0 h-14 w-14 bg-muted`}
        >
          <Icon name="Jobs" className="text-muted-foreground" size={28} />
        </View> */}
        <View className={cn("flex-1", !admin ? " flex-row gap-4" : "")}>
          {admin ? (
            <>
              <View className="flex-row items-center gap-2 mb-1.5">
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isUrgent ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {isUrgent ? "Urgent" : generateJobId(item?.id)}
                </Text>
                <View
                  className={`w-1 h-1 rounded-full ${
                    isUrgent ? "bg-destructive" : "bg-muted-foreground"
                  }`}
                />
                <Text className="text-[10px] font-medium text-muted-foreground">
                  {timeAgo(item?.createdAt)}
                </Text>
              </View>
              <Text className="text-card-foreground text-lg uppercase font-bold leading-tight pr-4">
                {item.title} {" | "} {item.subtitle || "Custom"}
              </Text>
            </>
          ) : (
            <>
              <View
                className={`flex items-center justify-center rounded-2xl shrink-0 h-14 w-14 bg-muted`}
              >
                <Icon
                  name="Jobs"
                  className="text-muted-foreground"
                  size={28}
                />
              </View>
              <View className="flex flex-col justify-center">
                <Text className="text-foreground text-lg font-bold leading-tight mb-1">
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  className="text-muted-foreground text-sm font-normal"
                >
                  {/* {subtitle} */}
                  {item.subtitle || item.description}
                </Text>
              </View>
            </>
          )}
        </View>
        <Status value={item?.status} style={"light"} />
      </View>
      {item?.isCustom && (
        <View className="flex-row">
          <Status style={"light"} value={"Custom"}></Status>
        </View>
      )}
      {/* Contractor Row */}
      <View className="flex flex-row items-center border-t border-b border-dashed border-border my-1 py-4">
        {!admin || hideAssigneeName ? (
          <>
            <View className="flex-row items-center gap-2 text-muted-foreground text-sm">
              <Icon
                name={"Calendar"}
                className="text-muted-foreground"
                size={18}
              />
              <Text className="text-foreground"> {date}</Text>
            </View>
          </>
        ) : (
          <View className="items-center gap-3 flex-row flex">
            <View
              className={`h-9 w-9 rounded-full items-center justify-center border border-border  bg-secondary`}
            >
              {/* {job.initials ? ( */}
              <Text className="text-secondary-foreground text-xs font-bold">
                {getNameInitials(item?.user?.name!)}
              </Text>
              {/* ) : (
            <Icon name="UserX" size={15} className="text-muted-foreground" />
          )} */}
            </View>
            <View>
              <Text className="text-xs text-muted-foreground mb-0.5">
                Contractor
              </Text>
              <Text className={`text-sm font-semibold ${"text-foreground"}`}>
                {item?.user?.name}
              </Text>
            </View>
          </View>
        )}
        <View className="flex-1" />
        <View>
          <Text className="text-xl font-semibold">{amount}</Text>
        </View>
      </View>

      {/* <View className="flex-row gap-3 mt-4">
        {job.actions === "review" && (
          <>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
              <Icon name="X" size={16} className="text-muted-foreground mr-2" />
              <Text className="text-muted-foreground font-semibold text-sm">
                Reject
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
              <Icon
                name="Check"
                size={16}
                className="text-primary-foreground mr-2"
              />
              <Text className="text-primary-foreground font-bold text-sm">
                Approve
              </Text>
            </Pressable>
          </>
        )}

        {job.actions === "view" && (
          <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
            <Text className="text-card-foreground font-semibold text-sm mr-2">
              View Details
            </Text>
            <Icon
              name="ArrowRight"
              size={16}
              className="text-card-foreground"
            />
          </Pressable>
        )}

        {job.actions === "assign" && (
          <>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-card border border-border active:opacity-80">
              <Text className="text-card-foreground font-semibold text-sm">
                Details
              </Text>
            </Pressable>
            <Pressable className="flex-1 h-11 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
              <Text className="text-primary-foreground font-bold text-sm">
                Assign Now
              </Text>
            </Pressable>
          </>
        )}
      </View> */}
    </Pressable>
  );
}
