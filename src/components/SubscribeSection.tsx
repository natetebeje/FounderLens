import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Check, TrendingUp, Lightbulb, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SubscribeSection = () => {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubscribing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-subscribe', {
        body: { email: email.trim() }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Successfully subscribed!",
        description: "You'll receive our latest updates and entrepreneur insights. Check your email for confirmation!",
      });
      
      setEmail("");
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        title: "Subscription failed",
        description: error.message || "There was an error subscribing to the newsletter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const benefits = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      text: "Weekly market insights and trending opportunities"
    },
    {
      icon: <Lightbulb className="w-5 h-5" />,
      text: "Exclusive entrepreneur tips and success stories"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      text: "Early access to new features and tools"
    }
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Stay Updated</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Join 10,000+ entrepreneurs getting our <span className="text-gradient-primary">insights</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get the latest market trends, business opportunities, and entrepreneur tips 
              delivered straight to your inbox every week.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {benefits.map((benefit, index) => (
              <Card key={index} className="bg-card/80 backdrop-blur-sm border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {benefit.icon}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{benefit.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Subscribe Form */}
          <Card className="bg-card/80 backdrop-blur-sm max-w-2xl mx-auto">
            <CardContent className="p-8">
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isSubscribing}
                  className="h-12 px-8"
                >
                  {isSubscribing ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
              
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                <span>No spam, unsubscribe anytime</span>
              </div>
            </CardContent>
          </Card>

          {/* Social Proof */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by entrepreneurs from
            </p>
            <div className="flex items-center justify-center gap-8 text-muted-foreground/60">
              <span className="font-semibold">Y Combinator</span>
              <span className="font-semibold">Techstars</span>
              <span className="font-semibold">500 Startups</span>
              <span className="font-semibold">Seedcamp</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};