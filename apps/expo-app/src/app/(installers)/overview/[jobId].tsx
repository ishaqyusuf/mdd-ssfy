import { Icon } from "@/components/ui/icon";
import { ScrollView, Text, View } from "react-native";

// All components are in this file as per the instructions.

const Header = () => (
  <View className="sticky top-0 z-30 bg-background px-5 py-4 flex-row items-center gap-4">
    <View className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center">
      <Icon name="ArrowLeft" className="text-foreground" />
    </View>
    <Text className="text-lg font-bold flex-1 text-center text-foreground pr-11">
      Job Overview
    </Text>
  </View>
);

const StatusBadge = () => (
  <View className="flex-row items-center gap-2 mb-2">
    <View className="flex-row items-center gap-1 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
      <View className="h-1.5 w-1.5 rounded-full bg-accent" />
      <Text className="text-accent text-xs font-bold uppercase tracking-wide">
        In Progress
      </Text>
    </View>
    <Text className="text-xs text-muted-foreground font-medium">#JB-4920</Text>
  </View>
);

const InfoCard = () => (
  <View className="bg-card p-5 rounded-[2rem] border border-border relative overflow-hidden">
    <View className="relative z-10 flex flex-col gap-5">
      <View className="flex-row items-start gap-4">
        <View className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
          <Icon name="Building2" className="text-muted-foreground" />
        </View>
        <View>
          <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Project
          </Text>
          <Text className="text-lg font-bold text-foreground leading-tight">
            Sunset Heights Apts
          </Text>
          <Text className="text-sm text-muted-foreground">
            1200 Sunset Blvd, West Wing
          </Text>
        </View>
      </View>
      <View className="w-full h-px bg-border" />
      <View className="flex-row items-start gap-4">
        <View className="h-12 w-12 rounded-2xl bg-background flex items-center justify-center shrink-0 border border-border">
          <Icon name="DoorOpen" className="text-muted-foreground" />
        </View>
        <View>
          <Text className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
            Unit
          </Text>
          <Text className="text-lg font-bold text-foreground leading-tight">
            Unit 4B
          </Text>
          <Text className="text-sm text-muted-foreground">
            Standard 2BR Layout
          </Text>
        </View>
      </View>
    </View>
  </View>
);

const TasksAndChargesCard = () => (
  <View className="bg-card rounded-[2rem] overflow-hidden border border-border">
    <View className="p-6 pb-2 border-b border-border flex-row justify-between items-center bg-background/50">
      <Text className="text-lg font-bold text-foreground">Tasks & Charges</Text>
      <Icon name="ReceiptText" className="text-muted-foreground" />
    </View>
    <View className="p-6 flex flex-col gap-6">
      <View className="flex-row justify-between items-start gap-4">
        <View className="flex-1">
          <Text className="font-bold text-foreground text-sm">
            Base Cabinets Install
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            5 units × $120.00
          </Text>
        </View>
        <Text className="font-bold text-foreground">$600.00</Text>
      </View>
      <View className="flex-row justify-between items-start gap-4">
        <View className="flex-1">
          <Text className="font-bold text-foreground text-sm">
            Wall Cabinets Install
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            4 units × $100.00
          </Text>
        </View>
        <Text className="font-bold text-foreground">$400.00</Text>
      </View>
      <View className="flex-row justify-between items-start gap-4">
        <View className="flex-1">
          <Text className="font-bold text-foreground text-sm">
            Hardware Mounting
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            18 handles × $5.00
          </Text>
        </View>
        <Text className="font-bold text-foreground">$90.00</Text>
      </View>
      {/* This section uses 'destructive' tokens to represent the warning state */}
      <View className="bg-destructive/10 -mx-2 p-3 rounded-xl border border-destructive/20">
        <View className="flex-row justify-between items-start gap-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5 mb-1">
              <Icon
                name="TriangleAlert"
                className="text-destructive text-[18px]"
              />
              <Text className="font-bold text-destructive text-sm">
                Extra: Wall Reinforcement
              </Text>
            </View>
            <Text className="text-xs text-destructive/70 leading-snug">
              Found dry rot behind sink area, required extra backing.
            </Text>
          </View>
          <Text className="font-bold text-destructive">$150.00</Text>
        </View>
      </View>
      <View className="h-px bg-border my-1" />
      <View className="flex-row justify-between items-end">
        <Text className="text-muted-foreground font-medium pb-2 text-sm">
          Total Amount
        </Text>
        <Text className="text-[32px] font-bold text-foreground tracking-tight leading-none">
          $1,240.00
        </Text>
      </View>
    </View>
  </View>
);

const TeamMember = ({
  name,
  role,
  isLead,
}: {
  name: string;
  role: string;
  isLead?: boolean;
}) => (
  <View className="flex-row items-center gap-3 bg-card p-2 pr-5 rounded-full border border-border shrink-0">
    <View className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
      <Text className="text-muted-foreground font-bold text-sm">
        {name.charAt(0)}
      </Text>
    </View>
    <View>
      <Text className="text-sm font-bold leading-none text-foreground">
        {name}
      </Text>
      <Text
        className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${
          isLead ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {role}
      </Text>
    </View>
  </View>
);

const NotesCard = () => (
  // Using 'secondary' for the notes card to differentiate it semantically.
  <View className="bg-secondary p-5 rounded-4xl border border-border mb-8 relative">
    <Icon
      name="Pin"
      className="absolute top-5 right-5 text-foreground/10 text-4xl -rotate-12"
    />
    <Text className="text-sm font-bold text-secondary-foreground flex-row items-center gap-2 mb-2">
      <Icon
        name="StickyNote"
        className="text-secondary-foreground text-[20px]"
      />
      Notes
    </Text>
    <Text className="text-sm text-secondary-foreground/80 italic leading-relaxed pr-6">
      Please make sure to cover the floors in the hallway before bringing in
      tools. The client is very particular about scratches.
    </Text>
  </View>
);

const ActionBar = () => (
  <View className="absolute bottom-0 left-0 w-full bg-card/90 border-t border-border px-5 pb-8 pt-4 z-40">
    <View className="flex-row gap-4">
      <View className="flex-1 h-14 rounded-full border border-border flex items-center justify-center flex-row gap-2">
        <Icon name="FilePenLine" className="text-foreground text-[20px]" />
        <Text className="font-bold text-foreground">Edit Job</Text>
      </View>
      <View className="flex-[1.5] h-14 rounded-full bg-primary flex items-center justify-center flex-row gap-2">
        <Icon
          name="CircleCheck"
          className="text-primary-foreground text-[20px]"
        />
        <Text className="font-bold text-primary-foreground">Mark Complete</Text>
      </View>
    </View>
  </View>
);

export default function JobOverviewScreen() {
  return (
    <View className="flex-1 bg-background">
      <Header />
      <ScrollView contentContainerClassName="p-5 pt-4 gap-6 pb-32">
        <View>
          <StatusBadge />
          <Text className="text-3xl font-bold leading-tight mb-1 text-foreground">
            Kitchen Install
          </Text>
          <Text className="text-muted-foreground font-medium text-sm">
            Created on Nov 15, 2023
          </Text>
        </View>

        <InfoCard />

        <View>
          <Text className="text-lg font-bold mb-3 text-foreground">
            Description
          </Text>
          <Text className="text-muted-foreground leading-relaxed text-sm">
            Complete installation of shaker-style cabinetry in kitchen area.
            Includes mounting of upper and lower cabinets, hardware
            installation, and final alignment adjustments. Ensure all surfaces
            are level before securing.
          </Text>
        </View>

        <TasksAndChargesCard />

        <View>
          <Text className="text-lg font-bold mb-3 text-foreground">
            Assigned Team
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row -mx-5 px-5"
            contentContainerClassName="gap-3 pb-2"
          >
            <TeamMember name="Admin" role="Lead" isLead />
            <TeamMember name="Admin" role="Apprentice" />
          </ScrollView>
        </View>

        <NotesCard />
      </ScrollView>
      <ActionBar />
    </View>
  );
}
