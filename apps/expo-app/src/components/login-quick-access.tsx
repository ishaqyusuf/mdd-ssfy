import { _trpc } from "@/components/static-trpc";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input-2";
import { Modal, useModal } from "@/components/ui/modal";
import { useColors } from "@/hooks/use-color";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import type { TextStyle } from "react-native";
import { Pressable, Text, View } from "react-native";

type LoginEmployee = {
  email?: string | null;
  id?: number | string | null;
  name?: string | null;
  role?: string | null;
};

type LoginQuickAccessProps = {
  onSelectEmail: (email: string) => void;
  variant?: "default" | "dark";
};

export function LoginQuickAccess({
  onSelectEmail,
  variant = "default",
}: LoginQuickAccessProps) {
  if (!__DEV__) return null;

  return (
    <DevLoginQuickAccess onSelectEmail={onSelectEmail} variant={variant} />
  );
}

function DevLoginQuickAccess({
  onSelectEmail,
  variant = "default",
}: LoginQuickAccessProps) {
  const [employeeSearch, setEmployeeSearch] = useState("");
  const employeesModal = useModal();
  const colors = useColors();
  const textInputStyle: TextStyle = {
    backgroundColor: "transparent",
    color: colors.foreground,
  };
  const employeesQuery = useQuery(
    _trpc.hrm.getQuickLoginEmployees.queryOptions(),
  );
  const loginableEmployees = useMemo(
    () =>
      ((employeesQuery.data ?? []) as LoginEmployee[]).filter(
        (employee) =>
          typeof employee.email === "string" && employee.email.trim(),
      ),
    [employeesQuery.data],
  );
  const filteredEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return loginableEmployees;

    return loginableEmployees.filter((employee) =>
      [employee.name, employee.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employeeSearch, loginableEmployees]);
  const dark = variant === "dark";

  function selectEmployee(employee: LoginEmployee) {
    if (!employee.email) return;
    onSelectEmail(employee.email);
    employeesModal.dismiss();
  }

  return (
    <>
      <View className="absolute bottom-8 left-5 z-50">
        <Pressable
          accessibilityHint={
            loginableEmployees.length
              ? `${loginableEmployees.length} employee logins available`
              : undefined
          }
          accessibilityLabel="Open quick login"
          accessibilityRole="button"
          onPress={employeesModal.present}
          className={`h-14 w-14 items-center justify-center rounded-full border shadow-lg shadow-black/20 active:opacity-80 ${
            dark
              ? "border-zinc-800 bg-[#111]"
              : "border-border bg-card active:bg-muted"
          }`}
        >
          <Icon
            name="Users"
            className={dark ? "text-white" : "text-foreground"}
            size={22}
          />
        </Pressable>
      </View>

      <Modal
        ref={employeesModal.ref}
        title="Employee logins"
        snapPoints={["78%"]}
      >
        <View className="px-5 pb-3">
          <View className="flex-row items-center rounded-2xl border border-border bg-background px-3">
            <Icon name="Search" className="text-muted-foreground" size={18} />
            <Input
              placeholder="Search by name or role"
              autoCapitalize="none"
              autoCorrect={false}
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
              placeholderTextColor={colors.mutedForeground}
              cursorColor={colors.primary}
              selectionColor={colors.primary}
              style={textInputStyle}
              className="h-12 flex-1 border-0 bg-transparent px-3 shadow-none"
            />
          </View>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 36, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {employeesQuery.isPending ? (
            <EmployeePickerMessage title="Loading employees..." />
          ) : employeesQuery.isError ? (
            <EmployeePickerMessage
              title="Unable to load employee logins."
              destructive
            />
          ) : filteredEmployees.length === 0 ? (
            <EmployeePickerMessage
              title="No employee logins found."
              description="Try a different name or role."
            />
          ) : (
            <View className="gap-2">
              {filteredEmployees.map((employee) => {
                const role = employee.role || "No role";
                const initials = getEmployeeInitials(
                  employee.name,
                  employee.email,
                );

                return (
                  <Pressable
                    key={`${employee.id ?? employee.email}`}
                    accessibilityLabel={`Use ${employee.name || employee.email}`}
                    accessibilityRole="button"
                    onPress={() => selectEmployee(employee)}
                    className="min-h-16 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 active:bg-muted"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Text className="text-sm font-black text-primary">
                        {initials}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          className="shrink text-sm font-bold text-foreground"
                          numberOfLines={1}
                        >
                          {employee.name || "Unnamed employee"}
                        </Text>
                        <View className="shrink-0 rounded-full bg-muted px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            {role}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="mt-1 text-xs text-muted-foreground"
                        numberOfLines={1}
                      >
                        {employee.email}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </BottomSheetScrollView>
      </Modal>
    </>
  );
}

function EmployeePickerMessage({
  description,
  destructive,
  title,
}: {
  description?: string;
  destructive?: boolean;
  title: string;
}) {
  return (
    <View
      className={`rounded-2xl border bg-card p-4 ${
        destructive ? "border-destructive/30" : "border-border"
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {title}
      </Text>
      {description ? (
        <Text className="mt-1 text-xs text-muted-foreground">
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function getEmployeeInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
