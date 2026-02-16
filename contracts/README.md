# Lumma Contracts

Contracts are provided for Arc testnet deployment:

- `src/LummaVaultManager.sol`
- `src/LummaMilestones.sol`

## Expected Deploy Order
1. Deploy `LummaVaultManager` with USDC address and owner multisig.
2. Configure vault IDs:
- `keccak256("vault-conservative")`
- `keccak256("vault-balanced")`
- `keccak256("vault-aggressive")`
3. Deploy `LummaMilestones` with owner address.
4. Set contract metadata URI and tier token URIs.

## Notes
- `LummaVaultManager` enforces tx cap and global pause.
- Yield accrual logic is intentionally offchain/model-based in v1 UI.
- `LummaMilestones` is owner-gated minting for anti-abuse control.

