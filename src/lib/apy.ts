import type { VaultDefinition } from "@/lib/types";
import { clamp, deterministicNumber, floorToMinutes, round2 } from "@/lib/utils";

const APY_BUCKET_MINUTES = 15;

export function estimateVaultApy(vault: VaultDefinition, at = new Date()) {
  const bucket = floorToMinutes(at, APY_BUCKET_MINUTES).toISOString();
  const seed = `${vault.id}:${bucket}`;
  const drift = deterministicNumber(seed);
  const center = (vault.apyMin + vault.apyMax) / 2;
  const amplitude = (vault.apyMax - vault.apyMin) / 2;
  const wave = Math.sin(at.getTime() / (1000 * 60 * 60 * 6));
  const apy = center + amplitude * 0.5 * wave + amplitude * (drift - 0.5);

  return round2(clamp(apy, vault.apyMin, vault.apyMax));
}

export function accrueSimpleInterest(
  principalUsd: number,
  currentEarnedUsd: number,
  apyPercent: number,
  fromIso: string,
  toDate = new Date(),
) {
  const from = new Date(fromIso);
  const elapsedMs = Math.max(0, toDate.getTime() - from.getTime());
  const yearsElapsed = elapsedMs / (1000 * 60 * 60 * 24 * 365);
  const earned = principalUsd * (apyPercent / 100) * yearsElapsed;
  return round2(currentEarnedUsd + earned);
}

