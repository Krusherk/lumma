// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract LummaMilestones is ERC721, ERC721URIStorage, Ownable {
    uint256 public nextTokenId = 1;
    string public contractMetadataURI;

    mapping(address => mapping(bytes32 => bool)) public claimedTier;
    mapping(uint256 => bytes32) public tokenTier;

    event MilestoneClaimed(address indexed account, bytes32 indexed tier, uint256 tokenId);
    event ContractMetadataUpdated(string uri);

    constructor(address initialOwner) ERC721("Lumma Milestones", "LUMMA") Ownable(initialOwner) {}

    function claimMilestone(
        address account,
        string calldata tier,
        string calldata tokenUri
    ) external onlyOwner returns (uint256 tokenId) {
        require(account != address(0), "invalid account");
        bytes32 tierHash = keccak256(bytes(tier));
        require(!claimedTier[account][tierHash], "already claimed");

        tokenId = nextTokenId;
        nextTokenId += 1;
        claimedTier[account][tierHash] = true;
        tokenTier[tokenId] = tierHash;

        _safeMint(account, tokenId);
        _setTokenURI(tokenId, tokenUri);
        emit MilestoneClaimed(account, tierHash, tokenId);
    }

    function setContractMetadataURI(string calldata uri) external onlyOwner {
        contractMetadataURI = uri;
        emit ContractMetadataUpdated(uri);
    }

    function contractURI() external view returns (string memory) {
        return contractMetadataURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

