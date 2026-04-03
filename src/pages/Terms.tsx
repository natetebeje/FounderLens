import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Scale, AlertTriangle, Mail } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Scale className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Terms of <span className="text-gradient-primary">Service</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            These terms govern your use of FounderLens and describe our mutual rights and responsibilities.
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Last updated: July 24, 2024 • Effective: July 24, 2024
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Agreement Overview */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="w-6 h-6 text-primary" />
                Agreement Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                By accessing or using FounderLens, you agree to be bound by these Terms of Service and all applicable laws. 
                If you do not agree with any of these terms, you are prohibited from using our services.
              </p>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">1. Service Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                FounderLens is an AI-powered platform that helps entrepreneurs discover, validate, and develop business opportunities. 
                Our services include business opportunity analysis, market research, validation frameworks, and team collaboration tools.
              </p>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Service Features</h4>
                <ul className="space-y-1">
                  <li>• AI-powered business opportunity discovery</li>
                  <li>• Market analysis and validation tools</li>
                  <li>• Team collaboration and project management</li>
                  <li>• Business insights and recommendations</li>
                  <li>• API access for enterprise customers</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* User Accounts */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">2. User Accounts and Responsibilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Account Creation</h4>
                <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Acceptable Use</h4>
                <p>You agree to use our services only for lawful purposes and in accordance with these terms. You may not:</p>
                <ul className="space-y-1 mt-2">
                  <li>• Use the service for illegal or unauthorized purposes</li>
                  <li>• Attempt to gain unauthorized access to our systems</li>
                  <li>• Share false or misleading information</li>
                  <li>• Violate any applicable laws or regulations</li>
                  <li>• Interfere with other users' use of the service</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Subscription and Billing */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">3. Subscription and Billing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Freemium Model</h4>
                <p>We offer a generous free plan with core features. Paid plans provide additional capabilities and remove usage limits. You can upgrade anytime and your payment method will be charged immediately upon subscription.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Billing Terms</h4>
                <p>Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except as required by law or as specifically stated in our refund policy.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Cancellation</h4>
                <p>You may cancel your subscription at any time. Cancellation will take effect at the end of your current billing period.</p>
              </div>
            </CardContent>
          </Card>

          {/* Intellectual Property */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">4. Intellectual Property Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">FounderLens Content</h4>
                <p>The FounderLens platform, including its design, functionality, algorithms, and content, is owned by FounderLens and protected by intellectual property laws.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Your Content</h4>
                <p>You retain ownership of any business ideas, strategies, or content you submit to our platform. You grant us a limited license to use this content to provide our services.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">AI-Generated Insights</h4>
                <p>Insights and recommendations generated by our AI are provided to you for your use. However, the underlying algorithms and methodologies remain our intellectual property.</p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy and Data */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">5. Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, 
                which is incorporated into these terms by reference.
              </p>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Data Security</h4>
                <p>We implement appropriate security measures to protect your data, but cannot guarantee absolute security. You acknowledge the inherent risks of internet transmission.</p>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimers */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                6. Disclaimers and Limitations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Service Availability</h4>
                <p>We strive to maintain service availability but cannot guarantee uninterrupted access. Services may be temporarily unavailable for maintenance or due to technical issues.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Business Advice Disclaimer</h4>
                <p>FounderLens provides analysis and insights but does not constitute professional business, legal, or financial advice. You should consult qualified professionals for specific advice.</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Limitation of Liability</h4>
                <p>To the maximum extent permitted by law, FounderLens shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services.</p>
              </div>
            </CardContent>
          </Card>

          {/* Termination */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">7. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Either party may terminate this agreement at any time. We may suspend or terminate your access if you violate these terms. 
                Upon termination, your right to use the service ceases immediately.
              </p>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Data Retention</h4>
                <p>After termination, we will retain your data for a reasonable period to comply with legal obligations, after which it will be deleted according to our data retention policy.</p>
              </div>
            </CardContent>
          </Card>

          {/* Governing Law */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">8. Governing Law and Disputes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                These terms are governed by the laws of the State of California, United States. Any disputes will be resolved through binding arbitration in San Francisco County, California.
              </p>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Class Action Waiver</h4>
                <p>You agree to resolve disputes individually and waive any right to participate in class action lawsuits or class-wide arbitration.</p>
              </div>
            </CardContent>
          </Card>

          {/* Changes to Terms */}
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">9. Changes to These Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p>
                We may update these terms from time to time. We will notify users of material changes via email or platform notification. 
                Continued use of the service after changes take effect constitutes acceptance of the new terms.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Mail className="w-6 h-6 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <p className="mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2">
                <p><strong>Email:</strong> legal@founderlens.com</p>
                <p><strong>Address:</strong> FounderLens, Inc.<br />123 Innovation Drive<br />San Francisco, CA 94105</p>
                <p><strong>Phone:</strong> +1 (555) 123-4567</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Terms;