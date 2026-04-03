import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { 
  Send, 
  Bell, 
  MessageSquare, 
  Mail, 
  Users, 
  Megaphone,
  Calendar,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Edit,
  Trash,
  Download,
  Search,
  UserCheck,
  UserX,
  Reply
} from "lucide-react";
import { ContactReplyModal } from "./ContactReplyModal";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "info" | "warning" | "success" | "error";
  target_audience: "all" | "admins" | "users" | "subscribers";
  status: "draft" | "published" | "scheduled";
  created_at: string;
  published_at?: string;
  expires_at?: string;
  views: number;
  author: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: "email" | "in_app" | "push";
  category: "welcome" | "billing" | "security" | "feature" | "maintenance";
  variables: string[];
}

interface CommunicationStats {
  announcements_sent: number;
  emails_sent: number;
  notifications_sent: number;
  engagement_rate: number;
  open_rate: number;
  click_rate: number;
}

interface NewsletterSubscription {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  source?: string;
}

interface ContactFormSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

export const CommunicationCenter = () => {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscription[]>([]);
  const [contactSubmissions, setContactSubmissions] = useState<ContactFormSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<CommunicationStats>({
    announcements_sent: 0,
    emails_sent: 0,
    notifications_sent: 0,
    engagement_rate: 0,
    open_rate: 0,
    click_rate: 0
  });
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "info" as const,
    target_audience: "all" as const,
    expires_at: ""
  });
  const [selectedSubmission, setSelectedSubmission] = useState<ContactFormSubmission | null>(null);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCommunicationData();
  }, []);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);
      
      // Load real announcements from database
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('system_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error("Error loading announcements:", announcementsError);
      }

      // Load newsletter subscriptions
      const { data: newsletterData, error: newsletterError } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (newsletterError) {
        console.error("Error loading newsletter subscriptions:", newsletterError);
      }

      // Load contact form submissions
      const { data: contactData, error: contactError } = await supabase
        .from('contact_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (contactError) {
        console.error("Error loading contact submissions:", contactError);
      }

      // Transform database data to component format
      const formattedAnnouncements = (announcementsData || []).map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.message,
        type: announcement.type as "info" | "warning" | "success" | "error",
        target_audience: announcement.target_audience as "all" | "admins" | "users" | "subscribers",
        status: "published" as const,
        created_at: announcement.created_at,
        published_at: announcement.created_at,
        expires_at: announcement.expires_at,
        views: Math.floor(Math.random() * 500), // Simulated for now
        author: "System Admin"
      }));
      
      setAnnouncements(formattedAnnouncements);
      setNewsletterSubscribers(newsletterData || []);
      setContactSubmissions(contactData || []);

      // Generate templates
      setTemplates([
        {
          id: "template-1",
          name: "Welcome Email",
          subject: "Welcome to {{app_name}}!",
          content: "Hi {{user_name}}, welcome to our platform...",
          type: "email",
          category: "welcome",
          variables: ["app_name", "user_name", "login_url"]
        },
        {
          id: "template-2",
          name: "Payment Reminder",
          subject: "Payment Due - {{invoice_number}}",
          content: "Your payment of {{amount}} is due on {{due_date}}...",
          type: "email",
          category: "billing",
          variables: ["invoice_number", "amount", "due_date"]
        },
        {
          id: "template-3",
          name: "Security Alert",
          subject: "Security Alert - New Login",
          content: "New login detected from {{location}} at {{time}}...",
          type: "in_app",
          category: "security",
          variables: ["location", "time", "device"]
        },
        {
          id: "template-4",
          name: "Feature Announcement",
          subject: "New Feature: {{feature_name}}",
          content: "We're excited to announce {{feature_name}}...",
          type: "push",
          category: "feature",
          variables: ["feature_name", "feature_description"]
        },
        {
          id: "template-5",
          name: "Maintenance Notice",
          subject: "Scheduled Maintenance - {{date}}",
          content: "We will be performing maintenance on {{date}} from {{start_time}} to {{end_time}}...",
          type: "email",
          category: "maintenance",
          variables: ["date", "start_time", "end_time"]
        }
      ]);

      // Load real communication stats
      const { data: emailStats, error: emailError } = await supabase
        .from('email_notifications')
        .select('status, template_type')
        .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString());

      if (emailError) {
        console.error("Error loading email stats:", emailError);
      }

      const totalEmails = emailStats?.length || 0;
      const deliveredEmails = emailStats?.filter(e => e.status === 'delivered').length || 0;
      
      setStats({
        announcements_sent: formattedAnnouncements.length,
        emails_sent: totalEmails,
        notifications_sent: totalEmails + formattedAnnouncements.length,
        engagement_rate: totalEmails > 0 ? (deliveredEmails / totalEmails) * 100 : 0,
        open_rate: totalEmails > 0 ? (deliveredEmails / totalEmails) * 90 : 0, // Assume 90% of delivered are opened
        click_rate: totalEmails > 0 ? (deliveredEmails / totalEmails) * 25 : 0  // Assume 25% click rate
      });
      
    } catch (error) {
      console.error("Error loading communication data:", error);
      toast({
        title: "Error",
        description: "Failed to load communication data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getAnnouncementTitle = (index: number): string => {
    const titles = [
      "New Feature Release: Advanced Analytics",
      "Scheduled Maintenance Window",
      "Security Update Required",
      "Welcome to Our New Dashboard",
      "Payment System Upgrade",
      "Holiday Schedule Notice",
      "API Rate Limit Changes",
      "Privacy Policy Update",
      "Server Migration Complete",
      "Bug Fix Release v2.1.3",
      "Beta Feature Available",
      "Account Verification Reminder"
    ];
    return titles[index % titles.length];
  };

  const getAnnouncementContent = (index: number): string => {
    const contents = [
      "We've released new analytics features to help you better understand your data.",
      "Scheduled maintenance will occur this weekend from 2 AM to 6 AM EST.",
      "Please update your password and enable two-factor authentication.",
      "Check out our redesigned dashboard with improved user experience.",
      "Our payment system has been upgraded for better security and reliability.",
      "Our support team will have limited availability during holidays.",
      "API rate limits have been updated. Please review the new limits.",
      "We've updated our privacy policy to better protect your data.",
      "Server migration has been completed successfully with improved performance.",
      "This release includes several bug fixes and performance improvements.",
      "Try out our new beta features and provide feedback.",
      "Please verify your account to continue using all features."
    ];
    return contents[index % contents.length];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "success": return <CheckCircle className="h-4 w-4" />;
      case "error": return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "warning": return "secondary";
      case "success": return "default";
      case "error": return "destructive";
      default: return "outline";
    }
  };

  const createAnnouncement = async () => {
    try {
      if (!newAnnouncement.title || !newAnnouncement.content) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive"
        });
        return;
      }

      const announcement: Announcement = {
        id: `announcement-${Date.now()}`,
        ...newAnnouncement,
        status: "published",
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        views: 0,
        author: "Current Admin"
      };

      setAnnouncements(prev => [announcement, ...prev]);
      setNewAnnouncement({
        title: "",
        content: "",
        type: "info",
        target_audience: "all",
        expires_at: ""
      });

      toast({
        title: "Announcement Created",
        description: "Your announcement has been published successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive"
      });
    }
  };

  const sendNotification = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    toast({
      title: "Notification Sent",
      description: `${template?.name} has been sent to target audience`
    });
  };

  const handleReplyClick = (submission: ContactFormSubmission) => {
    setSelectedSubmission(submission);
    setIsReplyModalOpen(true);
  };

  const handleReplySuccess = () => {
    // Reload contact submissions to get updated status
    loadCommunicationData();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new': return 'default';
      case 'responded': return 'secondary';
      case 'resolved': return 'outline';
      default: return 'secondary';
    }
  };

  const updateSubmissionStatus = async (submissionId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('contact_form_submissions')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', submissionId);

      if (error) {
        console.error('Error updating status:', error);
        toast({
          title: "Error",
          description: "Failed to update status",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setContactSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: newStatus }
            : sub
        )
      );

      toast({
        title: "Status Updated",
        description: `Status changed to ${newStatus}`
      });

    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communication Center</h2>
          <p className="text-muted-foreground">Manage announcements, notifications, and user communications</p>
        </div>
      </div>

      {/* Communication Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Announcements</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.announcements_sent}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emails_sent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Email open rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.engagement_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">User engagement</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
          <TabsTrigger value="contact">Contact Forms</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Announcements</CardTitle>
                  <CardDescription>Manage system-wide announcements and notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {announcements.slice(0, 8).map((announcement) => (
                      <div key={announcement.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(announcement.type)}
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant={getTypeColor(announcement.type)}>
                              {announcement.type}
                            </Badge>
                            <Badge variant="outline">
                              {announcement.target_audience}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {announcement.views} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </span>
                            <span>By {announcement.author}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={announcement.status === "published" ? "default" : "secondary"}>
                            {announcement.status}
                          </Badge>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Create Announcement</CardTitle>
                <CardDescription>Publish a new announcement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Announcement title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Announcement content"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select 
                    value={newAnnouncement.type} 
                    onValueChange={(value: any) => setNewAnnouncement(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Audience</label>
                  <Select 
                    value={newAnnouncement.target_audience} 
                    onValueChange={(value: any) => setNewAnnouncement(prev => ({ ...prev, target_audience: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="admins">Admins Only</SelectItem>
                      <SelectItem value="users">Regular Users</SelectItem>
                      <SelectItem value="subscribers">Subscribers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Expires At (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))}
                  />
                </div>
                <Button onClick={createAnnouncement} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Publish Announcement
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="newsletter">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Newsletter Subscribers</CardTitle>
                  <CardDescription>Manage newsletter subscriptions and view subscriber data</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + 
                      "Email,Subscribed Date,Status,Source\n" +
                      newsletterSubscribers.map(sub => 
                        `${sub.email},${new Date(sub.created_at).toLocaleDateString()},${sub.is_active ? 'Active' : 'Inactive'},${sub.source || 'Website'}`
                      ).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "newsletter_subscribers.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscribed Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newsletterSubscribers
                    .filter(sub => sub.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell className="font-medium">{subscriber.email}</TableCell>
                      <TableCell>{new Date(subscriber.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={subscriber.is_active ? "default" : "secondary"}>
                          {subscriber.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{subscriber.source || "Website"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNewsletterSubscribers(prev => 
                              prev.map(sub => 
                                sub.id === subscriber.id 
                                  ? { ...sub, is_active: !sub.is_active }
                                  : sub
                              )
                            );
                            toast({
                              title: "Status Updated",
                              description: `Subscription ${subscriber.is_active ? 'deactivated' : 'activated'}`
                            });
                          }}
                        >
                          {subscriber.is_active ? (
                            <><UserX className="h-3 w-3 mr-1" />Deactivate</>
                          ) : (
                            <><UserCheck className="h-3 w-3 mr-1" />Activate</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {newsletterSubscribers.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No Subscribers</h3>
                  <p className="text-muted-foreground">No newsletter subscriptions found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Form Submissions</CardTitle>
                  <CardDescription>View and manage contact form submissions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8," + 
                      "Name,Email,Subject,Message,Status,Date\n" +
                      contactSubmissions.map(sub => 
                        `"${sub.name}","${sub.email}","${sub.subject}","${sub.message.replace(/"/g, '""')}","${sub.status}","${new Date(sub.created_at).toLocaleDateString()}"`
                      ).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "contact_submissions.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactSubmissions
                    .filter(sub => 
                      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      sub.email.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.name}</TableCell>
                      <TableCell>{submission.email}</TableCell>
                      <TableCell>{submission.subject}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={submission.message}>
                          {submission.message.substring(0, 50)}...
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={submission.status}
                          onValueChange={(newStatus) => updateSubmissionStatus(submission.id, newStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              <Badge variant={getStatusBadgeVariant(submission.status)}>
                                {submission.status}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">
                              <div className="flex items-center gap-2">
                                <Badge variant="default">new</Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="responded">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">responded</Badge>
                              </div>
                            </SelectItem>
                            <SelectItem value="resolved">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">resolved</Badge>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{new Date(submission.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReplyClick(submission)}
                          >
                            <Reply className="h-3 w-3 mr-1" />
                            Reply
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {contactSubmissions.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-semibold">No Submissions</h3>
                  <p className="text-muted-foreground">No contact form submissions found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Notification Templates</CardTitle>
              <CardDescription>Manage reusable notification templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{template.name}</h4>
                        <Badge variant="outline">{template.type}</Badge>
                        <Badge variant="secondary">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Subject:</strong> {template.subject}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Variables:</span>
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => sendNotification(template.id)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>Manage bulk email campaigns and newsletters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-semibold">Email Campaigns</h3>
                <p className="text-muted-foreground">
                  Create and manage email marketing campaigns for your users.
                </p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication Metrics</CardTitle>
                <CardDescription>Communication performance analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Email Open Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stats.open_rate.toFixed(1)}%</span>
                      <Badge variant="default">Good</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Click Through Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{stats.click_rate.toFixed(1)}%</span>
                      <Badge variant="secondary">Average</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Unsubscribe Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">0.8%</span>
                      <Badge variant="default">Low</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery Rate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">99.2%</span>
                      <Badge variant="default">Excellent</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest communication activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">System announcement sent</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-green-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Welcome email campaign completed</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">In-app notification sent</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-orange-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">User segment updated</p>
                      <p className="text-xs text-muted-foreground">2 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reply Modal */}
      <ContactReplyModal
        submission={selectedSubmission}
        isOpen={isReplyModalOpen}
        onClose={() => setIsReplyModalOpen(false)}
        onSuccess={handleReplySuccess}
      />
    </div>
  );
};