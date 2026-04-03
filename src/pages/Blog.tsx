import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight } from "lucide-react";

const Blog = () => {
  const posts = [
    {
      title: "The Future of AI-Powered Entrepreneurship",
      excerpt: "How artificial intelligence is transforming the way we discover and validate business opportunities.",
      author: "Sarah Chen",
      date: "2024-07-20",
      category: "AI & Innovation",
      readTime: "5 min read"
    },
    {
      title: "From Idea to Validation: A Complete Guide",
      excerpt: "Learn the systematic approach to validating your business idea before investing time and money.",
      author: "Mike Rodriguez",
      date: "2024-07-18",
      category: "Validation",
      readTime: "8 min read"
    },
    {
      title: "Market Research in the Digital Age",
      excerpt: "Modern techniques for understanding your market and finding untapped opportunities.",
      author: "Alex Thompson",
      date: "2024-07-15",
      category: "Market Research",
      readTime: "6 min read"
    },
    {
      title: "Building Your First MVP: Best Practices",
      excerpt: "Essential strategies for creating a minimum viable product that actually validates your hypothesis.",
      author: "Jessica Park",
      date: "2024-07-12",
      category: "Product Development",
      readTime: "10 min read"
    },
    {
      title: "The Psychology of Successful Entrepreneurs",
      excerpt: "Understanding the mindset and habits that separate successful founders from the rest.",
      author: "David Kim",
      date: "2024-07-10",
      category: "Entrepreneurship",
      readTime: "7 min read"
    },
    {
      title: "Funding Your Startup: A Modern Approach",
      excerpt: "Exploring new funding models and strategies for early-stage entrepreneurs.",
      author: "Emma Wilson",
      date: "2024-07-08",
      category: "Funding",
      readTime: "9 min read"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Insights for <span className="text-gradient-primary">Modern Entrepreneurs</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Stay ahead of the curve with expert insights, case studies, and actionable advice 
            for building successful businesses in today's market.
          </p>
        </div>

        {/* Featured Post */}
        <Card className="mb-12 bg-gradient-card backdrop-blur-glass border-white/20 shadow-glow">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Featured</Badge>
              <Badge variant="outline">{posts[0].category}</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-foreground">{posts[0].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 text-lg">{posts[0].excerpt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{posts[0].author}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(posts[0].date).toLocaleDateString()}</span>
                </div>
                <span>{posts[0].readTime}</span>
              </div>
              <Button variant="hero">
                Read Article
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {posts.slice(1).map((post, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20 hover:shadow-glow transition-smooth">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">{post.category}</Badge>
                </div>
                <CardTitle className="text-lg text-foreground hover:text-primary transition-smooth cursor-pointer">
                  {post.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                  <span>{post.readTime}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">
            Get the latest insights and updates delivered to your inbox.
          </p>
          <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-foreground placeholder:text-muted-foreground"
            />
            <Button variant="hero">
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;