import { ConnectButton } from '@rainbow-me/rainbowkit';
import logo from "@/assets/logo.svg";

const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TrustVault Stars" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold">TrustVault Stars</h1>
              <p className="text-xs text-muted-foreground">Decentralized Reputation</p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
};

export default Header;

