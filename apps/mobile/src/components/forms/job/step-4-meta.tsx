import { JobFormProvider, useJobFormContext } from "@/hooks/use-job-form";
import { Controller } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { Input } from "@/components/ui/input-2";
import { Modal, useModal } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  ChevronRight,
  Home,
  Users,
} from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ProjectSelect } from "./step-1-project";
import { UnitSelect } from "./step-2-unit";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Step3Tasks } from "./step-3-tasks";
import { useJobFormStore } from "@/stores/use-job-form-store";

// const COWORKERS = [
//   { id: "1", name: "John Doe" },
//   { id: "2", name: "Jane Smith" },
//   { id: "3", name: "Peter Jones" },
//   { id: "4", name: "Mary Williams" },
// ];

export function Step4Meta() {
  const ctx = useJobFormContext();
  const form = ctx.form;
  const { showCharges, users, formData } = ctx;
  const store = useJobFormStore();
  const { title, subtitle } = store.form;
  const {
    ref: coworkerModalRef,
    present: presentCoworkerModal,
    dismiss: dismissCoworkerModal,
  } = useModal();
  const {
    ref: projectModalRef,
    present: presentProjectModal,
    dismiss: dismissProjectModal,
  } = useModal();
  const {
    ref: unitsModalRef,
    present: presentUnitsModal,
    dismiss: dismissUnitsModal,
  } = useModal();

  // const [showCharges, setShowCharges] = useState(false);
  // const showCharges = ctx.form.watch("includeAdditionalCharges");

  const _dismissProjectModal = (project) => {
    dismissProjectModal();
    if (project.id) presentUnitsModal();
  };
  const snapPoints = useMemo(
    () => [
      // "50%", "90%",
      "100%",
    ],
    []
  );

  const { id: coWorkerId, name: coWorkerName } = store.form.coWorker || {};
  // const { id: coWorkerId, name: coWorkerName } = formData.coWorker || {};
  const toggleCoworker = useCallback((coworker) => {
    ctx.form.setValue("coWorker.id", coworker.id);
    ctx.form.setValue("coWorker.name", coworker.name);
    store.update("form.coWorker", coworker);
    dismissCoworkerModal();
  }, []);

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-background"
      >
        <ScrollView
          className="mb-[100px]"
          contentContainerStyle={{
            paddingTop: 24,
            paddingBottom: 100,
            paddingHorizontal: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-10">
            {/* Project & Unit */}
            <View className="flex flex-col gap-3">
              <View className="">
                <Text className="px-1 text-lg font-bold tracking-tight text-foreground">
                  Project Details
                </Text>
              </View>
              <View className="rounded-xl border border-border bg-card">
                <Pressable
                  onPress={presentProjectModal}
                  className="flex-row items-center justify-between border-b border-border p-4"
                >
                  <View className="flex-row items-center gap-4">
                    <Building2 className="text-muted-foreground" size={22} />
                    <View>
                      <Text className="text-sm font-medium text-muted-foreground">
                        Project
                      </Text>
                      <Text className="text-base font-semibold text-foreground">
                        {title || "Select a project"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight className="text-muted-foreground" size={20} />
                </Pressable>
                <Pressable
                  onPress={presentUnitsModal}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-4">
                    <Home className="text-muted-foreground" size={22} />
                    <View>
                      <Text className="text-sm font-medium text-muted-foreground">
                        Unit
                      </Text>
                      <Text className="text-base font-semibold text-foreground">
                        {subtitle || "Select a unit"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight className="text-muted-foreground" size={20} />
                </Pressable>
              </View>
            </View>

            {/* Description */}
            <View className="gap-3">
              <Text className="px-1 text-lg font-bold tracking-tight text-foreground">
                Job Description
              </Text>
              <View className="rounded-xl border border-border bg-card">
                <Controller
                  control={form.control}
                  name={"description"}
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <Textarea
                      placeholder="Enter a detailed description of the job, including any special instructions or materials used..."
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value!}
                      className={cn(
                        "h-40 rounded-xl bg-card p-4 text-base text-foreground placeholder:text-muted-foreground",
                        error && "border-destructive"
                      )}
                    />
                  )}
                />
              </View>
            </View>

            {/* Additional Charges */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between px-1">
                <Text className="text-lg font-bold tracking-tight text-foreground">
                  Additional Charges
                </Text>
                <Switch
                  checked={!!showCharges}
                  onCheckedChange={(state) => {
                    ctx.form.setValue("includeAdditionalCharges", state);
                  }}
                />
              </View>
              {showCharges && (
                <View className="overflow-hidden rounded-xl border border-border bg-card">
                  <View className="divide-y divide-border">
                    <View className="p-4">
                      <View className="mt-2 gap-4">
                        <Controller
                          control={form.control}
                          name={`additionalReason`}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Textarea
                              placeholder="Reason for charge (e.g., extra materials, extended labor)"
                              onBlur={onBlur}
                              onChangeText={onChange}
                              value={value!}
                              className="h-24 text-base"
                            />
                          )}
                        />
                        <Controller
                          control={form.control}
                          name={`additionalCost`}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <Input
                              placeholder="Amount ($)"
                              onBlur={onBlur}
                              onChangeText={(e) => {
                                onChange(+e);
                              }}
                              value={value}
                              keyboardType="numeric"
                              className="text-base"
                            />
                          )}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Co-worker */}
            <View className="gap-3">
              <Text className="px-1 text-lg font-bold tracking-tight text-foreground">
                Assign Co-workers | {coWorkerId}
              </Text>
              <View className="gap-4 rounded-xl border border-border bg-card p-4">
                <Pressable
                  onPress={presentCoworkerModal}
                  className="flex-row items-center justify-between rounded-lg border border-dashed border-primary p-4"
                >
                  <Text className="font-semibold text-primary">
                    {coWorkerId ? `${coWorkerName}` : "Select Co-worker"}
                  </Text>
                  <Users className="text-primary" size={20} />
                </Pressable>
              </View>
            </View>
            {/* Co-worker */}
            <View className="gap-3">
              <Text className="px-1 text-lg font-bold tracking-tight text-foreground">
                Tasks
              </Text>
              <Step3Tasks />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        ref={coworkerModalRef}
        title="Assign Co-workers"
        snapPoints={snapPoints}
      >
        <JobFormProvider value={ctx}>
          <ScrollView>
            {[{ id: null, name: "None" }, ...(users?.data || [])]?.map(
              (coworker) => {
                const isSelected = coworker.id === coWorkerId;
                const initials = coworker?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  ?.filter((a, i) => i < 2)
                  .join("");
                return (
                  <Pressable
                    key={coworker.id}
                    onPress={() => toggleCoworker(coworker)}
                    className="flex-row items-center justify-between p-4"
                  >
                    <View className="flex-row items-center space-x-4">
                      <View className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Text className="font-bold text-muted-foreground">
                          {initials}
                        </Text>
                      </View>
                      <Text className="text-lg text-foreground">
                        {coworker.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <View className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="text-primary-foreground" size={16} />
                      </View>
                    )}
                  </Pressable>
                );
              }
            )}
          </ScrollView>
          {/* <View className="border-t border-border p-4">
          <Button onPress={dismissCoworkerModal}>
            <Text>Done</Text>
          </Button>
        </View> */}
        </JobFormProvider>
      </Modal>
      <Modal
        ref={projectModalRef}
        title="Select Project"
        snapPoints={snapPoints}
      >
        <JobFormProvider value={ctx}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 60 }}>
            <ProjectSelect onSelect={_dismissProjectModal} />
          </BottomSheetScrollView>
        </JobFormProvider>
      </Modal>
      <Modal ref={unitsModalRef} title="Select Unit" snapPoints={snapPoints}>
        <JobFormProvider value={ctx}>
          <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 60 }}>
            <UnitSelect onSelect={dismissUnitsModal} />
          </BottomSheetScrollView>
        </JobFormProvider>
      </Modal>
    </>
  );
}
