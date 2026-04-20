export type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type Metrics = {
  followers: number;
  reach: number;
  posts: number;
  engagement: number;
  engagementFromPage: boolean;
  updatedLabel: string;
};
export type Merged = {
  followersTrend: { date: string; value: number }[];
  reachTrend: { date: string; value: number }[];
  uniqueReachTrend: { date: string; value: number }[];
  engagementsTrend: { date: string; value: number }[];
  totalFollowers: number;
  totalReach: number;
  totalUniqueReach: number;
  totalEngagementsPage: number;
  engagementsFromPosts: number;
  postFrequencyTop: { date: string; count: number }[];
};

export type PageAnalytics = {
  commentsList: { message: string }[];
  engagements: number;
  engagementsTrend: { date: string; value: number }[];
  pageViews: number;
  pageViewsTrend: { date: string; value: number }[];
  postFrequency: { [key: string]: number };
  pageId: string;
  pageName: string;
  followers: number;
  reach: number;
  followersTrend: { date: string; value: number }[];
  reachTrend: { date: string; value: number }[];
  topCountries: Record<string, number> | string[];
  topCities: Record<string, number> | string[];
  uniqueReach: number;
  uniqueReachTrend: { date: string; value: number }[];
  lastUpdated: FirestoreTimestamp | Date;
};

export type InstagramAnalytics = {
  igUserId: string;
  username: string;
  followers: number;
  following: number;
  mediaCount: number;
  reach: number;
  views: number;
  interactions: number;
  accountsEngaged: number;
  reachTrend: { date: string; value: number }[];
  viewsTrend: { date: string; value: number }[];
  interactionsTrend: { date: string; value: number }[];
  engagedTrend: { date: string; value: number }[];
  followsTrend: { date: string; value: number }[];
  topCountries: Record<string, number> | string[];
  topCities: Record<string, number> | string[];
  ageGender: Record<string, number>;
  genderSplit: Record<string, number>;
  contentBreakdown: {
    images: number;
    videos: number;
    reels: number;
    stories: number;
    carousels: number;
  };
  postFrequency: { [key: string]: number };
  lastUpdated: FirestoreTimestamp | Date;
};

export type IgTrendKey = keyof Pick<
  InstagramAnalytics,
  | 'reachTrend'
  | 'viewsTrend'
  | 'interactionsTrend'
  | 'engagedTrend'
  | 'followsTrend'
>;

export type Post = {
  postId: string;
  message: string;
  mediaUrl: string;
  permalinkUrl?: string;
  type?: string;
  isPublished?: boolean;
  reactions: number;
  comments: number;
  shares: number;
  engagementScore: number;
  engagementRate?: number;
  impressions?: number;
  uniqueImpressions?: number;
  clicks?: number;
  createdAt: string;
};

export type InstagramPost = {
  postId: string;
  caption: string;
  mediaType: string;
  mediaUrl: string;
  permalink: string;
  isSharedToFeed: boolean;
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  engagementScore: number;
  engagementRate: number;
  reach: number;
  views: number;
  avgWatchTime: number;
  replies: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  timestamp: string;
};

/** Page-level rollup stored under `users/{uid}/liAnalytics/{sub}` after sync. */
export type LinkedInAnalytics = {
  profileUrn?: string;
  displayName?: string;
  headline?: string;
  followers?: number;
  connections?: number;
  impressions?: number;
  engagements?: number;
  clicks?: number;
  followersTrend?: { date: string; value: number }[];
  impressionsTrend?: { date: string; value: number }[];
  engagementsTrend?: { date: string; value: number }[];
  postFrequency?: { [key: string]: number };
  topCountries?: Record<string, number> | string[];
  topCities?: Record<string, number> | string[];
  lastUpdated?: FirestoreTimestamp | Date;
};

export type LinkedInPost = {
  postId: string;
  commentary?: string;
  message?: string;
  mediaUrl?: string;
  permalinkUrl?: string;
  type?: string;
  likes?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  engagementScore?: number;
  engagementRate?: number;
  impressions?: number;
  uniqueImpressions?: number;
  clicks?: number;
  createdAt?: string;
};

export type LiTrendKey = keyof Pick<
  LinkedInAnalytics,
  'followersTrend' | 'impressionsTrend' | 'engagementsTrend'
>;

export type LinkedInMerged = {
  followersTrend: { date: string; value: number }[];
  impressionsTrend: { date: string; value: number }[];
  engagementsTrend: { date: string; value: number }[];
  totalFollowers: number;
  totalImpressions: number;
  totalEngagementsPage: number;
  engagementsFromPosts: number;
  postFrequencyTop: { date: string; count: number }[];
};

/** True when `users/{uid}/liAnalytics/{sub}` exists (from GET /insights/linkedin/all). */
export type LinkedInAnalyticsConnection = {
  connected: boolean;
};

export type audienceRanked = {
  countries: { name: string; count: number }[];
  cities: { name: string; count: number }[];
}

export type InsightMetric = 'followers' | 'reach' | 'posts' | 'engagement';

export type PageTrendKey = keyof Pick<
  PageAnalytics,
  | 'followersTrend'
  | 'reachTrend'
  | 'uniqueReachTrend'
  | 'engagementsTrend'
  | 'pageViewsTrend'
>;
