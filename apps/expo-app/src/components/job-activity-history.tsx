import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "date-fns";
import { Text, View } from "react-native";

const TimelineItem = ({
  title,
  time,
  subtitle,
  highlightName,
  comment,
  isLatest,
  isLast,
}: {
  title: string;
  time: string;
  subtitle: React.ReactNode;
  highlightName?: string;
  comment?: string;
  isLatest?: boolean;
  isLast?: boolean;
}) => (
  <View className="relative pl-8">
    {/* Line */}
    {!isLast && (
      <View className="absolute left-[11px] top-4 bottom-[-32px] w-[2px] bg-white/10" />
    )}

    {/* Dot */}
    <View
      className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-muted z-10 ${isLatest ? "bg-success" : "bg-muted-foreground"}`}
    />
    <View className="absolute top-1 h-full w-[0.5px] bg-muted-foreground/30 my-2 left-[10px]" />

    <View className="flex-col pb-8">
      <View className="flex-row justify-between items-start mb-0.5">
        <Text className="text-foreground font-bold text-sm">{title}</Text>
        <Text className="text-muted-foreground text-[10px] font-medium uppercase">
          {time}
        </Text>
      </View>

      <Text className="text-muted-foreground text-xs mt-0.5">{subtitle}</Text>

      {comment && (
        <View className="mt-3 p-3 bg-muted rounded-lg border border-muted-foreground/20">
          <Text className="text-muted-foreground text-xs italic leading-relaxed">
            {comment}
          </Text>
        </View>
      )}
    </View>
  </View>
);

export const JobActivityHistory = ({ jobId }) => {
  const { data: activities } = useQuery(
    useTRPC().jobs.getJobActivityHistory.queryOptions({ jobId }),
  );
  if (!activities || activities?.length === 0) return null;
  return (
    <View className=" ">
      <Text className="text-lg font-bold mb-3 text-foreground">
        Activity History
      </Text>
      <View className="p-4 bg-card rounded-2xl">
        {activities.map((activity, index) => {
          return (
            <TimelineItem
              key={activity.id}
              title={activity.title}
              time={formatDate(new Date(activity.createdAt), "PP, p")}
              subtitle={
                <Text>
                  by{" "}
                  <Text className="text-success font-semibold">
                    {activity.performedBy}
                  </Text>
                </Text>
              }
              comment={activity.comment}
              isLatest={index === 0}
              isLast={index === activities.length - 1}
            />
          );
        })}
        <TimelineItem
          title="Job Submitted for Approval"
          time="Today, 2:45 PM"
          subtitle={
            <Text>
              Performed by{" "}
              <Text className="text-success font-semibold">John Doe</Text>{" "}
              (Contractor)
            </Text>
          }
          comment="All electrical tests completed successfully. Site is ready for final inspection."
          isLatest
        />
        <TimelineItem
          title="Job Started"
          time="Today, 9:15 AM"
          subtitle={
            <Text>
              Performed by{" "}
              <Text className="text-success font-semibold">John Doe</Text>
            </Text>
          }
        />
        <TimelineItem
          title="Job Assigned to Contractor"
          time="Oct 23, 4:20 PM"
          subtitle={
            <Text>
              Assigned by{" "}
              <Text className="text-success font-semibold">Sarah Smith</Text>{" "}
              (Admin)
            </Text>
          }
        />
        <TimelineItem
          title="Job Created"
          time="Oct 23, 11:00 AM"
          subtitle={
            <Text>
              Created by{" "}
              <Text className="text-success font-semibold">System Admin</Text>
            </Text>
          }
          isLast
        />
      </View>
    </View>
  );
};
