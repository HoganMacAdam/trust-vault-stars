import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWalletClient, usePublicClient } from 'wagmi';
import { Contract } from 'ethers';
import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { useFHEVM } from './useFHEVM';
import { getContractAddress } from '@/config/contracts';
import { toast } from 'sonner';

// Helper to convert walletClient to ethers signer
function walletClientToSigner(walletClient: any): Promise<JsonRpcSigner> {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new BrowserProvider(transport, network);
  const signer = provider.getSigner(account.address);
  return signer;
}

const TRUST_VAULT_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'ratedUser', type: 'address' },
      { internalType: 'externalEuint32', name: 'encryptedScore', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'submitRating',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getEncryptedScore',
    outputs: [
      { internalType: 'euint32', name: 'encryptedTotalScore', type: 'bytes32' },
      { internalType: 'euint32', name: 'encryptedCount', type: 'bytes32' },
      { internalType: 'uint256', name: 'publicCount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'viewer', type: 'address' }],
    name: 'authorizeViewer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'viewer', type: 'address' }],
    name: 'revokeViewer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'viewer', type: 'address' },
    ],
    name: 'isAuthorized',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'viewer', type: 'address' },
    ],
    name: 'ViewerAuthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'viewer', type: 'address' },
    ],
    name: 'ViewerRevoked',
    type: 'event',
  },
] as const;

export interface UserScore {
  encryptedTotalScore: string;
  encryptedCount: string;
  publicCount: bigint;
}

export function useTrustVault() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { instance, decryptEuint32, encryptEuint32 } = useFHEVM();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [authorizedViewers, setAuthorizedViewers] = useState<string[]>([]);
  const [isLoadingViewers, setIsLoadingViewers] = useState(false);

  // Get contract address based on chain
  const contractAddress = getContractAddress(chainId);

  // Read encrypted score for current user
  const { data: encryptedScore, refetch: refetchScore } = useReadContract({
    address: contractAddress,
    abi: TRUST_VAULT_ABI,
    functionName: 'getEncryptedScore',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && contractAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000,
      staleTime: 5000,
    },
  });

  // Submit a rating
  const submitRating = useCallback(
    async (ratedUser: string, score: number) => {
      if (!instance || !address || !isConnected || !walletClient) {
        toast.error('FHEVM not initialized or wallet not connected');
        return;
      }

      if (contractAddress === '0x0000000000000000000000000000000000000000') {
        toast.error('Contract address not configured');
        return;
      }

      if (score < 1 || score > 5) {
        toast.error('Rating must be between 1 and 5');
        return;
      }

      try {
        console.log('Encrypting rating:', score);
        const encrypted = await encryptEuint32(contractAddress, score);

        if (!encrypted) {
          throw new Error('Failed to encrypt rating');
        }

        console.log('Encryption successful:', {
          handle: encrypted.handle,
          inputProofLength: encrypted.inputProof.length,
        });

        // Use ethers Contract instead of viem writeContract (better FHEVM compatibility)
        const signer = await walletClientToSigner(walletClient);
        const trustVaultContract = new Contract(contractAddress, TRUST_VAULT_ABI, signer);

        console.log('Calling contract.submitRating...');
        const tx = await trustVaultContract.submitRating(
          ratedUser,
          encrypted.handle,
          encrypted.inputProof
        );

        console.log('Transaction sent, hash:', tx.hash);
        setTxHash(tx.hash as `0x${string}`);
        toast.info('Transaction submitted. Waiting for confirmation...');

        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
        toast.success('Rating submitted successfully!');
        refetchScore();
      } catch (error: any) {
        console.error('Failed to submit rating:', error);
        toast.error(`Failed to submit rating: ${error?.message || 'Unknown error'}`);
      }
    },
    [instance, address, isConnected, walletClient, contractAddress, encryptEuint32, refetchScore]
  );

  // Authorize a viewer
  const authorizeViewer = useCallback(
    async (viewer: string) => {
      if (!address || !isConnected || !walletClient) {
        toast.error('Wallet not connected');
        return;
      }

      try {
        const signer = await walletClientToSigner(walletClient);
        const trustVaultContract = new Contract(contractAddress, TRUST_VAULT_ABI, signer);

        const tx = await trustVaultContract.authorizeViewer(viewer);
        setTxHash(tx.hash as `0x${string}`);
        toast.info('Transaction submitted...');

        await tx.wait();
        toast.success('Viewer authorized successfully!');
        refetchScore();
      } catch (error: any) {
        console.error('Failed to authorize viewer:', error);
        toast.error(`Failed to authorize viewer: ${error?.message || 'Unknown error'}`);
      }
    },
    [address, isConnected, walletClient, contractAddress, refetchScore]
  );

  // Revoke a viewer
  const revokeViewer = useCallback(
    async (viewer: string) => {
      if (!address || !isConnected || !walletClient) {
        toast.error('Wallet not connected');
        return;
      }

      try {
        const signer = await walletClientToSigner(walletClient);
        const trustVaultContract = new Contract(contractAddress, TRUST_VAULT_ABI, signer);

        const tx = await trustVaultContract.revokeViewer(viewer);
        setTxHash(tx.hash as `0x${string}`);
        toast.info('Transaction submitted...');

        await tx.wait();
        toast.success('Viewer authorization revoked!');
        refetchScore();
      } catch (error: any) {
        console.error('Failed to revoke viewer:', error);
        toast.error(`Failed to revoke viewer: ${error?.message || 'Unknown error'}`);
      }
    },
    [address, isConnected, walletClient, contractAddress, refetchScore]
  );

  // Decrypt user's score
  const decryptScore = useCallback(async () => {
    if (!encryptedScore || !instance || !address) {
      toast.error('Cannot decrypt score');
      return null;
    }

    try {
      const [encryptedTotalScore, encryptedCount] = encryptedScore;
      const totalScore = await decryptEuint32(contractAddress, encryptedTotalScore as string);
      const count = await decryptEuint32(contractAddress, encryptedCount as string);

      if (totalScore !== null && count !== null && count > 0n) {
        const average = Number(totalScore) / Number(count);
        return { totalScore, count, average };
      }
      return null;
    } catch (error: any) {
      console.error('Failed to decrypt score:', error);
      toast.error('Failed to decrypt score');
      return null;
    }
  }, [encryptedScore, instance, address, contractAddress, decryptEuint32]);

  // Fetch all authorized viewers for the current user
  const fetchAuthorizedViewers = useCallback(async () => {
    if (!address || !contractAddress) {
      setAuthorizedViewers([]);
      return;
    }

    setIsLoadingViewers(true);
    try {
      // Use ethers provider to query events (more reliable than viem for event queries)
      let provider: BrowserProvider;
      
      if (walletClient) {
        provider = new BrowserProvider(walletClient.transport, {
          chainId: chainId || 31337,
          name: 'Unknown',
        });
      } else if (publicClient) {
        // Fallback: create provider from publicClient's transport
        const transport = (publicClient as any).transport;
        provider = new BrowserProvider(transport, {
          chainId: chainId || 31337,
          name: 'Unknown',
        });
      } else {
        // Last resort: use window.ethereum
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          provider = new BrowserProvider((window as any).ethereum);
        } else {
          throw new Error('No provider available');
        }
      }

      const contract = new Contract(contractAddress, TRUST_VAULT_ABI, provider);
      
      // Get all events for this user
      const authorizedFilter = contract.filters.ViewerAuthorized(address);
      const revokedFilter = contract.filters.ViewerRevoked(address);
      
      const [authorizedEvents, revokedEvents] = await Promise.all([
        contract.queryFilter(authorizedFilter),
        contract.queryFilter(revokedFilter),
      ]);

      // Build a map of viewer -> latest status (true = authorized, false = revoked)
      const viewerStatus = new Map<string, { authorized: boolean; blockNumber: number }>();

      // Process authorized events
      for (const event of authorizedEvents) {
        const viewer = (event.args as any).viewer?.toLowerCase() || (event.args as any)[1]?.toLowerCase();
        if (!viewer) continue;
        const blockNumber = event.blockNumber || 0;
        const current = viewerStatus.get(viewer);
        if (!current || blockNumber > current.blockNumber) {
          viewerStatus.set(viewer, { authorized: true, blockNumber });
        }
      }

      // Process revoked events (revocation overrides authorization)
      for (const event of revokedEvents) {
        const viewer = (event.args as any).viewer?.toLowerCase() || (event.args as any)[1]?.toLowerCase();
        if (!viewer) continue;
        const blockNumber = event.blockNumber || 0;
        const current = viewerStatus.get(viewer);
        if (!current || blockNumber > current.blockNumber) {
          viewerStatus.set(viewer, { authorized: false, blockNumber });
        }
      }

      // Filter to only currently authorized viewers
      const currentlyAuthorized = Array.from(viewerStatus.entries())
        .filter(([_, status]) => status.authorized)
        .map(([viewer, _]) => viewer);

      setAuthorizedViewers(currentlyAuthorized);
    } catch (error: any) {
      console.error('Failed to fetch authorized viewers:', error);
      setAuthorizedViewers([]);
    } finally {
      setIsLoadingViewers(false);
    }
  }, [address, contractAddress, walletClient, publicClient, chainId]);

  // Fetch authorized viewers when address or contract changes
  useEffect(() => {
    if (isConnected && address && contractAddress) {
      fetchAuthorizedViewers();
    } else {
      setAuthorizedViewers([]);
    }
  }, [isConnected, address, contractAddress, fetchAuthorizedViewers]);

  // Refetch after successful authorization/revocation
  useEffect(() => {
    if (isSuccess && txHash) {
      setTxHash(null);
      // Refetch authorized viewers after a short delay to ensure events are indexed
      setTimeout(() => {
        fetchAuthorizedViewers();
      }, 2000);
    }
  }, [isSuccess, txHash, fetchAuthorizedViewers]);

  return {
    contractAddress,
    encryptedScore: encryptedScore
      ? {
          encryptedTotalScore: encryptedScore[0] as string,
          encryptedCount: encryptedScore[1] as string,
          publicCount: encryptedScore[2] as bigint,
        }
      : null,
    submitRating,
    authorizeViewer,
    revokeViewer,
    decryptScore,
    authorizedViewers,
    isLoadingViewers,
    fetchAuthorizedViewers,
    isPending: isConfirming,
    isSuccess,
    refetchScore,
  };
}

