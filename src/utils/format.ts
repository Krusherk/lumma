/**
 * Shorten an Ethereum address for display.
 * 0xAbCd...1234
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format a number with commas.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}
