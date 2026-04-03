
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Eye, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const HeroSection = () => {
  const [ideaInput, setIdeaInput] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const navigate = useNavigate();
  const { elementRef: heroRef, isVisible } = useScrollAnimation();

  const fullPlaceholder = "What business area interests you? (e.g., AI automation, remote work, sustainability)";

  useEffect(() => {
    if (isVisible) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= fullPlaceholder.length) {
          setTypewriterText(fullPlaceholder.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const handleGetOpportunities = () => {
    const params = ideaInput.trim() ? `?idea=${encodeURIComponent(ideaInput.trim())}` : '';
    navigate(`/auth${params}`);
  };

  const handleTryFreeSample = () => {
    const params = ideaInput.trim() ? `?idea=${encodeURIComponent(ideaInput.trim())}` : '';
    navigate(`/guest-discovery${params}`);
  };

  const handleSeeExample = () => {
    setShowDemo(true);
  };

  const sampleOpportunities = [
    {
      title: "AI Content Creation SaaS 2025",
      description: "AI-powered content generation for small businesses and creators",
      market: "$15B+ market opportunity",
      difficulty: "Medium"
    },
    {
      title: "Remote Work Productivity Tool",
      description: "AI assistant for distributed teams to optimize collaboration and focus",
      market: "$10B+ market opportunity", 
      difficulty: "Hard"
    },
    {
      title: "Sustainable Business Consulting",
      description: "Help companies implement green practices and ESG compliance",
      market: "$6B+ market opportunity",
      difficulty: "Easy"
    }
  ];

  return (
    <section ref={heroRef} className="min-h-screen flex items-center justify-center pt-20 pb-10 px-4 relative overflow-hidden">

      <div className="container mx-auto max-w-4xl">
        <div className="text-center space-y-8">
          {/* Main Headline */}
          <div className={`space-y-4 transition-all duration-1000 ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className={`text-gradient-primary inline-block transition-all duration-1000 ${isVisible ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.2s' }}>
                Validate, build, launch.
              </span>{" "}
              <span className={`text-foreground inline-block transition-all duration-1000 ${isVisible ? 'animate-scale-in' : 'opacity-0 scale-75'}`} style={{ animationDelay: '0.4s' }}>
                First revenue in weeks.
              </span>
            </h1>
            <p className={`text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-all duration-1000 ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`} style={{ animationDelay: '0.6s' }}>
              The evidence-first Build Lab for solo founders and small teams. Get market proof, then build with confidence.
            </p>
          </div>

          {/* Discovery Input */}
          <div className={`max-w-xl mx-auto space-y-4 transition-all duration-1000 ${isVisible ? 'animate-scale-in' : 'opacity-0 scale-95'}`} style={{ animationDelay: '0.8s' }}>
            <div className="bg-white/10 backdrop-blur-glass p-6 rounded-2xl border border-white/20 shadow-soft hover:shadow-glow transition-all duration-300 hover:scale-105">
              <div className="space-y-4">
                <Input
                  placeholder={typewriterText}
                  value={ideaInput}
                  onChange={(e) => setIdeaInput(e.target.value)}
                  className="h-12 text-base bg-white/20 border-white/30 text-foreground placeholder:text-muted-foreground transition-all duration-300 focus:scale-105 focus:shadow-glow"
                />
                <Button 
                  variant="hero" 
                  size="lg" 
                  onClick={handleTryFreeSample}
                  className="w-full group animate-pulse-glow hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  Get 3 Free Opportunities
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              </div>
            </div>
          </div>

          {/* Demo Section */}
          {showDemo && (
            <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
              <h3 className="text-2xl font-semibold text-foreground animate-bounce-in">Sample Opportunities</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {sampleOpportunities.map((opportunity, index) => (
                  <div 
                    key={index} 
                    className="bg-white/10 backdrop-blur-glass p-4 rounded-xl border border-white/20 hover:scale-105 hover:shadow-glow transition-all duration-300 animate-slide-in-left group"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">{opportunity.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{opportunity.description}</p>
                    <div className="space-y-1 text-xs">
                      <div className="text-primary">{opportunity.market}</div>
                      <div className="text-muted-foreground">Difficulty: {opportunity.difficulty}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="hero" 
                size="lg" 
                onClick={handleGetOpportunities}
                className="mt-6 group hover:scale-105 transition-all duration-300"
              >
                Generate opportunities like these for your idea
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
            </div>
          )}

          {/* Value Proposition */}
          <div className={`text-center space-y-2 transition-all duration-1000 ${isVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`} style={{ animationDelay: '1s' }}>
            <p className="text-muted-foreground hover:text-foreground transition-colors duration-300">
              ✨ 3 opportunities instantly • 🔓 No signup required • 💡 Save and get 6 more when you join
            </p>
            <p className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
              Join <span className="text-primary font-semibold animate-pulse-glow">500+</span> entrepreneurs who found their opportunity
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
