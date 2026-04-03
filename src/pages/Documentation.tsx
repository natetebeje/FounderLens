import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Book, Search, Code, Zap, Users, Shield, ArrowRight } from "lucide-react";
import { useState } from "react";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    {
      icon: Zap,
      title: "Getting Started",
      description: "Quick start guide and basic concepts",
      articles: [
        "Creating Your First Account",
        "Understanding Business Opportunities",
        "Setting Up Your Profile",
        "Your First Discovery Session"
      ]
    },
    {
      icon: Code,
      title: "API Reference",
      description: "Complete API documentation and examples",
      articles: [
        "Authentication",
        "Opportunities Endpoint",
        "Validation API",
        "Webhooks",
        "Rate Limiting"
      ]
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Working with teams and organizations",
      articles: [
        "Creating Teams",
        "Managing Permissions",
        "Sharing Opportunities",
        "Team Analytics"
      ]
    },
    {
      icon: Shield,
      title: "Security & Privacy",
      description: "Data protection and security measures",
      articles: [
        "Data Encryption",
        "Privacy Policy",
        "GDPR Compliance",
        "Security Best Practices"
      ]
    }
  ];

  const quickLinks = [
    { title: "API Keys", description: "Manage your API authentication" },
    { title: "Webhooks", description: "Set up real-time notifications" },
    { title: "SDKs & Libraries", description: "Official and community libraries" },
    { title: "Status Page", description: "Current system status" },
    { title: "Changelog", description: "Latest updates and features" },
    { title: "Support", description: "Get help from our team" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Book className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-gradient-primary">Documentation</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Everything you need to know about FounderLens - from getting started 
            to advanced API integration.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white/20 border-white/30"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {quickLinks.map((link, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth cursor-pointer">
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold text-foreground text-sm mb-2">{link.title}</h3>
                <p className="text-xs text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Documentation Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-foreground">{section.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {section.articles.map((article, articleIndex) => (
                      <div 
                        key={articleIndex}
                        className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-smooth cursor-pointer"
                      >
                        <span className="text-foreground">{article}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    View All Articles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Featured Guides */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Featured Guides</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">Popular</Badge>
                <CardTitle className="text-lg text-foreground">Complete API Integration Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Step-by-step guide to integrate FounderLens API into your application.
                </p>
                <Button variant="hero" size="sm">
                  Read Guide
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-glass border-white/20">
              <CardHeader>
                <Badge variant="outline" className="w-fit">Updated</Badge>
                <CardTitle className="text-lg text-foreground">Building Your First AI Workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Learn how to create automated opportunity discovery workflows.
                </p>
                <Button variant="outline" size="sm">
                  Read Guide
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-glass border-white/20">
              <CardHeader>
                <Badge variant="outline" className="w-fit">New</Badge>
                <CardTitle className="text-lg text-foreground">Team Management Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Optimize your team's collaboration and opportunity tracking.
                </p>
                <Button variant="outline" size="sm">
                  Read Guide
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Section */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Need More Help?</h2>
          <p className="text-muted-foreground mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button variant="hero">
              Contact Support
            </Button>
            <Button variant="outline">
              Join Community
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;