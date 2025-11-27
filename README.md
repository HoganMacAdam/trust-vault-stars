# TrustVault Stars

Privacy-first decentralized reputation system with FHE encrypted trust scores.

## 🌐 Live Demo

**Vercel Test Link**: [https://trust-vault-stars.vercel.app/](https://trust-vault-stars.vercel.app/)

## 📹 Project Demo Video

The project demo video is included in the repository: `trust-vault-stars.mp4`


## Overview

TrustVault Stars is a decentralized reputation platform that allows users to:
- Submit encrypted ratings (1-5 stars) for any wallet address
- Automatically calculate encrypted average scores on-chain using FHE
- Decrypt and view their own trust scores
- Authorize specific addresses to view their scores
- Revoke authorization at any time

All ratings and scores are encrypted using Fully Homomorphic Encryption (FHE), ensuring complete privacy while allowing on-chain computation.

## 🔐 Core Encryption and Decryption Logic

### Encryption Flow

1. **Encryption When User Submits Rating**:
   - Frontend uses FHEVM SDK's `createEncryptedInput()` method to create encrypted input
   - Calls `add32(score)` to encrypt the rating (1-5) as `euint32` type
   - Generates encrypted handle and inputProof
   - Encrypted data is submitted to the chain via `submitRating()` function

```typescript
// Frontend encryption logic (useFHEVM.tsx)
const encryptEuint32 = async (contractAddress: string, value: number) => {
  const input = instance.createEncryptedInput(contractAddress, address);
  input.add32(value);
  const encrypted = await input.encrypt();
  return {
    handle: encrypted.handles[0],
    inputProof: encrypted.inputProof,
  };
};
```

2. **On-Chain Encrypted Computation**:
   - Contract receives encrypted rating of type `externalEuint32`
   - Uses `FHE.fromExternal()` to convert to internal `euint32` type
   - Uses `FHE.add()` to accumulate total score and count in encrypted state
   - All computations are performed in encrypted state without decryption

```solidity
// Encrypted computation in contract (TrustVault.sol)
euint32 encryptedEuint32 = FHE.fromExternal(encryptedScore, inputProof);
FHE.allowThis(encryptedEuint32);

// Accumulate encrypted scores
if (score.publicCount == 0) {
    score.encryptedTotalScore = encryptedEuint32;
    score.encryptedCount = FHE.asEuint32(1);
} else {
    score.encryptedTotalScore = FHE.add(score.encryptedTotalScore, encryptedEuint32);
    score.encryptedCount = FHE.add(score.encryptedCount, FHE.asEuint32(1));
}
```

### Decryption Flow

1. **Authorization Mechanism**:
   - Users can authorize specific addresses to view their decrypted scores via `authorizeViewer()`
   - Contract uses `FHE.allow()` to grant decryption permissions
   - Only authorized addresses can decrypt encrypted data

```solidity
// Authorize viewer (TrustVault.sol)
function authorizeViewer(address viewer) external {
    // ... validation logic ...
    FHE.allow(score.encryptedTotalScore, viewer);
    FHE.allow(score.encryptedCount, viewer);
}
```

2. **Decryption Process**:
   - Frontend uses FHEVM SDK's `userDecrypt()` method
   - Requires generating keypair and creating EIP712 signature
   - Only authorized users can successfully decrypt

```typescript
// Frontend decryption logic (useFHEVM.tsx)
const decryptEuint32 = async (contractAddress: string, handle: string) => {
  const keypair = instance.generateKeypair();
  const eip712 = instance.createEIP712(
    keypair.publicKey,
    [contractAddress],
    start,
    durationDays
  );
  const signature = await walletClient.signTypedData({...});
  
  const result = await instance.userDecrypt(
    [{ handle, contractAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature,
    [contractAddress],
    address,
    start,
    durationDays
  );
  return result[handle];
};
```

3. **Calculate Average**:
   - Decrypted total score and count are used to calculate average
   - `average = totalScore / count`
   - Only authorized users can see decrypted values

```typescript
// Calculate average score (useTrustVault.tsx)
const decryptScore = async () => {
  const totalScore = await decryptEuint32(contractAddress, encryptedTotalScore);
  const count = await decryptEuint32(contractAddress, encryptedCount);
  if (totalScore !== null && count !== null && count > 0n) {
    const average = Number(totalScore) / Number(count);
    return { totalScore, count, average };
  }
};
```

## 📄 Smart Contract Code

### Core Contract: TrustVault.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract TrustVault is SepoliaConfig {
    struct Rating {
        address rater;
        euint32 encryptedScore;
        uint256 timestamp;
    }

    struct UserScore {
        euint32 encryptedTotalScore;
        euint32 encryptedCount;
        uint256 publicCount;
        mapping(address => bool) authorizedViewers;
    }

    mapping(address => UserScore) public userScores;
    mapping(address => uint256[]) public userRatings;
    mapping(uint256 => Rating) public ratings;
    uint256 public totalRatings;

    // Submit encrypted rating
    function submitRating(
        address ratedUser,
        externalEuint32 encryptedScore,
        bytes calldata inputProof
    ) external returns (uint256) {
        // Convert external encrypted value to internal euint32
        euint32 encryptedEuint32 = FHE.fromExternal(encryptedScore, inputProof);
        FHE.allowThis(encryptedEuint32);
        
        // Accumulate scores and count in encrypted state
        UserScore storage score = userScores[ratedUser];
        if (score.publicCount == 0) {
            score.encryptedTotalScore = encryptedEuint32;
            score.encryptedCount = FHE.asEuint32(1);
        } else {
            score.encryptedTotalScore = FHE.add(score.encryptedTotalScore, encryptedEuint32);
            score.encryptedCount = FHE.add(score.encryptedCount, FHE.asEuint32(1));
        }
        score.publicCount++;
        
        // Allow rated user to decrypt their own score
        FHE.allow(score.encryptedTotalScore, ratedUser);
        FHE.allow(score.encryptedCount, ratedUser);
        
        return ratingId;
    }

    // Authorize viewer
    function authorizeViewer(address viewer) external {
        UserScore storage score = userScores[msg.sender];
        score.authorizedViewers[viewer] = true;
        FHE.allow(score.encryptedTotalScore, viewer);
        FHE.allow(score.encryptedCount, viewer);
    }

    // Revoke authorization
    function revokeViewer(address viewer) external {
        UserScore storage score = userScores[msg.sender];
        score.authorizedViewers[viewer] = false;
    }
}
```

### Deployed Contract Addresses

- **Sepolia Testnet**: `0x13d8E8B49B1e4ff967A53Ab08801A51d9C71bA91`
- **Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x13d8E8B49B1e4ff967A53Ab08801A51d9C71bA91)

## Project Structure

```
trust-vault-stars/
├── contracts/          # Smart contracts
│   └── TrustVault.sol  # Main contract with FHE rating system
├── deploy/             # Deployment scripts
├── test/               # Test files
│   ├── TrustVault.ts   # Local tests
│   └── TrustVaultSepolia.ts  # Sepolia tests
├── tasks/              # Hardhat tasks
│   └── TrustVault.ts  # CLI interaction tasks
├── frontend/           # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks (useFHEVM, useTrustVault)
│   │   ├── config/      # Configuration (wagmi, contracts)
│   │   └── pages/       # Page components
│   └── public/          # Static assets
└── hardhat.config.ts   # Hardhat configuration
```

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat node (for local development)

## Installation

### 1. Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Set Up Environment Variables

```bash
# Set up Hardhat variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY  # Optional
```

### 3. Compile Contracts

```bash
npm run compile
```

## Development

### Local Development

1. **Start Hardhat Node**

```bash
# In one terminal
npx hardhat node
```

2. **Deploy Contracts**

```bash
# In another terminal
npx hardhat deploy --network localhost
```

3. **Update Frontend Contract Address**

After deployment, copy the contract address and update `frontend/src/config/contracts.ts`:

```typescript
export const CONTRACT_ADDRESSES: Record<number, Address> = {
  31337: 'YOUR_DEPLOYED_ADDRESS' as Address,
  // ...
};
```

4. **Start Frontend**

```bash
cd frontend
npm run dev
```

### Testing

```bash
# Run local tests
npm run test

# Run Sepolia tests (after deployment)
npm run test:sepolia
```

## Usage

### Smart Contract Functions

#### Submit Rating
```solidity
function submitRating(
    address ratedUser,
    externalEuint32 encryptedScore,
    bytes calldata inputProof
) external returns (uint256)
```

#### Get Encrypted Score
```solidity
function getEncryptedScore(address user)
    external view returns (
        euint32 encryptedTotalScore,
        euint32 encryptedCount,
        uint256 publicCount
    )
```

#### Authorize Viewer
```solidity
function authorizeViewer(address viewer) external
```

#### Revoke Viewer
```solidity
function revokeViewer(address viewer) external
```

### CLI Tasks

```bash
# Get contract address
npx hardhat --network localhost task:address

# Submit a rating
npx hardhat --network localhost task:submit-rating --rated-user <address> --score 5

# Decrypt a user's score
npx hardhat --network localhost task:decrypt-score --user <address>

# Authorize a viewer
npx hardhat --network localhost task:authorize --viewer <address>

# Revoke authorization
npx hardhat --network localhost task:revoke --viewer <address>
```

## Frontend Components

The frontend includes the following key components:

- **Header**: Navigation and wallet connection
- **Hero**: Landing section with project description
- **TrustScore**: Display and decrypt user's trust score
- **SubmitRating**: Submit encrypted ratings for any address
- **AuthorizedUsers**: Manage authorized viewers
- **RecentActivity**: Display recent rating activities

## Deployment

### Sepolia Testnet

1. **Deploy Contract**

```bash
npx hardhat deploy --network sepolia
```

2. **Verify Contract** (Optional)

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

3. **Update Frontend Config**

Update `frontend/src/config/contracts.ts` with the deployed address:

```typescript
export const CONTRACT_ADDRESSES: Record<number, Address> = {
  11155111: '0x13d8E8B49B1e4ff967A53Ab08801A51d9C71bA91' as Address,
  // ...
};
```

4. **Build Frontend**

```bash
cd frontend
npm run build
```

## Features

### Privacy Protection
- All ratings are encrypted using FHE before submission
- Average scores are calculated on-chain in encrypted form
- Only authorized users can decrypt scores
- No one can see individual ratings or scores without authorization

### User Control
- Users can view their own scores anytime
- Selective disclosure: authorize specific addresses
- Revoke authorization at any time
- Complete transparency of authorization status

### On-Chain Computation
- Encrypted addition for accumulating scores
- Encrypted counting for number of ratings
- Average calculation (decrypted by authorized users)
- All computation happens on-chain without revealing data

## Technology Stack

- **Smart Contracts**: Solidity 0.8.27
- **FHE**: Zama FHEVM
- **Frontend**: React + TypeScript + Vite
- **Wallet**: RainbowKit + Wagmi
- **UI**: shadcn/ui + Tailwind CSS

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
