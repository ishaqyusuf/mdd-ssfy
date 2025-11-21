import { create } from "zustand";
type PlayerState = {
  //   sound: Audio.Sound | null;
  sound: any | null;
  history: { current: number; duration: number };
  //   bookmarks: Bookmark[];
  bookmarks: any[];
  rate: number;
  //   setSound: (s: Audio.Sound | null) => void;
  setSound: (s: any | null) => void;
  //   setStatus: (st: AVPlaybackStatusSuccess) => void;
  setStatus: (st: any) => void;
  //   addBookmark: (bm: Bookmark) => void;
  addBookmark: (bm: any) => void;
  setRate: (r: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  sound: null,
  history: { current: 0, duration: 0 },
  bookmarks: [],
  rate: 1,
  setSound: (s) => set({ sound: s }),
  setStatus: (st) =>
    set({
      history: {
        current: Math.floor(st.positionMillis / 1000),
        duration: Math.floor(st.durationMillis! / 1000),
      },
    }),
  addBookmark: (bm) => set((s) => ({ bookmarks: [...s.bookmarks, bm] })),
  setRate: (r) => set({ rate: r }),
}));
