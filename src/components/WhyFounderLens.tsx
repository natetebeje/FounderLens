import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/useScrollAnimation";
import { Globe, Brain, Rocket, ArrowRight } from "lucide-react";

const differentiators = [
  {
    icon: Globe,
    label: "01 — Live Research",
    title: "We search reality. They search memory.",
    description:
      "ChatGPT answers from training data frozen in the past. FounderLens runs a live research engine — Reddit discussions happening right now, App Store competitors updated today, web citations from this week. Every score you see is earned from real evidence, not a confident-sounding guess.",
    contrast: {
      them: "\"There appears to be demand for this idea based on general market trends...\"",
      us: "47 Reddit posts · 12 App Store competitors · 18 web citations · Score: 72/100",
    },
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/15",
    iconColor: "text-blue-400",
    labelColor: "text-blue-400",
  },
  {
    icon: Brain,
    label: "02 — Persistent Memory",
    title: "We remember everything. They forget you instantly.",
    description:
      "The moment you close a ChatGPT tab, your context is gone. In FounderLens, your research, your Idea Coach conversation, and your Product Proposal are permanently stored and shared with every AI agent working for you. Your Paperclip CEO agent knows your competitors before its first heartbeat — not because you pasted them in, but because we researched and stored them for your specific opportunity.",
    contrast: {
      them: "\"I don't have context from our previous conversation. Could you remind me what your idea was?\"",
      us: "Idea Coach, CEO agent, CMO agent — all reading the same persistent research report.",
    },
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    labelColor: "text-violet-400",
  },
  {
    icon: Rocket,
    label: "03 — AI Company Execution",
    title: "We build you a company. They give you a plan.",
    description:
      "ChatGPT will write you a go-to-market strategy. FounderLens executes it. One click launches a real Paperclip company — a CEO agent reviewing weekly OKRs, a CMO agent drafting launch content, an Engineer agent writing your MVP spec. The output is not text to copy into another tool. It is a team doing work while you sleep.",
    contrast: {
      them: "\"Here's a 7-step go-to-market strategy you could consider implementing...\"",
      us: "CEO · CTO · Engineer · CMO · Growth — hired, briefed, and working in 30 seconds.",
    },
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/20",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    labelColor: "text-emerald-400",
  },
];

export const WhyFounderLens = () => {
  const { elementRef: titleRef, isVisible: titleVisible } = useScrollAnimation();
  const { elementRef: cardsRef, visibleItems } = useStaggeredAnimation(differentiators.length, 180);

  return (
    <section id="why-founderlens" className="py-24 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div ref={titleRef} className="text-center space-y-4 mb-20">
          {/* Eyebrow */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-muted-foreground transition-all duration-700 ${
              titleVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Why FounderLens vs ChatGPT / Claude
          </div>

          <h2
            className={`text-4xl md:text-5xl font-bold text-foreground transition-all duration-1000 ${
              titleVisible ? "animate-fade-up" : "opacity-0 translate-y-8"
            }`}
          >
            ChatGPT gives you{" "}
            <span className="relative">
              <span className="text-muted-foreground line-through decoration-red-400/60">advice</span>
            </span>
            .<br />
            FounderLens gives you a{" "}
            <span className="text-gradient-primary animate-gradient-shift bg-gradient-to-r bg-clip-text">
              company
            </span>
            .
          </h2>

          <p
            className={`text-xl text-muted-foreground max-w-2xl mx-auto transition-all duration-1000 ${
              titleVisible ? "animate-fade-up" : "opacity-0 translate-y-4"
            }`}
            style={{ animationDelay: "0.2s" }}
          >
            Three fundamental differences that no prompt engineering can close.
          </p>
        </div>

        {/* Cards */}
        <div ref={cardsRef} className="space-y-6">
          {differentiators.map((d, i) => {
            const Icon = d.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl border ${d.border} bg-gradient-to-br ${d.color} backdrop-blur-sm p-8 transition-all duration-700 ${
                  visibleItems[i]
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
              >
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Left — main content */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${d.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${d.iconColor}`} />
                      </div>
                      <span className={`text-xs font-semibold tracking-widest uppercase ${d.labelColor}`}>
                        {d.label}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground leading-snug">
                      {d.title}
                    </h3>

                    <p className="text-muted-foreground leading-relaxed text-[15px]">
                      {d.description}
                    </p>
                  </div>

                  {/* Right — contrast panel */}
                  <div className="lg:w-80 shrink-0 space-y-3">
                    {/* Them */}
                    <div className="rounded-xl bg-red-500/8 border border-red-500/15 p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full bg-red-400/60" />
                        <span className="text-xs text-red-400/80 font-medium">ChatGPT / Claude</span>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">
                        {d.contrast.them}
                      </p>
                    </div>

                    {/* Us */}
                    <div className={`rounded-xl bg-black/20 border ${d.border} p-4`}>
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className={`w-2 h-2 rounded-full ${d.iconBg.replace('bg-', 'bg-').replace('/15', '/80')}`} />
                        <span className={`text-xs font-medium ${d.iconColor}`}>FounderLens</span>
                      </div>
                      <p className="text-xs text-foreground/80 font-medium leading-relaxed">
                        {d.contrast.us}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div
          className={`mt-16 text-center transition-all duration-1000 ${
            visibleItems[2] ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "600ms" }}
        >
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </a>
          <p className="mt-3 text-xs text-muted-foreground">
            No credit card required · Full research engine on first validation
          </p>
        </div>
      </div>
    </section>
  );
};
