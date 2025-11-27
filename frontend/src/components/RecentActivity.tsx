import { Card } from "@/components/ui/card";
import { useReadContract } from "wagmi";
import { getContractAddress } from "@/config/contracts";
import { useAccount } from "wagmi";
import { Clock, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TRUST_VAULT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserRatings',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'ratingId', type: 'uint256' }],
    name: 'getRating',
    outputs: [
      { internalType: 'address', name: 'rater', type: 'address' },
      { internalType: 'euint32', name: 'encryptedScore', type: 'bytes32' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const RecentActivity = () => {
  const { address, isConnected } = useAccount();
  const contractAddress = getContractAddress();

  // Get user's rating IDs
  const { data: ratingIds } = useReadContract({
    address: contractAddress,
    abi: TRUST_VAULT_ABI,
    functionName: 'getUserRatings',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && contractAddress !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 10000,
    },
  });

  if (!isConnected) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </h3>
        <p className="text-muted-foreground">Please connect your wallet to view recent activity</p>
      </Card>
    );
  }

  if (!ratingIds || ratingIds.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </h3>
        <p className="text-muted-foreground">No ratings received yet</p>
      </Card>
    );
  }

  // Get the most recent 5 ratings
  const recentRatingIds = [...ratingIds].reverse().slice(0, 5);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Recent Activity
      </h3>
      <div className="space-y-3">
        {recentRatingIds.map((ratingId) => (
          <RatingItem key={ratingId.toString()} ratingId={ratingId} contractAddress={contractAddress} />
        ))}
      </div>
    </Card>
  );
};

function RatingItem({ ratingId, contractAddress }: { ratingId: bigint; contractAddress: string }) {
  const { data: ratingData } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: TRUST_VAULT_ABI,
    functionName: 'getRating',
    args: [ratingId],
    query: {
      enabled: contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  if (!ratingData) {
    return (
      <div className="p-3 bg-muted/30 rounded border border-border animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4"></div>
      </div>
    );
  }

  const [rater, encryptedScore, timestamp] = ratingData;
  const time = formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });

  return (
    <div className="p-3 bg-muted/30 rounded border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          <span className="text-sm font-medium">Rating #{ratingId.toString()}</span>
        </div>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        From: {rater.slice(0, 6)}...{rater.slice(-4)}
      </div>
      <div className="mt-1 flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Score:</span>
        <span className="text-xs font-mono">Encrypted</span>
      </div>
    </div>
  );
}

export default RecentActivity;
