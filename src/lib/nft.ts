import type { NftTier } from "@/lib/types";

export const swapMilestones: Record<Exclude<NftTier, "special">, number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
  diamond: 250,
};

export const nftBoosts: Record<Exclude<NftTier, "special">, number> = {
  bronze: 1.05,
  silver: 1.1,
  gold: 1.2,
  diamond: 1.3,
};

export function getEligibleMilestones(swapCount: number) {
  return (Object.keys(swapMilestones) as Array<Exclude<NftTier, "special">>).filter(
    (tier) => swapCount >= swapMilestones[tier],
  );
}

