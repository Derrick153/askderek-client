import React from "react";
import HeroSection from "./HeroSection";
import FeaturedProperties from "./FeaturedProperties";
import BrowseByLocation from "./BrowseByLocation";
import ExploreCategories from "./ExploreCategories";
import RecentlyAdded from "./RecentlyAdded";
import TrustBar from "./TrustBar";
import HowItWorks from "./HowItWorks";
import CallToActionSection from "./CallToActionSection";
import FooterSection from "./FooterSection";

const Landing = () => {
  return (
    <div>
      <HeroSection />
      <FeaturedProperties />
      <BrowseByLocation />
      <ExploreCategories />
      <RecentlyAdded />
      <TrustBar />
      <HowItWorks />
      <CallToActionSection />
      <FooterSection />
    </div>
  );
};

export default Landing;
