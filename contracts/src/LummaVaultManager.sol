// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LummaVaultManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum VaultRisk {
        Conservative,
        Balanced,
        Aggressive
    }

    struct VaultConfig {
        bool enabled;
        bool paused;
        VaultRisk risk;
        uint256 txCap;
        uint256 totalDeposits;
    }

    struct Position {
        uint256 principal;
        uint256 depositedAt;
    }

    IERC20 public immutable usdc;
    bool public globalPaused;

    mapping(bytes32 => VaultConfig) public vaults;
    mapping(address => mapping(bytes32 => Position)) public positions;

    event VaultConfigured(bytes32 indexed vaultId, VaultRisk risk, uint256 txCap);
    event VaultPaused(bytes32 indexed vaultId, bool paused);
    event GlobalPause(bool paused);
    event Deposited(address indexed user, bytes32 indexed vaultId, uint256 amount);
    event Withdrawn(address indexed user, bytes32 indexed vaultId, uint256 amount);

    constructor(address usdcAddress, address initialOwner) Ownable(initialOwner) {
        require(usdcAddress != address(0), "invalid usdc");
        usdc = IERC20(usdcAddress);
    }

    modifier whenNotPaused(bytes32 vaultId) {
        require(!globalPaused, "global paused");
        require(vaults[vaultId].enabled, "vault disabled");
        require(!vaults[vaultId].paused, "vault paused");
        _;
    }

    function configureVault(
        bytes32 vaultId,
        VaultRisk risk,
        uint256 txCap
    ) external onlyOwner {
        require(vaultId != bytes32(0), "invalid vault");
        require(txCap > 0, "invalid cap");
        vaults[vaultId] = VaultConfig({
            enabled: true,
            paused: false,
            risk: risk,
            txCap: txCap,
            totalDeposits: vaults[vaultId].totalDeposits
        });
        emit VaultConfigured(vaultId, risk, txCap);
    }

    function setGlobalPause(bool paused) external onlyOwner {
        globalPaused = paused;
        emit GlobalPause(paused);
    }

    function setVaultPause(bytes32 vaultId, bool paused) external onlyOwner {
        require(vaults[vaultId].enabled, "vault disabled");
        vaults[vaultId].paused = paused;
        emit VaultPaused(vaultId, paused);
    }

    function deposit(bytes32 vaultId, uint256 amount) external nonReentrant whenNotPaused(vaultId) {
        require(amount > 0, "invalid amount");
        require(amount <= vaults[vaultId].txCap, "tx cap exceeded");

        Position storage position = positions[msg.sender][vaultId];
        position.principal += amount;
        if (position.depositedAt == 0) {
            position.depositedAt = block.timestamp;
        }
        vaults[vaultId].totalDeposits += amount;

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, vaultId, amount);
    }

    function withdraw(bytes32 vaultId, uint256 amount) external nonReentrant {
        require(amount > 0, "invalid amount");
        Position storage position = positions[msg.sender][vaultId];
        require(position.principal >= amount, "insufficient position");

        position.principal -= amount;
        vaults[vaultId].totalDeposits -= amount;
        if (position.principal == 0) {
            position.depositedAt = 0;
        }

        usdc.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, vaultId, amount);
    }

    function getUserPosition(address user, bytes32 vaultId) external view returns (Position memory) {
        return positions[user][vaultId];
    }
}

