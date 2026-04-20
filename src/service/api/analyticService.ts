import { apiGet, apiPost } from '@/lib/api-client';
import type { ApiEnvelope } from '@/lib/api-types';

export type AnalyticsStructuredSections = {
  automatedInsights: {
    bestPerforming: string;
    optimalPosting: string;
    audienceEngagement: string;
    contentRecommendations: string;
  };
  predictiveAnalytics: {
    expectedReachNewPost: string;
    viralProbability: string;
    audienceBehaviorTrends: string;
  };
  viralContent: {
    rapidEngagement: string;
    highShareVelocity: string;
    increasingCommentRate: string;
    exampleAlert: string;
  };
  anomalyDetection: {
    items: string[];
  };
  sentimentComments: {
    positivePercent: number | null;
    neutralPercent: number | null;
    negativePercent: number | null;
    narrative: string;
  };
};

export type AnalyticsRecommendationPayload = {
  layout?: 'bullet' | 'structured';
  bullets?: string[];
  structured?: AnalyticsStructuredSections;
  source: 'openai' | 'fallback';
};

export const postAnalyticsRecommendations = async (body: {
  scope: 'page' | 'post';
  platform: 'facebook' | 'instagram' | 'linkedin';
  context: Record<string, unknown>;
  layout?: 'bullet' | 'structured';
}) => {
  return apiPost<ApiEnvelope<AnalyticsRecommendationPayload>>(
    '/api/v1/insights/analytics-recommendations',
    body
  );
};

export const getInsightsFaceBook = async () => {
  return apiGet<
    ApiEnvelope<{ pageAnalytics: Record<string, unknown> | null; allPosts: unknown[] }>
  >('/api/v1/insights/facebook/all');
};

export const getInsightsInstagram = async () => {
  return apiGet<
    ApiEnvelope<{ igAnalytics: Record<string, unknown> | null; allPosts: unknown[] }>
  >('/api/v1/insights/instagram/all');
};

export type LinkedInInsightsPayload = {
  liAnalytics: Record<string, unknown> | null;
  allPosts: unknown[];
  linkedinAnalyticsConnected: boolean;
};

export const getInsightsLinkedIn = async () => {
  return apiGet<ApiEnvelope<LinkedInInsightsPayload>>(
    '/api/v1/insights/linkedin/all'
  );
};

