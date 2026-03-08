import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text, View } from "react-native";
import { NeoCard } from "@/components/forms/job-v2/ui/neo-card";
import { JOB_ALERT_CONFIG, JobAlertType } from "./config";

type JobAlertViewProps = {
  alert: JobAlertType;
  jobId: number;
  onGoHome: () => void;
  onCreateJob: () => void;
  onViewJob: () => void;
};

function toneClasses(alert: JobAlertType) {
  const tone = JOB_ALERT_CONFIG[alert].tone;
  if (tone === "danger") {
    return {
      card: "border-destructive/30 bg-destructive/10",
      badge: "bg-destructive/20",
      badgeText: "text-destructive",
      icon: "TriangleAlert",
    };
  }
  if (tone === "info") {
    return {
      card: "border-primary/30 bg-primary/10",
      badge: "bg-primary/20",
      badgeText: "text-primary",
      icon: "Info",
    };
  }
  return {
    card: "border-primary/30 bg-primary/10",
    badge: "bg-primary/20",
    badgeText: "text-primary",
    icon: "CheckCircle2",
  };
}

export function JobAlertView({
  alert,
  jobId,
  onGoHome,
  onCreateJob,
  onViewJob,
}: JobAlertViewProps) {
  const config = JOB_ALERT_CONFIG[alert];
  const tone = toneClasses(alert);
  const isRequestSubmitted = alert === "request-submitted";

  return (
    <View className="flex-1 justify-center gap-3 px-4 pb-6">
      <NeoCard className={`items-center py-10 ${tone.card}`}>
        <View
          className={`mb-4 h-16 w-16 items-center justify-center rounded-full ${tone.badge}`}
        >
          <Icon name={tone.icon as any} className={tone.badgeText} size={28} />
        </View>
        <Text className={`text-center text-xs uppercase tracking-[1.2px] ${tone.badgeText}`}>
          {config.subtitle}
        </Text>
        <Text className="mt-1 text-center text-2xl font-black text-foreground">
          {config.title}
        </Text>
        <Text className="mt-2 px-4 text-center text-sm leading-5 text-muted-foreground">
          {config.description}
        </Text>
        <View className="mt-4 rounded-full border border-border bg-card px-4 py-2">
          <Text className="text-xs font-semibold text-foreground">Job #{jobId}</Text>
        </View>
      </NeoCard>

      <Button onPress={onViewJob} className="h-12 rounded-2xl bg-primary">
        <Icon name="Eye" className="text-primary-foreground" size={16} />
        <Text className="text-primary-foreground">View Job</Text>
      </Button>

      <Button onPress={onCreateJob} variant="outline" className="h-12 rounded-2xl border-border bg-background">
        <Icon name="PlusCircle" className="text-foreground" size={16} />
        <Text className="text-foreground">
          {isRequestSubmitted ? "Create New Job" : "Create Another Job"}
        </Text>
      </Button>

      <Button onPress={onGoHome} variant="outline" className="h-12 rounded-2xl border-border bg-background">
        <Icon name="House" className="text-foreground" size={16} />
        <Text className="text-foreground">Go Back Home</Text>
      </Button>
    </View>
  );
}

