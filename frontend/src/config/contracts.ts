import { Address } from 'viem';

// Contract addresses for different networks
export const CONTRACT_ADDRESSES: Record<number, Address> = {
  // Hardhat local network
  31337: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
  // Sepolia testnet
  11155111: (import.meta.env.VITE_SEPOLIA_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
};

// Default contract address (for Hardhat local)
export const DEFAULT_CONTRACT_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address;

/**
 * Get contract address for a given chain ID
 * @param chainId - The chain ID (optional, will use current chain if not provided)
 * @returns The contract address for the chain, or default address if not found
 */
export function getContractAddress(chainId?: number): Address {
  // If chainId is provided, use it
  if (chainId && CONTRACT_ADDRESSES[chainId]) {
    return CONTRACT_ADDRESSES[chainId];
  }
  
  // Try to get chainId from window.ethereum or wagmi
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const chainId = parseInt((window as any).ethereum.chainId, 16);
      if (CONTRACT_ADDRESSES[chainId]) {
        return CONTRACT_ADDRESSES[chainId];
      }
    } catch (e) {
      // Ignore errors
    }
  }
  
  return DEFAULT_CONTRACT_ADDRESS;
}

