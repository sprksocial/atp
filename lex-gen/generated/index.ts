/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type FetchHandler,
  type FetchHandlerOptions,
  XrpcClient,
} from "@atp/xrpc";
import { schemas } from "./lexicons.ts";
import { type OmitKey, type Un$Typed } from "./util.ts";
import * as AppBskyVideoUploadVideo from "./types/app/bsky/video/uploadVideo.ts";
import * as AppBskyVideoDefs from "./types/app/bsky/video/defs.ts";
import * as AppBskyVideoGetJobStatus from "./types/app/bsky/video/getJobStatus.ts";
import * as AppBskyVideoGetUploadLimits from "./types/app/bsky/video/getUploadLimits.ts";
import * as AppBskyBookmarkDefs from "./types/app/bsky/bookmark/defs.ts";
import * as AppBskyBookmarkDeleteBookmark from "./types/app/bsky/bookmark/deleteBookmark.ts";
import * as AppBskyBookmarkGetBookmarks from "./types/app/bsky/bookmark/getBookmarks.ts";
import * as AppBskyBookmarkCreateBookmark from "./types/app/bsky/bookmark/createBookmark.ts";
import * as AppBskyEmbedDefs from "./types/app/bsky/embed/defs.ts";
import * as AppBskyEmbedRecord from "./types/app/bsky/embed/record.ts";
import * as AppBskyEmbedImages from "./types/app/bsky/embed/images.ts";
import * as AppBskyEmbedRecordWithMedia from "./types/app/bsky/embed/recordWithMedia.ts";
import * as AppBskyEmbedVideo from "./types/app/bsky/embed/video.ts";
import * as AppBskyEmbedExternal from "./types/app/bsky/embed/external.ts";
import * as AppBskyNotificationDefs from "./types/app/bsky/notification/defs.ts";
import * as AppBskyNotificationRegisterPush from "./types/app/bsky/notification/registerPush.ts";
import * as AppBskyNotificationPutPreferences from "./types/app/bsky/notification/putPreferences.ts";
import * as AppBskyNotificationPutActivitySubscription from "./types/app/bsky/notification/putActivitySubscription.ts";
import * as AppBskyNotificationDeclaration from "./types/app/bsky/notification/declaration.ts";
import * as AppBskyNotificationPutPreferencesV2 from "./types/app/bsky/notification/putPreferencesV2.ts";
import * as AppBskyNotificationUpdateSeen from "./types/app/bsky/notification/updateSeen.ts";
import * as AppBskyNotificationListActivitySubscriptions from "./types/app/bsky/notification/listActivitySubscriptions.ts";
import * as AppBskyNotificationUnregisterPush from "./types/app/bsky/notification/unregisterPush.ts";
import * as AppBskyNotificationGetPreferences from "./types/app/bsky/notification/getPreferences.ts";
import * as AppBskyNotificationListNotifications from "./types/app/bsky/notification/listNotifications.ts";
import * as AppBskyNotificationGetUnreadCount from "./types/app/bsky/notification/getUnreadCount.ts";
import * as AppBskyUnspeccedGetSuggestedFeedsSkeleton from "./types/app/bsky/unspecced/getSuggestedFeedsSkeleton.ts";
import * as AppBskyUnspeccedSearchStarterPacksSkeleton from "./types/app/bsky/unspecced/searchStarterPacksSkeleton.ts";
import * as AppBskyUnspeccedDefs from "./types/app/bsky/unspecced/defs.ts";
import * as AppBskyUnspeccedGetOnboardingSuggestedStarterPacksSkeleton from "./types/app/bsky/unspecced/getOnboardingSuggestedStarterPacksSkeleton.ts";
import * as AppBskyUnspeccedGetSuggestedUsers from "./types/app/bsky/unspecced/getSuggestedUsers.ts";
import * as AppBskyUnspeccedGetPostThreadOtherV2 from "./types/app/bsky/unspecced/getPostThreadOtherV2.ts";
import * as AppBskyUnspeccedGetSuggestedStarterPacks from "./types/app/bsky/unspecced/getSuggestedStarterPacks.ts";
import * as AppBskyUnspeccedGetSuggestedStarterPacksSkeleton from "./types/app/bsky/unspecced/getSuggestedStarterPacksSkeleton.ts";
import * as AppBskyUnspeccedGetOnboardingSuggestedStarterPacks from "./types/app/bsky/unspecced/getOnboardingSuggestedStarterPacks.ts";
import * as AppBskyUnspeccedGetSuggestedUsersSkeleton from "./types/app/bsky/unspecced/getSuggestedUsersSkeleton.ts";
import * as AppBskyUnspeccedGetPostThreadV2 from "./types/app/bsky/unspecced/getPostThreadV2.ts";
import * as AppBskyUnspeccedGetTrends from "./types/app/bsky/unspecced/getTrends.ts";
import * as AppBskyUnspeccedSearchActorsSkeleton from "./types/app/bsky/unspecced/searchActorsSkeleton.ts";
import * as AppBskyUnspeccedGetSuggestionsSkeleton from "./types/app/bsky/unspecced/getSuggestionsSkeleton.ts";
import * as AppBskyUnspeccedSearchPostsSkeleton from "./types/app/bsky/unspecced/searchPostsSkeleton.ts";
import * as AppBskyUnspeccedGetAgeAssuranceState from "./types/app/bsky/unspecced/getAgeAssuranceState.ts";
import * as AppBskyUnspeccedGetPopularFeedGenerators from "./types/app/bsky/unspecced/getPopularFeedGenerators.ts";
import * as AppBskyUnspeccedInitAgeAssurance from "./types/app/bsky/unspecced/initAgeAssurance.ts";
import * as AppBskyUnspeccedGetTrendingTopics from "./types/app/bsky/unspecced/getTrendingTopics.ts";
import * as AppBskyUnspeccedGetTaggedSuggestions from "./types/app/bsky/unspecced/getTaggedSuggestions.ts";
import * as AppBskyUnspeccedGetSuggestedFeeds from "./types/app/bsky/unspecced/getSuggestedFeeds.ts";
import * as AppBskyUnspeccedGetTrendsSkeleton from "./types/app/bsky/unspecced/getTrendsSkeleton.ts";
import * as AppBskyUnspeccedGetConfig from "./types/app/bsky/unspecced/getConfig.ts";
import * as AppBskyGraphGetStarterPacks from "./types/app/bsky/graph/getStarterPacks.ts";
import * as AppBskyGraphGetSuggestedFollowsByActor from "./types/app/bsky/graph/getSuggestedFollowsByActor.ts";
import * as AppBskyGraphBlock from "./types/app/bsky/graph/block.ts";
import * as AppBskyGraphGetStarterPacksWithMembership from "./types/app/bsky/graph/getStarterPacksWithMembership.ts";
import * as AppBskyGraphFollow from "./types/app/bsky/graph/follow.ts";
import * as AppBskyGraphDefs from "./types/app/bsky/graph/defs.ts";
import * as AppBskyGraphGetListsWithMembership from "./types/app/bsky/graph/getListsWithMembership.ts";
import * as AppBskyGraphUnmuteActorList from "./types/app/bsky/graph/unmuteActorList.ts";
import * as AppBskyGraphGetListBlocks from "./types/app/bsky/graph/getListBlocks.ts";
import * as AppBskyGraphListblock from "./types/app/bsky/graph/listblock.ts";
import * as AppBskyGraphGetStarterPack from "./types/app/bsky/graph/getStarterPack.ts";
import * as AppBskyGraphStarterpack from "./types/app/bsky/graph/starterpack.ts";
import * as AppBskyGraphMuteActorList from "./types/app/bsky/graph/muteActorList.ts";
import * as AppBskyGraphMuteThread from "./types/app/bsky/graph/muteThread.ts";
import * as AppBskyGraphSearchStarterPacks from "./types/app/bsky/graph/searchStarterPacks.ts";
import * as AppBskyGraphGetActorStarterPacks from "./types/app/bsky/graph/getActorStarterPacks.ts";
import * as AppBskyGraphGetLists from "./types/app/bsky/graph/getLists.ts";
import * as AppBskyGraphGetFollowers from "./types/app/bsky/graph/getFollowers.ts";
import * as AppBskyGraphUnmuteThread from "./types/app/bsky/graph/unmuteThread.ts";
import * as AppBskyGraphMuteActor from "./types/app/bsky/graph/muteActor.ts";
import * as AppBskyGraphGetMutes from "./types/app/bsky/graph/getMutes.ts";
import * as AppBskyGraphListitem from "./types/app/bsky/graph/listitem.ts";
import * as AppBskyGraphList from "./types/app/bsky/graph/list.ts";
import * as AppBskyGraphGetKnownFollowers from "./types/app/bsky/graph/getKnownFollowers.ts";
import * as AppBskyGraphVerification from "./types/app/bsky/graph/verification.ts";
import * as AppBskyGraphGetListMutes from "./types/app/bsky/graph/getListMutes.ts";
import * as AppBskyGraphGetFollows from "./types/app/bsky/graph/getFollows.ts";
import * as AppBskyGraphGetBlocks from "./types/app/bsky/graph/getBlocks.ts";
import * as AppBskyGraphGetRelationships from "./types/app/bsky/graph/getRelationships.ts";
import * as AppBskyGraphUnmuteActor from "./types/app/bsky/graph/unmuteActor.ts";
import * as AppBskyGraphGetList from "./types/app/bsky/graph/getList.ts";
import * as AppBskyFeedGenerator from "./types/app/bsky/feed/generator.ts";
import * as AppBskyFeedSendInteractions from "./types/app/bsky/feed/sendInteractions.ts";
import * as AppBskyFeedDefs from "./types/app/bsky/feed/defs.ts";
import * as AppBskyFeedGetFeedGenerators from "./types/app/bsky/feed/getFeedGenerators.ts";
import * as AppBskyFeedGetTimeline from "./types/app/bsky/feed/getTimeline.ts";
import * as AppBskyFeedGetFeedGenerator from "./types/app/bsky/feed/getFeedGenerator.ts";
import * as AppBskyFeedGetAuthorFeed from "./types/app/bsky/feed/getAuthorFeed.ts";
import * as AppBskyFeedGetLikes from "./types/app/bsky/feed/getLikes.ts";
import * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.ts";
import * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.ts";
import * as AppBskyFeedGetPostThread from "./types/app/bsky/feed/getPostThread.ts";
import * as AppBskyFeedGetActorLikes from "./types/app/bsky/feed/getActorLikes.ts";
import * as AppBskyFeedLike from "./types/app/bsky/feed/like.ts";
import * as AppBskyFeedGetRepostedBy from "./types/app/bsky/feed/getRepostedBy.ts";
import * as AppBskyFeedRepost from "./types/app/bsky/feed/repost.ts";
import * as AppBskyFeedDescribeFeedGenerator from "./types/app/bsky/feed/describeFeedGenerator.ts";
import * as AppBskyFeedSearchPosts from "./types/app/bsky/feed/searchPosts.ts";
import * as AppBskyFeedGetPosts from "./types/app/bsky/feed/getPosts.ts";
import * as AppBskyFeedGetFeed from "./types/app/bsky/feed/getFeed.ts";
import * as AppBskyFeedGetQuotes from "./types/app/bsky/feed/getQuotes.ts";
import * as AppBskyFeedGetFeedSkeleton from "./types/app/bsky/feed/getFeedSkeleton.ts";
import * as AppBskyFeedGetListFeed from "./types/app/bsky/feed/getListFeed.ts";
import * as AppBskyFeedGetSuggestedFeeds from "./types/app/bsky/feed/getSuggestedFeeds.ts";
import * as AppBskyFeedGetActorFeeds from "./types/app/bsky/feed/getActorFeeds.ts";
import * as AppBskyFeedPost from "./types/app/bsky/feed/post.ts";
import * as AppBskyRichtextFacet from "./types/app/bsky/richtext/facet.ts";
import * as AppBskyActorSearchActorsTypeahead from "./types/app/bsky/actor/searchActorsTypeahead.ts";
import * as AppBskyActorDefs from "./types/app/bsky/actor/defs.ts";
import * as AppBskyActorPutPreferences from "./types/app/bsky/actor/putPreferences.ts";
import * as AppBskyActorGetProfile from "./types/app/bsky/actor/getProfile.ts";
import * as AppBskyActorGetSuggestions from "./types/app/bsky/actor/getSuggestions.ts";
import * as AppBskyActorSearchActors from "./types/app/bsky/actor/searchActors.ts";
import * as AppBskyActorGetProfiles from "./types/app/bsky/actor/getProfiles.ts";
import * as AppBskyActorStatus from "./types/app/bsky/actor/status.ts";
import * as AppBskyActorGetPreferences from "./types/app/bsky/actor/getPreferences.ts";
import * as AppBskyActorProfile from "./types/app/bsky/actor/profile.ts";
import * as AppBskyLabelerDefs from "./types/app/bsky/labeler/defs.ts";
import * as AppBskyLabelerService from "./types/app/bsky/labeler/service.ts";
import * as AppBskyLabelerGetServices from "./types/app/bsky/labeler/getServices.ts";

export * as AppBskyVideoUploadVideo from "./types/app/bsky/video/uploadVideo.ts";
export * as AppBskyVideoDefs from "./types/app/bsky/video/defs.ts";
export * as AppBskyVideoGetJobStatus from "./types/app/bsky/video/getJobStatus.ts";
export * as AppBskyVideoGetUploadLimits from "./types/app/bsky/video/getUploadLimits.ts";
export * as AppBskyBookmarkDefs from "./types/app/bsky/bookmark/defs.ts";
export * as AppBskyBookmarkDeleteBookmark from "./types/app/bsky/bookmark/deleteBookmark.ts";
export * as AppBskyBookmarkGetBookmarks from "./types/app/bsky/bookmark/getBookmarks.ts";
export * as AppBskyBookmarkCreateBookmark from "./types/app/bsky/bookmark/createBookmark.ts";
export * as AppBskyEmbedDefs from "./types/app/bsky/embed/defs.ts";
export * as AppBskyEmbedRecord from "./types/app/bsky/embed/record.ts";
export * as AppBskyEmbedImages from "./types/app/bsky/embed/images.ts";
export * as AppBskyEmbedRecordWithMedia from "./types/app/bsky/embed/recordWithMedia.ts";
export * as AppBskyEmbedVideo from "./types/app/bsky/embed/video.ts";
export * as AppBskyEmbedExternal from "./types/app/bsky/embed/external.ts";
export * as AppBskyNotificationDefs from "./types/app/bsky/notification/defs.ts";
export * as AppBskyNotificationRegisterPush from "./types/app/bsky/notification/registerPush.ts";
export * as AppBskyNotificationPutPreferences from "./types/app/bsky/notification/putPreferences.ts";
export * as AppBskyNotificationPutActivitySubscription from "./types/app/bsky/notification/putActivitySubscription.ts";
export * as AppBskyNotificationDeclaration from "./types/app/bsky/notification/declaration.ts";
export * as AppBskyNotificationPutPreferencesV2 from "./types/app/bsky/notification/putPreferencesV2.ts";
export * as AppBskyNotificationUpdateSeen from "./types/app/bsky/notification/updateSeen.ts";
export * as AppBskyNotificationListActivitySubscriptions from "./types/app/bsky/notification/listActivitySubscriptions.ts";
export * as AppBskyNotificationUnregisterPush from "./types/app/bsky/notification/unregisterPush.ts";
export * as AppBskyNotificationGetPreferences from "./types/app/bsky/notification/getPreferences.ts";
export * as AppBskyNotificationListNotifications from "./types/app/bsky/notification/listNotifications.ts";
export * as AppBskyNotificationGetUnreadCount from "./types/app/bsky/notification/getUnreadCount.ts";
export * as AppBskyUnspeccedGetSuggestedFeedsSkeleton from "./types/app/bsky/unspecced/getSuggestedFeedsSkeleton.ts";
export * as AppBskyUnspeccedSearchStarterPacksSkeleton from "./types/app/bsky/unspecced/searchStarterPacksSkeleton.ts";
export * as AppBskyUnspeccedDefs from "./types/app/bsky/unspecced/defs.ts";
export * as AppBskyUnspeccedGetOnboardingSuggestedStarterPacksSkeleton from "./types/app/bsky/unspecced/getOnboardingSuggestedStarterPacksSkeleton.ts";
export * as AppBskyUnspeccedGetSuggestedUsers from "./types/app/bsky/unspecced/getSuggestedUsers.ts";
export * as AppBskyUnspeccedGetPostThreadOtherV2 from "./types/app/bsky/unspecced/getPostThreadOtherV2.ts";
export * as AppBskyUnspeccedGetSuggestedStarterPacks from "./types/app/bsky/unspecced/getSuggestedStarterPacks.ts";
export * as AppBskyUnspeccedGetSuggestedStarterPacksSkeleton from "./types/app/bsky/unspecced/getSuggestedStarterPacksSkeleton.ts";
export * as AppBskyUnspeccedGetOnboardingSuggestedStarterPacks from "./types/app/bsky/unspecced/getOnboardingSuggestedStarterPacks.ts";
export * as AppBskyUnspeccedGetSuggestedUsersSkeleton from "./types/app/bsky/unspecced/getSuggestedUsersSkeleton.ts";
export * as AppBskyUnspeccedGetPostThreadV2 from "./types/app/bsky/unspecced/getPostThreadV2.ts";
export * as AppBskyUnspeccedGetTrends from "./types/app/bsky/unspecced/getTrends.ts";
export * as AppBskyUnspeccedSearchActorsSkeleton from "./types/app/bsky/unspecced/searchActorsSkeleton.ts";
export * as AppBskyUnspeccedGetSuggestionsSkeleton from "./types/app/bsky/unspecced/getSuggestionsSkeleton.ts";
export * as AppBskyUnspeccedSearchPostsSkeleton from "./types/app/bsky/unspecced/searchPostsSkeleton.ts";
export * as AppBskyUnspeccedGetAgeAssuranceState from "./types/app/bsky/unspecced/getAgeAssuranceState.ts";
export * as AppBskyUnspeccedGetPopularFeedGenerators from "./types/app/bsky/unspecced/getPopularFeedGenerators.ts";
export * as AppBskyUnspeccedInitAgeAssurance from "./types/app/bsky/unspecced/initAgeAssurance.ts";
export * as AppBskyUnspeccedGetTrendingTopics from "./types/app/bsky/unspecced/getTrendingTopics.ts";
export * as AppBskyUnspeccedGetTaggedSuggestions from "./types/app/bsky/unspecced/getTaggedSuggestions.ts";
export * as AppBskyUnspeccedGetSuggestedFeeds from "./types/app/bsky/unspecced/getSuggestedFeeds.ts";
export * as AppBskyUnspeccedGetTrendsSkeleton from "./types/app/bsky/unspecced/getTrendsSkeleton.ts";
export * as AppBskyUnspeccedGetConfig from "./types/app/bsky/unspecced/getConfig.ts";
export * as AppBskyGraphGetStarterPacks from "./types/app/bsky/graph/getStarterPacks.ts";
export * as AppBskyGraphGetSuggestedFollowsByActor from "./types/app/bsky/graph/getSuggestedFollowsByActor.ts";
export * as AppBskyGraphBlock from "./types/app/bsky/graph/block.ts";
export * as AppBskyGraphGetStarterPacksWithMembership from "./types/app/bsky/graph/getStarterPacksWithMembership.ts";
export * as AppBskyGraphFollow from "./types/app/bsky/graph/follow.ts";
export * as AppBskyGraphDefs from "./types/app/bsky/graph/defs.ts";
export * as AppBskyGraphGetListsWithMembership from "./types/app/bsky/graph/getListsWithMembership.ts";
export * as AppBskyGraphUnmuteActorList from "./types/app/bsky/graph/unmuteActorList.ts";
export * as AppBskyGraphGetListBlocks from "./types/app/bsky/graph/getListBlocks.ts";
export * as AppBskyGraphListblock from "./types/app/bsky/graph/listblock.ts";
export * as AppBskyGraphGetStarterPack from "./types/app/bsky/graph/getStarterPack.ts";
export * as AppBskyGraphStarterpack from "./types/app/bsky/graph/starterpack.ts";
export * as AppBskyGraphMuteActorList from "./types/app/bsky/graph/muteActorList.ts";
export * as AppBskyGraphMuteThread from "./types/app/bsky/graph/muteThread.ts";
export * as AppBskyGraphSearchStarterPacks from "./types/app/bsky/graph/searchStarterPacks.ts";
export * as AppBskyGraphGetActorStarterPacks from "./types/app/bsky/graph/getActorStarterPacks.ts";
export * as AppBskyGraphGetLists from "./types/app/bsky/graph/getLists.ts";
export * as AppBskyGraphGetFollowers from "./types/app/bsky/graph/getFollowers.ts";
export * as AppBskyGraphUnmuteThread from "./types/app/bsky/graph/unmuteThread.ts";
export * as AppBskyGraphMuteActor from "./types/app/bsky/graph/muteActor.ts";
export * as AppBskyGraphGetMutes from "./types/app/bsky/graph/getMutes.ts";
export * as AppBskyGraphListitem from "./types/app/bsky/graph/listitem.ts";
export * as AppBskyGraphList from "./types/app/bsky/graph/list.ts";
export * as AppBskyGraphGetKnownFollowers from "./types/app/bsky/graph/getKnownFollowers.ts";
export * as AppBskyGraphVerification from "./types/app/bsky/graph/verification.ts";
export * as AppBskyGraphGetListMutes from "./types/app/bsky/graph/getListMutes.ts";
export * as AppBskyGraphGetFollows from "./types/app/bsky/graph/getFollows.ts";
export * as AppBskyGraphGetBlocks from "./types/app/bsky/graph/getBlocks.ts";
export * as AppBskyGraphGetRelationships from "./types/app/bsky/graph/getRelationships.ts";
export * as AppBskyGraphUnmuteActor from "./types/app/bsky/graph/unmuteActor.ts";
export * as AppBskyGraphGetList from "./types/app/bsky/graph/getList.ts";
export * as AppBskyFeedGenerator from "./types/app/bsky/feed/generator.ts";
export * as AppBskyFeedSendInteractions from "./types/app/bsky/feed/sendInteractions.ts";
export * as AppBskyFeedDefs from "./types/app/bsky/feed/defs.ts";
export * as AppBskyFeedGetFeedGenerators from "./types/app/bsky/feed/getFeedGenerators.ts";
export * as AppBskyFeedGetTimeline from "./types/app/bsky/feed/getTimeline.ts";
export * as AppBskyFeedGetFeedGenerator from "./types/app/bsky/feed/getFeedGenerator.ts";
export * as AppBskyFeedGetAuthorFeed from "./types/app/bsky/feed/getAuthorFeed.ts";
export * as AppBskyFeedGetLikes from "./types/app/bsky/feed/getLikes.ts";
export * as AppBskyFeedPostgate from "./types/app/bsky/feed/postgate.ts";
export * as AppBskyFeedThreadgate from "./types/app/bsky/feed/threadgate.ts";
export * as AppBskyFeedGetPostThread from "./types/app/bsky/feed/getPostThread.ts";
export * as AppBskyFeedGetActorLikes from "./types/app/bsky/feed/getActorLikes.ts";
export * as AppBskyFeedLike from "./types/app/bsky/feed/like.ts";
export * as AppBskyFeedGetRepostedBy from "./types/app/bsky/feed/getRepostedBy.ts";
export * as AppBskyFeedRepost from "./types/app/bsky/feed/repost.ts";
export * as AppBskyFeedDescribeFeedGenerator from "./types/app/bsky/feed/describeFeedGenerator.ts";
export * as AppBskyFeedSearchPosts from "./types/app/bsky/feed/searchPosts.ts";
export * as AppBskyFeedGetPosts from "./types/app/bsky/feed/getPosts.ts";
export * as AppBskyFeedGetFeed from "./types/app/bsky/feed/getFeed.ts";
export * as AppBskyFeedGetQuotes from "./types/app/bsky/feed/getQuotes.ts";
export * as AppBskyFeedGetFeedSkeleton from "./types/app/bsky/feed/getFeedSkeleton.ts";
export * as AppBskyFeedGetListFeed from "./types/app/bsky/feed/getListFeed.ts";
export * as AppBskyFeedGetSuggestedFeeds from "./types/app/bsky/feed/getSuggestedFeeds.ts";
export * as AppBskyFeedGetActorFeeds from "./types/app/bsky/feed/getActorFeeds.ts";
export * as AppBskyFeedPost from "./types/app/bsky/feed/post.ts";
export * as AppBskyRichtextFacet from "./types/app/bsky/richtext/facet.ts";
export * as AppBskyActorSearchActorsTypeahead from "./types/app/bsky/actor/searchActorsTypeahead.ts";
export * as AppBskyActorDefs from "./types/app/bsky/actor/defs.ts";
export * as AppBskyActorPutPreferences from "./types/app/bsky/actor/putPreferences.ts";
export * as AppBskyActorGetProfile from "./types/app/bsky/actor/getProfile.ts";
export * as AppBskyActorGetSuggestions from "./types/app/bsky/actor/getSuggestions.ts";
export * as AppBskyActorSearchActors from "./types/app/bsky/actor/searchActors.ts";
export * as AppBskyActorGetProfiles from "./types/app/bsky/actor/getProfiles.ts";
export * as AppBskyActorStatus from "./types/app/bsky/actor/status.ts";
export * as AppBskyActorGetPreferences from "./types/app/bsky/actor/getPreferences.ts";
export * as AppBskyActorProfile from "./types/app/bsky/actor/profile.ts";
export * as AppBskyLabelerDefs from "./types/app/bsky/labeler/defs.ts";
export * as AppBskyLabelerService from "./types/app/bsky/labeler/service.ts";
export * as AppBskyLabelerGetServices from "./types/app/bsky/labeler/getServices.ts";

export const APP_BSKY_GRAPH = {
  DefsModlist: "app.bsky.graph.defs#modlist",
  DefsCuratelist: "app.bsky.graph.defs#curatelist",
  DefsReferencelist: "app.bsky.graph.defs#referencelist",
};
export const APP_BSKY_FEED = {
  DefsRequestLess: "app.bsky.feed.defs#requestLess",
  DefsRequestMore: "app.bsky.feed.defs#requestMore",
  DefsClickthroughItem: "app.bsky.feed.defs#clickthroughItem",
  DefsClickthroughAuthor: "app.bsky.feed.defs#clickthroughAuthor",
  DefsClickthroughReposter: "app.bsky.feed.defs#clickthroughReposter",
  DefsClickthroughEmbed: "app.bsky.feed.defs#clickthroughEmbed",
  DefsContentModeUnspecified: "app.bsky.feed.defs#contentModeUnspecified",
  DefsContentModeVideo: "app.bsky.feed.defs#contentModeVideo",
  DefsInteractionSeen: "app.bsky.feed.defs#interactionSeen",
  DefsInteractionLike: "app.bsky.feed.defs#interactionLike",
  DefsInteractionRepost: "app.bsky.feed.defs#interactionRepost",
  DefsInteractionReply: "app.bsky.feed.defs#interactionReply",
  DefsInteractionQuote: "app.bsky.feed.defs#interactionQuote",
  DefsInteractionShare: "app.bsky.feed.defs#interactionShare",
};
export const APP_BSKY_ACTOR = {
  StatusLive: "app.bsky.actor.status#live",
};

export class AtpBaseClient extends XrpcClient {
  app: AppNS;

  constructor(options: FetchHandler | FetchHandlerOptions) {
    super(options, schemas);
    this.app = new AppNS(this);
  }

  /** @deprecated use `this` instead */
  get xrpc(): XrpcClient {
    return this;
  }
}

export class AppNS {
  _client: XrpcClient;
  bsky: AppBskyNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.bsky = new AppBskyNS(client);
  }
}

export class AppBskyNS {
  _client: XrpcClient;
  video: AppBskyVideoNS;
  bookmark: AppBskyBookmarkNS;
  embed: AppBskyEmbedNS;
  notification: AppBskyNotificationNS;
  unspecced: AppBskyUnspeccedNS;
  graph: AppBskyGraphNS;
  feed: AppBskyFeedNS;
  richtext: AppBskyRichtextNS;
  actor: AppBskyActorNS;
  labeler: AppBskyLabelerNS;

  constructor(client: XrpcClient) {
    this._client = client;
    this.video = new AppBskyVideoNS(client);
    this.bookmark = new AppBskyBookmarkNS(client);
    this.embed = new AppBskyEmbedNS(client);
    this.notification = new AppBskyNotificationNS(client);
    this.unspecced = new AppBskyUnspeccedNS(client);
    this.graph = new AppBskyGraphNS(client);
    this.feed = new AppBskyFeedNS(client);
    this.richtext = new AppBskyRichtextNS(client);
    this.actor = new AppBskyActorNS(client);
    this.labeler = new AppBskyLabelerNS(client);
  }
}

export class AppBskyVideoNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  uploadVideo(
    data?: AppBskyVideoUploadVideo.InputSchema,
    opts?: AppBskyVideoUploadVideo.CallOptions,
  ): Promise<AppBskyVideoUploadVideo.Response> {
    return this._client
      .call("app.bsky.video.uploadVideo", opts?.qp, data, opts);
  }

  getJobStatus(
    params?: AppBskyVideoGetJobStatus.QueryParams,
    opts?: AppBskyVideoGetJobStatus.CallOptions,
  ): Promise<AppBskyVideoGetJobStatus.Response> {
    return this._client
      .call("app.bsky.video.getJobStatus", params, undefined, opts);
  }

  getUploadLimits(
    params?: AppBskyVideoGetUploadLimits.QueryParams,
    opts?: AppBskyVideoGetUploadLimits.CallOptions,
  ): Promise<AppBskyVideoGetUploadLimits.Response> {
    return this._client
      .call("app.bsky.video.getUploadLimits", params, undefined, opts);
  }
}

export class AppBskyBookmarkNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  deleteBookmark(
    data?: AppBskyBookmarkDeleteBookmark.InputSchema,
    opts?: AppBskyBookmarkDeleteBookmark.CallOptions,
  ): Promise<AppBskyBookmarkDeleteBookmark.Response> {
    return this._client
      .call("app.bsky.bookmark.deleteBookmark", opts?.qp, data, opts)
      .catch((e) => {
        throw AppBskyBookmarkDeleteBookmark.toKnownErr(e);
      });
  }

  getBookmarks(
    params?: AppBskyBookmarkGetBookmarks.QueryParams,
    opts?: AppBskyBookmarkGetBookmarks.CallOptions,
  ): Promise<AppBskyBookmarkGetBookmarks.Response> {
    return this._client
      .call("app.bsky.bookmark.getBookmarks", params, undefined, opts);
  }

  createBookmark(
    data?: AppBskyBookmarkCreateBookmark.InputSchema,
    opts?: AppBskyBookmarkCreateBookmark.CallOptions,
  ): Promise<AppBskyBookmarkCreateBookmark.Response> {
    return this._client
      .call("app.bsky.bookmark.createBookmark", opts?.qp, data, opts)
      .catch((e) => {
        throw AppBskyBookmarkCreateBookmark.toKnownErr(e);
      });
  }
}

export class AppBskyEmbedNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class AppBskyNotificationNS {
  _client: XrpcClient;
  declaration: AppBskyNotificationDeclarationRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.declaration = new AppBskyNotificationDeclarationRecord(client);
  }

  registerPush(
    data?: AppBskyNotificationRegisterPush.InputSchema,
    opts?: AppBskyNotificationRegisterPush.CallOptions,
  ): Promise<AppBskyNotificationRegisterPush.Response> {
    return this._client
      .call("app.bsky.notification.registerPush", opts?.qp, data, opts);
  }

  putPreferences(
    data?: AppBskyNotificationPutPreferences.InputSchema,
    opts?: AppBskyNotificationPutPreferences.CallOptions,
  ): Promise<AppBskyNotificationPutPreferences.Response> {
    return this._client
      .call("app.bsky.notification.putPreferences", opts?.qp, data, opts);
  }

  putActivitySubscription(
    data?: AppBskyNotificationPutActivitySubscription.InputSchema,
    opts?: AppBskyNotificationPutActivitySubscription.CallOptions,
  ): Promise<AppBskyNotificationPutActivitySubscription.Response> {
    return this._client
      .call(
        "app.bsky.notification.putActivitySubscription",
        opts?.qp,
        data,
        opts,
      );
  }

  putPreferencesV2(
    data?: AppBskyNotificationPutPreferencesV2.InputSchema,
    opts?: AppBskyNotificationPutPreferencesV2.CallOptions,
  ): Promise<AppBskyNotificationPutPreferencesV2.Response> {
    return this._client
      .call("app.bsky.notification.putPreferencesV2", opts?.qp, data, opts);
  }

  updateSeen(
    data?: AppBskyNotificationUpdateSeen.InputSchema,
    opts?: AppBskyNotificationUpdateSeen.CallOptions,
  ): Promise<AppBskyNotificationUpdateSeen.Response> {
    return this._client
      .call("app.bsky.notification.updateSeen", opts?.qp, data, opts);
  }

  listActivitySubscriptions(
    params?: AppBskyNotificationListActivitySubscriptions.QueryParams,
    opts?: AppBskyNotificationListActivitySubscriptions.CallOptions,
  ): Promise<AppBskyNotificationListActivitySubscriptions.Response> {
    return this._client
      .call(
        "app.bsky.notification.listActivitySubscriptions",
        params,
        undefined,
        opts,
      );
  }

  unregisterPush(
    data?: AppBskyNotificationUnregisterPush.InputSchema,
    opts?: AppBskyNotificationUnregisterPush.CallOptions,
  ): Promise<AppBskyNotificationUnregisterPush.Response> {
    return this._client
      .call("app.bsky.notification.unregisterPush", opts?.qp, data, opts);
  }

  getPreferences(
    params?: AppBskyNotificationGetPreferences.QueryParams,
    opts?: AppBskyNotificationGetPreferences.CallOptions,
  ): Promise<AppBskyNotificationGetPreferences.Response> {
    return this._client
      .call("app.bsky.notification.getPreferences", params, undefined, opts);
  }

  listNotifications(
    params?: AppBskyNotificationListNotifications.QueryParams,
    opts?: AppBskyNotificationListNotifications.CallOptions,
  ): Promise<AppBskyNotificationListNotifications.Response> {
    return this._client
      .call("app.bsky.notification.listNotifications", params, undefined, opts);
  }

  getUnreadCount(
    params?: AppBskyNotificationGetUnreadCount.QueryParams,
    opts?: AppBskyNotificationGetUnreadCount.CallOptions,
  ): Promise<AppBskyNotificationGetUnreadCount.Response> {
    return this._client
      .call("app.bsky.notification.getUnreadCount", params, undefined, opts);
  }
}

export class AppBskyNotificationDeclarationRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records:
        ({ uri: string; value: AppBskyNotificationDeclaration.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.notification.declaration",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyNotificationDeclaration.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.notification.declaration",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyNotificationDeclaration.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.notification.declaration";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      {
        collection,
        rkey: "self",
        ...params,
        record: { ...record, $type: collection },
      },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.notification.declaration",
      ...params,
    }, { headers });
  }
}

export class AppBskyUnspeccedNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  getSuggestedFeedsSkeleton(
    params?: AppBskyUnspeccedGetSuggestedFeedsSkeleton.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedFeedsSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedFeedsSkeleton.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getSuggestedFeedsSkeleton",
        params,
        undefined,
        opts,
      );
  }

  searchStarterPacksSkeleton(
    params?: AppBskyUnspeccedSearchStarterPacksSkeleton.QueryParams,
    opts?: AppBskyUnspeccedSearchStarterPacksSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedSearchStarterPacksSkeleton.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.searchStarterPacksSkeleton",
        params,
        undefined,
        opts,
      )
      .catch((e) => {
        throw AppBskyUnspeccedSearchStarterPacksSkeleton.toKnownErr(e);
      });
  }

  getOnboardingSuggestedStarterPacksSkeleton(
    params?:
      AppBskyUnspeccedGetOnboardingSuggestedStarterPacksSkeleton.QueryParams,
    opts?:
      AppBskyUnspeccedGetOnboardingSuggestedStarterPacksSkeleton.CallOptions,
  ): Promise<
    AppBskyUnspeccedGetOnboardingSuggestedStarterPacksSkeleton.Response
  > {
    return this._client
      .call(
        "app.bsky.unspecced.getOnboardingSuggestedStarterPacksSkeleton",
        params,
        undefined,
        opts,
      );
  }

  getSuggestedUsers(
    params?: AppBskyUnspeccedGetSuggestedUsers.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedUsers.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedUsers.Response> {
    return this._client
      .call("app.bsky.unspecced.getSuggestedUsers", params, undefined, opts);
  }

  getPostThreadOtherV2(
    params?: AppBskyUnspeccedGetPostThreadOtherV2.QueryParams,
    opts?: AppBskyUnspeccedGetPostThreadOtherV2.CallOptions,
  ): Promise<AppBskyUnspeccedGetPostThreadOtherV2.Response> {
    return this._client
      .call("app.bsky.unspecced.getPostThreadOtherV2", params, undefined, opts);
  }

  getSuggestedStarterPacks(
    params?: AppBskyUnspeccedGetSuggestedStarterPacks.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedStarterPacks.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedStarterPacks.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getSuggestedStarterPacks",
        params,
        undefined,
        opts,
      );
  }

  getSuggestedStarterPacksSkeleton(
    params?: AppBskyUnspeccedGetSuggestedStarterPacksSkeleton.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedStarterPacksSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedStarterPacksSkeleton.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getSuggestedStarterPacksSkeleton",
        params,
        undefined,
        opts,
      );
  }

  getOnboardingSuggestedStarterPacks(
    params?: AppBskyUnspeccedGetOnboardingSuggestedStarterPacks.QueryParams,
    opts?: AppBskyUnspeccedGetOnboardingSuggestedStarterPacks.CallOptions,
  ): Promise<AppBskyUnspeccedGetOnboardingSuggestedStarterPacks.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getOnboardingSuggestedStarterPacks",
        params,
        undefined,
        opts,
      );
  }

  getSuggestedUsersSkeleton(
    params?: AppBskyUnspeccedGetSuggestedUsersSkeleton.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedUsersSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedUsersSkeleton.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getSuggestedUsersSkeleton",
        params,
        undefined,
        opts,
      );
  }

  getPostThreadV2(
    params?: AppBskyUnspeccedGetPostThreadV2.QueryParams,
    opts?: AppBskyUnspeccedGetPostThreadV2.CallOptions,
  ): Promise<AppBskyUnspeccedGetPostThreadV2.Response> {
    return this._client
      .call("app.bsky.unspecced.getPostThreadV2", params, undefined, opts);
  }

  getTrends(
    params?: AppBskyUnspeccedGetTrends.QueryParams,
    opts?: AppBskyUnspeccedGetTrends.CallOptions,
  ): Promise<AppBskyUnspeccedGetTrends.Response> {
    return this._client
      .call("app.bsky.unspecced.getTrends", params, undefined, opts);
  }

  searchActorsSkeleton(
    params?: AppBskyUnspeccedSearchActorsSkeleton.QueryParams,
    opts?: AppBskyUnspeccedSearchActorsSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedSearchActorsSkeleton.Response> {
    return this._client
      .call("app.bsky.unspecced.searchActorsSkeleton", params, undefined, opts)
      .catch((e) => {
        throw AppBskyUnspeccedSearchActorsSkeleton.toKnownErr(e);
      });
  }

  getSuggestionsSkeleton(
    params?: AppBskyUnspeccedGetSuggestionsSkeleton.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestionsSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestionsSkeleton.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getSuggestionsSkeleton",
        params,
        undefined,
        opts,
      );
  }

  searchPostsSkeleton(
    params?: AppBskyUnspeccedSearchPostsSkeleton.QueryParams,
    opts?: AppBskyUnspeccedSearchPostsSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedSearchPostsSkeleton.Response> {
    return this._client
      .call("app.bsky.unspecced.searchPostsSkeleton", params, undefined, opts)
      .catch((e) => {
        throw AppBskyUnspeccedSearchPostsSkeleton.toKnownErr(e);
      });
  }

  getAgeAssuranceState(
    params?: AppBskyUnspeccedGetAgeAssuranceState.QueryParams,
    opts?: AppBskyUnspeccedGetAgeAssuranceState.CallOptions,
  ): Promise<AppBskyUnspeccedGetAgeAssuranceState.Response> {
    return this._client
      .call("app.bsky.unspecced.getAgeAssuranceState", params, undefined, opts);
  }

  getPopularFeedGenerators(
    params?: AppBskyUnspeccedGetPopularFeedGenerators.QueryParams,
    opts?: AppBskyUnspeccedGetPopularFeedGenerators.CallOptions,
  ): Promise<AppBskyUnspeccedGetPopularFeedGenerators.Response> {
    return this._client
      .call(
        "app.bsky.unspecced.getPopularFeedGenerators",
        params,
        undefined,
        opts,
      );
  }

  initAgeAssurance(
    data?: AppBskyUnspeccedInitAgeAssurance.InputSchema,
    opts?: AppBskyUnspeccedInitAgeAssurance.CallOptions,
  ): Promise<AppBskyUnspeccedInitAgeAssurance.Response> {
    return this._client
      .call("app.bsky.unspecced.initAgeAssurance", opts?.qp, data, opts)
      .catch((e) => {
        throw AppBskyUnspeccedInitAgeAssurance.toKnownErr(e);
      });
  }

  getTrendingTopics(
    params?: AppBskyUnspeccedGetTrendingTopics.QueryParams,
    opts?: AppBskyUnspeccedGetTrendingTopics.CallOptions,
  ): Promise<AppBskyUnspeccedGetTrendingTopics.Response> {
    return this._client
      .call("app.bsky.unspecced.getTrendingTopics", params, undefined, opts);
  }

  getTaggedSuggestions(
    params?: AppBskyUnspeccedGetTaggedSuggestions.QueryParams,
    opts?: AppBskyUnspeccedGetTaggedSuggestions.CallOptions,
  ): Promise<AppBskyUnspeccedGetTaggedSuggestions.Response> {
    return this._client
      .call("app.bsky.unspecced.getTaggedSuggestions", params, undefined, opts);
  }

  getSuggestedFeeds(
    params?: AppBskyUnspeccedGetSuggestedFeeds.QueryParams,
    opts?: AppBskyUnspeccedGetSuggestedFeeds.CallOptions,
  ): Promise<AppBskyUnspeccedGetSuggestedFeeds.Response> {
    return this._client
      .call("app.bsky.unspecced.getSuggestedFeeds", params, undefined, opts);
  }

  getTrendsSkeleton(
    params?: AppBskyUnspeccedGetTrendsSkeleton.QueryParams,
    opts?: AppBskyUnspeccedGetTrendsSkeleton.CallOptions,
  ): Promise<AppBskyUnspeccedGetTrendsSkeleton.Response> {
    return this._client
      .call("app.bsky.unspecced.getTrendsSkeleton", params, undefined, opts);
  }

  getConfig(
    params?: AppBskyUnspeccedGetConfig.QueryParams,
    opts?: AppBskyUnspeccedGetConfig.CallOptions,
  ): Promise<AppBskyUnspeccedGetConfig.Response> {
    return this._client
      .call("app.bsky.unspecced.getConfig", params, undefined, opts);
  }
}

export class AppBskyGraphNS {
  _client: XrpcClient;
  block: AppBskyGraphBlockRecord;
  follow: AppBskyGraphFollowRecord;
  listblock: AppBskyGraphListblockRecord;
  starterpack: AppBskyGraphStarterpackRecord;
  listitem: AppBskyGraphListitemRecord;
  list: AppBskyGraphListRecord;
  verification: AppBskyGraphVerificationRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.block = new AppBskyGraphBlockRecord(client);
    this.follow = new AppBskyGraphFollowRecord(client);
    this.listblock = new AppBskyGraphListblockRecord(client);
    this.starterpack = new AppBskyGraphStarterpackRecord(client);
    this.listitem = new AppBskyGraphListitemRecord(client);
    this.list = new AppBskyGraphListRecord(client);
    this.verification = new AppBskyGraphVerificationRecord(client);
  }

  getStarterPacks(
    params?: AppBskyGraphGetStarterPacks.QueryParams,
    opts?: AppBskyGraphGetStarterPacks.CallOptions,
  ): Promise<AppBskyGraphGetStarterPacks.Response> {
    return this._client
      .call("app.bsky.graph.getStarterPacks", params, undefined, opts);
  }

  getSuggestedFollowsByActor(
    params?: AppBskyGraphGetSuggestedFollowsByActor.QueryParams,
    opts?: AppBskyGraphGetSuggestedFollowsByActor.CallOptions,
  ): Promise<AppBskyGraphGetSuggestedFollowsByActor.Response> {
    return this._client
      .call(
        "app.bsky.graph.getSuggestedFollowsByActor",
        params,
        undefined,
        opts,
      );
  }

  getStarterPacksWithMembership(
    params?: AppBskyGraphGetStarterPacksWithMembership.QueryParams,
    opts?: AppBskyGraphGetStarterPacksWithMembership.CallOptions,
  ): Promise<AppBskyGraphGetStarterPacksWithMembership.Response> {
    return this._client
      .call(
        "app.bsky.graph.getStarterPacksWithMembership",
        params,
        undefined,
        opts,
      );
  }

  getListsWithMembership(
    params?: AppBskyGraphGetListsWithMembership.QueryParams,
    opts?: AppBskyGraphGetListsWithMembership.CallOptions,
  ): Promise<AppBskyGraphGetListsWithMembership.Response> {
    return this._client
      .call("app.bsky.graph.getListsWithMembership", params, undefined, opts);
  }

  unmuteActorList(
    data?: AppBskyGraphUnmuteActorList.InputSchema,
    opts?: AppBskyGraphUnmuteActorList.CallOptions,
  ): Promise<AppBskyGraphUnmuteActorList.Response> {
    return this._client
      .call("app.bsky.graph.unmuteActorList", opts?.qp, data, opts);
  }

  getListBlocks(
    params?: AppBskyGraphGetListBlocks.QueryParams,
    opts?: AppBskyGraphGetListBlocks.CallOptions,
  ): Promise<AppBskyGraphGetListBlocks.Response> {
    return this._client
      .call("app.bsky.graph.getListBlocks", params, undefined, opts);
  }

  getStarterPack(
    params?: AppBskyGraphGetStarterPack.QueryParams,
    opts?: AppBskyGraphGetStarterPack.CallOptions,
  ): Promise<AppBskyGraphGetStarterPack.Response> {
    return this._client
      .call("app.bsky.graph.getStarterPack", params, undefined, opts);
  }

  muteActorList(
    data?: AppBskyGraphMuteActorList.InputSchema,
    opts?: AppBskyGraphMuteActorList.CallOptions,
  ): Promise<AppBskyGraphMuteActorList.Response> {
    return this._client
      .call("app.bsky.graph.muteActorList", opts?.qp, data, opts);
  }

  muteThread(
    data?: AppBskyGraphMuteThread.InputSchema,
    opts?: AppBskyGraphMuteThread.CallOptions,
  ): Promise<AppBskyGraphMuteThread.Response> {
    return this._client
      .call("app.bsky.graph.muteThread", opts?.qp, data, opts);
  }

  searchStarterPacks(
    params?: AppBskyGraphSearchStarterPacks.QueryParams,
    opts?: AppBskyGraphSearchStarterPacks.CallOptions,
  ): Promise<AppBskyGraphSearchStarterPacks.Response> {
    return this._client
      .call("app.bsky.graph.searchStarterPacks", params, undefined, opts);
  }

  getActorStarterPacks(
    params?: AppBskyGraphGetActorStarterPacks.QueryParams,
    opts?: AppBskyGraphGetActorStarterPacks.CallOptions,
  ): Promise<AppBskyGraphGetActorStarterPacks.Response> {
    return this._client
      .call("app.bsky.graph.getActorStarterPacks", params, undefined, opts);
  }

  getLists(
    params?: AppBskyGraphGetLists.QueryParams,
    opts?: AppBskyGraphGetLists.CallOptions,
  ): Promise<AppBskyGraphGetLists.Response> {
    return this._client
      .call("app.bsky.graph.getLists", params, undefined, opts);
  }

  getFollowers(
    params?: AppBskyGraphGetFollowers.QueryParams,
    opts?: AppBskyGraphGetFollowers.CallOptions,
  ): Promise<AppBskyGraphGetFollowers.Response> {
    return this._client
      .call("app.bsky.graph.getFollowers", params, undefined, opts);
  }

  unmuteThread(
    data?: AppBskyGraphUnmuteThread.InputSchema,
    opts?: AppBskyGraphUnmuteThread.CallOptions,
  ): Promise<AppBskyGraphUnmuteThread.Response> {
    return this._client
      .call("app.bsky.graph.unmuteThread", opts?.qp, data, opts);
  }

  muteActor(
    data?: AppBskyGraphMuteActor.InputSchema,
    opts?: AppBskyGraphMuteActor.CallOptions,
  ): Promise<AppBskyGraphMuteActor.Response> {
    return this._client
      .call("app.bsky.graph.muteActor", opts?.qp, data, opts);
  }

  getMutes(
    params?: AppBskyGraphGetMutes.QueryParams,
    opts?: AppBskyGraphGetMutes.CallOptions,
  ): Promise<AppBskyGraphGetMutes.Response> {
    return this._client
      .call("app.bsky.graph.getMutes", params, undefined, opts);
  }

  getKnownFollowers(
    params?: AppBskyGraphGetKnownFollowers.QueryParams,
    opts?: AppBskyGraphGetKnownFollowers.CallOptions,
  ): Promise<AppBskyGraphGetKnownFollowers.Response> {
    return this._client
      .call("app.bsky.graph.getKnownFollowers", params, undefined, opts);
  }

  getListMutes(
    params?: AppBskyGraphGetListMutes.QueryParams,
    opts?: AppBskyGraphGetListMutes.CallOptions,
  ): Promise<AppBskyGraphGetListMutes.Response> {
    return this._client
      .call("app.bsky.graph.getListMutes", params, undefined, opts);
  }

  getFollows(
    params?: AppBskyGraphGetFollows.QueryParams,
    opts?: AppBskyGraphGetFollows.CallOptions,
  ): Promise<AppBskyGraphGetFollows.Response> {
    return this._client
      .call("app.bsky.graph.getFollows", params, undefined, opts);
  }

  getBlocks(
    params?: AppBskyGraphGetBlocks.QueryParams,
    opts?: AppBskyGraphGetBlocks.CallOptions,
  ): Promise<AppBskyGraphGetBlocks.Response> {
    return this._client
      .call("app.bsky.graph.getBlocks", params, undefined, opts);
  }

  getRelationships(
    params?: AppBskyGraphGetRelationships.QueryParams,
    opts?: AppBskyGraphGetRelationships.CallOptions,
  ): Promise<AppBskyGraphGetRelationships.Response> {
    return this._client
      .call("app.bsky.graph.getRelationships", params, undefined, opts)
      .catch((e) => {
        throw AppBskyGraphGetRelationships.toKnownErr(e);
      });
  }

  unmuteActor(
    data?: AppBskyGraphUnmuteActor.InputSchema,
    opts?: AppBskyGraphUnmuteActor.CallOptions,
  ): Promise<AppBskyGraphUnmuteActor.Response> {
    return this._client
      .call("app.bsky.graph.unmuteActor", opts?.qp, data, opts);
  }

  getList(
    params?: AppBskyGraphGetList.QueryParams,
    opts?: AppBskyGraphGetList.CallOptions,
  ): Promise<AppBskyGraphGetList.Response> {
    return this._client
      .call("app.bsky.graph.getList", params, undefined, opts);
  }
}

export class AppBskyGraphBlockRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphBlock.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.block",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyGraphBlock.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.block",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphBlock.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.block";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.block",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphFollowRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphFollow.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.follow",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyGraphFollow.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.follow",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphFollow.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.follow";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.follow",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphListblockRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphListblock.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.listblock",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyGraphListblock.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.listblock",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphListblock.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.listblock";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.listblock",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphStarterpackRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphStarterpack.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.starterpack",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyGraphStarterpack.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.starterpack",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphStarterpack.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.starterpack";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.starterpack",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphListitemRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphListitem.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.listitem",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyGraphListitem.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.listitem",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphListitem.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.listitem";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.listitem",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphListRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphList.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.list",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyGraphList.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.list",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphList.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.list";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.list",
      ...params,
    }, { headers });
  }
}

export class AppBskyGraphVerificationRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyGraphVerification.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.graph.verification",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyGraphVerification.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.graph.verification",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyGraphVerification.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.graph.verification";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.graph.verification",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedNS {
  _client: XrpcClient;
  generator: AppBskyFeedGeneratorRecord;
  postgate: AppBskyFeedPostgateRecord;
  threadgate: AppBskyFeedThreadgateRecord;
  like: AppBskyFeedLikeRecord;
  repost: AppBskyFeedRepostRecord;
  post: AppBskyFeedPostRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.generator = new AppBskyFeedGeneratorRecord(client);
    this.postgate = new AppBskyFeedPostgateRecord(client);
    this.threadgate = new AppBskyFeedThreadgateRecord(client);
    this.like = new AppBskyFeedLikeRecord(client);
    this.repost = new AppBskyFeedRepostRecord(client);
    this.post = new AppBskyFeedPostRecord(client);
  }

  sendInteractions(
    data?: AppBskyFeedSendInteractions.InputSchema,
    opts?: AppBskyFeedSendInteractions.CallOptions,
  ): Promise<AppBskyFeedSendInteractions.Response> {
    return this._client
      .call("app.bsky.feed.sendInteractions", opts?.qp, data, opts);
  }

  getFeedGenerators(
    params?: AppBskyFeedGetFeedGenerators.QueryParams,
    opts?: AppBskyFeedGetFeedGenerators.CallOptions,
  ): Promise<AppBskyFeedGetFeedGenerators.Response> {
    return this._client
      .call("app.bsky.feed.getFeedGenerators", params, undefined, opts);
  }

  getTimeline(
    params?: AppBskyFeedGetTimeline.QueryParams,
    opts?: AppBskyFeedGetTimeline.CallOptions,
  ): Promise<AppBskyFeedGetTimeline.Response> {
    return this._client
      .call("app.bsky.feed.getTimeline", params, undefined, opts);
  }

  getFeedGenerator(
    params?: AppBskyFeedGetFeedGenerator.QueryParams,
    opts?: AppBskyFeedGetFeedGenerator.CallOptions,
  ): Promise<AppBskyFeedGetFeedGenerator.Response> {
    return this._client
      .call("app.bsky.feed.getFeedGenerator", params, undefined, opts);
  }

  getAuthorFeed(
    params?: AppBskyFeedGetAuthorFeed.QueryParams,
    opts?: AppBskyFeedGetAuthorFeed.CallOptions,
  ): Promise<AppBskyFeedGetAuthorFeed.Response> {
    return this._client
      .call("app.bsky.feed.getAuthorFeed", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetAuthorFeed.toKnownErr(e);
      });
  }

  getLikes(
    params?: AppBskyFeedGetLikes.QueryParams,
    opts?: AppBskyFeedGetLikes.CallOptions,
  ): Promise<AppBskyFeedGetLikes.Response> {
    return this._client
      .call("app.bsky.feed.getLikes", params, undefined, opts);
  }

  getPostThread(
    params?: AppBskyFeedGetPostThread.QueryParams,
    opts?: AppBskyFeedGetPostThread.CallOptions,
  ): Promise<AppBskyFeedGetPostThread.Response> {
    return this._client
      .call("app.bsky.feed.getPostThread", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetPostThread.toKnownErr(e);
      });
  }

  getActorLikes(
    params?: AppBskyFeedGetActorLikes.QueryParams,
    opts?: AppBskyFeedGetActorLikes.CallOptions,
  ): Promise<AppBskyFeedGetActorLikes.Response> {
    return this._client
      .call("app.bsky.feed.getActorLikes", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetActorLikes.toKnownErr(e);
      });
  }

  getRepostedBy(
    params?: AppBskyFeedGetRepostedBy.QueryParams,
    opts?: AppBskyFeedGetRepostedBy.CallOptions,
  ): Promise<AppBskyFeedGetRepostedBy.Response> {
    return this._client
      .call("app.bsky.feed.getRepostedBy", params, undefined, opts);
  }

  describeFeedGenerator(
    params?: AppBskyFeedDescribeFeedGenerator.QueryParams,
    opts?: AppBskyFeedDescribeFeedGenerator.CallOptions,
  ): Promise<AppBskyFeedDescribeFeedGenerator.Response> {
    return this._client
      .call("app.bsky.feed.describeFeedGenerator", params, undefined, opts);
  }

  searchPosts(
    params?: AppBskyFeedSearchPosts.QueryParams,
    opts?: AppBskyFeedSearchPosts.CallOptions,
  ): Promise<AppBskyFeedSearchPosts.Response> {
    return this._client
      .call("app.bsky.feed.searchPosts", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedSearchPosts.toKnownErr(e);
      });
  }

  getPosts(
    params?: AppBskyFeedGetPosts.QueryParams,
    opts?: AppBskyFeedGetPosts.CallOptions,
  ): Promise<AppBskyFeedGetPosts.Response> {
    return this._client
      .call("app.bsky.feed.getPosts", params, undefined, opts);
  }

  getFeed(
    params?: AppBskyFeedGetFeed.QueryParams,
    opts?: AppBskyFeedGetFeed.CallOptions,
  ): Promise<AppBskyFeedGetFeed.Response> {
    return this._client
      .call("app.bsky.feed.getFeed", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetFeed.toKnownErr(e);
      });
  }

  getQuotes(
    params?: AppBskyFeedGetQuotes.QueryParams,
    opts?: AppBskyFeedGetQuotes.CallOptions,
  ): Promise<AppBskyFeedGetQuotes.Response> {
    return this._client
      .call("app.bsky.feed.getQuotes", params, undefined, opts);
  }

  getFeedSkeleton(
    params?: AppBskyFeedGetFeedSkeleton.QueryParams,
    opts?: AppBskyFeedGetFeedSkeleton.CallOptions,
  ): Promise<AppBskyFeedGetFeedSkeleton.Response> {
    return this._client
      .call("app.bsky.feed.getFeedSkeleton", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetFeedSkeleton.toKnownErr(e);
      });
  }

  getListFeed(
    params?: AppBskyFeedGetListFeed.QueryParams,
    opts?: AppBskyFeedGetListFeed.CallOptions,
  ): Promise<AppBskyFeedGetListFeed.Response> {
    return this._client
      .call("app.bsky.feed.getListFeed", params, undefined, opts)
      .catch((e) => {
        throw AppBskyFeedGetListFeed.toKnownErr(e);
      });
  }

  getSuggestedFeeds(
    params?: AppBskyFeedGetSuggestedFeeds.QueryParams,
    opts?: AppBskyFeedGetSuggestedFeeds.CallOptions,
  ): Promise<AppBskyFeedGetSuggestedFeeds.Response> {
    return this._client
      .call("app.bsky.feed.getSuggestedFeeds", params, undefined, opts);
  }

  getActorFeeds(
    params?: AppBskyFeedGetActorFeeds.QueryParams,
    opts?: AppBskyFeedGetActorFeeds.CallOptions,
  ): Promise<AppBskyFeedGetActorFeeds.Response> {
    return this._client
      .call("app.bsky.feed.getActorFeeds", params, undefined, opts);
  }
}

export class AppBskyFeedGeneratorRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedGenerator.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.generator",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedGenerator.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.generator",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedGenerator.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.generator";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.generator",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedPostgateRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedPostgate.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.postgate",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedPostgate.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.postgate",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedPostgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.postgate";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.postgate",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedThreadgateRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedThreadgate.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.threadgate",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyFeedThreadgate.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.threadgate",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedThreadgate.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.threadgate";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.threadgate",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedLikeRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedLike.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.like",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedLike.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.like",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedLike.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.like";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.like",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedRepostRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedRepost.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.repost",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedRepost.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.repost",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedRepost.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.repost";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.repost",
      ...params,
    }, { headers });
  }
}

export class AppBskyFeedPostRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyFeedPost.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.feed.post",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyFeedPost.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.feed.post",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyFeedPost.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.feed.post";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      { collection, ...params, record: { ...record, $type: collection } },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.feed.post",
      ...params,
    }, { headers });
  }
}

export class AppBskyRichtextNS {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }
}

export class AppBskyActorNS {
  _client: XrpcClient;
  status: AppBskyActorStatusRecord;
  profile: AppBskyActorProfileRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.status = new AppBskyActorStatusRecord(client);
    this.profile = new AppBskyActorProfileRecord(client);
  }

  searchActorsTypeahead(
    params?: AppBskyActorSearchActorsTypeahead.QueryParams,
    opts?: AppBskyActorSearchActorsTypeahead.CallOptions,
  ): Promise<AppBskyActorSearchActorsTypeahead.Response> {
    return this._client
      .call("app.bsky.actor.searchActorsTypeahead", params, undefined, opts);
  }

  putPreferences(
    data?: AppBskyActorPutPreferences.InputSchema,
    opts?: AppBskyActorPutPreferences.CallOptions,
  ): Promise<AppBskyActorPutPreferences.Response> {
    return this._client
      .call("app.bsky.actor.putPreferences", opts?.qp, data, opts);
  }

  getProfile(
    params?: AppBskyActorGetProfile.QueryParams,
    opts?: AppBskyActorGetProfile.CallOptions,
  ): Promise<AppBskyActorGetProfile.Response> {
    return this._client
      .call("app.bsky.actor.getProfile", params, undefined, opts);
  }

  getSuggestions(
    params?: AppBskyActorGetSuggestions.QueryParams,
    opts?: AppBskyActorGetSuggestions.CallOptions,
  ): Promise<AppBskyActorGetSuggestions.Response> {
    return this._client
      .call("app.bsky.actor.getSuggestions", params, undefined, opts);
  }

  searchActors(
    params?: AppBskyActorSearchActors.QueryParams,
    opts?: AppBskyActorSearchActors.CallOptions,
  ): Promise<AppBskyActorSearchActors.Response> {
    return this._client
      .call("app.bsky.actor.searchActors", params, undefined, opts);
  }

  getProfiles(
    params?: AppBskyActorGetProfiles.QueryParams,
    opts?: AppBskyActorGetProfiles.CallOptions,
  ): Promise<AppBskyActorGetProfiles.Response> {
    return this._client
      .call("app.bsky.actor.getProfiles", params, undefined, opts);
  }

  getPreferences(
    params?: AppBskyActorGetPreferences.QueryParams,
    opts?: AppBskyActorGetPreferences.CallOptions,
  ): Promise<AppBskyActorGetPreferences.Response> {
    return this._client
      .call("app.bsky.actor.getPreferences", params, undefined, opts);
  }
}

export class AppBskyActorStatusRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyActorStatus.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.actor.status",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyActorStatus.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.actor.status",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyActorStatus.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.actor.status";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      {
        collection,
        rkey: "self",
        ...params,
        record: { ...record, $type: collection },
      },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.actor.status",
      ...params,
    }, { headers });
  }
}

export class AppBskyActorProfileRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyActorProfile.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.actor.profile",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<{ uri: string; cid: string; value: AppBskyActorProfile.Record }> {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.actor.profile",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyActorProfile.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.actor.profile";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      {
        collection,
        rkey: "self",
        ...params,
        record: { ...record, $type: collection },
      },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.actor.profile",
      ...params,
    }, { headers });
  }
}

export class AppBskyLabelerNS {
  _client: XrpcClient;
  service: AppBskyLabelerServiceRecord;

  constructor(client: XrpcClient) {
    this._client = client;
    this.service = new AppBskyLabelerServiceRecord(client);
  }

  getServices(
    params?: AppBskyLabelerGetServices.QueryParams,
    opts?: AppBskyLabelerGetServices.CallOptions,
  ): Promise<AppBskyLabelerGetServices.Response> {
    return this._client
      .call("app.bsky.labeler.getServices", params, undefined, opts);
  }
}

export class AppBskyLabelerServiceRecord {
  _client: XrpcClient;

  constructor(client: XrpcClient) {
    this._client = client;
  }

  async list(
    params: OmitKey<ComAtprotoRepoListRecords.QueryParams, "collection">,
  ): Promise<
    {
      cursor?: string;
      records: ({ uri: string; value: AppBskyLabelerService.Record })[];
    }
  > {
    const res = await this._client.call("com.atproto.repo.listRecords", {
      collection: "app.bsky.labeler.service",
      ...params,
    });
    return res.data;
  }

  async get(
    params: OmitKey<ComAtprotoRepoGetRecord.QueryParams, "collection">,
  ): Promise<
    { uri: string; cid: string; value: AppBskyLabelerService.Record }
  > {
    const res = await this._client.call("com.atproto.repo.getRecord", {
      collection: "app.bsky.labeler.service",
      ...params,
    });
    return res.data;
  }

  async create(
    params: OmitKey<
      ComAtprotoRepoCreateRecord.InputSchema,
      "collection" | "record"
    >,
    record: Un$Typed<AppBskyLabelerService.Record>,
    headers?: Record<string, string>,
  ): Promise<{ uri: string; cid: string }> {
    const collection = "app.bsky.labeler.service";
    const res = await this._client.call(
      "com.atproto.repo.createRecord",
      undefined,
      {
        collection,
        rkey: "self",
        ...params,
        record: { ...record, $type: collection },
      },
      { encoding: "application/json", headers },
    );
    return res.data;
  }

  async delete(
    params: OmitKey<ComAtprotoRepoDeleteRecord.InputSchema, "collection">,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this._client.call("com.atproto.repo.deleteRecord", undefined, {
      collection: "app.bsky.labeler.service",
      ...params,
    }, { headers });
  }
}
