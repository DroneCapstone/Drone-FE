import { CTASection } from "../components/CTASection";
import { DroneShowcaseSection } from "../components/DroneShowcaseSection";
import { HeroSection } from "../components/HeroSection";
import { HomeFooter } from "../components/HomeFooter";
import { HomeHeader } from "../components/HomeHeader";
import { HorizontalDeliverySection } from "../components/HorizontalDeliverySection";
import { HubShowcaseSection } from "../components/HubShowcaseSection";
import { PlatformSection } from "../components/PlatformSection";

export function HomePage() {
  return (
    <div className="min-h-screen scroll-smooth overflow-x-hidden bg-[#050505] text-white">
      <HomeHeader />

      <main>
        <HeroSection />
        <HorizontalDeliverySection />
        <DroneShowcaseSection />
        <HubShowcaseSection />
        <PlatformSection />
        <CTASection />
      </main>

      <HomeFooter />
    </div>
  );
}
