import { Eye, Twitter, Linkedin, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
export const Footer = () => {
  return <footer className="py-16 px-4 border-t border-border/20 bg-gradient-card backdrop-blur-glass">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
                alt="FounderLens" 
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-foreground">FounderLens</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI-powered business opportunity discovery and validation.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="w-9 h-9 hover:bg-white/10">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9 hover:bg-white/10">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9 hover:bg-white/10">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Essential Links */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="/pricing" className="hover:text-foreground transition-smooth">Pricing</a></li>
              <li><a href="/contact" className="hover:text-foreground transition-smooth">Contact</a></li>
              <li><a href="/documentation" className="hover:text-foreground transition-smooth">Documentation</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="/privacy" className="hover:text-foreground transition-smooth">Privacy Policy</a></li>
              <li><a href="/terms" className="hover:text-foreground transition-smooth">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">© 2025 FounderLens. All rights reserved.</div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-smooth">Privacy Policy</a>
            <a href="/terms" className="hover:text-foreground transition-smooth">Terms of Service</a>
            <a href="/cookies" className="hover:text-foreground transition-smooth">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>;
};