"use client";

import { useTRPC } from "@/trpc/client";
import { getChannelsOptionList, isChannelName, type ChannelName } from "@notifications/channels";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { getColorFromName } from "@gnd/utils/colors";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { DropdownMenu as Dropdown, Select } from "@gnd/ui/namespace";
import { Textarea } from "@gnd/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

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
  transformSubmitData?: TransformSubmitData;
  onSubmitData?: (data: ChatSubmitData) => void | Promise<void>;
  onSent?: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const defaultPalette = ["#00A9FE", "#00D084", "#FF6900", "#EB144C", "#8A2BE2"] as const;

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

  // Flat payload defaults (single map used for every channel)
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
    <div
      className={cn(
        "flex flex-row items-center gap-1.5 border-b border-border/70 bg-muted/35 px-2 py-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ChatFooter({ children, className }: BaseSlotProps) {
  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1.5 border-t border-border/70 bg-muted/25 px-2 py-1.5",
        className,
      )}
    >
      {children}
    </div>
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
  placeholder = "Type or select a channel",
}: ChatChannelsOptionProps) {
  const { state, setChannel, channelOptions } = useChat();
  const listId = useId();

  const options = useMemo(
    () =>
      names?.length
        ? channelOptions.filter((item) => names.includes(item.value))
        : channelOptions,
    [channelOptions, names],
  );

  return (
    <div className={cn("min-w-0 flex-1 space-y-1", className)}>
      <Input
        list={listId}
        value={state.channel}
        onChange={(event) => setChannel(event.target.value)}
        placeholder={placeholder}
        className="h-7 rounded-md border border-transparent bg-transparent px-2 shadow-none focus-visible:border-border/60 focus-visible:ring-0"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </datalist>
      {state.errors.channel ? <p className="text-xs text-destructive">{state.errors.channel}</p> : null}
    </div>
  );
}

function ChatOptions({ children, className }: BaseSlotProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 px-2 py-0.5", className)}>
      {children}
    </div>
  );
}

type ChatMetaOptionProps = {
  show?: boolean;
  required?: boolean;
  name: string;
  label?: string;
  icon?: ReactNode;
  className?: string;
  placeholder?: string;
};

function ChatMetaOption({
  show = true,
  required,
  name,
  label,
  icon: _icon,
  className,
  placeholder,
}: ChatMetaOptionProps) {
  const { state, setMetaValue, setMetaFieldConfig } = useChat();

  useEffect(() => {
    setMetaFieldConfig(name, { required, show });
  }, [name, required, setMetaFieldConfig, show]);

  if (!show) return null;

  const errorKey = createErrorKey("meta", name);

  return (
    <div className={cn("w-auto space-y-1", className)}>
      <Input
        value={state.meta[name] || ""}
        onChange={(event) => setMetaValue(name, event.target.value)}
        placeholder={placeholder || `Enter ${label || name}`}
        className="h-7 w-[150px] rounded-md border border-transparent bg-transparent px-2 shadow-none focus-visible:border-border/60 focus-visible:ring-0"
      />
      {state.errors[errorKey] ? <p className="text-xs text-destructive">{state.errors[errorKey]}</p> : null}
    </div>
  );
}

type ChatPayloadOptionProps = {
  show?: boolean;
  required?: boolean;
  name: string;
  label?: string;
  icon?: ReactNode;
  options: ChatOption[];
  className?: string;
};

function ChatPayloadOption({
  show = true,
  required,
  name,
  label,
  icon: _icon,
  options,
  className,
}: ChatPayloadOptionProps) {
  const { state, setPayloadValue, setPayloadFieldConfig } = useChat();

  useEffect(() => {
    setPayloadFieldConfig(name, { required, show });
  }, [name, required, setPayloadFieldConfig, show]);

  if (!show) return null;

  const errorKey = createErrorKey("payload", name);

  return (
    <div className={cn("w-auto space-y-1", className)}>
      <Select.Root
        value={state.payload[name] || ""}
        onValueChange={(value) => setPayloadValue(name, value)}
      >
        <Select.Trigger className="h-7 w-[150px] rounded-md border border-transparent bg-transparent px-2 shadow-none focus-visible:border-border/60 focus-visible:ring-0">
          <Select.Value placeholder={label ? `Select ${label}` : "Select option"} />
        </Select.Trigger>
        <Select.Content>
          {options.map((option) => (
            <Select.Item
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {state.errors[errorKey] ? <p className="text-xs text-destructive">{state.errors[errorKey]}</p> : null}
    </div>
  );
}

type ChatContentProps = {
  className?: string;
  placeholder?: string;
};

export function ChatContent({
  className,
  placeholder = "Write a note...",
}: ChatContentProps) {
  const { state, setMessage } = useChat();

  return (
    <div className={cn("space-y-1 px-2 py-1", className)}>
      <Textarea
        value={state.message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        className="min-h-[56px] resize-none rounded-lg border-0 bg-transparent px-1 py-0.5 shadow-none focus-visible:border-0 focus-visible:ring-0"
      />
      {state.errors.message ? <p className="text-xs text-destructive">{state.errors.message}</p> : null}
      {state.errors.submit ? <p className="text-xs text-destructive">{state.errors.submit}</p> : null}
    </div>
  );
}

type ChatColorPickerProps = {
  className?: string;
  label?: string;
  palette?: readonly string[];
};

function ChatColorPicker({
  className,
  label = "Note color",
  palette = defaultPalette,
}: ChatColorPickerProps) {
  const { state, setNoteColor } = useChat();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 rounded-md px-2"
          >
            <span
              className="size-3 rounded-full border"
              style={{ backgroundColor: state.noteColor }}
            />
            <span className="text-xs">{label}</span>
            <Icons.ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Content align="start" className="w-36 p-1.5">
          <div className="grid grid-cols-5 gap-1">
            {palette.map((color) => (
              <Dropdown.Item
                key={color}
                className={cn(
                  "h-5 w-5 min-w-0 rounded-sm p-0",
                  state.noteColor === color && "ring-1 ring-foreground/50",
                )}
                onSelect={() => setNoteColor(color)}
                aria-label={`Select ${color} note color`}
              >
                <span
                  className="h-full w-full rounded-[5px] border"
                  style={{ backgroundColor: color }}
                />
              </Dropdown.Item>
            ))}
          </div>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}

type ChatSendButtonProps = {
  className?: string;
  label?: string;
};

function ChatSendButton({ className, label = "Send" }: ChatSendButtonProps) {
  const { state } = useChat();
  const resolvedLabel = state.isSubmitting ? "Sending..." : label;

  return (
    <Button
      type="submit"
      disabled={state.isSubmitting}
      className={cn("h-7 w-7 rounded-md p-0", className)}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      <Icons.ArrowOutward className="size-4" />
      <span className="sr-only">{resolvedLabel}</span>
    </Button>
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
    noteColor: getColorFromName(resolvedDefaultChannel || "activity"),
  });

  const [metaFieldConfigs, setMetaFieldConfigs] = useState<Record<string, OptionFieldConfig>>({});
  const [payloadFieldConfigs, setPayloadFieldConfigs] = useState<Record<string, OptionFieldConfig>>({});

  const normalizedContacts = useMemo(() => normalizeContacts(contacts), [contacts]);

  const fallbackMutation = useMutation(
    trpc.notes.createInboxActivity.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.notes.activityTree.pathKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.notes.list.pathKey(),
        });
      },
    }),
  );

  useEffect(() => {
    if (channel && isChannelName(channel)) {
      setState((prev) => ({
        ...prev,
        channel,
        payload: resolveDefaultPayloadValues(defaultPayloads, channel),
      }));
      return;
    }
    if (!state.channel && defaultChannelOptions.length > 0) {
      setState((prev) => ({
        ...prev,
        channel: defaultChannelOptions[0].value,
        payload: resolveDefaultPayloadValues(
          defaultPayloads,
          defaultChannelOptions[0].value,
        ),
      }));
    }
  }, [channel, defaultChannelOptions, defaultPayloads, state.channel]);

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

  async function submit() {
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
      toast.success("Message sent");
    } catch (error) {
      setState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          submit: error instanceof Error ? error.message : "Failed to send message",
        },
      }));
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  const contextValue = useMemo<ChatContextValue>(
    () => ({
      state,
      setChannel: (value) => {
        setState((prev) => ({
          ...prev,
          channel: value,
          payload: resolveDefaultPayloadValues(defaultPayloads, value),
          errors: { ...prev.errors, channel: "" },
        }));
      },
      setMessage: (value) => {
        setState((prev) => ({
          ...prev,
          message: value,
          errors: { ...prev.errors, message: "" },
        }));
      },
      setMetaValue: (name, value) => {
        setState((prev) => ({
          ...prev,
          meta: { ...prev.meta, [name]: value },
          errors: { ...prev.errors, [createErrorKey("meta", name)]: "" },
        }));
      },
      setPayloadValue: (name, value) => {
        setState((prev) => ({
          ...prev,
          payload: { ...prev.payload, [name]: value },
          errors: { ...prev.errors, [createErrorKey("payload", name)]: "" },
        }));
      },
      setMetaFieldConfig: (name, config) => {
        setMetaFieldConfigs((prev) => ({ ...prev, [name]: config }));
      },
      setPayloadFieldConfig: (name, config) => {
        setPayloadFieldConfigs((prev) => ({ ...prev, [name]: config }));
      },
      setNoteColor: (value) => {
        setState((prev) => ({ ...prev, noteColor: value }));
      },
      submit,
      channelOptions,
    }),
    [channelOptions, defaultPayloads, state],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit();
  }

  return (
    <ChatContext.Provider value={contextValue}>
      <form
        className={cn(
          "space-y-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-[border-color,box-shadow] focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20",
          className,
        )}
        onSubmit={handleSubmit}
      >
        {children}
      </form>
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
  Content: typeof ChatContent;
  SendButton: typeof ChatSendButton;
  ColorPicker: typeof ChatColorPicker;
};

export const Chat: ChatComponent = Object.assign(ChatRoot, {
  Header: ChatHeader,
  Footer: ChatFooter,
  ChannelsOption: ChatChannelsOption,
  Options: ChatOptions,
  MetaOption: ChatMetaOption,
  PayloadOption: ChatPayloadOption,
  Content: ChatContent,
  SendButton: ChatSendButton,
  ColorPicker: ChatColorPicker,
});
