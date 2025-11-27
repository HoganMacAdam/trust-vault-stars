import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustScore from "@/components/TrustScore";
import RecentActivity from "@/components/RecentActivity";
import SubmitRating from "@/components/SubmitRating";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <main className="container mx-auto px-4 py-12 space-y-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <TrustScore />
          <RecentActivity />
        </div>
        <div className="max-w-6xl mx-auto space-y-8">
          <SubmitRating />
        </div>
      </main>
    </div>
  );
};

export default Index;

