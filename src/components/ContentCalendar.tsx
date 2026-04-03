import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Globe,
  Edit
} from 'lucide-react';

interface ScheduledContent {
  id: string;
  content: string;
  content_type: string;
  platform: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  updated_at: string;
  target_audience?: any;
  engagement_data?: any;
}

interface ContentCalendarProps {
  onContentSelect: (content: ScheduledContent) => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ onContentSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([]);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadScheduledContent();
  }, [currentDate, viewMode]);

  const loadScheduledContent = async () => {
    try {
      const startDate = getStartDate();
      const endDate = getEndDate();

      const { data, error } = await supabase
        .from('marketing_content')
        .select('*')
        .not('scheduled_for', 'is', null)
        .gte('scheduled_for', startDate.toISOString())
        .lte('scheduled_for', endDate.toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setScheduledContent(data || []);
    } catch (error: any) {
      console.error('Error loading scheduled content:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load scheduled content",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const start = new Date(currentDate);
    if (viewMode === 'week') {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
    } else {
      start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getEndDate = () => {
    const end = new Date(currentDate);
    if (viewMode === 'week') {
      const day = end.getDay();
      end.setDate(end.getDate() + (6 - day));
    } else {
      end.setMonth(end.getMonth() + 1, 0);
    }
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const getDatesInRange = () => {
    const dates = [];
    const start = getStartDate();
    const end = getEndDate();
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

  const getContentForDate = (date: Date) => {
    const dateStr = date.toDateString();
    return scheduledContent.filter(content => {
      const contentDate = new Date(content.scheduled_for);
      return contentDate.toDateString() === dateStr;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (viewMode === 'week') {
      const start = getStartDate();
      const end = getEndDate();
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Content Calendar
            </CardTitle>
            <CardDescription>
              Manage and schedule your marketing content
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value: 'week' | 'month') => setViewMode(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">{formatDateHeader()}</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className={`grid gap-2 ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground border-b">
              {day}
            </div>
          ))}

          {/* Calendar grid */}
          {getDatesInRange().map(date => {
            const dayContent = getContentForDate(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            
            return (
              <div 
                key={date.toISOString()}
                className={`min-h-[120px] p-2 border rounded-lg ${
                  isToday(date) 
                    ? 'bg-primary/5 border-primary' 
                    : isCurrentMonth 
                      ? 'bg-background' 
                      : 'bg-muted/30'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday(date) ? 'text-primary' : 
                  isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayContent.slice(0, 3).map(content => (
                    <div
                      key={content.id}
                      onClick={() => onContentSelect(content)}
                      className="text-xs p-1 bg-primary/10 text-primary rounded cursor-pointer hover:bg-primary/20 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {content.platform}
                        </Badge>
                        <span className="truncate">
                          {new Date(content.scheduled_for).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className="truncate mt-1">
                        {content.content.substring(0, 30)}...
                      </div>
                    </div>
                  ))}
                  
                  {dayContent.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayContent.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {scheduledContent.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled content found for this period.</p>
            <p className="text-sm">Create and schedule content to see it here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};