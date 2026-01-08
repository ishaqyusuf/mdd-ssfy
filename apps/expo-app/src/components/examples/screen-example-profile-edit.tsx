import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { Icon, IconKeys, IconProps } from "../ui/icon";

interface ProfileProps {
  onBack: () => void;
  onSave: () => void;
}

export default function ProfileExampleScreen() {
  const { onBack, onSave } = {
    onBack: () => {},
    onSave: () => {},
  };
  const [name, setName] = useState("Alex Morgan");
  const [phone, setPhone] = useState("+1 (555) 012-3456");
  const [email, setEmail] = useState("alex.morgan@contractor.com");
  const [bio, setBio] = useState(
    "Licensed contractor with 10+ years of experience in residential renovations and plumbing."
  );

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-4 border-b border-border bg-background z-10">
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
        >
          <Icon name="ArrowLeft" className="text-foreground" size={24} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Edit Profile</Text>
        <Pressable
          onPress={onSave}
          className="h-10 px-3 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20"
        >
          <Text className="text-primary font-bold text-sm">Save</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Avatar Section */}
        <View className="items-center py-8">
          <View className="relative">
            <View className="h-28 w-28 rounded-full bg-muted items-center justify-center border-4 border-card shadow-sm">
              <Text className="text-4xl font-bold text-muted-foreground">
                AM
              </Text>
            </View>
            <Pressable className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary items-center justify-center border-2 border-background shadow-sm active:opacity-80">
              <Icon
                name="Camera"
                className="text-primary-foreground"
                size={16}
              />
            </Pressable>
          </View>
          <Text className="mt-4 text-sm font-semibold text-primary">
            Change Photo
          </Text>
        </View>

        <View className="px-4 gap-8">
          {/* Personal Info */}
          <Section title="PERSONAL DETAILS">
            <InputField
              label="Full Name"
              value={name}
              onChangeText={setName}
              icon={"User" as IconKeys}
            />
            <InputField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              icon={"Phone" as IconKeys}
              keyboardType="phone-pad"
            />
            <InputField
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              icon={"Mail" as IconKeys}
              keyboardType="email-address"
            />
          </Section>

          {/* Professional Info */}
          <Section title="PROFESSIONAL INFO">
            <View className="gap-2">
              <Text className="text-sm font-medium text-muted-foreground">
                Contractor ID
              </Text>
              <View className="flex-row items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
                <Icon name="Hash" className="text-muted-foreground" size={18} />
                <Text className="text-base text-muted-foreground font-medium">
                  #8821-X99
                </Text>
                <View className="ml-auto rounded bg-background/50 px-2 py-1 border border-border">
                  <Text className="text-[10px] font-bold text-muted-foreground uppercase">
                    Read Only
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-medium text-muted-foreground">
                Bio
              </Text>
              <View className="rounded-xl border border-border bg-card p-3 focus:border-primary">
                <TextInput
                  className="text-base text-foreground min-h-[100px]"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  textAlignVertical="top"
                  placeholder="Tell us about your services..."
                  placeholderTextColor="#666"
                />
              </View>
            </View>
          </Section>

          {/* Skills */}
          <Section title="SKILLS & TRADES">
            <View className="flex-row flex-wrap gap-2">
              <SkillChip label="Plumbing" />
              <SkillChip label="Renovation" />
              <SkillChip label="Electrical" />
              <SkillChip label="Drywall" />
              <Pressable className="flex-row items-center gap-1.5 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1.5 active:bg-secondary">
                <Icon name="Plus" className="text-muted-foreground" size={14} />
                <Text className="text-sm font-medium text-muted-foreground">
                  Add Skill
                </Text>
              </Pressable>
            </View>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Sub-Components                               */
/* -------------------------------------------------------------------------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 ml-1">
        {title}
      </Text>
      <View className="gap-4">{children}</View>
    </View>
  );
}

function InputField({ label, value, onChangeText, icon, keyboardType }: any) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3.5 focus:border-primary">
        <Icon name={icon} className="text-muted-foreground" size={18} />
        <TextInput
          className="flex-1 text-base text-foreground p-0"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={`Enter ${label}`}
          placeholderTextColor="#666"
        />
      </View>
    </View>
  );
}

function SkillChip({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 border border-primary/20">
      <Text className="text-sm font-semibold text-primary">{label}</Text>
      <Pressable hitSlop={8}>
        <Icon name="X" className="text-primary/60" size={12} />
      </Pressable>
    </View>
  );
}
