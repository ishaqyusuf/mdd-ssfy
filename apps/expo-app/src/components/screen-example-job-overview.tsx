import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "./ui/icon";
import { SafeArea } from "./safe-area";

/**
 * Semantic Avatar Component (Initials Only)
 */
const Avatar = ({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) => {
  return (
    <View
      className={`items-center justify-center bg-secondary rounded-full overflow-hidden border border-border ${className}`}
    >
      <Text className="text-secondary-foreground text-xs font-medium uppercase">
        {initials}
      </Text>
    </View>
  );
};

/**
 * Main Job Details Screen
 */
export default function JobOverviewExampleScreen() {
  return (
    <SafeArea>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-border bg-background">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity className="size-10 rounded-full bg-card items-center justify-center border border-border">
            <Icon
              name="ArrowLeft"
              className="text-muted-foreground"
              style={{ size: 20 }}
            />
          </TouchableOpacity>
          <View>
            <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Job #2024-85
            </Text>
            <Text className="text-lg font-bold text-foreground">
              Job Details
            </Text>
          </View>
        </View>
        <Avatar initials="AD" className="size-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
      >
        {/* Main Job Card */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 pr-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon
                  name="Building"
                  className="text-muted-foreground"
                  style={{ size: 14 }}
                />
                <Text className="text-xs font-medium text-muted-foreground">
                  Skyline Apartments • Unit 4B
                </Text>
              </View>
              <Text className="text-2xl font-bold text-foreground leading-tight">
                Kitchen Cabinet Installation
              </Text>
            </View>

            <View className="flex-row items-center px-3 py-1.5 rounded-full bg-secondary border border-border">
              <Icon
                name="Clock"
                className="text-secondary-foreground mr-1.5"
                style={{ size: 12 }}
              />
              <Text className="text-xs font-medium text-secondary-foreground">
                Pending
              </Text>
            </View>
          </View>

          <Text className="text-sm text-muted-foreground leading-relaxed mb-6">
            Full installation of upper and lower shaker-style cabinets. Includes
            hardware installation and minor leveling adjustments.
          </Text>

          <View className="flex-row items-center justify-between pt-4 border-t border-border">
            <View className="flex-row items-center">
              <View className="flex-row -space-x-3 mr-4">
                <Avatar
                  initials="MS"
                  className="size-8 bg-background ring-2 ring-card"
                />
                <Avatar
                  initials="JL"
                  className="size-8 bg-background ring-2 ring-card"
                />
                <View className="size-8 rounded-full bg-muted items-center justify-center ring-2 ring-card border border-border">
                  <Text className="text-[10px] font-medium text-muted-foreground">
                    +1
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground font-medium">
                Assigned Team
              </Text>
            </View>

            <TouchableOpacity className="bg-secondary p-2 rounded-full">
              <Icon
                name="MapPin"
                className="text-secondary-foreground"
                style={{ size: 16 }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Breakdown Section */}
        <View className="bg-card rounded-2xl border border-border mb-6 overflow-hidden">
          <View className="px-6 py-4 border-b border-border bg-muted/20 flex-row items-center gap-3">
            <Icon
              name="Receipt"
              className="text-muted-foreground"
              style={{ size: 18 }}
            />
            <Text className="font-semibold text-foreground">Job Breakdown</Text>
          </View>

          <View className="p-6 gap-5">
            {/* Line Item 1 */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  Base Cabinets Install
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Qty: 8 units
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $480.00
              </Text>
            </View>

            {/* Line Item 2 */}
            <View className="flex-row justify-between items-start">
              <View>
                <Text className="text-sm font-medium text-foreground">
                  Wall Cabinets Install
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Qty: 6 units
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $360.00
              </Text>
            </View>

            {/* Line Item 3 */}
            <View className="flex-row justify-between items-start">
              <View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-foreground">
                    Materials Run
                  </Text>
                  <View className="px-1.5 py-0.5 rounded bg-muted">
                    <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                      Extra
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Home Depot pickup
                </Text>
              </View>
              <Text className="text-sm font-medium text-foreground">
                $45.00
              </Text>
            </View>

            {/* Total Footer */}
            <View className="mt-2 pt-4 border-t border-dashed border-border flex-row justify-between items-center">
              <Text className="text-sm font-medium text-muted-foreground">
                Total Estimate
              </Text>
              <Text className="text-xl font-bold text-accent-foreground">
                $885.00
              </Text>
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6">
          <View className="flex-row items-center gap-2 mb-4">
            <Icon
              name="FileText"
              className="text-muted-foreground"
              style={{ size: 16 }}
            />
            <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Field Notes
            </Text>
          </View>

          <View className="bg-muted/30 p-4 rounded-xl border border-border">
            <Text className="text-sm text-foreground italic leading-relaxed">
              "Client requested soft-close hinges on all doors. I've added this
              to the materials list but need approval for the extra hardware
              cost."
            </Text>
            <View className="flex-row items-center gap-2 mt-3">
              <Avatar initials="MS" className="size-5" />
              <Text className="text-[10px] text-muted-foreground font-medium">
                Mike S. • 2 hours ago
              </Text>
            </View>
          </View>
        </View>

        {/* Admin Review Action Area */}
        <View className="bg-card rounded-2xl p-6 border border-border mb-6 shadow-sm">
          <View className="flex-row items-center gap-3 mb-6">
            <View className="p-2 rounded-lg bg-accent/10">
              <Icon
                name="ShieldCheck"
                className="text-accent-foreground"
                style={{ size: 20 }}
              />
            </View>
            <Text className="text-lg font-bold text-foreground">
              Admin Review
            </Text>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-semibold text-muted-foreground uppercase mb-3">
              Internal Notes
            </Text>
            <TextInput
              className="w-full bg-background border border-border rounded-xl text-sm p-4 text-foreground min-h-[100px]"
              placeholder="Enter notes regarding approval or rejection..."
              placeholderTextColor="hsl(var(--muted-foreground))"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="gap-3">
            <TouchableOpacity className="w-full py-4 px-4 bg-secondary rounded-xl flex-row items-center justify-center gap-2 border border-border">
              <Icon
                name="UserPlus"
                className="text-secondary-foreground"
                style={{ size: 18 }}
              />
              <Text className="text-secondary-foreground font-semibold">
                Re-Assign Job
              </Text>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 py-4 px-4 bg-destructive rounded-xl flex-row items-center justify-center gap-2">
                <Icon
                  name="X"
                  className="text-destructive-foreground"
                  style={{ size: 18 }}
                />
                <Text className="text-destructive-foreground font-semibold">
                  Reject
                </Text>
              </TouchableOpacity>

              <TouchableOpacity className="flex-1 py-4 px-4 bg-accent rounded-xl flex-row items-center justify-center gap-2">
                <Icon
                  name="Check"
                  className="text-accent-foreground"
                  style={{ size: 18 }}
                />
                <Text className="text-accent-foreground font-semibold">
                  Approve
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-border flex-row justify-between items-center px-6 pt-3 pb-8">
        <TouchableOpacity className="items-center gap-1.5 w-16">
          <Icon
            name="LayoutGrid"
            className="text-muted-foreground"
            style={{ size: 24 }}
          />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center gap-1.5 w-16">
          <Icon
            name="ClipboardList"
            className="text-foreground"
            style={{ size: 24 }}
          />
          <Text className="text-[10px] font-medium text-foreground">Jobs</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center gap-1.5 w-16">
          <Icon
            name="Users"
            className="text-muted-foreground"
            style={{ size: 24 }}
          />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Teams
          </Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center gap-1.5 w-16">
          <Icon
            name="Settings"
            className="text-muted-foreground"
            style={{ size: 24 }}
          />
          <Text className="text-[10px] font-medium text-muted-foreground">
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeArea>
  );
}
