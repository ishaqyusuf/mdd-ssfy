import { useInfiniteLoader } from "@/components/infinite-loader";
import { _trpc } from "@/components/static-trpc";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { FocusAwareStatusBar, SafeAreaView } from "@/components/ui";
import { BodyScrollView } from "@/components/ui/body-scroll-view";
import { usePostsFilter } from "@/hooks/use-posts-filter-params";
import { useState } from "react";
import { useRef } from "react";
import { PicturePostCard } from "@/components/picture-post-card";
import { TextPostCard } from "@/components/text-post-card";
import { AudioPostCard } from "@/components/audio-post-card";
import { Fragment } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
export default function Posts() {
  //   const { filters, hasFilters, setFilters } = usePostsFilter();
  const {
    data: posts,
    ref: loadMoreRef,
    refetch,
    isRefetching,
  } = useInfiniteLoader({
    // filter: ,
    route: _trpc?.podcasts.posts,
  });

  // const [refreshing] = useState(false);
  function Item(props: ItemProps) {
    const { item } = props;
    // return <View className="border-b border-muted p-4"></View>;
    return (
      <ThemedView className="border-b border-muted p-4">
        {item.img.length ? (
          <Fragment>{/* <PicturePostCard {...props} /> */}</Fragment>
        ) : item.audio?.mediaId ? (
          <Fragment>
            <AudioPostCard {...props} />
          </Fragment>
        ) : (
          <Fragment>
            <TextPostCard {...props} />
          </Fragment>
        )}
      </ThemedView>
    );
  }
  const listRef = useRef<FlatList>(null);
  return (
    <>
      <SafeAreaView className="flex-1">
        {/* <ThemedView className=""> */}
        <FlatList
          ref={listRef}
          data={posts}
          // renderItem={({ item }) => <PostCard post={item} />} // Render your post card
          // keyExtractor={item => item.id}
          keyExtractor={(item) => item?.id.toString()}
          renderItem={Item}
          // onScroll={handleScroll}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          // refreshControl={
          //   // Add refresh control
          //   <RefreshControl
          //     refreshing={isRefreshing} // Bind refreshing state
          //     onRefresh={handleRefresh} // Bind refresh handler
          //   />
          // }
          // ListFooterComponent={
          //   isFetchingNextPage ? (
          //     <ActivityIndicator size="small" color="#0000ff" />
          //   ) : null
          // }
          // onEndReached={() => {
          //   if (hasNextPage && !isFetchingNextPage) {
          //     fetchNextPage();
          //   }
          // }}
          // onEndReachedThreshold={0.5} // Load more when 50% from the end
          // ListFooterComponent={
          //   isFetchingNextPage ? (
          //     <ActivityIndicator size="large" />
          //   ) : null
          // }
        />
        {/* </ThemedView> */}
      </SafeAreaView>
      {/* </BodyScrollView> */}
    </>
  );
}
