/**
 * AI Agent Free Tier Quota Tracker - Type Definitions
 */

export interface QuotaLimit {
  /** Maximum number of requests allowed in the period */
  maxRequests: number;
  /** Maximum number of input tokens allowed in the period */
  maxInputTokens: number;
  /** Maximum number of output tokens allowed in the period */
  maxOutputTokens: number;
}

export interface QuotaUsage {
  /** Number of requests made */
  requests: number;
  /** Number of input tokens used */
  inputTokens: number;
  /** Number of output tokens used */
  outputTokens: number;
  /** Timestamp when tracking started for this period */
  periodStart: number;
  /** Timestamp when the period resets */
  periodReset: number;
}

export interface AIProvider {
  id: string;
  name: string;
  /** Whether this provider's quota is being tracked */
  enabled: boolean;
  /** The current quota limits */
  limits: QuotaLimit;
  /** Current usage */
  usage: QuotaUsage;
  /** Reset interval in hours (e.g. 24 for daily, 168 for weekly, 720 for monthly) */
  resetIntervalHours: number;
}

export type ResetFrequency = 'daily' | 'weekly' | 'monthly';

// For mockups

// export const DEFAULT_PROVIDERS: Omit<AIProvider, 'usage'>[] = [
//   {
//     id: 'openai-gpt4o-mini',
//     name: 'OpenAI GPT-4o mini',
//     enabled: true,
//     limits: {
//       maxRequests: 100,
//       maxInputTokens: 100000,
//       maxOutputTokens: 50000
//     },
//     resetIntervalHours: 24
//   },
//   {
//     id: 'openai-gpt35',
//     name: 'OpenAI GPT-3.5',
//     enabled: true,
//     limits: {
//       maxRequests: 200,
//       maxInputTokens: 200000,
//       maxOutputTokens: 100000
//     },
//     resetIntervalHours: 24
//   },
//   {
//     id: 'anthropic-claude',
//     name: 'Anthropic Claude',
//     enabled: true,
//     limits: {
//       maxRequests: 100,
//       maxInputTokens: 100000,
//       maxOutputTokens: 100000
//     },
//     resetIntervalHours: 24
//   },
//   {
//     id: 'google-gemini',
//     name: 'Google Gemini',
//     enabled: true,
//     limits: {
//       maxRequests: 60,
//       maxInputTokens: 60000,
//       maxOutputTokens: 30000
//     },
//     resetIntervalHours: 60
//   },
//   {
//     id: 'github-copilot',
//     name: 'GitHub Copilot',
//     enabled: true,
//     limits: {
//       maxRequests: 300,
//       maxInputTokens: 0,
//       maxOutputTokens: 0
//     },
//     resetIntervalHours: 24
//   },
//   {
//     id: 'custom',
//     name: 'Custom API',
//     enabled: false,
//     limits: {
//       maxRequests: 100,
//       maxInputTokens: 100000,
//       maxOutputTokens: 50000
//     },
//     resetIntervalHours: 24
//   }
// ]

export const RESET_INTERVALS: Record<ResetFrequency, number> = {
  daily: 24,
  weekly: 168,
  monthly: 720
}
