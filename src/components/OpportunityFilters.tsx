
import { useState } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FilterState {
  search: string;
  competition: string[];
  difficulty: string[];
  marketSize: string[];
  timeToMarket: string[];
  validationStatus: string[];
  assignedTo: string[];
  source: string[];
  founderFitMin: number;
  aiConfidenceMin: number;
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface OpportunityFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableTags: string[];
  opportunityCount: number;
  filteredCount: number;
}

export const OpportunityFilters = ({
  filters,
  onFiltersChange,
  availableTags,
  opportunityCount,
  filteredCount
}: OpportunityFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      competition: [],
      difficulty: [],
      marketSize: [],
      timeToMarket: [],
      validationStatus: [],
      assignedTo: [],
      source: [],
      founderFitMin: 0,
      aiConfidenceMin: 0,
      tags: [],
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = filters.search || 
    filters.competition.length > 0 || 
    filters.difficulty.length > 0 ||
    filters.marketSize.length > 0 ||
    filters.timeToMarket.length > 0 ||
    filters.validationStatus.length > 0 ||
    filters.assignedTo.length > 0 ||
    filters.source.length > 0 ||
    filters.founderFitMin > 0 ||
    filters.aiConfidenceMin > 0 ||
    filters.tags.length > 0;

  const competitionOptions = [
    { value: 'minimal', label: 'Minimal' },
    { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
    { value: 'intense', label: 'Intense' }
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const marketSizeOptions = [
    { value: 'niche', label: 'Niche' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'massive', label: 'Massive' }
  ];

  const timeToMarketOptions = [
    { value: '1-3_months', label: '1-3 Months' },
    { value: '3-6_months', label: '3-6 Months' },
    { value: '6-12_months', label: '6-12 Months' },
    { value: '12+_months', label: '12+ Months' }
  ];

  const validationStatusOptions = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  const assignmentOptions = [
    { value: 'assigned', label: 'Assigned' },
    { value: 'unassigned', label: 'Unassigned' }
  ];

  const sourceOptions = [
    { value: 'discovery', label: 'Discovery' },
    { value: 'mvp_generated', label: 'MVP Generated' },
    { value: 'manual', label: 'Manual Entry' },
    { value: 'imported', label: 'Imported' }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <CardTitle>Filters & Search</CardTitle>
            <Badge variant="outline">
              Showing {filteredCount} of {opportunityCount}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              {isExpanded ? 'Less Filters' : 'More Filters'}
              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search opportunities..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date Created</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="founder_fit_score">Founder Fit Score</SelectItem>
              <SelectItem value="ai_confidence_score">AI Confidence</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {filters.sortOrder === 'asc' ? '↑' : '↓'}
          </Button>
        </div>
      </CardHeader>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: "{filters.search}"
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('search', '')}
                />
              </Badge>
            )}
            
            {filters.competition.map(comp => (
              <Badge key={comp} variant="secondary" className="gap-1">
                Competition: {comp}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('competition', comp)}
                />
              </Badge>
            ))}

            {filters.difficulty.map(diff => (
              <Badge key={diff} variant="secondary" className="gap-1">
                Difficulty: {diff}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('difficulty', diff)}
                />
              </Badge>
            ))}

            {filters.marketSize.map(size => (
              <Badge key={size} variant="secondary" className="gap-1">
                Market: {size}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('marketSize', size)}
                />
              </Badge>
            ))}

            {filters.timeToMarket.map(time => (
              <Badge key={time} variant="secondary" className="gap-1">
                Time: {time.replace('_', ' ')}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('timeToMarket', time)}
                />
              </Badge>
            ))}

            {filters.validationStatus.map(status => (
              <Badge key={status} variant="secondary" className="gap-1">
                Status: {status.replace('_', ' ')}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('validationStatus', status)}
                />
              </Badge>
            ))}

            {filters.assignedTo.map(assigned => (
              <Badge key={assigned} variant="secondary" className="gap-1">
                Assignment: {assigned}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('assignedTo', assigned)}
                />
              </Badge>
            ))}

            {filters.source.map(src => (
              <Badge key={src} variant="secondary" className="gap-1">
                Source: {src.replace('_', ' ')}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('source', src)}
                />
              </Badge>
            ))}

            {filters.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                Tag: {tag}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => toggleArrayFilter('tags', tag)}
                />
              </Badge>
            ))}

            {filters.founderFitMin > 0 && (
              <Badge variant="secondary" className="gap-1">
                Founder Fit: ≥{filters.founderFitMin}%
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('founderFitMin', 0)}
                />
              </Badge>
            )}

            {filters.aiConfidenceMin > 0 && (
              <Badge variant="secondary" className="gap-1">
                AI Confidence: ≥{filters.aiConfidenceMin}%
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => updateFilter('aiConfidenceMin', 0)}
                />
              </Badge>
            )}
          </div>
        </div>
      )}

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Competition Level */}
            <div className="space-y-2">
              <h4 className="font-medium">Competition Level</h4>
              <div className="flex flex-wrap gap-2">
                {competitionOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`competition-${option.value}`}
                      checked={filters.competition.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('competition', option.value)}
                    />
                    <label htmlFor={`competition-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-2">
              <h4 className="font-medium">Difficulty Level</h4>
              <div className="flex flex-wrap gap-2">
                {difficultyOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`difficulty-${option.value}`}
                      checked={filters.difficulty.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('difficulty', option.value)}
                    />
                    <label htmlFor={`difficulty-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Size */}
            <div className="space-y-2">
              <h4 className="font-medium">Market Size</h4>
              <div className="flex flex-wrap gap-2">
                {marketSizeOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`market-${option.value}`}
                      checked={filters.marketSize.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('marketSize', option.value)}
                    />
                    <label htmlFor={`market-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Time to Market */}
            <div className="space-y-2">
              <h4 className="font-medium">Time to Market</h4>
              <div className="flex flex-wrap gap-2">
                {timeToMarketOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`time-${option.value}`}
                      checked={filters.timeToMarket.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('timeToMarket', option.value)}
                    />
                    <label htmlFor={`time-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Status */}
            <div className="space-y-2">
              <h4 className="font-medium">Validation Status</h4>
              <div className="flex flex-wrap gap-2">
                {validationStatusOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`validation-${option.value}`}
                      checked={filters.validationStatus.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('validationStatus', option.value)}
                    />
                    <label htmlFor={`validation-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Status */}
            <div className="space-y-2">
              <h4 className="font-medium">Assignment Status</h4>
              <div className="flex flex-wrap gap-2">
                {assignmentOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assigned-${option.value}`}
                      checked={filters.assignedTo.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('assignedTo', option.value)}
                    />
                    <label htmlFor={`assigned-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <h4 className="font-medium">Opportunity Source</h4>
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${option.value}`}
                      checked={filters.source.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('source', option.value)}
                    />
                    <label htmlFor={`source-${option.value}`} className="text-sm">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Ranges */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Minimum Founder Fit Score: {filters.founderFitMin}%</h4>
                <Slider
                  value={[filters.founderFitMin]}
                  onValueChange={(value) => updateFilter('founderFitMin', value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Minimum AI Confidence: {filters.aiConfidenceMin}%</h4>
                <Slider
                  value={[filters.aiConfidenceMin]}
                  onValueChange={(value) => updateFilter('aiConfidenceMin', value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => toggleArrayFilter('tags', tag)}
                      />
                      <label htmlFor={`tag-${tag}`} className="text-sm">
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
