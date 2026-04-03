import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, ExternalLink } from "lucide-react";

const Press = () => {
  const pressReleases = [
    {
      title: "FounderLens Raises $15M Series A to Democratize Entrepreneurship",
      date: "2024-07-15",
      summary: "Funding will accelerate AI development and expand platform capabilities for entrepreneurs worldwide.",
      category: "Funding"
    },
    {
      title: "FounderLens Surpasses 10,000 Active Entrepreneurs",
      date: "2024-06-20",
      summary: "Platform milestone represents growing demand for AI-powered business discovery tools.",
      category: "Milestone"
    },
    {
      title: "New AI Validation Framework Launched",
      date: "2024-05-30",
      summary: "Advanced machine learning algorithms now provide deeper business opportunity insights.",
      category: "Product"
    },
    {
      title: "FounderLens Partners with Leading Accelerators",
      date: "2024-05-10",
      summary: "Strategic partnerships with Y Combinator, Techstars, and others to support early-stage founders.",
      category: "Partnership"
    }
  ];

  const mediaKit = [
    {
      title: "Company Logo Package",
      description: "High-resolution logos in various formats and colors",
      type: "ZIP"
    },
    {
      title: "Executive Headshots",
      description: "Professional photos of leadership team",
      type: "ZIP"
    },
    {
      title: "Product Screenshots",
      description: "High-quality images of the platform interface",
      type: "ZIP"
    },
    {
      title: "Company Fact Sheet",
      description: "Key statistics, milestones, and company information",
      type: "PDF"
    }
  ];

  const mediaContact = {
    name: "Sarah Johnson",
    title: "Head of Communications",
    email: "press@founderlens.com",
    phone: "+1 (555) 123-4567"
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Press & <span className="text-gradient-primary">Media</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The latest news, announcements, and resources for media coverage of FounderLens.
          </p>
        </div>

        {/* Latest News */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Latest News</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {pressReleases.map((release, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline">{release.category}</Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(release.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl text-foreground hover:text-primary transition-smooth cursor-pointer">
                    {release.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{release.summary}</p>
                  <Button variant="outline" size="sm">
                    Read Full Release
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Media Kit */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Media Kit</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mediaKit.map((item, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Download className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <Badge variant="secondary">{item.type}</Badge>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Media Contact */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">Media Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-foreground">{mediaContact.name}</h4>
                  <p className="text-muted-foreground">{mediaContact.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-foreground">{mediaContact.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground">{mediaContact.phone}</p>
                </div>
              </div>
              <Button variant="hero" className="w-full mt-6">
                Contact Media Team
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-glass border-white/20">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Founded</p>
                  <p className="text-foreground font-semibold">2023</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Headquarters</p>
                  <p className="text-foreground font-semibold">San Francisco, CA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-foreground font-semibold">10,000+ Entrepreneurs</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Funding</p>
                  <p className="text-foreground font-semibold">$15M Series A</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Press;