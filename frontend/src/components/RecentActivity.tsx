import { Card } from "@/components/ui/card";
import { useReadContract } from "wagmi";
import { getContractAddress } from "@/config/contracts";
import { useAccount } from "wagmi";
import { Clock, Star, Sparkles } from "lucide-react";
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
      <Card className="p-6 glass hover-lift border-accent/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-xl font-bold gradient-text">Recent Activity</h3>
        </div>
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Please connect your wallet to view recent activity</p>
        </div>
      </Card>
    );
  }

  if (!ratingIds || ratingIds.length === 0) {
    return (
      <Card className="p-6 glass hover-lift border-accent/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-xl font-bold gradient-text">Recent Activity</h3>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 mb-4">
            <Star className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground">No ratings received yet</p>
        </div>
      </Card>
    );
  }

  // Get the most recent 5 ratings
  const recentRatingIds = [...ratingIds].reverse().slice(0, 5);

  return (
    <Card className="p-6 glass hover-lift border-accent/20 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
            <Clock className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-xl font-bold gradient-text">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {recentRatingIds.map((ratingId, index) => (
            <RatingItem 
              key={ratingId.toString()} 
              ratingId={ratingId} 
              contractAddress={contractAddress}
              index={index}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

function RatingItem({ 
  ratingId, 
  contractAddress,
  index 
}: { 
  ratingId: bigint; 
  contractAddress: string;
  index: number;
}) {
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
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  const [rater, encryptedScore, timestamp] = ratingData;
  const time = formatDistanceToNow(new Date(Number(timestamp) * 1000), { addSuffix: true });

  return (
    <div 
      className="p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 hover:border-primary/30 hover-lift transition-all duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Star className="w-4 h-4 text-primary fill-primary/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Rating #{ratingId.toString()}</span>
              <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
            </div>
            <div className="mt-1 text-xs text-muted-foreground font-mono">
              From: {rater.slice(0, 6)}...{rater.slice(-4)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-background/50 border border-border/30">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/30 border border-border/20">
        <span className="text-xs text-muted-foreground">Score:</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-mono font-semibold text-primary">Encrypted</span>
        </div>
      </div>
    </div>
  );
}

export default RecentActivity;
