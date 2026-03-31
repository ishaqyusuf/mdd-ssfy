import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  getChannelsOptionList,
  isChannelName,
  type ChannelName,
} from "@notifications/channels";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  View,
} from "react-native";

export type ChatOption = {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type InboxContact = {
  id: number;
  role?: "employee" | "customer";
};

export type InboxContactGroup = {
  ids: number[];
  role?: "employee" | "customer";
};

export type InboxContacts =
  | InboxContact[]
  | InboxContactGroup[]
  | {
      employee?: number[];
      customer?: number[];
    };

type OptionFieldConfig = {
  required?: boolean;
  show?: boolean;
};

type ChatState = {
  channel: string;
  message: string;
  meta: Record<string, string>;
  payload: Record<string, string>;
  errors: Record<string, string>;
  isSubmitting: boolean;
  noteColor: string;
  isComposerFocused: boolean;
};

type ChatContextValue = {
  state: ChatState;
  setChannel: (value: string) => void;
  setMessage: (value: string) => void;
  setMetaValue: (name: string, value: string) => void;
  setPayloadValue: (name: string, value: string) => void;
  setMetaFieldConfig: (name: string, config: OptionFieldConfig) => void;
  setPayloadFieldConfig: (name: string, config: OptionFieldConfig) => void;
  setNoteColor: (value: string) => void;
  setComposerFocused: (value: boolean) => void;
  submit: () => Promise<void>;
  channelOptions: Array<{ label: string; value: string; description: string }>;
};

export type ChatSubmitData = {
  channel: string;
  message?: string;
  payload: Record<string, unknown>;
  meta: Record<string, string>;
  noteColor: string;
  contacts: InboxContactGroup[];
  transformed: unknown;
};

type TransformSubmitData = (
  payload: Record<string, string>,
  meta: Record<string, string>,
) => Promise<unknown> | unknown;

export type ChatProps = {
  children: ReactNode;
  className?: string;
  channel?: string;
  names?: readonly string[];
  payload?: Record<string, unknown>;
  defaultPayloads?:
    | Record<string, string>
    | Partial<Record<string, Record<string, string>>>;
  contacts?: InboxContacts;
  messageRequired?: boolean;
  defaultNoteColor?: string;
  transformSubmitData?: TransformSubmitData;
  onSubmitData?: (data: ChatSubmitData) => void | Promise<void>;
  onSent?: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const defaultPalette = [
  "#000000",
  "#00A9FE",
  "#00D084",
  "#FF6900",
  "#EB144C",
  "#8A2BE2",
] as const;

function createErrorKey(scope: "meta" | "payload", name: string) {
  return `${scope}:${name}`;
}

function normalizeContacts(contacts?: InboxContacts): InboxContactGroup[] {
  if (!contacts) return [];

  if (Array.isArray(contacts)) {
    return contacts
      .map((item) => {
        const role: "employee" | "customer" =
          item.role === "customer" ? "customer" : "employee";

        if ("ids" in item) {
          return {
            role,
            ids: item.ids || [],
          };
        }

        return {
          role,
          ids: [item.id],
        };
      })
      .filter((group) => group.ids.length > 0);
  }

  return ([
    {
      role: "employee",
      ids: contacts.employee || [],
    },
    {
      role: "customer",
      ids: contacts.customer || [],
    },
  ] as InboxContactGroup[]).filter((group) => group.ids.length > 0);
}

function mergeSubmitPayload(
  basePayload: Record<string, unknown>,
  dynamicPayload: Record<string, string>,
  transformed: unknown,
) {
  const mergedBase = {
    ...(basePayload || {}),
    ...dynamicPayload,
  };

  if (transformed && typeof transformed === "object" && !Array.isArray(transformed)) {
    return {
      ...mergedBase,
      ...(transformed as Record<string, unknown>),
    };
  }

  return mergedBase;
}

function resolveDefaultPayloadValues(
  defaultPayloads: ChatProps["defaultPayloads"],
  channel?: string,
) {
  if (!defaultPayloads) return {};

  const values = Object.values(defaultPayloads);
  const first = values[0];

  if (typeof first === "string" || first == null) {
    return defaultPayloads as Record<string, string>;
  }

  if (!channel) return {};

  return (
    (defaultPayloads as Partial<Record<string, Record<string, string>>>)[
      channel
    ] || {}
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within <Chat>");
  }
  return ctx;
}

type BaseSlotProps = {
  children?: ReactNode;
  className?: string;
};

function ChatHeader({ children, className }: BaseSlotProps) {
  return (
    <View className={cn("flex-row items-center gap-1 px-2 py-1.5", className)}>
      {children}
    </View>
  );
}

function ChatFooter({ children, className }: BaseSlotProps) {
  return (
    <View className={cn("flex-row items-center gap-1 px-2 py-1.5", className)}>
      {children}
    </View>
  );
}

type OptionMenuProps = {
  title: string;
  placeholder: string;
  value?: string;
  options: ChatOption[];
  onSelect: (value: string) => void;
  className?: string;
};

function OptionMenu({
  title,
  placeholder,
  value,
  options,
  onSelect,
  className,
}: OptionMenuProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((option) => option.value === value)?.label || placeholder;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "h-11 min-w-28 flex-row items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5",
          className,
        )}
      >
        <Text className="max-w-[200px] flex-1 text-xs font-medium text-foreground" numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Icon name="ChevronDown" className="text-muted-foreground" size={14} />
      </Pressable>

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="max-h-[70%] rounded-t-2xl border border-border bg-background px-3 pb-5 pt-3">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </Text>
            <ScrollView>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    disabled={option.disabled}
                    onPress={() => {
                      if (option.disabled) return;
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "min-h-11 flex-row items-center justify-between rounded-md px-2.5",
                      selected && "bg-muted",
                      option.disabled && "opacity-50",
                    )}
                  >
                    <View className="flex-row items-center gap-2">
                      {option.icon ? <View>{option.icon}</View> : null}
                      <Text className="text-sm text-foreground">{option.label}</Text>
                    </View>
                    {selected ? (
                      <Icon name="Check" className="text-primary" size={14} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </RNModal>
    </>
  );
}

type ChatChannelsOptionProps = {
  names?: readonly string[];
  className?: string;
  placeholder?: string;
};

function ChatChannelsOption({
  names,
  className,
  placeholder = "Select channel",
}: ChatChannelsOptionProps) {
  const { state, setChannel, channelOptions } = useChat();

  const options = useMemo(
    () =>
      (names?.length
        ? channelOptions.filter((item) => names.includes(item.value))
        : channelOptions
      ).map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [channelOptions, names],
  );

  return (
    <View className={cn("w-auto gap-1", className)}>
      <OptionMenu
        title="Channel"
        placeholder={placeholder}
        value={state.channel}
        options={options}
        onSelect={setChannel}
      />
      {state.errors.channel ? (
        <Text className="text-xs text-destructive">{state.errors.channel}</Text>
      ) : null}
    </View>
  );
}

type ChatOptionsProps = {
  children?: ReactNode;
  className?: string;
};

function ChatOptions({ children, className }: ChatOptionsProps) {
  return <View className={cn("flex-row flex-wrap items-center gap-1.5", className)}>{children}</View>;
}

type ChatFieldOptionProps = {
  show?: boolean;
  required?: boolean;
  name: string;
  label?: string;
  icon?: ReactNode;
  className?: string;
  options: ChatOption[];
  placeholder?: string;
};

function ChatMetaOption({
  show = true,
  required,
  name,
  label,
  className,
  options,
  placeholder = "Select",
}: ChatFieldOptionProps) {
  const { state, setMetaValue, setMetaFieldConfig } = useChat();

  useEffect(() => {
    setMetaFieldConfig(name, { show, required });
  }, [name, required, setMetaFieldConfig, show]);

  if (!show) return null;

  const errorKey = createErrorKey("meta", name);

  return (
    <View className={cn("w-auto gap-1", className)}>
      <OptionMenu
        title={label || name}
        placeholder={placeholder}
        value={state.meta[name]}
        options={options}
        onSelect={(value) => setMetaValue(name, value)}
      />
      {state.errors[errorKey] ? (
        <Text className="text-xs text-destructive">{state.errors[errorKey]}</Text>
      ) : null}
    </View>
  );
}

function ChatPayloadOption({
  show = true,
  required,
  name,
  label,
  className,
  options,
  placeholder = "Select",
}: ChatFieldOptionProps) {
  const { state, setPayloadValue, setPayloadFieldConfig } = useChat();

  useEffect(() => {
    setPayloadFieldConfig(name, { show, required });
  }, [name, required, setPayloadFieldConfig, show]);

  if (!show) return null;

  const errorKey = createErrorKey("payload", name);

  return (
    <View className={cn("w-auto gap-1", className)}>
      <OptionMenu
        title={label || name}
        placeholder={placeholder}
        value={state.payload[name]}
        options={options}
        onSelect={(value) => setPayloadValue(name, value)}
      />
      {state.errors[errorKey] ? (
        <Text className="text-xs text-destructive">{state.errors[errorKey]}</Text>
      ) : null}
    </View>
  );
}

type ChatContentProps = {
  className?: string;
  placeholder?: string;
};

function ChatContentNode({ className, placeholder = "Write a note..." }: ChatContentProps) {
  const { state, setMessage, setComposerFocused } = useChat();

  return (
    <View className={cn("px-1.5 pb-1", className)}>
      <Textarea
        value={state.message}
        onChangeText={setMessage}
        onFocus={() => setComposerFocused(true)}
        onBlur={() => setComposerFocused(false)}
        placeholder={placeholder}
        numberOfLines={3}
        className="min-h-0 border-0 bg-transparent px-2 py-1.5 text-sm shadow-none"
      />
      {state.errors.message ? (
        <Text className="px-2 text-xs text-destructive">{state.errors.message}</Text>
      ) : null}
      {state.errors.submit ? (
        <Text className="px-2 text-xs text-destructive">{state.errors.submit}</Text>
      ) : null}
    </View>
  );
}

type ChatSendButtonProps = {
  className?: string;
};

function ChatSendButton({ className }: ChatSendButtonProps) {
  const { state, submit } = useChat();

  return (
    <Button
      size="icon"
      variant="default"
      disabled={state.isSubmitting}
      onPress={submit}
      className={cn("size-9 rounded-full", className)}
    >
      <Icon name="Send" className="text-primary-foreground" size={14} />
    </Button>
  );
}

type ChatColorPickerProps = {
  className?: string;
  palette?: readonly string[];
};

function ChatColorPicker({ className, palette = defaultPalette }: ChatColorPickerProps) {
  const { state, setNoteColor } = useChat();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          "h-11 min-w-24 flex-row items-center justify-between rounded-md border border-border bg-background px-2.5",
          className,
        )}
      >
        <View className="flex-row items-center gap-2">
          <View
            className="size-3.5 rounded-full border border-border"
            style={{ backgroundColor: state.noteColor }}
          />
          <Text className="text-xs text-muted-foreground">Color</Text>
        </View>
        <Icon name="ChevronDown" className="text-muted-foreground" size={14} />
      </Pressable>

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/45">
          <Pressable className="flex-1" onPress={() => setOpen(false)} />
          <View className="rounded-t-2xl border border-border bg-background px-3 pb-6 pt-3">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Note Color
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {palette.map((color) => {
                const selected = color === state.noteColor;
                return (
                  <Pressable
                    key={color}
                    onPress={() => {
                      setNoteColor(color);
                      setOpen(false);
                    }}
                    className={cn(
                      "size-10 items-center justify-center rounded-full border",
                      selected ? "border-foreground" : "border-border",
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {selected ? (
                      <Icon
                        name="Check"
                        className={color === "#000000" ? "text-white" : "text-foreground"}
                        size={14}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </RNModal>
    </>
  );
}

function ChatRoot({
  children,
  className,
  channel,
  names,
  payload,
  defaultPayloads,
  contacts,
  messageRequired,
  defaultNoteColor,
  transformSubmitData,
  onSubmitData,
  onSent,
}: ChatProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const defaultChannelOptions = useMemo(() => getChannelsOptionList({ names }), [names]);

  const resolvedDefaultChannel = useMemo(() => {
    if (channel && isChannelName(channel)) {
      return channel;
    }
    return defaultChannelOptions[0]?.value || "";
  }, [channel, defaultChannelOptions]);

  const [state, setState] = useState<ChatState>({
    channel: resolvedDefaultChannel,
    message: "",
    meta: {},
    payload: resolveDefaultPayloadValues(defaultPayloads, resolvedDefaultChannel),
    errors: {},
    isSubmitting: false,
    noteColor: defaultNoteColor || "#000000",
    isComposerFocused: false,
  });

  const [metaFieldConfigs, setMetaFieldConfigs] = useState<Record<string, OptionFieldConfig>>({});
  const [payloadFieldConfigs, setPayloadFieldConfigs] = useState<Record<string, OptionFieldConfig>>({});

  const normalizedContacts = useMemo(() => normalizeContacts(contacts), [contacts]);

  const fallbackMutation = useMutation(
    trpc.notes.createInboxActivity.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.notes.activityTree.pathKey() });
        queryClient.invalidateQueries({ queryKey: trpc.notes.list.pathKey() });
      },
    }),
  );

  useEffect(() => {
    if (!state.channel && defaultChannelOptions.length > 0) {
      setState((prev) => ({
        ...prev,
        channel: defaultChannelOptions[0].value,
        payload: resolveDefaultPayloadValues(defaultPayloads, defaultChannelOptions[0].value),
      }));
    }
  }, [defaultChannelOptions, defaultPayloads, state.channel]);

  const channelOptions = useMemo(() => {
    const options = getChannelsOptionList({ names });
    if (!channel || !isChannelName(channel)) {
      return options;
    }

    const hasDefault = options.some((item) => item.value === channel);
    if (hasDefault) {
      return options;
    }

    const fallback = getChannelsOptionList({ channel })[0];
    return fallback ? [fallback, ...options] : options;
  }, [channel, names]);

  const submit = useCallback(async () => {
    const errors: Record<string, string> = {};

    if (!state.channel) {
      errors.channel = "Please select a channel.";
    } else if (!isChannelName(state.channel)) {
      errors.channel = "Please select a valid channel.";
    }

    if (messageRequired && !state.message.trim()) {
      errors.message = "Message is required.";
    }

    for (const [name, config] of Object.entries(metaFieldConfigs)) {
      if (config.show === false || !config.required) continue;
      if (!state.meta[name]?.trim()) {
        errors[createErrorKey("meta", name)] = "This field is required.";
      }
    }

    for (const [name, config] of Object.entries(payloadFieldConfigs)) {
      if (config.show === false || !config.required) continue;
      if (!state.payload[name]?.trim()) {
        errors[createErrorKey("payload", name)] = "This field is required.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, errors }));
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, errors: {} }));

    try {
      const transformed = transformSubmitData
        ? await transformSubmitData(state.payload, state.meta)
        : undefined;

      const finalPayload = mergeSubmitPayload(payload || {}, state.payload, transformed);
      const trimmedMessage = state.message.trim();
      const hasPayload = Object.keys(finalPayload).length > 0;

      if (!trimmedMessage && !hasPayload) {
        setState((prev) => ({
          ...prev,
          errors: {
            ...prev.errors,
            submit: "Message is empty",
          },
          isSubmitting: false,
        }));
        return;
      }

      const submitData: ChatSubmitData = {
        channel: state.channel,
        message: trimmedMessage || undefined,
        payload: finalPayload,
        meta: state.meta,
        noteColor: state.noteColor,
        contacts: normalizedContacts,
        transformed,
      };

      if (onSubmitData) {
        await onSubmitData(submitData);
      } else {
        if (!isChannelName(submitData.channel)) {
          throw new Error("Invalid channel for inbox activity");
        }

        await fallbackMutation.mutateAsync({
          channel: submitData.channel as ChannelName,
          payload: submitData.payload,
          contacts: submitData.contacts,
          message: submitData.message,
          noteColor: submitData.noteColor,
        });
      }

      setState((prev) => ({
        ...prev,
        message: "",
        payload: {},
        meta: {},
      }));

      onSent?.();
      Toast.show("Message sent", {
        type: "success",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message";
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          submit: message,
        },
      }));
      Toast.show(message, {
        type: "error",
      });
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [
    defaultPayloads,
    fallbackMutation,
    messageRequired,
    metaFieldConfigs,
    normalizedContacts,
    onSent,
    onSubmitData,
    payload,
    payloadFieldConfigs,
    state,
    transformSubmitData,
  ]);

  const setChannel = useCallback(
    (value: string) => {
      setState((prev) => ({
        ...prev,
        channel: value,
        payload: resolveDefaultPayloadValues(defaultPayloads, value),
        errors: { ...prev.errors, channel: "" },
      }));
    },
    [defaultPayloads],
  );

  const setMessage = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      message: value,
      errors: { ...prev.errors, message: "" },
    }));
  }, []);

  const setMetaValue = useCallback((name: string, value: string) => {
    setState((prev) => ({
      ...prev,
      meta: { ...prev.meta, [name]: value },
      errors: { ...prev.errors, [createErrorKey("meta", name)]: "" },
    }));
  }, []);

  const setPayloadValue = useCallback((name: string, value: string) => {
    setState((prev) => ({
      ...prev,
      payload: { ...prev.payload, [name]: value },
      errors: { ...prev.errors, [createErrorKey("payload", name)]: "" },
    }));
  }, []);

  const setMetaFieldConfig = useCallback((name: string, config: OptionFieldConfig) => {
    setMetaFieldConfigs((prev) => {
      const current = prev[name];
      if (current?.required === config.required && current?.show === config.show) {
        return prev;
      }
      return { ...prev, [name]: config };
    });
  }, []);

  const setPayloadFieldConfig = useCallback((name: string, config: OptionFieldConfig) => {
    setPayloadFieldConfigs((prev) => {
      const current = prev[name];
      if (current?.required === config.required && current?.show === config.show) {
        return prev;
      }
      return { ...prev, [name]: config };
    });
  }, []);

  const setNoteColor = useCallback((value: string) => {
    setState((prev) => ({ ...prev, noteColor: value }));
  }, []);

  const setComposerFocused = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, isComposerFocused: value }));
  }, []);

  const contextValue = useMemo<ChatContextValue>(
    () => ({
      state,
      setChannel,
      setMessage,
      setMetaValue,
      setPayloadValue,
      setMetaFieldConfig,
      setPayloadFieldConfig,
      setNoteColor,
      setComposerFocused,
      submit,
      channelOptions,
    }),
    [
      channelOptions,
      setChannel,
      setComposerFocused,
      setMessage,
      setMetaFieldConfig,
      setMetaValue,
      setNoteColor,
      setPayloadFieldConfig,
      setPayloadValue,
      state,
      submit,
    ],
  );

  return (
    <ChatContext.Provider value={contextValue}>
      <View
        className={cn(
          "overflow-hidden rounded-xl border bg-card",
          state.isComposerFocused ? "border-primary/40" : "border-border",
          className,
        )}
      >
        {children}
      </View>
    </ChatContext.Provider>
  );
}

type ChatComponent = ((props: ChatProps) => ReactNode) & {
  Header: typeof ChatHeader;
  Footer: typeof ChatFooter;
  ChannelsOption: typeof ChatChannelsOption;
  Options: typeof ChatOptions;
  MetaOption: typeof ChatMetaOption;
  PayloadOption: typeof ChatPayloadOption;
  Content: typeof ChatContentNode;
  SendButton: typeof ChatSendButton;
  ColorPicker: typeof ChatColorPicker;
};

export const Chat = Object.assign(
  function ChatComponent(props: ChatProps) {
    return <ChatRoot {...props} />;
  },
  {
    Header: ChatHeader,
    Footer: ChatFooter,
    ChannelsOption: ChatChannelsOption,
    Options: ChatOptions,
    MetaOption: ChatMetaOption,
    PayloadOption: ChatPayloadOption,
    Content: ChatContentNode,
    SendButton: ChatSendButton,
    ColorPicker: ChatColorPicker,
  },
) as ChatComponent;

export function ChatContent(props: ChatContentProps) {
  return <Chat.Content {...props} />;
}
