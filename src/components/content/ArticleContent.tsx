import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, BarChart3, Users, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Article {
  id: string;
  content: string;
  opportunity_id?: string;
}

interface ArticleContentProps {
  article: Article;
}

export const ArticleContent = ({ article }: ArticleContentProps) => {
  const navigate = useNavigate();

  // Parse content as markdown-like text (simplified for demo)
  const formatContent = (content: string) => {
    return content.split('\n').map((paragraph, index) => {
      if (paragraph.trim() === '') return null;
      
      // Handle headings
      if (paragraph.startsWith('# ')) {
        return (
          <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
            {paragraph.replace('# ', '')}
          </h2>
        );
      }
      
      if (paragraph.startsWith('## ')) {
        return (
          <h3 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3">
            {paragraph.replace('## ', '')}
          </h3>
        );
      }

      // Handle bold text
      const formattedParagraph = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      return (
        <p 
          key={index} 
          className="text-foreground leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formattedParagraph }}
        />
      );
    }).filter(Boolean);
  };

  return (
    <div className="space-y-8">
      {/* Main Content */}
      <div className="prose prose-lg max-w-none">
        {formatContent(article.content)}
      </div>

      {/* Opportunity Integration */}
      {article.opportunity_id && (
        <Card className="glass-card p-6 border-l-4 border-l-primary">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                Explore This Opportunity
              </h3>
            </div>
            
            <p className="text-muted-foreground">
              This story is based on a validated business opportunity from our platform. 
              See the full analysis, market research, and validation data.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">AI Analysis</p>
                <p className="text-xs text-muted-foreground">Market insights</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Community</p>
                <p className="text-xs text-muted-foreground">Reddit signals</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Validation</p>
                <p className="text-xs text-muted-foreground">Real feedback</p>
              </div>
            </div>
            
            <Button 
              className="w-full"
              onClick={() => navigate(`/validation/${article.opportunity_id}`)}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Full Opportunity Analysis
            </Button>
          </div>
        </Card>
      )}

      {/* Call to Action */}
      <Card className="glass-card p-6 text-center bg-gradient-subtle">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Ready to Validate Your Own Ideas?
        </h3>
        <p className="text-muted-foreground mb-6">
          Use FounderLens to discover, validate, and launch your next business opportunity with AI-powered insights.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={() => navigate('/discovery')}>
            Start Discovery
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/guest-discovery')}>
            Try Free Sample
          </Button>
        </div>
      </Card>
    </div>
  );
};