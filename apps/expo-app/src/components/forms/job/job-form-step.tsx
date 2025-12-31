import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { View } from "@/components/ui/view";
import { useJobFormContext } from "@/hooks/use-job-form-2";
import { Text } from "react-native";

export function JobFormStep() {
  const ctx = useJobFormContext();
  return (
    <>
      <View className="flex-1 px-4 gap-4">
        <Label>Job Title*</Label>
        <View classname="border border-border rounded-md px-3 py-2">
          <Text className="text-foreground text-base">
            {ctx.formData.title || "Custom"}
          </Text>
        </View>
        <Label>Description</Label>
        <Textarea />
      </View>
      <View className="pb-8 px-4">
        <Button size="lg" className="w-full">
          <Text className="text-lg font-semibold"> Submit Job</Text>
          <Icon name="ArrowRight" className="text-background" size={20} />
        </Button>
      </View>
    </>
  );
}
