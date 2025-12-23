import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, UserMinus, Loader2, Users, Shield, CheckCircle2 } from "lucide-react";
import { useTrustVault } from "@/hooks/useTrustVault";
import { useAccount, useReadContract } from "wagmi";
import { useState } from "react";
import { toast } from "sonner";
import { getContractAddress } from "@/config/contracts";

const TRUST_VAULT_ABI = [
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
] as const;

const AuthorizedUsers = () => {
  const { address, isConnected } = useAccount();
  const { 
    authorizeViewer, 
    revokeViewer, 
    isPending, 
    authorizedViewers, 
    isLoadingViewers,
    fetchAuthorizedViewers 
  } = useTrustVault();
  const [newViewer, setNewViewer] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const contractAddress = getContractAddress();

  // Check if a viewer is authorized (this is a simplified version - in production you'd want to track all authorized users)
  const { data: isAuthorized } = useReadContract({
    address: contractAddress,
    abi: TRUST_VAULT_ABI,
    functionName: 'isAuthorized',
    args: address && newViewer.match(/^0x[a-fA-F0-9]{40}$/) ? [address, newViewer as `0x${string}`] : undefined,
    query: {
      enabled: isConnected && !!address && !!newViewer && newViewer.match(/^0x[a-fA-F0-9]{40}$/) !== null,
    },
  });

  const handleAuthorize = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!newViewer || !newViewer.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Please enter a valid Ethereum address");
      return;
    }

    if (newViewer.toLowerCase() === address.toLowerCase()) {
      toast.error("Cannot authorize yourself");
      return;
    }

    setIsAuthorizing(true);
    try {
      await authorizeViewer(newViewer);
      setNewViewer("");
      toast.success("Viewer authorized successfully!");
      // Refetch authorized viewers after a short delay
      setTimeout(() => {
        fetchAuthorizedViewers();
      }, 2000);
    } catch (error: any) {
      console.error("Authorize error:", error);
      toast.error(`Failed to authorize: ${error?.message || "Unknown error"}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleRevoke = async (viewer: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsRevoking(viewer);
    try {
      await revokeViewer(viewer);
      toast.success("Authorization revoked successfully!");
      // Refetch authorized viewers after a short delay
      setTimeout(() => {
        fetchAuthorizedViewers();
      }, 2000);
    } catch (error: any) {
      console.error("Revoke error:", error);
      toast.error(`Failed to revoke: ${error?.message || "Unknown error"}`);
    } finally {
      setIsRevoking(null);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-8 glass hover-lift border-secondary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20">
            <Users className="w-6 h-6 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Authorized Users</h2>
        </div>
        <div className="text-center py-8">
          <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Please connect your wallet to manage authorized viewers</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8 glass hover-lift border-secondary/20 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 glow-secondary">
            <Users className="w-6 h-6 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Authorized Users</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="viewer" className="text-sm font-semibold">Authorize New Viewer</Label>
            <div className="flex gap-3">
              <Input
                id="viewer"
                type="text"
                placeholder="0x..."
                value={newViewer}
                onChange={(e) => setNewViewer(e.target.value)}
                disabled={isAuthorizing || isPending}
                className="flex-1 h-12 bg-background/50 border-border/50 focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
              />
              <Button
                onClick={handleAuthorize}
                disabled={isAuthorizing || isPending || !newViewer || isAuthorized === true}
                className="h-12 px-6 bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 glow-secondary"
              >
                {isAuthorizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Authorize
                  </>
                )}
              </Button>
            </div>
            {isAuthorized === true && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <p className="text-xs text-green-500 font-medium">This address is already authorized</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Authorized users can decrypt and view your trust score
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Authorized Viewers ({authorizedViewers.length})</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchAuthorizedViewers}
                disabled={isLoadingViewers}
                className="h-8 text-xs hover:bg-secondary/10"
              >
                {isLoadingViewers ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Refresh'
                )}
              </Button>
            </div>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/50 min-h-[120px] space-y-2">
              {isLoadingViewers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-secondary" />
                  <span className="text-sm text-muted-foreground">Loading authorized viewers...</span>
                </div>
              ) : authorizedViewers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 mb-3">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No authorized viewers yet. Authorize a viewer using the form above.
                  </p>
                </div>
              ) : (
                authorizedViewers.map((viewer) => (
                  <div
                    key={viewer}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-background/80 to-background/40 border border-border/50 hover:border-secondary/30 hover-lift transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <span className="text-sm font-mono font-semibold">{viewer.slice(0, 8)}...{viewer.slice(-6)}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                          <span className="text-xs text-green-500 font-medium">Authorized</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(viewer)}
                      disabled={isRevoking === viewer || isPending}
                      className="hover:scale-105 transition-transform"
                    >
                      {isRevoking === viewer ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Revoking...
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-3 h-3 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AuthorizedUsers;
