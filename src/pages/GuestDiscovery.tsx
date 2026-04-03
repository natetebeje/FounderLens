import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { GuestDiscovery as GuestDiscoveryComponent } from "@/components/GuestDiscovery";

const GuestDiscovery = () => {
  const [searchParams] = useSearchParams();
  const contextualIdea = searchParams.get('idea');

  useEffect(() => {
    // Track guest discovery usage for analytics
    console.log('Guest discovery started', { contextualIdea });
  }, [contextualIdea]);

  return (
    <div className="min-h-screen pt-24 pb-10 px-4">
      <div className="container mx-auto">
        <GuestDiscoveryComponent contextualIdea={contextualIdea || undefined} />
      </div>
    </div>
  );
};

export default GuestDiscovery;