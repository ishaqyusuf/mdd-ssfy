import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
// import * as FileSystem from "expo-file-system/legacy";
import { File, Directory, Paths } from "expo-file-system";
import { Feather } from "@expo/vector-icons";

import { useAudioStore } from "@/store/audio-store";
import { getTelegramFileUrl } from "@/lib/get-telegram-file";
import { formatBytes, formatDuration } from "@/lib/utils";

export const AudioPlayer = () => {
  const {
    blog,
    isFooterPlaying,
    sound,
    setSound,
    setIsFooterPlaying,
    setData,
    setIsLoading,
    ...ctx
  } = useAudioStore();

  useEffect(() => {
    if (blog && !sound) {
      loadAudio();
    }
    return () => {
      sound?.unloadAsync(); // Cleanup previous audio
    };
  }, [blog]);

  const loadAudio = async () => {
    const { audio } = blog;
    // const filePath = `${FileSystem.documentDirectory}al-ghurobaa/media/${audio.fileName}`;
    const folderPath = `${Paths.document}al-ghurobaa/media/`;
    const filePath = `${folderPath}${audio.fileName}`;

    // Ensure the folder exists
    const folderInfo = new File(folderPath).info();
    if (!folderInfo.exists) {
      await new Directory().create(folderPath, { intermediates: true });
    }
    const handlePlaybackUpdate = (status) => {
      if (status.isLoaded) {
        const currentMillis = status.positionMillis || 0;
        const totalMillis = status.durationMillis || 1; // Avoid divide by zero
        setData({
          currentTime: formatDuration(currentMillis),
          seekPosition: currentMillis,
          progressPercentage: (currentMillis / totalMillis) * 100,
          duration: totalMillis,
        });
      }
    };
    const fileInfo = new File(filePath).info();

    if (fileInfo.exists) {
      // Load audio from local file
      play(filePath);
    } else {
      // Fetch audio URL via tRPC or API
      //   const audioUrl = await fetchAudio(post.audio.fileId); // Your tRPC call to fetch the audio URL
      const audioUrl = (await getTelegramFileUrl(audio.telegramFileId))?.url;
      if (!audioUrl) {
        //   ToastAndroid.show({ text: "Audio URL is not available!", duration: 3000 });
        ToastAndroid.show("Audi url is not avaible", 2000);
        return;
      }
      // Stream the audio immediately
      const downloadResumable = FileSystem.createDownloadResumable(
        audioUrl,
        filePath,
        {},
        async (downloadProgress) => {
          // Track download progress if needed
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          setData({ downloadProgress: progress });
        }
      );

      const downloadPromise = downloadResumable.downloadAsync().catch((err) => {
        console.error("Download failed:", err);
      });

      // Start streaming audio
      await play(audioUrl);

      // Wait for the download to complete
      // downloadPromise.then();
      downloadResumable
        .downloadAsync()
        .then(async () => {
          // Once download completes, switch to offline mode (local file playback)
          await play(filePath);
          setData({ downloadProgress: 1 }); // Download complete
        })
        .catch((err) => {
          console.error("Download failed:", err);
          //  Toast.show({ text: "Audio download failed!", duration: 3000 });
        });
      //   await play(audioUrl);

      //   setAudioUri(audioUrl);
      //   streamedSound.setOnPlaybackStatusUpdate(handlePlaybackUpdate);

      // setAudioDuration(status.durationMillis || null);
      //   setIsPlaying(true);

      // Download audio and save to local storage in the background
      // const { size } = await FileSystem.downloadAsync(audioUrl, filePath);
      // setAudioSize(size);
    }
    async function play(uri) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Ensure audio stays active in the background
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      });
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, positionMillis: ctx.seekPosition }
      );
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate(handlePlaybackUpdate);
      setIsFooterPlaying(true);
    }
    // setIsLoading(false);
    // if (footerAudio?.uri) {
    //   const { sound: newSound } = await Audio.Sound.createAsync(
    //     { uri: footerAudio.audioUri },
    //     { shouldPlay: false },
    //   );
    //   setSound(newSound);
    // }
  };

  const toggleFooterPlayPause = async () => {
    if (!sound) return;

    if (isFooterPlaying) {
      await sound.pauseAsync();
      setIsFooterPlaying(false);
    } else {
      await sound.playAsync();
      setIsFooterPlaying(true);
    }
  };

  if (!blog) return null;

  return (
    <View className="fixed bottom-0 w-full flex-row items-center p-4">
      <View className="flex-1">
        <Text className="text-lg font-semibold text-white">
          {blog.audio.displayName}
        </Text>
        <Text className="text-sm text-gray-400">
          {blog.audio.authorName} • {blog.audio.albumName}
        </Text>
      </View>
      <TouchableOpacity onPress={toggleFooterPlayPause}>
        <Feather
          name={isFooterPlaying ? "pause" : "play"}
          size={32}
          color="white"
        />
      </TouchableOpacity>
      <View className="mt-4">
        <View className="relative h-2 w-full rounded-full bg-gray-700">
          <View
            style={{ width: `${ctx.progressPercentage}%` }}
            className="absolute h-2 rounded-full bg-blue-500"
          />
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-xs text-gray-400">{ctx.currentTime}</Text>
          <Text className="text-xs text-gray-400">
            {formatDuration(ctx.duration)}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        {/* Additional Info */}
        <View>
          {ctx.size && (
            <Text className="text-xs text-gray-500">
              Size: {formatBytes(ctx.size)}
            </Text>
          )}
        </View>
        {/* Loading Indicator */}
        {ctx.isLoading && <ActivityIndicator size="small" color="#ffffff" />}
      </View>
    </View>
  );
};
