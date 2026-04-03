import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Calendar, Trophy, Lightbulb, TrendingUp } from "lucide-react";

const Community = () => {
  const stats = [
    { label: "Active Members", value: "10,000+", icon: Users },
    { label: "Success Stories", value: "2,500+", icon: Trophy },
    { label: "Monthly Events", value: "15+", icon: Calendar },
    { label: "Ideas Shared", value: "50,000+", icon: Lightbulb }
  ];

  const channels = [
    {
      name: "🚀 Getting Started",
      description: "New to FounderLens? Start here for tips and guidance",
      members: "2,500+",
      activity: "Very Active"
    },
    {
      name: "💡 Opportunity Sharing",
      description: "Share and discuss business opportunities with the community",
      members: "5,000+",
      activity: "Very Active"
    },
    {
      name: "🔧 Product Feedback",
      description: "Help shape the future of FounderLens with your feedback",
      members: "1,200+",
      activity: "Active"
    },
    {
      name: "🎯 Success Stories",
      description: "Celebrate wins and learn from successful entrepreneurs",
      members: "3,800+",
      activity: "Active"
    },
    {
      name: "🤝 Collaboration Hub",
      description: "Find co-founders, partners, and team members",
      members: "4,200+",
      activity: "Very Active"
    },
    {
      name: "📚 Learning Resources",
      description: "Share articles, courses, and educational content",
      members: "2,100+",
      activity: "Moderate"
    }
  ];

  const events = [
    {
      title: "Weekly Founder Meetup",
      date: "Every Wednesday",
      time: "7:00 PM PST",
      type: "Virtual",
      description: "Connect with fellow entrepreneurs and share your journey"
    },
    {
      title: "AI-Powered Business Discovery Workshop",
      date: "July 30, 2024",
      time: "2:00 PM PST",
      type: "Virtual",
      description: "Deep dive into using AI for business opportunity discovery"
    },
    {
      title: "Validation Framework Masterclass",
      date: "August 5, 2024",
      time: "1:00 PM PST",
      type: "Virtual",
      description: "Learn advanced techniques for validating business ideas"
    }
  ];

  const successStories = [
    {
      name: "Sarah Chen",
      company: "EcoPackaging Solutions",
      story: "Used FounderLens to discover the sustainable packaging opportunity. Now generating $100K MRR!",
      timeframe: "6 months"
    },
    {
      name: "Mike Rodriguez",
      company: "LocalConnect",
      story: "Found my co-founder through the community and built a successful local services platform.",
      timeframe: "8 months"
    },
    {
      name: "Jessica Park",
      company: "HealthTech AI",
      story: "The validation framework helped me pivot to the right market. Raised $2M seed round!",
      timeframe: "10 months"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Join the <span className="text-gradient-primary">Community</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Connect with thousands of entrepreneurs, share ideas, get feedback, 
            and build your network in the most supportive startup community.
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 text-center">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{stat.value}</h3>
                  <p className="text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Community Channels */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Community Channels</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">{channel.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={channel.activity === "Very Active" ? "default" : "secondary"}>
                      {channel.activity}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{channel.members} members</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{channel.description}</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Join Channel
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Upcoming Events</h2>
          <div className="space-y-4">
            {events.map((event, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{event.title}</h3>
                        <Badge variant="outline">{event.type}</Badge>
                      </div>
                      <p className="text-muted-foreground mb-4">{event.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{event.date}</span>
                        </div>
                        <span>{event.time}</span>
                      </div>
                    </div>
                    <Button variant="hero">
                      Join Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Success Stories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {successStories.map((story, index) => (
              <Card key={index} className="bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{story.name}</h3>
                      <p className="text-sm text-muted-foreground">{story.company}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">"{story.story}"</p>
                  <Badge variant="secondary">{story.timeframe} journey</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Join Community CTA */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <div className="flex items-center justify-center gap-2 mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Connect?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of entrepreneurs building the future together.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg">
              Join Discord Community
            </Button>
            <Button variant="outline" size="lg">
              Follow on LinkedIn
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;