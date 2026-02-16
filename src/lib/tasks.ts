import type { TaskDefinition } from "@/lib/types";

export const taskDefinitions: TaskDefinition[] = [
  { key: "connect_wallet", label: "Connect wallet", type: "daily", points: 10, cooldownHours: 24 },
  { key: "first_deposit", label: "Make first deposit", type: "activity", points: 50 },
  { key: "complete_swap", label: "Complete a swap", type: "daily", points: 20, cooldownHours: 24 },
  { key: "daily_dashboard", label: "Check dashboard daily", type: "daily", points: 5, cooldownHours: 24 },
  {
    key: "follow_twitter",
    label: "Follow on X",
    type: "social",
    points: 100,
    socialDelayHours: 24,
  },
  {
    key: "retweet_announcement",
    label: "Retweet announcement",
    type: "social",
    points: 50,
    socialDelayHours: 24,
  },
  {
    key: "join_discord",
    label: "Join Discord",
    type: "social",
    points: 100,
    socialDelayHours: 12,
  },
  { key: "invite_friend", label: "Invite a friend", type: "social", points: 200, socialDelayHours: 24 },
  { key: "share_referral", label: "Share referral link", type: "social", points: 50, socialDelayHours: 12 },
  {
    key: "like_comment",
    label: "Like + comment on post",
    type: "social",
    points: 25,
    socialDelayHours: 12,
  },
  { key: "deposit_100", label: "Deposit $100+", type: "activity", points: 100 },
  { key: "deposit_1000", label: "Deposit $1000+", type: "activity", points: 500 },
  { key: "hold_7d", label: "Hold for 7 days", type: "activity", points: 150 },
  { key: "hold_30d", label: "Hold for 30 days", type: "activity", points: 500 },
  { key: "swaps_10", label: "Complete 10 swaps", type: "activity", points: 200 },
  { key: "swaps_50", label: "Complete 50 swaps", type: "activity", points: 1000 },
];

export const taskByKey = new Map(taskDefinitions.map((task) => [task.key, task]));

