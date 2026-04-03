import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, MessageCircle, BookOpen, Video, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { ModernBackground } from "@/components/ui/modern-background";

const Help = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const helpCategories = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of FounderLens",
      articles: 12
    },
    {
      icon: Search,
      title: "Discovery & Opportunities",
      description: "Find and analyze business opportunities",
      articles: 8
    },
    {
      icon: MessageCircle,
      title: "Team Collaboration",
      description: "Work with your team effectively",
      articles: 6
    },
    {
      icon: Video,
      title: "Validation Workflows",
      description: "Validate your business ideas",
      articles: 10
    }
  ];

  const faqs = [
    {
      question: "How do I create my first business opportunity discovery?",
      answer: "Start by clicking 'Start Discovery' on the homepage. Enter your interests, skills, or market area you're curious about. Our AI will analyze your input and generate personalized business opportunities for you to explore."
    },
    {
      question: "What makes FounderLens different from other business idea platforms?",
      answer: "FounderLens uses advanced AI to analyze real market data, trends, and your personal profile to generate validated business opportunities. We don't just give you ideas - we provide market analysis, validation frameworks, and team collaboration tools."
    },
    {
      question: "Can I collaborate with my team on opportunities?",
      answer: "Yes! FounderLens supports team collaboration. You can invite team members, share opportunities, assign validation tasks, and track progress together. Different plans support different numbers of team members."
    },
    {
      question: "How accurate is the AI analysis?",
      answer: "Our AI has a 95% accuracy rate based on real market outcomes. We continuously improve our algorithms using the latest market data, successful business patterns, and user feedback to provide the most reliable insights."
    },
    {
      question: "What's included in the free plan?",
      answer: "The free plan includes up to 9 opportunities, 3 discovery sessions, basic AI analysis, email support, and community access. It's perfect for exploring the platform and getting your first business insights."
    },
    {
      question: "How does the freemium model work?",
      answer: "Start with our generous free plan that includes up to 9 opportunities and 3 discovery sessions. When you're ready for more features, upgrade to a paid plan with unlimited opportunities, advanced AI analysis, and team collaboration features."
    },
    {
      question: "Can I export my opportunities and analysis?",
      answer: "Yes, Basic and higher plans include export capabilities. You can export your opportunities, validation reports, and analysis in various formats including PDF and CSV for easy sharing and presentation."
    },
    {
      question: "Is my data secure and private?",
      answer: "Absolutely. We use enterprise-grade security measures to protect your data. All data is encrypted in transit and at rest. We're GDPR compliant and never share your personal business ideas with third parties."
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@founderlens.io",
      response: "Usually within 24 hours"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our support team",
      contact: "Available in-app",
      response: "Monday-Friday, 9 AM - 6 PM PST"
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly with us",
      contact: "+1 (555) 123-4567",
      response: "Premium plans only"
    }
  ];

  return (
    <ModernBackground variant="mesh">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            How can we <span className="text-gradient-primary">help</span> you?
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Find answers to your questions, learn how to use FounderLens, 
            and get the support you need to succeed.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white/20 border-white/30"
            />
          </div>
        </div>

        {/* Help Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {helpCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth cursor-pointer">
                <CardHeader className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg text-foreground">{category.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">{category.articles} articles</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Browse Articles
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="bg-white/10 backdrop-blur-glass border-white/20 rounded-lg px-6">
                  <AccordionTrigger className="text-foreground hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Contact Support</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {contactOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-lg text-foreground">{option.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-foreground font-medium mb-2">{option.contact}</p>
                    <p className="text-sm text-muted-foreground mb-4">{option.response}</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Contact Now
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Status Page Link */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">System Status</h2>
          <p className="text-muted-foreground mb-6">
            Check the current status of FounderLens services and any ongoing maintenance.
          </p>
          <Button variant="hero">
            View Status Page
          </Button>
        </div>
      </div>
    </ModernBackground>
  );
};

export default Help;