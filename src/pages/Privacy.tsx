import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, FileText, Mail } from "lucide-react";

const Privacy = () => {
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
            Privacy <span className="text-gradient-primary">Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Your privacy is fundamental to how we operate. This policy explains how we collect, 
            use, and protect your information.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: July 24, 2024
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Quick Summary */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Eye className="w-6 h-6 text-primary" />
                Privacy at a Glance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">What We Collect</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Account information (email, name)</li>
                    <li>• Business interests and ideas you share</li>
                    <li>• Usage data and analytics</li>
                    <li>• Communication preferences</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">How We Use It</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Provide personalized business insights</li>
                    <li>• Improve our AI algorithms</li>
                    <li>• Send relevant updates and content</li>
                    <li>• Ensure platform security</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Sections */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Account Information</h4>
                <p>When you create an account, we collect your email address, name, and other information you choose to provide. This helps us personalize your experience and provide customer support.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Business Data</h4>
                <p>We collect the business interests, ideas, and preferences you share with our platform to generate personalized opportunity recommendations. This data is kept strictly confidential.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Usage Information</h4>
                <p>We automatically collect information about how you use our platform, including pages visited, features used, and interaction patterns to improve our services.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Service Provision</h4>
                <p>We use your information to provide, maintain, and improve our business discovery and validation services, including AI-powered recommendations.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Communication</h4>
                <p>We may send you service updates, security notifications, and relevant business insights based on your preferences.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Analytics and Improvement</h4>
                <p>We analyze usage patterns to improve our platform, develop new features, and enhance the accuracy of our AI algorithms.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">3. Information Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">No Sale of Personal Data</h4>
                <p>We never sell your personal information or business ideas to third parties. Your entrepreneurial insights remain confidential.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Service Providers</h4>
                <p>We may share limited data with trusted service providers who help us operate our platform, such as cloud hosting and analytics services.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Legal Requirements</h4>
                <p>We may disclose information when required by law or to protect the rights, property, or safety of our users and platform.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">4. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>We implement industry-standard security measures to protect your information:</p>
              <ul className="space-y-2">
                <li>• End-to-end encryption for data transmission</li>
                <li>• AES-256 encryption for data storage</li>
                <li>• Regular security audits and penetration testing</li>
                <li>• Multi-factor authentication options</li>
                <li>• SOC 2 Type II compliance</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">5. Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Access and Portability</h4>
                <p>You can request a copy of your personal data and export your business opportunities and analysis.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Correction and Deletion</h4>
                <p>You can update your information or request deletion of your account and associated data at any time.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Communication Preferences</h4>
                <p>You can opt out of marketing communications while still receiving important service updates.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">6. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>FounderLens operates globally. We may transfer your information to countries other than your own, including the United States. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">7. Changes to This Policy</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>We may update this privacy policy from time to time. We will notify you of any material changes by email or through our platform. Your continued use of FounderLens after changes become effective constitutes acceptance of the updated policy.</p>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Mail className="w-6 h-6 text-primary" />
                Contact Our Privacy Team
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                If you have questions about this privacy policy or how we handle your information, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> privacy@founderlens.com</p>
                <p><strong>Address:</strong> 123 Innovation Drive, San Francisco, CA 94105</p>
                <p><strong>Data Protection Officer:</strong> dpo@founderlens.com</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Privacy;