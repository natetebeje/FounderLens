import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, FileText, MessageSquare, Download } from "lucide-react";

interface LessonContentTabsProps {
  videoUrl?: string;
  content?: string;
  resources?: Array<{
    title: string;
    url: string;
    type: 'pdf' | 'link' | 'template';
  }>;
  discussion?: {
    enabled: boolean;
    count: number;
  };
}

export const LessonContentTabs = ({ 
  videoUrl, 
  content, 
  resources = [], 
  discussion 
}: LessonContentTabsProps) => {
  return (
    <Tabs defaultValue="video" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="video" className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          Video
        </TabsTrigger>
        <TabsTrigger value="content" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Content
        </TabsTrigger>
        <TabsTrigger value="resources" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Resources
        </TabsTrigger>
        <TabsTrigger value="discussion" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Discussion {discussion?.count && `(${discussion.count})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="video" className="mt-6">
        <Card className="glass-card p-0 overflow-hidden">
          {videoUrl ? (
            <div className="aspect-video bg-muted/20 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-12 h-12 text-primary mx-auto mb-2" />
                <p className="text-muted-foreground">Video Player</p>
                <p className="text-sm text-muted-foreground">
                  {videoUrl}
                </p>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-muted/20 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No video available</p>
              </div>
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="content" className="mt-6">
        <Card className="glass-card p-8">
          {content ? (
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <div style={{ whiteSpace: 'pre-wrap' }} className="text-foreground">
                {content}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No additional content available</p>
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="resources" className="mt-6">
        <Card className="glass-card p-6">
          {resources.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Lesson Resources</h3>
              <div className="grid gap-3">
                {resources.map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{resource.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">{resource.type}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No resources available for this lesson</p>
            </div>
          )}
        </Card>
      </TabsContent>

      <TabsContent value="discussion" className="mt-6">
        <Card className="glass-card p-6">
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Lesson Discussion
            </h3>
            <p className="text-muted-foreground mb-4">
              Connect with other learners and share insights about this lesson
            </p>
            <Button>
              Join Discussion
            </Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
};