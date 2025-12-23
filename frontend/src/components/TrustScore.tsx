import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Lock, Unlock, Loader2, Shield } from "lucide-react";
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
      <Card className="p-8 glass hover-lift border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Your Trust Score</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">Please connect your wallet to view your trust score</p>
          </div>
        </div>
      </Card>
    );
  }

  const hasRatings = encryptedScore && encryptedScore.publicCount > 0n;

  return (
    <Card className="p-8 glass hover-lift border-primary/20 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 glow-primary">
            <Star className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Your Trust Score</h2>
        </div>

        {!hasRatings ? (
          <div className="space-y-4 py-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30">
                <Star className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">No ratings yet. Your trust score will appear here once you receive ratings.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover-lift">
                <p className="text-xs text-muted-foreground mb-1">Total Ratings</p>
                <p className="text-3xl font-bold text-primary">{encryptedScore.publicCount.toString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover-lift flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Encrypted</span>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>

            {decryptedData ? (
              <div className="space-y-4 p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border-2 border-green-500/30 relative overflow-hidden">
                {/* 成功装饰 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Unlock className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-sm font-semibold text-green-500">Decrypted Successfully</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Score</p>
                      <p className="text-xl font-bold">{decryptedData.totalScore.toString()}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50">
                      <p className="text-xs text-muted-foreground mb-1">Average</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold">{decryptedData.average.toFixed(2)}</p>
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* 星级可视化 */}
                  <div className="flex items-center gap-1 justify-center p-3 bg-background/30 rounded-lg">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`w-6 h-6 transition-all ${
                          value <= Math.round(decryptedData.average)
                            ? "fill-yellow-400 text-yellow-400 scale-110"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleDecrypt}
                disabled={isDecrypting || isPending}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 glow-primary hover:scale-105 transition-all duration-300"
                variant="default"
              >
                {isDecrypting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="w-5 h-5 mr-2" />
                    Decrypt My Score
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TrustScore;
