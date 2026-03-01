import { Pressable } from "react-native";
import { _goBack } from "./static-router";
import { Icon } from "./ui/icon";

type BackBtnProps = {
  onPress?: (event?: any) => void;
};

export function BackBtn({ onPress }: BackBtnProps) {
  return (
    <Pressable
      onPress={
        onPress
          ? onPress
          : (e) => {
              _goBack();
            }
      }
      className="h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center"
    >
      <Icon name="ArrowLeft" className="text-foreground" />
    </Pressable>
  );
}
