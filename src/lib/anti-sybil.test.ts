import { describe, expect, it } from "vitest";

import { assessStrictRisk } from "@/lib/anti-sybil";

describe("strict anti-sybil policy", () => {
  it("blocks users on high risk combination", () => {
    const risk = assessStrictRisk({
      walletAgeDays: 0.3,
      eventsInLastHour: 40,
      referralAttemptsInLastHour: 8,
      repeatedFundingSource: true,
    });
    expect(risk.riskFlag).toBe("blocked");
  });

  it("keeps normal user as none", () => {
    const risk = assessStrictRisk({
      walletAgeDays: 14,
      eventsInLastHour: 3,
      referralAttemptsInLastHour: 0,
      repeatedFundingSource: false,
    });
    expect(risk.riskFlag).toBe("none");
  });
});

