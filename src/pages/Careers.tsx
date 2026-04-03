import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Heart, Zap, Globe } from "lucide-react";

const Careers = () => {
  const openings = [
    {
      title: "Senior AI Engineer",
      department: "Engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      description: "Build the next generation of AI-powered business discovery tools."
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "New York, NY / Remote",
      type: "Full-time",
      description: "Design intuitive experiences that help entrepreneurs succeed."
    },
    {
      title: "Growth Marketing Manager",
      department: "Marketing",
      location: "Austin, TX / Remote",
      type: "Full-time",
      description: "Drive user acquisition and engagement for our platform."
    },
    {
      title: "Customer Success Specialist",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Help entrepreneurs maximize their success with FounderLens."
    }
  ];

  const benefits = [
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health, dental, and vision insurance plus wellness stipend"
    },
    {
      icon: Globe,
      title: "Remote-First",
      description: "Work from anywhere with quarterly team retreats and coworking stipend"
    },
    {
      icon: Zap,
      title: "Growth & Learning",
      description: "Annual learning budget, conference attendance, and mentorship programs"
    },
    {
      icon: Users,
      title: "Equity & Impact",
      description: "Meaningful equity package and the chance to impact millions of entrepreneurs"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Build the future of <span className="text-gradient-primary">entrepreneurship</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Join a team of passionate builders creating AI-powered tools that help 
            entrepreneurs discover and launch successful businesses.
          </p>
        </div>

        {/* Culture Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">Our Culture</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We're a team of entrepreneurs, engineers, and dreamers who believe 
                in the power of great ideas backed by smart execution.
              </p>
              <p>
                Our culture is built on transparency, continuous learning, and 
                empowering each other to do the best work of our careers.
              </p>
              <p>
                We move fast, think big, and always put our users first.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center mb-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-2">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-foreground mb-2">{job.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{job.department}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{job.type}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline">{job.department}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{job.description}</p>
                  <Button variant="hero">
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Don't See Your Role */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Don't see your role?</h2>
          <p className="text-muted-foreground mb-6">
            We're always looking for talented people. Send us your resume and tell us how you'd like to contribute.
          </p>
          <Button variant="hero" size="lg">
            Get In Touch
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Careers;