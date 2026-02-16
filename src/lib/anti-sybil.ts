import type { RiskFlag } from "@/lib/types";

interface RiskInput {
  walletAgeDays: number;
  eventsInLastHour: number;
  referralAttemptsInLastHour: number;
  repeatedFundingSource: boolean;
}

export interface RiskAssessment {
  score: number;
  riskFlag: RiskFlag;
  reasons: string[];
}

export function assessStrictRisk(input: RiskInput): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (input.walletAgeDays < 2) {
    score += 35;
    reasons.push("wallet_age_below_2d");
  }
  if (input.eventsInLastHour > 20) {
    score += 30;
    reasons.push("event_burst_detected");
  } else if (input.eventsInLastHour > 10) {
    score += 15;
    reasons.push("event_rate_high");
  }
  if (input.referralAttemptsInLastHour > 3) {
    score += 25;
    reasons.push("rapid_referral_attempts");
  }
  if (input.repeatedFundingSource) {
    score += 30;
    reasons.push("shared_funding_source");
  }

  if (score >= 70) {
    return { score, riskFlag: "blocked", reasons };
  }
  if (score >= 35) {
    return { score, riskFlag: "review", reasons };
  }
  return { score, riskFlag: "none", reasons };
}

