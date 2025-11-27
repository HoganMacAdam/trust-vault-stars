// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title TrustVault - Privacy-first decentralized reputation system
/// @notice A smart contract for encrypted trust scores with selective disclosure
/// @dev All ratings are encrypted using FHEVM, only authorized users can decrypt
contract TrustVault is SepoliaConfig {
    /// @notice Rating structure
    struct Rating {
        address rater;      // Address of the person giving the rating
        euint32 encryptedScore; // Encrypted rating (1-5 stars)
        uint256 timestamp;
    }

    /// @notice User trust score data
    struct UserScore {
        euint32 encryptedTotalScore;  // Sum of all encrypted ratings
        euint32 encryptedCount;       // Number of ratings (encrypted)
        uint256 publicCount;          // Public count for display purposes
        mapping(address => bool) authorizedViewers; // Who can decrypt this user's score
    }

    /// @notice Mapping from user address to their score data
    mapping(address => UserScore) public userScores;
    
    /// @notice Mapping from user address to array of rating IDs
    mapping(address => uint256[]) public userRatings;
    
    /// @notice Mapping from rating ID to Rating
    mapping(uint256 => Rating) public ratings;
    
    /// @notice Total number of ratings created
    uint256 public totalRatings;

    /// @notice Event emitted when a new rating is submitted
    event RatingSubmitted(
        uint256 indexed ratingId,
        address indexed ratedUser,
        address indexed rater,
        uint256 timestamp
    );

    /// @notice Event emitted when a user authorizes a viewer
    event ViewerAuthorized(
        address indexed user,
        address indexed viewer
    );

    /// @notice Event emitted when a user revokes authorization
    event ViewerRevoked(
        address indexed user,
        address indexed viewer
    );

    /// @notice Submit a rating for a user (1-5 stars)
    /// @param ratedUser The address of the user being rated
    /// @param encryptedScore The encrypted rating (1-5)
    /// @param inputProof Proof for the encrypted data
    /// @return ratingId The ID of the newly created rating
    function submitRating(
        address ratedUser,
        externalEuint32 encryptedScore,
        bytes calldata inputProof
    ) external returns (uint256) {
        require(ratedUser != address(0), "Invalid user address");
        require(ratedUser != msg.sender, "Cannot rate yourself");

        uint256 ratingId = totalRatings;
        totalRatings++;

        // Convert external encrypted value to internal euint32
        euint32 encryptedEuint32 = FHE.fromExternal(encryptedScore, inputProof);
        
        // Verify rating is between 1 and 5 (using FHE comparison)
        // Note: In production, you might want to add range checks
        // For MVP, we assume users submit valid ratings
        
        // Allow contract to use this encrypted value
        FHE.allowThis(encryptedEuint32);
        FHE.allow(encryptedEuint32, msg.sender);

        // Store the rating
        ratings[ratingId] = Rating({
            rater: msg.sender,
            encryptedScore: encryptedEuint32,
            timestamp: block.timestamp
        });

        userRatings[ratedUser].push(ratingId);

        // Update user's encrypted total score and count
        UserScore storage score = userScores[ratedUser];
        
        // Initialize encryptedTotalScore if it's the first rating
        if (score.publicCount == 0) {
            score.encryptedTotalScore = encryptedEuint32;
            score.encryptedCount = FHE.asEuint32(1);
        } else {
            // Add to existing values
            score.encryptedTotalScore = FHE.add(score.encryptedTotalScore, encryptedEuint32);
            score.encryptedCount = FHE.add(score.encryptedCount, FHE.asEuint32(1));
        }
        // Ensure the contract retains permission to operate on refreshed ciphertexts
        FHE.allowThis(score.encryptedTotalScore);
        FHE.allowThis(score.encryptedCount);
        score.publicCount++;

        // Allow the rated user to decrypt their own score
        FHE.allow(score.encryptedTotalScore, ratedUser);
        FHE.allow(score.encryptedCount, ratedUser);

        emit RatingSubmitted(ratingId, ratedUser, msg.sender, block.timestamp);

        return ratingId;
    }

    /// @notice Get the encrypted average score for a user
    /// @param user The address of the user
    /// @return encryptedTotalScore The encrypted sum of all ratings
    /// @return encryptedCount The encrypted number of ratings
    /// @return publicCount The public count of ratings
    function getEncryptedScore(address user)
        external
        view
        returns (
            euint32 encryptedTotalScore,
            euint32 encryptedCount,
            uint256 publicCount
        )
    {
        UserScore storage score = userScores[user];
        return (
            score.encryptedTotalScore,
            score.encryptedCount,
            score.publicCount
        );
    }

    /// @notice Authorize an address to view your decrypted trust score
    /// @param viewer The address to authorize
    function authorizeViewer(address viewer) external {
        require(viewer != address(0), "Invalid viewer address");
        require(viewer != msg.sender, "Cannot authorize yourself");
        
        UserScore storage score = userScores[msg.sender];
        require(score.publicCount > 0, "No scores to authorize");
        require(!score.authorizedViewers[viewer], "Viewer already authorized");
        
        score.authorizedViewers[viewer] = true;
        
        // Allow viewer to decrypt the score
        // The contract has allowThis permission, and the user (msg.sender) has permission
        // So the contract can grant access to others on behalf of the user
        // This works because the contract was granted allowThis when the score was created
        FHE.allow(score.encryptedTotalScore, viewer);
        FHE.allow(score.encryptedCount, viewer);
        
        emit ViewerAuthorized(msg.sender, viewer);
    }

    /// @notice Revoke authorization from an address
    /// @param viewer The address to revoke authorization from
    function revokeViewer(address viewer) external {
        UserScore storage score = userScores[msg.sender];
        require(score.authorizedViewers[viewer], "Viewer not authorized");
        
        score.authorizedViewers[viewer] = false;
        
        emit ViewerRevoked(msg.sender, viewer);
    }

    /// @notice Check if an address is authorized to view a user's score
    /// @param user The address of the user
    /// @param viewer The address to check
    /// @return True if viewer is authorized
    function isAuthorized(address user, address viewer) external view returns (bool) {
        if (user == viewer) {
            return true; // Users can always view their own score
        }
        return userScores[user].authorizedViewers[viewer];
    }

    /// @notice Get all rating IDs for a user
    /// @param user The address of the user
    /// @return An array of rating IDs
    function getUserRatings(address user) external view returns (uint256[] memory) {
        return userRatings[user];
    }

    /// @notice Get a rating by ID
    /// @param ratingId The ID of the rating
    /// @return rater The address of the rater
    /// @return encryptedScore The encrypted score
    /// @return timestamp The timestamp when the rating was created
    function getRating(uint256 ratingId)
        external
        view
        returns (
            address rater,
            euint32 encryptedScore,
            uint256 timestamp
        )
    {
        Rating memory rating = ratings[ratingId];
        require(rating.rater != address(0), "Rating does not exist");
        
        return (
            rating.rater,
            rating.encryptedScore,
            rating.timestamp
        );
    }
}

