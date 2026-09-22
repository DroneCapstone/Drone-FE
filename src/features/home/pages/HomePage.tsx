import { CTASection } from "../components/CTASection";
import { HeroSection } from "../components/HeroSection";
import { HomeFooter } from "../components/HomeFooter";
import { HomeHeader } from "../components/HomeHeader";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { PlatformSection } from "../components/PlatformSection";
import { SolutionsSection } from "../components/SolutionsSection";

export function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <HomeHeader />

      <main>
        <HeroSection />

        <SolutionsSection />

        <HowItWorksSection />

        <PlatformSection />

        <CTASection />
      </main>

      <HomeFooter />
    </div>
  );
}