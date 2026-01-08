import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import {
  Send,
  Plus,
  Bot,
  User,
  MoreVertical,
  Sparkles,
} from "lucide-react-native";
import { SafeArea } from "../safe-area";

// --- Configuration & Initialization ---

// Initialize Gemini Client
// In a real app, ensure process.env.API_KEY is available.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
// const MODEL_NAME = "gemini-3-flash-preview";

// --- Types ---

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  isError?: boolean;
};

// --- Styles Injection for Web (Shim for shadcn tokens) ---
// This injects CSS variables so the NativeWind classes work as expected in a browser.
const WebStyles = () => {
  if (Platform.OS !== "web") return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
      :root {
        --background: 0 0% 100%;
        --foreground: 240 10% 3.9%;
        --card: 0 0% 100%;
        --card-foreground: 240 10% 3.9%;
        --popover: 0 0% 100%;
        --popover-foreground: 240 10% 3.9%;
        --primary: 240 5.9% 10%;
        --primary-foreground: 0 0% 98%;
        --secondary: 240 4.8% 95.9%;
        --secondary-foreground: 240 5.9% 10%;
        --muted: 240 4.8% 95.9%;
        --muted-foreground: 240 3.8% 46.1%;
        --accent: 240 4.8% 95.9%;
        --accent-foreground: 240 5.9% 10%;
        --destructive: 0 84.2% 60.2%;
        --destructive-foreground: 0 0% 98%;
        --border: 240 5.9% 90%;
        --input: 240 5.9% 90%;
        --ring: 240 10% 3.9%;
        --radius: 0.5rem;
      }
      .dark {
        --background: 240 10% 3.9%;
        --foreground: 0 0% 98%;
        --card: 240 10% 3.9%;
        --card-foreground: 0 0% 98%;
        --popover: 240 10% 3.9%;
        --popover-foreground: 0 0% 98%;
        --primary: 0 0% 98%;
        --primary-foreground: 240 5.9% 10%;
        --secondary: 240 3.7% 15.9%;
        --secondary-foreground: 0 0% 98%;
        --muted: 240 3.7% 15.9%;
        --muted-foreground: 240 5% 64.9%;
        --accent: 240 3.7% 15.9%;
        --accent-foreground: 0 0% 98%;
        --destructive: 0 62.8% 30.6%;
        --destructive-foreground: 0 0% 98%;
        --border: 240 3.7% 15.9%;
        --input: 240 3.7% 15.9%;
        --ring: 240 4.9% 83.9%;
      }
    `,
      }}
    />
  );
};

// --- Reusable Components ---

const Avatar = ({
  role,
  initials,
}: {
  role: "user" | "model";
  initials?: string;
}) => {
  const isUser = role === "user";
  return (
    <View
      className={`h-8 w-8 rounded-full items-center justify-center border ${
        isUser ? "bg-secondary border-border" : "bg-primary border-primary"
      }`}
    >
      {isUser ? (
        <User size={16} className="text-secondary-foreground" />
      ) : (
        <Bot size={16} className="text-primary-foreground" />
      )}
    </View>
  );
};

const Button = ({
  onPress,
  children,
  variant = "primary",
  className = "",
  disabled,
}: any) => {
  const baseStyle = "h-10 px-4 rounded-md flex-row items-center justify-center";
  const variants = {
    primary: "bg-primary",
    ghost: "bg-transparent",
    outline: "border border-input bg-background",
    secondary: "bg-secondary",
  };

  const textVariants = {
    primary: "text-primary-foreground font-medium",
    ghost: "text-foreground",
    outline: "text-foreground",
    secondary: "text-secondary-foreground",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      <Text className={`${textVariants[variant as keyof typeof textVariants]}`}>
        {children}
      </Text>
    </Pressable>
  );
};

// --- Main App Component ---

export function JobAdminScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "model", text: "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare history for the model
      // We limit context window manually for this demo to last 10 messages to save tokens/complexity
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      // Add the new message
      const currentMessagePart = {
        role: "user",
        parts: [{ text: userMsg.text }],
      };

      // const response = await ai.models.generateContent({
      //   model: MODEL_NAME,
      //   contents: [...history, currentMessagePart],
      // });

      // const responseText =
      //   response.text || "I'm sorry, I couldn't generate a response.";

      // const aiMsg: Message = {
      //   id: (Date.now() + 1).toString(),
      //   role: "model",
      //   text: responseText,
      // };

      // setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: "I'm having trouble connecting right now. Please try again.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <SafeArea>
      <WebStyles />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-background/95 z-10">
        <View className="flex-row items-center gap-3">
          <View className="bg-primary/10 p-2 rounded-lg">
            <Sparkles size={20} className="text-primary" />
          </View>
          <View>
            <Text className="text-base font-semibold text-foreground">
              Gemini Chat
            </Text>
            <Text className="text-xs text-muted-foreground">
              {/* Using {MODEL_NAME} */}
            </Text>
          </View>
        </View>
        <Button variant="ghost" className="h-8 w-8 px-0">
          <MoreVertical size={20} className="text-muted-foreground" />
        </Button>
      </View>

      {/* Chat List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 20, gap: 24 }}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              className={`flex-row gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "model" && <Avatar role="model" />}

              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary rounded-tr-sm"
                    : msg.isError
                    ? "bg-destructive/10 border border-destructive/20 rounded-tl-sm"
                    : "bg-muted rounded-tl-sm"
                }`}
              >
                <Text
                  className={`text-base leading-6 ${
                    msg.role === "user"
                      ? "text-primary-foreground"
                      : msg.isError
                      ? "text-destructive"
                      : "text-foreground"
                  }`}
                >
                  {msg.text}
                </Text>
              </View>

              {msg.role === "user" && <Avatar role="user" />}
            </View>
          ))}

          {isLoading && (
            <View className="flex-row gap-3 justify-start">
              <Avatar role="model" />
              <View className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 items-center justify-center h-12 w-16">
                <ActivityIndicator size="small" color="gray" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="p-4 border-t border-border bg-background">
          <View className="flex-row items-end gap-2 bg-secondary/50 border border-input rounded-2xl p-2">
            <Pressable className="p-2 rounded-full hover:bg-muted active:bg-muted">
              <Plus size={20} className="text-muted-foreground" />
            </Pressable>

            <TextInput
              className="flex-1 min-h-[40px] max-h-[120px] text-base text-foreground pb-3 pt-3 px-1"
              placeholder="Message Gemini..."
              placeholderTextColor="gray"
              multiline
              value={input}
              onChangeText={setInput}
              textAlignVertical="center"
            />

            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
              className={`p-2 rounded-full ${
                input.trim() ? "bg-primary" : "bg-muted-foreground/20"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator
                  size={20}
                  color={input.trim() ? "white" : "gray"}
                />
              ) : (
                <Send
                  size={20}
                  className={
                    input.trim()
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  }
                />
              )}
            </Pressable>
          </View>
          <Text className="text-center text-xs text-muted-foreground mt-2">
            Gemini can make mistakes. Check important info.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
