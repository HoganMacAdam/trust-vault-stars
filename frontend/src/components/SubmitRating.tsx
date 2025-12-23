import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Loader2, Send, Sparkles } from "lucide-react";
import { useTrustVault } from "@/hooks/useTrustVault";
import { useAccount } from "wagmi";
import { useState } from "react";
import { toast } from "sonner";

const SubmitRating = () => {
  const { address, isConnected } = useAccount();
  const { submitRating, isPending } = useTrustVault();
  const [ratedUser, setRatedUser] = useState("");
  const [score, setScore] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!ratedUser || !ratedUser.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (ratedUser.toLowerCase() === address.toLowerCase()) {
      toast.error("Cannot rate yourself");
      return;
    }

    if (score < 1 || score > 5) {
      toast.error("Rating must be between 1 and 5");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRating(ratedUser, score);
      setRatedUser("");
      setScore(5);
      toast.success("Rating submitted successfully!");
    } catch (error: any) {
      console.error("Submit rating error:", error);
      toast.error(`Failed to submit rating: ${error?.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-8 glass hover-lift border-secondary/20 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 glow-secondary">
            <Star className="w-6 h-6 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Submit Rating</h2>
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 mb-4">
              <Star className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground">Please connect your wallet to submit a rating</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="ratedUser" className="text-sm font-semibold">User Address</Label>
              <Input
                id="ratedUser"
                type="text"
                placeholder="0x..."
                value={ratedUser}
                onChange={(e) => setRatedUser(e.target.value)}
                disabled={isSubmitting || isPending}
                required
                className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <p className="text-xs text-muted-foreground">
                Enter the Ethereum address of the user you want to rate
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="score" className="text-sm font-semibold">Rating (1-5 stars)</Label>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setScore(value)}
                    disabled={isSubmitting || isPending}
                    className={`
                      relative p-3 rounded-lg transition-all duration-300 transform
                      ${score === value
                        ? "bg-gradient-to-br from-primary to-secondary scale-110 shadow-lg glow-primary"
                        : "bg-background/50 hover:bg-background/80 hover:scale-105"
                      }
                      ${isSubmitting || isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <Star
                      className={`
                        w-6 h-6 transition-all duration-300
                        ${score >= value
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                        }
                      `}
                    />
                    {score === value && (
                      <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-pulse" />
                    )}
                  </button>
                ))}
                <div className="ml-auto px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-lg font-bold text-primary">{score} / 5</span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isPending || !ratedUser}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 glow-primary hover:scale-[1.02] transition-all duration-300"
            >
              {isSubmitting || isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Submit Encrypted Rating
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};

export default SubmitRating;
