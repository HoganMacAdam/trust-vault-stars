import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, UserMinus, Loader2, Users } from "lucide-react";
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
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Authorized Users
        </h2>
        <p className="text-muted-foreground">Please connect your wallet to manage authorized viewers</p>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Users className="w-6 h-6" />
        Authorized Users
      </h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="viewer">Authorize New Viewer</Label>
          <div className="flex gap-2">
            <Input
              id="viewer"
              type="text"
              placeholder="0x..."
              value={newViewer}
              onChange={(e) => setNewViewer(e.target.value)}
              disabled={isAuthorizing || isPending}
              className="flex-1"
            />
            <Button
              onClick={handleAuthorize}
              disabled={isAuthorizing || isPending || !newViewer || isAuthorized === true}
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
            <p className="text-xs text-green-500">This address is already authorized</p>
          )}
          <p className="text-xs text-muted-foreground">
            Authorized users can decrypt and view your trust score
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Authorized Viewers</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={fetchAuthorizedViewers}
              disabled={isLoadingViewers}
              className="h-7 text-xs"
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
          <div className="p-4 bg-muted/30 rounded-lg border border-border min-h-[100px]">
            {isLoadingViewers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading authorized viewers...</span>
              </div>
            ) : authorizedViewers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No authorized viewers yet. Authorize a viewer using the form above.
              </p>
            ) : (
              <div className="space-y-2">
                {authorizedViewers.map((viewer) => (
                  <div
                    key={viewer}
                    className="flex items-center justify-between p-3 bg-background rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{viewer.slice(0, 6)}...{viewer.slice(-4)}</span>
                      <span className="text-xs text-green-500">Authorized</span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRevoke(viewer)}
                      disabled={isRevoking === viewer || isPending}
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AuthorizedUsers;
