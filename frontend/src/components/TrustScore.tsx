import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Lock, Unlock, Loader2 } from "lucide-react";
import { useTrustVault } from "@/hooks/useTrustVault";
import { useAccount } from "wagmi";
import { useState } from "react";
import { toast } from "sonner";

const TrustScore = () => {
  const { address, isConnected } = useAccount();
  const { encryptedScore, decryptScore, isPending } = useTrustVault();
  const [decryptedData, setDecryptedData] = useState<{ totalScore: bigint; count: bigint; average: number } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleDecrypt = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!encryptedScore || encryptedScore.publicCount === 0n) {
      toast.info("No ratings yet. Your trust score will appear here once you receive ratings.");
      return;
    }

    setIsDecrypting(true);
    try {
      const data = await decryptScore();
      if (data) {
        setDecryptedData(data);
        toast.success("Score decrypted successfully!");
      } else {
        toast.error("Failed to decrypt score");
      }
    } catch (error: any) {
      console.error("Decryption error:", error);
      toast.error(`Failed to decrypt: ${error?.message || "Unknown error"}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Star className="w-6 h-6" />
          Your Trust Score
        </h2>
        <p className="text-muted-foreground">Please connect your wallet to view your trust score</p>
      </Card>
    );
  }

  const hasRatings = encryptedScore && encryptedScore.publicCount > 0n;

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Star className="w-6 h-6" />
        Your Trust Score
      </h2>

      {!hasRatings ? (
        <div className="space-y-4">
          <p className="text-muted-foreground">No ratings yet. Your trust score will appear here once you receive ratings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Ratings</p>
              <p className="text-2xl font-bold">{encryptedScore.publicCount.toString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Encrypted</span>
            </div>
          </div>

          {decryptedData ? (
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Unlock className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Decrypted</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Score</p>
                  <p className="text-lg font-semibold">{decryptedData.totalScore.toString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Average</p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-semibold">{decryptedData.average.toFixed(2)}</p>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleDecrypt}
              disabled={isDecrypting || isPending}
              className="w-full"
              variant="outline"
            >
              {isDecrypting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Decrypt My Score
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

export default TrustScore;
