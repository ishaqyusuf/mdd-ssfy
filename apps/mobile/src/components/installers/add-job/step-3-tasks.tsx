import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useColorScheme } from "nativewind";
import { Input } from "@/components/ui/input-2";
import { Button } from "@/components/ui/button";
import { LegendList } from "@legendapp/list";
import { useJobFormContext } from "@/hooks/use-job-form";
import { useMemo } from "react";
import { Text } from "@/components/ui/text";
import { consoleLog } from "@gnd/utils";
import { Controller } from "react-hook-form";

export function Step3Tasks() {
  const ctx = useJobFormContext();

  const handleSubmit = () => {
    const values = form.getValues();
    consoleLog("Form value", values);
    Object.entries(values.tasks).map(([a, b]) => {
      if (b.qty) consoleLog(a, b);
    });
    ctx.saveJob(values);
  };
  const formTask = ctx.form.watch("tasks");
  const form = ctx.form;
  const renderItem = ({ item }) => {
    // const taskQty = formTask?.[item.uid]?.qty ?? 0;
    const qtyName = `tasks.${item.uid}.qty` as any;
    // const qty = form.watch(qtyName);
    return (
      <View className="p-4 border-b border-gray-200 dark:border-gray-700 flex-row justify-between items-center">
        <View>
          <Text className="text-lg text-gray-800 dark:text-gray-200">
            {item.title}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Rate: ${item.cost}/unit
          </Text>
        </View>
        {/* <Input className="w-20 h-10 text-center" /> */}
        <View className="w-20">
          <Controller
            control={form.control}
            name={qtyName}
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <>
                <Input
                  placeholder="Qty"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  autoCapitalize="none"
                  keyboardType="numeric"
                  // textContentType="emailAddress"
                  className="font-semibold"
                />
                {error && (
                  <Text className="text-red-500 mt-1">{error.message}</Text>
                )}
              </>
            )}
          />
          {/* <Input
            keyboardType="numeric"
            value={qty}
            onChangeText={(e) => {
              form.setValue(qtyPath, +e);
            }}
            placeholder="Qty"
            placeholderTextColor={
              colorScheme === "dark" ? "#9CA3AF" : "#6B7280"
            }
          /> */}
        </View>
      </View>
    );
  };
  const taskList = useMemo(() => {
    const d =
      ctx?.costData?.list?.filter((c) => !!formTask?.[c?.uid]?.maxQty) || [];
    return d;
  }, [ctx?.costData, formTask]);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* <Form {...form}> */}
        <LegendList
          data={taskList}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            <View className="p-4  bg-white dark:bg-gray-900">
              <Button onPress={handleSubmit}>
                <Text>Submit Job</Text>
              </Button>
            </View>
          }
        />
        {/* </Form> */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
