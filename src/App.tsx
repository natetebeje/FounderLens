
import * as React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ModernNavigation } from "@/components/ModernNavigation";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ModernBackground } from "@/components/ui/modern-background";
import { ProductionErrorBoundary } from "@/components/enhanced/ProductionErrorBoundary";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SecurityMonitor } from "@/components/SecurityMonitor";
import { PrivacyControls } from "@/components/PrivacyControls";
import { LoadingFallback } from "@/components/LoadingFallback";
import { BottomNavigationProvider } from "@/components/BottomNavigationProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { Suspense, lazy } from "react";

// Eager-load critical entry pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy-load all other pages for code splitting
const Stories = lazy(() => import("./pages/Stories"));
const Article = lazy(() => import("./pages/Article"));
const Ideas = lazy(() => import("./pages/Ideas"));
const CaseStudies = lazy(() => import("./pages/CaseStudies"));
const BuildLab = lazy(() => import("./pages/BuildLab"));
const BuildTrack = lazy(() => import("./pages/BuildTrack"));
const BuildLesson = lazy(() => import("./pages/BuildLesson"));
const Discovery = lazy(() => import("./pages/Discovery"));
const GuestDiscovery = lazy(() => import("./pages/GuestDiscovery"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const ValidationWorkflow = lazy(() => import("./pages/ValidationWorkflow"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Team = lazy(() => import("./pages/Team"));
const About = lazy(() => import("./pages/About"));
const Blog = lazy(() => import("./pages/Blog"));
const Careers = lazy(() => import("./pages/Careers"));
const Press = lazy(() => import("./pages/Press"));
const Contact = lazy(() => import("./pages/Contact"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Help = lazy(() => import("./pages/Help"));
const Community = lazy(() => import("./pages/Community"));
const Status = lazy(() => import("./pages/Status"));
const Security = lazy(() => import("./pages/Security"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GrowthHub = lazy(() => import("./pages/GrowthHub"));

// Create a client with production-optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors, but retry on network/5xx errors
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Prevent background refetches for subscription data
      refetchInterval: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Only retry network errors, not validation errors
        const isNetworkError = error instanceof Error && 
          (error.message.includes('fetch') || error.message.includes('network'));
        return isNetworkError && failureCount < 2;
      },
    },
  },
});

const App = () => (
  <ProductionErrorBoundary
    onError={(error, errorInfo) => {
      // Log production errors for monitoring
      console.error('Application Error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }}
    retryLimit={3}
    showDetails={import.meta.env.DEV}
  >
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="founder-lens-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
          <BrowserRouter>
          <Suspense fallback={<LoadingFallback type="page" />}>
            <AuthProvider>
            <OfflineIndicator />
            <SecurityMonitor />
            <PrivacyControls />
            <WorkspaceProvider>
              
              <ModernBackground>
                <ModernNavigation />
                <div className="pt-24">
                  <Suspense fallback={<LoadingFallback type="skeleton" />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/stories" element={<Stories />} />
                      <Route path="/a/:slug" element={<Article />} />
                      <Route path="/ideas" element={<Ideas />} />
                      <Route path="/case-studies" element={<CaseStudies />} />
                      <Route path="/build" element={<BuildLab />} />
                      <Route path="/build/:trackSlug" element={<BuildTrack />} />
                      <Route path="/build/:trackSlug/:lessonSlug" element={<BuildLesson />} />
                      <Route path="/guest-discovery" element={<GuestDiscovery />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                      <Route path="/discovery" element={<ProtectedRoute requireWorkspace><Discovery /></ProtectedRoute>} />
                      <Route path="/opportunities" element={<ProtectedRoute requireWorkspace><Opportunities /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute requireWorkspace><Dashboard /></ProtectedRoute>} />
                      <Route path="/growth-hub" element={<ProtectedRoute requireWorkspace><GrowthHub /></ProtectedRoute>} />
                      <Route path="/analytics" element={<ProtectedRoute requireWorkspace><Analytics /></ProtectedRoute>} />
                      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
                      <Route path="/subscription-success" element={<ProtectedRoute><SubscriptionSuccess /></ProtectedRoute>} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/team" element={<ProtectedRoute requireWorkspace><Team /></ProtectedRoute>} />
                      <Route path="/enterprise" element={<Enterprise />} />
                      <Route path="/validation/:opportunityId" element={<ProtectedRoute requireWorkspace><ValidationWorkflow /></ProtectedRoute>} />
                      <Route path="/about" element={<About />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/careers" element={<Careers />} />
                      <Route path="/press" element={<Press />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/documentation" element={<Documentation />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/community" element={<Community />} />
                      <Route path="/status" element={<Status />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/privacy" element={<Privacy />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/cookies" element={<Cookies />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </ModernBackground>
            </WorkspaceProvider>
            {/* Mobile Bottom Navigation */}
            <BottomNavigationProvider />
            </AuthProvider>
          </Suspense>
          </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  </ProductionErrorBoundary>
);

export default App;
