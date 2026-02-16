import { describe, expect, it } from "vitest";

import { accrueSimpleInterest, estimateVaultApy } from "@/lib/apy";
import type { VaultDefinition } from "@/lib/types";

const vault: VaultDefinition = {
  id: "vault-balanced",
  risk: "balanced",
  name: "Balanced",
  apyMin: 8,
  apyMax: 12,
  tvlUsd: 1000,
  txCapUsd: 500,
};

describe("APY estimator", () => {
  it("keeps values in configured range", () => {
    const at = new Date("2026-02-15T10:00:00.000Z");
    const apy = estimateVaultApy(vault, at);
    expect(apy).toBeGreaterThanOrEqual(vault.apyMin);
    expect(apy).toBeLessThanOrEqual(vault.apyMax);
  });

  it("accrues positive earned amount over time", () => {
    const earned = accrueSimpleInterest(1000, 0, 10, "2026-02-01T00:00:00.000Z", new Date("2026-03-01T00:00:00.000Z"));
    expect(earned).toBeGreaterThan(0);
  });
});

