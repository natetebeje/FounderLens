import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle, Clock, Activity } from "lucide-react";

const Status = () => {
  const systemStatus = "Operational"; // This would come from your monitoring system

  const services = [
    {
      name: "API",
      status: "Operational",
      uptime: "99.98%",
      responseTime: "145ms"
    },
    {
      name: "Web Application",
      status: "Operational", 
      uptime: "99.99%",
      responseTime: "1.2s"
    },
    {
      name: "AI Discovery Engine",
      status: "Operational",
      uptime: "99.95%",
      responseTime: "2.8s"
    },
    {
      name: "Database",
      status: "Operational",
      uptime: "99.99%",
      responseTime: "45ms"
    },
    {
      name: "Authentication",
      status: "Operational",
      uptime: "99.97%",
      responseTime: "89ms"
    },
    {
      name: "File Storage",
      status: "Operational",
      uptime: "99.96%",
      responseTime: "156ms"
    }
  ];

  const incidents = [
    {
      title: "Scheduled Maintenance - Database Optimization",
      status: "Scheduled",
      date: "July 28, 2024",
      time: "02:00 - 04:00 UTC",
      impact: "Low",
      description: "Routine database maintenance to optimize performance. Brief interruptions expected."
    },
    {
      title: "API Rate Limiting Issues - Resolved",
      status: "Resolved",
      date: "July 20, 2024", 
      time: "14:30 - 15:45 UTC",
      impact: "Medium",
      description: "Some users experienced API rate limiting errors. Issue was resolved by adjusting throttling parameters."
    },
    {
      title: "Authentication Service Slowdown - Resolved",
      status: "Resolved",
      date: "July 18, 2024",
      time: "09:15 - 10:30 UTC", 
      impact: "Low",
      description: "Login attempts were experiencing delays. Resolved by scaling authentication servers."
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "degraded":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "outage":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "scheduled":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "degraded":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "outage":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "scheduled":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "resolved":
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "low":
        return "bg-green-500/10 text-green-500";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500";
      case "high":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            {getStatusIcon(systemStatus)}
            <h1 className="text-4xl md:text-6xl font-bold">
              System <span className="text-gradient-primary">Status</span>
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Real-time status and performance metrics for all FounderLens services.
          </p>
          <div className="mt-6">
            <Badge className={`text-lg px-4 py-2 ${getStatusColor(systemStatus)}`}>
              All Systems {systemStatus}
            </Badge>
          </div>
        </div>

        {/* Services Status */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Service Status</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground">{service.name}</CardTitle>
                    {getStatusIcon(service.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge className={getStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Uptime (30d)</span>
                      <span className="text-sm text-foreground font-medium">{service.uptime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Response Time</span>
                      <span className="text-sm text-foreground font-medium">{service.responseTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Incidents & Maintenance */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Recent Incidents & Maintenance</h2>
          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <Card key={index} className="bg-white/10 backdrop-blur-glass border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(incident.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">{incident.date} • {incident.time}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(incident.status)}>
                        {incident.status}
                      </Badge>
                      <Badge className={getImpactColor(incident.impact)}>
                        {incident.impact} Impact
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{incident.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Subscribe to Updates */}
        <div className="text-center bg-white/10 backdrop-blur-glass p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-foreground mb-4">Stay Informed</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to get notified about system updates and incidents.
          </p>
          <div className="flex flex-col md:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-foreground placeholder:text-muted-foreground"
            />
            <Button variant="hero">
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Status;