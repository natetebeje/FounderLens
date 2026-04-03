import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CaseStudiesFiltersProps {
  selectedRevenue: string | null;
  selectedIndustry: string | null;
  sortBy: string;
}

export const CaseStudiesFilters = ({ 
  selectedRevenue, 
  selectedIndustry, 
  sortBy 
}: CaseStudiesFiltersProps) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const revenueRanges = [
    { value: 'under-10k', label: 'Under $10K' },
    { value: '10k-50k', label: '$10K - $50K' },
    { value: '50k-100k', label: '$50K - $100K' },
    { value: '100k-500k', label: '$100K - $500K' },
    { value: '500k-1m', label: '$500K - $1M' },
    { value: 'over-1m', label: 'Over $1M' },
  ];

  const industries = [
    { value: 'saas', label: 'SaaS' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'content', label: 'Content' },
    { value: 'service', label: 'Service' },
    { value: 'hardware', label: 'Hardware' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'revenue-high', label: 'Highest Revenue' },
    { value: 'fastest-revenue', label: 'Fastest to Revenue' },
  ];

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    navigate(`/case-studies?${newParams.toString()}`);
  };

  const clearAllFilters = () => {
    navigate('/case-studies');
  };

  const hasActiveFilters = selectedRevenue || selectedIndustry || sortBy !== 'newest';

  return (
    <div className="w-full max-w-4xl">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              Filter & Sort
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
        
        <CollapsibleContent className="space-y-6 p-4 border border-border rounded-lg bg-muted/20">
          {/* Revenue Range */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Revenue Range</h3>
            <div className="flex flex-wrap gap-2">
              {revenueRanges.map((range) => (
                <Badge
                  key={range.value}
                  variant={selectedRevenue === range.value ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => updateFilter('revenue', selectedRevenue === range.value ? null : range.value)}
                >
                  {range.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Industry</h3>
            <div className="flex flex-wrap gap-2">
              {industries.map((industry) => (
                <Badge
                  key={industry.value}
                  variant={selectedIndustry === industry.value ? "default" : "secondary"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => updateFilter('industry', selectedIndustry === industry.value ? null : industry.value)}
                >
                  {industry.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Sort By</h3>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={sortBy === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter('sort', option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Build Track Filter */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Special Filter</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilter('has-build-track', 'true')}
              className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
            >
              Show Only Buildable Stories
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};