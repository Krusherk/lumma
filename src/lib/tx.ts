export interface TxStep {
  label: string;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
}

export interface TxPayload {
  chainId: number;
  mode: "onchain" | "simulation";
  steps: TxStep[];
  note?: string;
}
