import { ItemProps } from "@/components/data-list/blog/item";
import { create } from "zustand";

import { FieldPath, FieldPathValue } from "react-hook-form";
import { Audio } from "expo-av";

const data = {
  blog: null as any as ItemProps["item"], // Holds the current audio details
  isPlaying: false, // Playback state
  isLoading: false, // Playback state
  sound: null as Audio.Sound,
  currentTime: null,
  duration: null,
  seekPosition: null,
  progressPercentage: null,
  uri: null,
  size: null,
};
type Action = ReturnType<typeof funcs>;
type Data = typeof data;
type Store = Data & Action;
export type ZusFormSet = (update: (state: Data) => Partial<Data>) => void;

function funcs(set: ZusFormSet) {
  return {
    reset: (resetData) =>
      set((state) => ({
        ...data,
        ...resetData,
      })),
    update: <K extends FieldPath<Data>>(k: K, v: FieldPathValue<Data, K>) =>
      set((state) => {
        const newState = {
          ...state,
        };
        // const d = dotSet(newState);
        // d.set(k, v);
        return newState;
      }),
    toggleBlog: (blog) =>
      set((state) => {
        if (state.sound && state.blog.id == blog.id) {
          // pause
          // state.sound.pauseAsync();
          return {
            ...state,
          };
        }
        state.sound?.unloadAsync(); // Unload previous sound
        return {
          blog,
          sound: null,
          isFooterPlaying: false,
          seekPosition: null,
        };
      }),
    setIsFooterPlaying: (isPlaying) => set({ isPlaying: isPlaying }),
    setIsLoading: (isLoading) => set({}),
    setSound: (sound) =>
      set({
        sound,
        currentTime: null,
        progressPercentage: null,
        duration: null,
        uri: null,
        size: null,
      }),
    setData: (data) =>
      set((state) => ({
        ...state,
        ...data,
      })),
  };
}
export const useAudioStore = create<Store>((set) => ({
  ...data,
  ...funcs(set),
}));
