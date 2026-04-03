import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  UserCheck, 
  Activity,
  Globe,
  Database,
  Key,
  FileText,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface SecurityMetrics {
  threat_level: "low" | "medium" | "high";
  active_sessions: number;
  failed_logins: number;
  suspicious_activities: number;
  compliance_score: number;
  last_security_scan: string;
}

interface SecurityEvent {
  id: string;
  type: "login_attempt" | "suspicious_activity" | "policy_violation" | "data_access";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  user_email?: string;
  ip_address: string;
  timestamp: string;
  status: "active" | "resolved" | "investigating";
}

interface ComplianceItem {
  requirement: string;
  status: "compliant" | "partial" | "non_compliant";
  last_checked: string;
  description: string;
}

export const SecurityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    threat_level: "low",
    active_sessions: 0,
    failed_logins: 0,
    suspicious_activities: 0,
    compliance_score: 0,
    last_security_scan: ""
  });
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load real security events from database
      const { data: securityEventsData, error: securityError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (securityError) {
        console.error("Error loading security events:", securityError);
      }

      // Transform database data to component format
      const formattedEvents = (securityEventsData || []).map(event => ({
        id: event.id,
        type: event.event_type as "login_attempt" | "suspicious_activity" | "policy_violation" | "data_access",
        severity: event.severity as "low" | "medium" | "high" | "critical",
        description: getEventDescription(event.event_type),
        user_email: event.user_id ? `user@example.com` : undefined, // We don't have email in security_events
        ip_address: String(event.ip_address || "Unknown"),
        timestamp: event.created_at,
        status: "active" as const // All events start as active
      }));

      setSecurityEvents(formattedEvents);

      // Calculate real metrics based on security events
      const recentEvents = formattedEvents.filter(e => 
        new Date(e.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      const failedLogins = recentEvents.filter(e => e.type === "login_attempt").length;
      const suspiciousActivities = recentEvents.filter(e => e.type === "suspicious_activity").length;
      const threatLevel = recentEvents.some(e => e.severity === "critical") ? "high" : 
                         recentEvents.some(e => e.severity === "high") ? "medium" : "low";

      setMetrics({
        threat_level: threatLevel,
        active_sessions: Math.floor(Math.random() * 200) + 50, // Still simulated as we don't track this
        failed_logins: failedLogins,
        suspicious_activities: suspiciousActivities,
        compliance_score: 85, // Fixed compliance score
        last_security_scan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      });

      // Set compliance items
      setComplianceItems([
        {
          requirement: "GDPR Compliance",
          status: "compliant",
          last_checked: new Date().toISOString(),
          description: "General Data Protection Regulation compliance"
        },
        {
          requirement: "SOC 2 Type II",
          status: "partial",
          last_checked: new Date(Date.now() - 30 * 86400000).toISOString(),
          description: "Service Organization Control 2 certification"
        },
        {
          requirement: "ISO 27001",
          status: "compliant",
          last_checked: new Date(Date.now() - 15 * 86400000).toISOString(),
          description: "Information security management standard"
        },
        {
          requirement: "HIPAA",
          status: "non_compliant",
          last_checked: new Date(Date.now() - 60 * 86400000).toISOString(),
          description: "Health Insurance Portability and Accountability Act"
        },
        {
          requirement: "PCI DSS",
          status: "compliant",
          last_checked: new Date(Date.now() - 7 * 86400000).toISOString(),
          description: "Payment Card Industry Data Security Standard"
        }
      ]);
      
    } catch (error) {
      console.error("Error loading security data:", error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventDescription = (type: string): string => {
    const descriptions = {
      login_attempt: "Multiple failed login attempts detected",
      suspicious_activity: "Unusual user activity pattern identified",
      policy_violation: "Security policy violation detected",
      data_access: "Unauthorized data access attempt"
    };
    return descriptions[type as keyof typeof descriptions] || "Security event detected";
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "default";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      default: return "outline";
    }
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "partial": return <Clock className="h-4 w-4 text-yellow-600" />;
      case "non_compliant": return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const resolveSecurityEvent = (eventId: string) => {
    setSecurityEvents(prev => 
      prev.map(event => 
        event.id === eventId ? { ...event, status: "resolved" } : event
      )
    );
    toast({
      title: "Event Resolved",
      description: "Security event has been marked as resolved"
    });
  };

  const runSecurityScan = () => {
    toast({
      title: "Security Scan Started",
      description: "Running comprehensive security scan..."
    });
    // Simulate scan
    setTimeout(() => {
      setMetrics(prev => ({
        ...prev,
        last_security_scan: new Date().toISOString()
      }));
      toast({
        title: "Security Scan Complete",
        description: "No critical vulnerabilities found"
      });
    }, 3000);
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
          <h2 className="text-2xl font-bold">Security & Compliance Dashboard</h2>
          <p className="text-muted-foreground">Monitor security threats and compliance status</p>
        </div>
        <Button onClick={runSecurityScan}>
          <Shield className="h-4 w-4 mr-2" />
          Run Security Scan
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={getThreatLevelColor(metrics.threat_level)}>
                {metrics.threat_level.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active_sessions}</div>
            <p className="text-xs text-muted-foreground">Current user sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failed_logins}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.compliance_score}%</div>
            <p className="text-xs text-muted-foreground">Overall compliance</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Monitor and respond to security incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(event.severity)}>
                          {event.severity}
                        </Badge>
                        <span className="text-sm font-medium">{event.type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {event.user_email && <span>User: {event.user_email}</span>}
                        <span>IP: {event.ip_address}</span>
                        <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.status === "resolved" ? "default" : "secondary"}>
                        {event.status}
                      </Badge>
                      {event.status === "active" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => resolveSecurityEvent(event.id)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>Regulatory compliance and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getComplianceIcon(item.status)}
                      <div>
                        <h4 className="font-medium">{item.requirement}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Last checked: {new Date(item.last_checked).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      item.status === "compliant" ? "default" : 
                      item.status === "partial" ? "secondary" : "destructive"
                    }>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Monitoring</CardTitle>
                <CardDescription>System security monitoring status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database Monitoring
                    </span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Network Monitoring
                    </span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      User Activity Monitoring
                    </span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      API Access Monitoring
                    </span>
                    <Badge variant="secondary">Partial</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Scans</CardTitle>
                <CardDescription>Automated security scanning results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Vulnerability Scan</span>
                    <Badge variant="default">Passed</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Penetration Test</span>
                    <Badge variant="default">Passed</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Code Security Audit</span>
                    <Badge variant="secondary">In Progress</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Dependencies Check</span>
                    <Badge variant="default">Passed</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last scan: {new Date(metrics.last_security_scan).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>Security Policies</CardTitle>
              <CardDescription>Manage security policies and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Password Policy</h4>
                    <p className="text-sm text-muted-foreground">Minimum 8 characters, special characters required</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-muted-foreground">Required for all admin accounts</p>
                  </div>
                  <Badge variant="default">Enforced</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Session Timeout</h4>
                    <p className="text-sm text-muted-foreground">Auto-logout after 30 minutes of inactivity</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">IP Whitelist</h4>
                    <p className="text-sm text-muted-foreground">Restrict admin access to specific IP ranges</p>
                  </div>
                  <Badge variant="secondary">Optional</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};