import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cookie, Settings, Shield, BarChart } from "lucide-react";

const Cookies = () => {
  const cookieTypes = [
    {
      icon: Shield,
      name: "Essential Cookies",
      required: true,
      description: "These cookies are necessary for the website to function and cannot be switched off in our systems.",
      examples: [
        "Authentication and security tokens",
        "Session management",
        "Load balancing",
        "CSRF protection"
      ]
    },
    {
      icon: BarChart,
      name: "Analytics Cookies",
      required: false,
      description: "These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.",
      examples: [
        "Google Analytics",
        "Page view tracking",
        "User behavior analysis",
        "Performance monitoring"
      ]
    },
    {
      icon: Settings,
      name: "Functional Cookies",
      required: false,
      description: "These cookies enable the website to provide enhanced functionality and personalization.",
      examples: [
        "Language preferences",
        "Theme settings",
        "Remember form inputs",
        "User interface preferences"
      ]
    }
  ];

  const thirdPartyServices = [
    {
      name: "Google Analytics",
      purpose: "Website analytics and performance monitoring",
      dataShared: "Anonymous usage statistics, page views, user interactions",
      retention: "26 months",
      optOut: "Available"
    },
    {
      name: "Stripe",
      purpose: "Payment processing and subscription management",
      dataShared: "Payment information, billing details (during checkout only)",
      retention: "As required by financial regulations",
      optOut: "Not available (required for service)"
    },
    {
      name: "Supabase",
      purpose: "Backend services and data storage",
      dataShared: "Account information, application data",
      retention: "Until account deletion",
      optOut: "Not available (required for service)"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Cookie className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Cookie <span className="text-gradient-primary">Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Learn about how FounderLens uses cookies and similar technologies to improve your experience.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: July 24, 2024
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* What Are Cookies */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Cookie className="w-6 h-6 text-primary" />
                What Are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and understanding how you use our service.
              </p>
              <p>
                We use both "session cookies" (which expire when you close your browser) and "persistent cookies" (which remain on your device until they expire or you delete them).
              </p>
            </CardContent>
          </Card>

          {/* Types of Cookies */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground text-center">Types of Cookies We Use</h2>
            {cookieTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl text-foreground">{type.name}</CardTitle>
                          <div className="mt-2">
                            <Badge variant={type.required ? "default" : "secondary"}>
                              {type.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{type.description}</p>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Examples:</h4>
                      <ul className="space-y-1">
                        {type.examples.map((example, exampleIndex) => (
                          <li key={exampleIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                            <span>{example}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Third-Party Services */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground text-center">Third-Party Services</h2>
            <div className="space-y-4">
              {thirdPartyServices.map((service, index) => (
                <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">{service.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Purpose</h4>
                        <p className="text-sm text-muted-foreground">{service.purpose}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Data Shared</h4>
                        <p className="text-sm text-muted-foreground">{service.dataShared}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Data Retention</h4>
                        <p className="text-sm text-muted-foreground">{service.retention}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Opt-Out</h4>
                        <Badge variant={service.optOut === "Available" ? "default" : "secondary"}>
                          {service.optOut}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Managing Cookies */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">Managing Your Cookie Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Browser Settings</h4>
                <p>You can control and manage cookies through your browser settings. Most browsers allow you to:</p>
                <ul className="space-y-1 mt-2">
                  <li>• View what cookies are stored on your device</li>
                  <li>• Delete existing cookies</li>
                  <li>• Block cookies from being set</li>
                  <li>• Set preferences for specific websites</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Platform Settings</h4>
                <p>You can also manage your cookie preferences directly through our platform settings. Note that disabling certain cookies may affect the functionality of our service.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Analytics Opt-Out</h4>
                <p>To opt out of Google Analytics tracking, you can install the Google Analytics Opt-out Browser Add-on or use our cookie preference center.</p>
              </div>
            </CardContent>
          </Card>

          {/* Updates to Cookie Policy */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">Updates to This Cookie Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices or applicable laws. 
                When we make changes, we will update the "Last updated" date at the top of this policy and notify you 
                through our platform or by email if the changes are significant.
              </p>
            </CardContent>
          </Card>

          {/* Cookie Preferences */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="w-6 h-6 text-primary" />
                Manage Your Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                You can update your cookie preferences at any time using the controls below.
              </p>
              <div className="flex flex-col md:flex-row gap-4">
                <Button variant="hero">
                  Cookie Preferences
                </Button>
                <Button variant="outline">
                  Reject Optional Cookies
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">Questions About Cookies?</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                If you have questions about our use of cookies or this Cookie Policy, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacy@founderlens.com</p>
                <p><strong>Address:</strong> 123 Innovation Drive, San Francisco, CA 94105</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cookies;