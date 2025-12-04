import { useJobFormContext } from "@/hooks/use-job-form";
import { Controller, useFieldArray } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input-2";
import { Modal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, PlusCircle, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const COWORKERS = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Peter Jones" },
  { id: "4", name: "Mary Williams" },
];

export function Step4Meta() {
  const ctx = useJobFormContext();
  const form = ctx.form;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalCharges",
  });

  const {
    ref: coworkerModalRef,
    present: presentCoworkerModal,
    dismiss: dismissCoworkerModal,
  } = useModal();
  const [selectedCoworkers, setSelectedCoworkers] = useState<typeof COWORKERS>(
    []
  );

  const toggleCoworker = (coworker: { id: string; name: string }) => {
    setSelectedCoworkers((prev) =>
      prev.find((c) => c.id === coworker.id)
        ? prev.filter((c) => c.id !== coworker.id)
        : [...prev, coworker]
    );
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="mb-[100px] px-4"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: 100,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="space-y-6">
            {/* Project & Unit */}
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="mb-4 text-lg font-semibold text-foreground">
                Project Details
              </Text>
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-muted-foreground">
                    Project
                  </Text>
                  <Text className="text-base font-semibold text-foreground">
                    {ctx.projectId}
                  </Text>
                </View>
                <View>
                  <Text className="text-sm font-medium text-muted-foreground">
                    Unit
                  </Text>
                  <Text className="text-base font-semibold text-foreground">
                    {ctx.homeId}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="mb-2 text-lg font-semibold text-foreground">
                Job Description
              </Text>
              <Controller
                control={form.control}
                name={"description"}
                render={({
                  field: { onChange, onBlur, value },
                  fieldState: { error },
                }) => (
                  <Textarea
                    placeholder="Enter a detailed description of the job..."
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value!}
                    className={cn(
                      "h-32 text-base",
                      error && "border-destructive"
                    )}
                  />
                )}
              />
            </View>

            {/* Additional Charges */}
            <View className="rounded-lg border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-foreground">
                  Additional Charges
                </Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => append({ reason: "", charge: "" })}
                >
                  <Icon as={PlusCircle} className="text-primary" />
                </Button>
              </View>
              <View className="mt-4 space-y-4">
                {fields.map((field, index) => (
                  <View
                    key={field.id}
                    className="flex-row items-center space-x-2"
                  >
                    <View className="flex-1">
                      <Controller
                        control={form.control}
                        name={`additionalCharges.${index}.reason`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            placeholder="Reason"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            className="text-base"
                          />
                        )}
                      />
                    </View>
                    <View className="w-28">
                      <Controller
                        control={form.control}
                        name={`additionalCharges.${index}.charge`}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <Input
                            placeholder="Amount"
                            onBlur={onBlur}
                            onChangeText={onChange}
                            value={value}
                            keyboardType="numeric"
                            className="text-base"
                          />
                        )}
                      />
                    </View>
                    <Button
                      variant="ghost"
                      size="icon"
                      onPress={() => remove(index)}
                    >
                      <Icon as={Trash2} className="text-destructive" />
                    </Button>
                  </View>
                ))}
              </View>
            </View>

            {/* Co-worker */}
            <View className="rounded-lg border border-border bg-card p-4">
              <Text className="mb-4 text-lg font-semibold text-foreground">
                Assign Co-workers
              </Text>
              <Button variant="outline" onPress={presentCoworkerModal}>
                <Text>Select Co-workers</Text>
              </Button>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {selectedCoworkers.map((c) => (
                  <View
                    key={c.id}
                    className="flex-row items-center rounded-full bg-secondary px-3 py-1"
                  >
                    <Text className="text-secondary-foreground">{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal ref={coworkerModalRef} title="Assign Co-workers" snapPoints={["50%"]}>
        <ScrollView>
          {COWORKERS.map((coworker) => (
            <Pressable
              key={coworker.id}
              onPress={() => toggleCoworker(coworker)}
              className="flex-row items-center justify-between p-4"
            >
              <Text className="text-lg">{coworker.name}</Text>
              {selectedCoworkers.find((c) => c.id === coworker.id) && (
                <Icon as={Check} className="text-primary" />
              )}
            </Pressable>
          ))}
        </ScrollView>
        <View className="p-4">
          <Button onPress={dismissCoworkerModal}>
            <Text>Done</Text>
          </Button>
        </View>
      </Modal>
    </>
  );
}