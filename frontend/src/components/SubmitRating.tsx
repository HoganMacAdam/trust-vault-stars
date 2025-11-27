import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";
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
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Star className="w-6 h-6" />
        Submit Rating
      </h2>

      {!isConnected ? (
        <p className="text-muted-foreground">Please connect your wallet to submit a rating</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ratedUser">User Address</Label>
            <Input
              id="ratedUser"
              type="text"
              placeholder="0x..."
              value={ratedUser}
              onChange={(e) => setRatedUser(e.target.value)}
              disabled={isSubmitting || isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the Ethereum address of the user you want to rate
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="score">Rating (1-5 stars)</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  disabled={isSubmitting || isPending}
                  className={`p-2 rounded transition-colors ${
                    score === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      score >= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium">{score} / 5</span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isPending || !ratedUser}
            className="w-full"
          >
            {isSubmitting || isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                Submit Encrypted Rating
              </>
            )}
          </Button>
        </form>
      )}
    </Card>
  );
};

export default SubmitRating;
