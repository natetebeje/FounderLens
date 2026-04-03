
import { Brain, Search, Users, TrendingUp, Shield, Zap } from "lucide-react";
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Search,
    title: "Evidence-First Validation",
    description: "Reddit research, landing page tests, and customer interviews—get real market proof before you build a single feature."
  },
  {
    icon: Brain,
    title: "Step-by-Step Build Programs",
    description: "Video courses that show you exactly how to build and launch—from MVP to first revenue, with real examples and templates."
  },
  {
    icon: Zap,
    title: "Launch in Weeks, Not Months",
    description: "Pre-built components, templates, and automation tools that compress your timeline from idea to paying customers."
  },
  {
    icon: Users,
    title: "Team Execution Hub",
    description: "Share validation results, assign tasks, and track progress together—turn market evidence into coordinated action."
  },
  {
    icon: TrendingUp,
    title: "First Revenue Tracking",
    description: "Monitor validation scores, launch progress, and revenue milestones with dashboards built for founder velocity."
  },
  {
    icon: Shield,
    title: "Risk-Minimized Building",
    description: "Build only what customers already want—validation data guides every feature decision to reduce wasted effort."
  }
];

export const FeaturesSection = () => {
  const { elementRef: titleRef, isVisible: titleVisible } = useScrollAnimation();
  const { elementRef: cardsRef, visibleItems } = useStaggeredAnimation(features.length, 150);

  return (
    <section id="features" className="py-20 px-4 relative overflow-hidden">
      {/* Background Animation Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 right-10 w-24 h-24 bg-primary/5 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-10 w-20 h-20 bg-primary/8 rounded-full animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="container mx-auto max-w-6xl">
        <div ref={titleRef} className="text-center space-y-4 mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold text-foreground transition-all duration-1000 ${titleVisible ? 'animate-fade-up' : 'opacity-0 translate-y-8'}`}>
            From market proof to <span className="text-gradient-primary animate-gradient-shift bg-gradient-to-r bg-clip-text">first revenue</span>.
          </h2>
          <p className={`text-xl text-muted-foreground max-w-2xl mx-auto transition-all duration-1000 ${titleVisible ? 'animate-fade-up' : 'opacity-0 translate-y-4'}`} style={{ animationDelay: '0.2s' }}>
            The only platform that combines validation, building, and launching in one evidence-driven workflow.
          </p>
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`bg-white/10 backdrop-blur-glass p-6 rounded-2xl border border-white/20 shadow-soft hover:shadow-glow hover:bg-white/15 transition-all duration-500 group hover:scale-105 hover:-translate-y-2 ${
                visibleItems[index] ? 'animate-slide-in-left opacity-100' : 'opacity-0 translate-x-8'
              }`}
              style={{ 
                animationDelay: `${index * 150}ms`,
                transform: visibleItems[index] ? 'none' : 'translateX(50px)'
              }}
            >
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-pulse-glow">
                <feature.icon className="w-6 h-6 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
