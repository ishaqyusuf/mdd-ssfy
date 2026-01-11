import { cn } from "@/lib/utils";
import { LinkProps, useRouter } from "expo-router";
import { Pressable } from "react-native";

interface Props {
  href: LinkProps["href"];
  children?;
  className?;
}
export function PressableLink({ children, className, href }: Props) {
  const router = useRouter();

  return (
    <Pressable
      className={cn(className)}
      onPress={(e) => {
        console.log({ href });
        router.push(href);
      }}
    >
      {children}
    </Pressable>
  );
}
