import type { QuestDefinition } from "@/lib/types";

export const weeklyQuests: QuestDefinition[] = [
  {
    id: "arc-orbit",
    name: "Arc Orbit",
    week: "Week 1",
    points: 350,
    scarcity: 1000,
    tasks: [
      { id: "orbit-deposit", label: "Deposit in any vault", kind: "deposit", target: 1 },
      { id: "orbit-swaps", label: "Complete 3 swaps", kind: "swaps", target: 3 },
      {
        id: "orbit-invite",
        label: "Invite 1 active friend",
        kind: "invite_active_friend",
        target: 1,
      },
    ],
  },
  {
    id: "stable-surgeon",
    name: "Stable Surgeon",
    week: "Week 1",
    points: 280,
    scarcity: 1500,
    tasks: [
      { id: "surgeon-swaps", label: "Complete 5 swaps", kind: "swaps", target: 5 },
      {
        id: "surgeon-social",
        label: "Submit social proof",
        kind: "social_proof",
        target: 1,
      },
    ],
  },
];

