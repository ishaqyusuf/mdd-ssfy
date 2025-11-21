import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Audio } from "expo-av";
import { Feather } from "@expo/vector-icons"; // Play/Pause icon
import { ThemedText } from "@/components/ThemedText";
import { ItemProps } from "./data-list/blog/item";
import { useAudioStore } from "@/store/audio-store";

// import { fetchAudio } from "./fetchAudio"; // Your tRPC or API call to fetch audio
// import { formatBytes, formatDuration } from "./utils"; // Utility functions for formatting size and duration

export function AudioPostCard({ item: post }: ItemProps) {
  const state = useAudioStore();
  if (!post.audio) return null;
  const audio = post.audio;
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    setIsPlaying(state.blog?.id == post?.id && state?.isPlaying);
  }, [state.blog, post, state.isPlaying]);
  const handleFooterPlayback = async () => {
    if (isPlaying) {
      await state.sound.pauseAsync();
      state.setIsFooterPlaying(false);
      return;
    }
    if (state.blog?.id == post.id) {
      await state.sound.playAsync();
      state.setIsFooterPlaying(true);
      return;
    }
    console.log(post);
    state.toggleBlog(post);
  };
  return (
    <View className="rounded-2xl">
      {/* Header: Audio Metadata */}
      <View className="flex-row items-center">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={handleFooterPlayback}
          className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-md"
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
        {/* Metadata */}
        <View className="flex-1">
          <Text className="text-xl font-semibold text-white">
            {post.audio.title || post.audio.displayName}
          </Text>
          {post.caption && (
            <Text className="text-sm text-gray-400">{post.caption}</Text>
          )}
          <View className="mt-1 flex-row items-center space-x-2">
            {audio.albumName && (
              <Text className="text-xs text-gray-500">
                Album: {audio.albumName}
              </Text>
            )}
            {audio.authorName && (
              <Text className="text-xs text-gray-500">
                • {audio.authorName}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
const __AudioPostCard = ({ item: post }: ItemProps) => {
  const state = useAudioStore();
  if (!post.audio) return null;
  const audio = post.audio;
  const [isPlaying, setIsPlaying] = useState(false);
  useEffect(() => {
    setIsPlaying(state.blog?.id == post?.id && state?.isPlaying);
  }, [state.blog, post, state.isPlaying]);
  const handleFooterPlayback = async () => {
    if (isPlaying) {
      await state.sound.pauseAsync();
      state.setIsFooterPlaying(false);
      return;
    }
    if (state.blog?.id == post.id) {
      await state.sound.playAsync();
      state.setIsFooterPlaying(true);
      return;
    }
    state.toggleBlog(post);
  };
  return (
    <View className="rounded-2xl bg-gray-900 p-4 shadow-lg">
      {/* Header: Audio Metadata */}
      <View className="flex-row items-center">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={handleFooterPlayback}
          className="mr-4 h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-md"
        >
          <Feather
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
        {/* Metadata */}
        <View className="flex-1">
          <Text className="text-xl font-semibold text-white">
            {post.audio.displayName}
          </Text>
          {post.caption && (
            <Text className="text-sm text-gray-400">{post.caption}</Text>
          )}
          <View className="mt-1 flex-row items-center space-x-2">
            {audio.albumName && (
              <Text className="text-xs text-gray-500">
                Album: {audio.albumName}
              </Text>
            )}
            {audio.authorName && (
              <Text className="text-xs text-gray-500">
                • {audio.authorName}
              </Text>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};
