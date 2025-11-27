import { Shield } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-6">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Privacy-First Reputation</span>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Earn Trust, Reveal Wisely
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build your decentralized reputation with encrypted trust scores. 
            Control who sees your reputation and when.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-6 py-3">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm">Fully Encrypted</span>
            </div>
            <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-6 py-3">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-sm">Selective Reveal</span>
            </div>
            <div className="flex items-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-6 py-3">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm">On-Chain Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

