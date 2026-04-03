import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Key, Eye, FileText, Award, Users, Zap } from "lucide-react";

const Security = () => {
  const securityFeatures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data is encrypted in transit and at rest using AES-256 encryption standards."
    },
    {
      icon: Key,
      title: "Multi-Factor Authentication",
      description: "Optional 2FA and SSO integration for enterprise customers."
    },
    {
      icon: Eye,
      title: "Privacy by Design",
      description: "Your business ideas and data are never shared with third parties."
    },
    {
      icon: Shield,
      title: "SOC 2 Type II Compliant",
      description: "Independently audited for security, availability, and confidentiality."
    },
    {
      icon: Users,
      title: "Role-Based Access Control",
      description: "Granular permissions and access controls for team members."
    },
    {
      icon: Zap,
      title: "Real-Time Monitoring",
      description: "24/7 security monitoring and automated threat detection."
    }
  ];

  const certifications = [
    {
      name: "SOC 2 Type II",
      description: "Independently verified security controls and processes",
      badge: "Certified"
    },
    {
      name: "GDPR Compliant",
      description: "Full compliance with European data protection regulations",
      badge: "Compliant"
    },
    {
      name: "CCPA Compliant",
      description: "California Consumer Privacy Act compliance",
      badge: "Compliant"
    },
    {
      name: "ISO 27001",
      description: "Information security management system certification",
      badge: "In Progress"
    }
  ];

  const dataProtection = [
    {
      title: "Data Encryption",
      details: [
        "AES-256 encryption for data at rest",
        "TLS 1.3 for data in transit",
        "Key rotation every 90 days",
        "Hardware security modules (HSMs)"
      ]
    },
    {
      title: "Access Controls",
      details: [
        "Multi-factor authentication",
        "Single sign-on (SSO) support",
        "Role-based access control",
        "Regular access reviews"
      ]
    },
    {
      title: "Infrastructure Security",
      details: [
        "AWS enterprise-grade infrastructure",
        "Network isolation and firewalls",
        "Regular security audits",
        "Automated backup systems"
      ]
    },
    {
      title: "Monitoring & Response",
      details: [
        "24/7 security monitoring",
        "Automated threat detection",
        "Incident response procedures",
        "Regular penetration testing"
      ]
    }
  ];

  const privacyPrinciples = [
    "We collect only the minimum data necessary to provide our services",
    "Your business ideas and strategies remain completely confidential",
    "We never sell or share your personal information with third parties",
    "You maintain full control over your data and can delete it anytime",
    "All data processing is transparent and documented",
    "We comply with global privacy regulations including GDPR and CCPA"
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Enterprise-Grade <span className="text-gradient-primary">Security</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Your business ideas and data are protected by industry-leading security measures 
            and privacy controls. Trust is our foundation.
          </p>
        </div>

        {/* Security Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Certifications */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Certifications & Compliance</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications.map((cert, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 text-center">
                <CardHeader>
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Award className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg text-foreground">{cert.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{cert.description}</p>
                  <Badge 
                    variant={cert.badge === "Certified" || cert.badge === "Compliant" ? "default" : "secondary"}
                  >
                    {cert.badge}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Data Protection Details */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Data Protection Measures</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {dataProtection.map((section, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardHeader>
                  <CardTitle className="text-xl text-foreground">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.details.map((detail, detailIndex) => (
                      <li key={detailIndex} className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                        <span className="text-sm">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Privacy Principles */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Our Privacy Principles</h2>
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {privacyPrinciples.map((principle, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                    <p className="text-muted-foreground">{principle}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Resources */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg text-foreground">Security Whitepaper</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Detailed technical documentation of our security architecture and practices.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg text-foreground">Security Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Report security vulnerabilities and help us maintain our security standards.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Report Issue
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg text-foreground">Security Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Contact our security team directly for enterprise security questions.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Contact Team
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Security Team */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Questions About Security?</h2>
          <p className="text-muted-foreground mb-6">
            Our security team is available to answer your questions and provide additional documentation.
          </p>
          <Button variant="hero" size="lg">
            Contact Security Team
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Security;