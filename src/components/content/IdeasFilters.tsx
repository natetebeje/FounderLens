import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

interface IdeasFiltersProps {
  selectedIndustry: string | null;
  selectedDifficulty: string | null;
  sortBy: string;
}

const industries = [
  'SaaS',
  'E-commerce',
  'FinTech',
  'HealthTech',
  'EdTech',
  'MarTech',
  'AI/ML',
  'Marketplace',
  'Mobile App',
  'B2B Tools',
  'Consumer',
  'Enterprise'
];

const difficulties = [
  { value: 'easy', label: 'Easy (1-3)', description: 'Low technical complexity' },
  { value: 'medium', label: 'Medium (4-6)', description: 'Moderate technical skills' },
  { value: 'hard', label: 'Hard (7-10)', description: 'High technical expertise' }
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'confidence', label: 'Highest Confidence' },
  { value: 'difficulty', label: 'Easiest First' },
  { value: 'alphabetical', label: 'A-Z' }
];

export const IdeasFilters = ({ selectedIndustry, selectedDifficulty, sortBy }: IdeasFiltersProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleIndustryClick = (industry: string) => {
    const params = new URLSearchParams(searchParams);
    if (selectedIndustry === industry) {
      params.delete('industry');
    } else {
      params.set('industry', industry);
    }
    setSearchParams(params);
  };

  const handleDifficultyChange = (difficulty: string) => {
    const params = new URLSearchParams(searchParams);
    if (difficulty === 'all') {
      params.delete('difficulty');
    } else {
      params.set('difficulty', difficulty);
    }
    setSearchParams(params);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = selectedIndustry || selectedDifficulty || sortBy !== 'newest';

  return (
    <div className="space-y-6">
      {/* Sort */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Sort Ideas</h3>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Difficulty Filter */}
      <Card className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Difficulty Level</h3>
        <Select value={selectedDifficulty || 'all'} onValueChange={handleDifficultyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select difficulty..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {difficulties.map((difficulty) => (
              <SelectItem key={difficulty.value} value={difficulty.value}>
                <div>
                  <div className="font-medium">{difficulty.label}</div>
                  <div className="text-xs text-muted-foreground">{difficulty.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Industry Filter */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filter by Industry</h3>
          {hasFilters && (
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
          {industries.map((industry) => (
            <Badge
              key={industry}
              variant={selectedIndustry === industry ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleIndustryClick(industry)}
            >
              {industry}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="glass-card p-6 bg-gradient-subtle">
        <h3 className="text-lg font-semibold text-foreground mb-4">💡 Pro Tip</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Start with "Easy" difficulty ideas if you're new to entrepreneurship. 
          High confidence scores indicate strong market validation.
        </p>
      </Card>

      {/* Call to Action */}
      <Card className="glass-card p-6 text-center">
        <h3 className="font-semibold text-foreground mb-2">
          Don't see your perfect idea?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Use our discovery process to find opportunities tailored to your skills and interests.
        </p>
        <Button size="sm" className="w-full" onClick={() => navigate('/discovery')}>
          Start Discovery
        </Button>
      </Card>
    </div>
  );
};