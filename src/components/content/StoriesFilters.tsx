import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface StoriesFiltersProps {
  selectedTag: string | null;
}

export const StoriesFilters = ({ selectedTag }: StoriesFiltersProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tags, setTags] = useState<Tag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('content_tags')
        .select('*')
        .order('name');
      
      setTags(data || []);
    };

    fetchTags();
  }, []);

  const handleTagClick = (tagSlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (selectedTag === tagSlug) {
      params.delete('tag');
    } else {
      params.set('tag', tagSlug);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Search Stories</h3>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="w-full" size="sm">
            Search
          </Button>
        </form>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filter by Topic</h3>
          {(selectedTag || searchParams.get('search')) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTag === tag.slug ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleTagClick(tag.slug)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Browse Categories</h3>
        <div className="space-y-2 text-sm">
          <button 
            onClick={() => navigate('/stories')}
            className="block w-full text-left py-2 px-3 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            All Stories
          </button>
          <button 
            onClick={() => handleTagClick('success-story')}
            className="block w-full text-left py-2 px-3 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            Success Stories
          </button>
          <button 
            onClick={() => handleTagClick('product-hunt')}
            className="block w-full text-left py-2 px-3 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            Product Hunt Launches
          </button>
          <button 
            onClick={() => handleTagClick('bootstrapped')}
            className="block w-full text-left py-2 px-3 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            Bootstrapped Companies
          </button>
        </div>
      </Card>
    </div>
  );
};