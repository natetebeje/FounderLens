
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/HeroSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { AboutSection } from "@/components/AboutSection";
import { PricingSection } from "@/components/PricingSection";
import { SubscribeSection } from "@/components/SubscribeSection";
import { ContactSection } from "@/components/ContactSection";
import { Footer } from "@/components/Footer";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { analytics, trackEvent } from "@/utils/analytics";
import { ModernBackground } from "@/components/ui/modern-background";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createCheckout } = useSubscription();
  const { isAuthenticated, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Redirect authenticated users to opportunities (not the marketing page)
    if (!loading && isAuthenticated) {
      const checkoutPlan = searchParams.get('checkout');
      if (checkoutPlan) {
        // Handle checkout flow
        setSearchParams(prev => {
          prev.delete('checkout');
          return prev;
        });
        analytics.checkoutStarted({ plan: checkoutPlan, price: 0 });
        toast({
          title: "Processing checkout...",
          description: `Starting your ${checkoutPlan} plan checkout`,
        });
        setTimeout(() => {
          createCheckout(checkoutPlan);
        }, 1000);
      } else {
        navigate('/discovery', { replace: true });
      }
      return;
    }

    // Set proper SEO for landing page
    document.title = "FounderLens - Evidence-First Build Lab | Validate, Build, Launch to First Revenue";

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Evidence-first Build Lab that helps solo founders and small product teams validate, build, and launch to first revenue in weeks—not months. Get market proof, then build with confidence.');
    }

    // Initialize analytics tracking
    analytics.trackPerformance();
    analytics.trackUserBehavior();
    analytics.pageViewed('home');
  }, [loading, isAuthenticated, searchParams, setSearchParams, createCheckout, navigate, toast]);

  return (
    <ModernBackground variant="mesh">
      <HeroSection />
      <FeaturesSection />
      <AboutSection />
      <PricingSection />
      <SubscribeSection />
      <ContactSection />
      <Footer />
    </ModernBackground>
  );
};

export default Index;
