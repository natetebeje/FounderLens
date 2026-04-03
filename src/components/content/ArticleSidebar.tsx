import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share, Bookmark, Twitter, Linkedin, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  slug: string;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
  }>;
}

interface ArticleSidebarProps {
  article: Article;
}

export const ArticleSidebar = ({ article }: ArticleSidebarProps) => {
  const { toast } = useToast();

  const handleShare = async (platform: string) => {
    const url = `${window.location.origin}/a/${article.slug}`;
    const text = `Check out this story: ${article.title}`;

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(url);
          toast({
            title: "Link copied!",
            description: "The article link has been copied to your clipboard.",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to copy link to clipboard.",
            variant: "destructive"
          });
        }
        break;
    }
  };

  const handleBookmark = () => {
    toast({
      title: "Coming soon!",
      description: "Bookmarking feature will be available soon.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Share Card */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Share this story</h3>
        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => handleShare('twitter')}
          >
            <Twitter className="w-4 h-4 mr-2" />
            Share on Twitter
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => handleShare('linkedin')}
          >
            <Linkedin className="w-4 h-4 mr-2" />
            Share on LinkedIn
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => handleShare('copy')}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={handleBookmark}
          >
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark
          </Button>
        </div>
      </Card>

      {/* Tags Card */}
      {article.tags.length > 0 && (
        <Card className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Topics</h3>
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <Badge key={tag.id} variant="outline" className="cursor-pointer hover:bg-primary/10">
                {tag.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Newsletter Signup */}
      <Card className="glass-card p-6 bg-gradient-subtle">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Get More Stories
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Subscribe to get the latest founder stories and validated opportunities delivered weekly.
        </p>
        <Button size="sm" className="w-full">
          Subscribe to Newsletter
        </Button>
      </Card>

      {/* Featured CTA */}
      <Card className="glass-card p-6 text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Start Your Journey
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Discover and validate your own business opportunities with FounderLens.
        </p>
        <Button size="sm" className="w-full">
          Try FounderLens Free
        </Button>
      </Card>
    </div>
  );
};