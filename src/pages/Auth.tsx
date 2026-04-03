
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, ArrowLeft, Sparkles, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackGuestEvent } from "@/utils/guestAnalytics";
import { productionLogger } from "@/utils/productionLogger";
import { ModernBackground } from "@/components/ui/modern-background";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [searchParams] = useSearchParams();
  const [contextualIdea, setContextualIdea] = useState<string>('');
  const [isGuestUpgrade, setIsGuestUpgrade] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper function to check if guest has opportunities to transfer
  const hasGuestOpportunities = () => {
    try {
      const opportunities = localStorage.getItem('guestOpportunities');
      const hasOpps = !!(opportunities && JSON.parse(opportunities).length > 0);
      productionLogger.debug('Checking guest opportunities', 'auth', { hasOpportunities: hasOpps });
      return hasOpps;
    } catch (error) {
      productionLogger.error('Error checking guest opportunities', error instanceof Error ? error : new Error(String(error)), 'auth');
      return false;
    }
  };

  useEffect(() => {
    const checkAuthAndIntent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if we're in password reset mode
      const isReset = searchParams.get('reset') === 'true';
      
      if (session && isReset) {
        // User clicked reset link and has a temporary session
        setIsResettingPassword(true);
        return;
      }
      
      if (session && !isReset) {
        // Normal authenticated session
        const pendingPlan = localStorage.getItem('pendingPlan');
        const planFromUrl = searchParams.get('plan');
        
        if (pendingPlan || planFromUrl) {
          // Clear the pending plan and redirect to checkout
          localStorage.removeItem('pendingPlan');
          navigate(`/?checkout=${pendingPlan || planFromUrl}`);
          return;
        }
        
        navigate("/discovery");
        return;
      }
      
      // Check for contextual idea from URL params
      const ideaFromUrl = searchParams.get('idea');
      if (ideaFromUrl) {
        setContextualIdea(ideaFromUrl);
      }
      
      // Check if this is a guest upgrade flow
      const upgradeParam = searchParams.get('upgrade');
      const opportunitiesParam = searchParams.get('opportunities');
      if (upgradeParam === 'guest') {
        setIsGuestUpgrade(true);
        // Show that we have opportunities to save
        if (opportunitiesParam === '3') {
          toast({
            title: "💡 Save Your 3 Opportunities + Get 6 More",
            description: "Create your account to save your opportunities and unlock 6 additional personalized opportunities",
          });
        }
      }
    };
    
    checkAuthAndIntent();

    return () => {};
  }, [navigate, searchParams, contextualIdea]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGuestSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "default",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          // User exists, try to sign them in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          if (signInError) {
            toast({
              title: "Account exists",
              description: "An account with this email already exists. Please use the correct password to sign in.",
              variant: "default",
            });
            return;
          }
          
          toast({
            title: "Signed in successfully!",
            description: "Your opportunities have been saved to your account.",
          });
        } else {
          toast({
            title: "Unable to create account",
            description: error.message,
            variant: "default",
          });
          return;
        }
      } else {
        toast({
          title: "Account created successfully!",
          description: "Your opportunities have been saved to your account.",
        });
      }

      trackGuestEvent('guest_account_created', {
        email: formData.email,
        opportunities_count: localStorage.getItem('guestOpportunities') ? JSON.parse(localStorage.getItem('guestOpportunities')!).length : 0
      });

      // Redirect to opportunities page where transfer will happen
      window.location.href = '/opportunities';
      
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: "Please check your connection and try again.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple concurrent submissions
    if (isAuthenticating) return;
    
    setIsLoading(true);
    setIsAuthenticating(true);
    
    productionLogger.info(isSignUp ? 'Starting sign up process' : 'Starting sign in process', 'auth', {
      email: formData.email,
      hasGuestOpportunities: hasGuestOpportunities()
    });

    // Basic validation
    if (isSignUp && formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "default",
      });
      setIsLoading(false);
      setIsAuthenticating(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Account exists",
              description: "An account with this email already exists. Please sign in instead.",
              variant: "default",
            });
          } else {
            toast({
              title: "Unable to create account",
              description: error.message,
              variant: "default",
            });
          }
          return;
        }

        toast({
          title: "Account created successfully!",
          description: "Welcome to FounderLens. Let's discover opportunities.",
        });
        window.location.href = '/discovery';
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          let friendlyMessage = "Please check your email and password";
          
          if (error.message.includes("Invalid login credentials")) {
            friendlyMessage = "Email or password doesn't match our records. Try the forgot password option if needed.";
          } else if (error.message.includes("Email not confirmed")) {
            friendlyMessage = "Please check your email and click the confirmation link before signing in.";
          } else if (error.message.includes("Too many requests")) {
            friendlyMessage = "Too many sign-in attempts. Please wait a moment and try again.";
          }
          
          toast({
            title: "Unable to sign in",
            description: friendlyMessage,
            variant: "default",
          });
          return;
        }

        toast({
          title: "Welcome back!",
          description: "You've been signed in successfully.",
        });

        // Redirect to discovery for normal sign-in
        window.location.href = '/discovery';
      }
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: "Please check your connection and try again.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
      setIsAuthenticating(false);
      productionLogger.info('Auth process completed', 'auth');
    }
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        toast({
          title: "Unable to send reset email",
          description: "Please check the email address and try again",
          variant: "default",
        });
        return;
      }

      setResetEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setIsForgotPassword(false);
    setResetEmailSent(false);
    setResetEmail("");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "default",
      });
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "default",
      });
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Unable to update password",
          description: "The reset link may have expired. Please try requesting a new one.",
          variant: "default",
        });
        return;
      }

      toast({
        title: "Password updated successfully",
        description: "You can now sign in with your new password.",
      });

      // Clear URL parameters and redirect to home
      navigate("/");
      
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: "Please try again or request a new reset link.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If we're in password reset completion mode, show that view
  if (isResettingPassword) {
    return (
      <ModernBackground variant="mesh" className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <img 
                  src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
                  alt="FounderLens" 
                  className="w-10 h-10 rounded-lg"
                />
                <span className="text-2xl font-bold">FounderLens</span>
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl">Set your new password</CardTitle>
                <CardDescription>
                  Choose a secure password for your account
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Updating password..." : "Update password"}
                </Button>

                <Button 
                  type="button"
                  onClick={() => {
                    setIsResettingPassword(false);
                    navigate("/auth");
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ModernBackground>
    );
  }

  // If we're in forgot password mode, show that view
  if (isForgotPassword) {
    return (
      <ModernBackground variant="mesh" className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <img 
                  src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
                  alt="FounderLens" 
                  className="w-10 h-10 rounded-lg"
                />
                <span className="text-2xl font-bold">FounderLens</span>
              </div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl">
                  {resetEmailSent ? "Check your email" : "Reset your password"}
                </CardTitle>
                <CardDescription>
                  {resetEmailSent 
                    ? "We've sent you a password reset link."
                    : "Enter your email address and we'll send you a reset link."
                  }
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {resetEmailSent ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    If an account with that email exists, you'll receive a password reset link shortly.
                  </p>
                  <Button 
                    onClick={resetForgotPasswordState}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send reset link"}
                  </Button>

                  <Button 
                    type="button"
                    onClick={resetForgotPasswordState}
                    variant="ghost"
                    className="w-full"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </ModernBackground>
    );
  }

  return (
    <ModernBackground variant="mesh" className="flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-card backdrop-blur-glass border-border/50">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <img 
                src="/lovable-uploads/c10149ce-689c-4417-8b3b-777476f9a804.png" 
                alt="FounderLens" 
                className="w-10 h-10 rounded-lg"
              />
              <span className="text-2xl font-bold">FounderLens</span>
            </div>
            
            {/* Show contextual idea if present */}
            {contextualIdea && (
              <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Your idea:</span>
                </div>
                <p className="text-sm text-muted-foreground">"{contextualIdea}"</p>
              </div>
            )}
            
            <div className="space-y-2">
              <CardTitle className="text-2xl">
                {isSignUp ? "Create your account" : "Welcome back"}
              </CardTitle>
                <CardDescription>
                  {isGuestUpgrade
                    ? "Save your generated opportunities and unlock 6 additional personalized opportunities"
                    : isSignUp 
                      ? contextualIdea 
                        ? "Sign up to explore this opportunity with AI"
                        : "Start discovering personalized business opportunities"
                      : contextualIdea
                        ? "Sign in to explore this opportunity with AI"
                        : "Sign in to continue your entrepreneurial journey"
                  }
                </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs value={isGuestUpgrade ? "email-only" : (isSignUp ? "signup" : "signin")} className="w-full">
              <TabsList className={`grid w-full ${isGuestUpgrade ? 'grid-cols-2' : 'grid-cols-2'}`}>
                {isGuestUpgrade && (
                  <TabsTrigger value="email-only" className="text-primary">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Quick Start
                  </TabsTrigger>
                )}
                <TabsTrigger 
                  value="signin" 
                  onClick={() => setIsSignUp(false)}
                >
                  Sign In
                </TabsTrigger>
                {!isGuestUpgrade && (
                  <TabsTrigger 
                    value="signup" 
                    onClick={() => setIsSignUp(true)}
                  >
                    Sign Up
                  </TabsTrigger>
                )}
              </TabsList>

              {isGuestUpgrade && (
                <TabsContent value="email-only" className="space-y-4 mt-6">
                  <div className="text-center space-y-2 mb-6">
                    <h3 className="text-lg font-semibold text-primary">Save Your 3 Opportunities + Get 6 More</h3>
                    <p className="text-sm text-muted-foreground">
                      Create your account to save your opportunities and unlock 6 additional personalized opportunities
                    </p>
                  </div>
                  
                  <form onSubmit={handleGuestSignUp} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="guest-firstName">First Name</Label>
                        <Input
                          id="guest-firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guest-lastName">Last Name</Label>
                        <Input
                          id="guest-lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guest-email">Email</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guest-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="guest-password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          placeholder="Create a password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guest-confirmPassword">Confirm Password</Label>
                      <Input
                        id="guest-confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating Account..." : "Sign Up & Save Opportunities"}
                      <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      Your opportunities will be saved immediately after account creation
                    </p>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="signin" className="space-y-4 mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isAuthenticating}
                  >
                    {isLoading ? "Signing in..." : contextualIdea ? "Sign In & Explore" : "Sign In"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-muted-foreground hover:text-primary"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </TabsContent>

              {!isGuestUpgrade && (
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          placeholder="Create a password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        placeholder="Confirm your password"
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating account..." : contextualIdea ? "Sign Up & Explore" : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>


          </CardContent>
        </Card>
      </div>
    </ModernBackground>
  );
};

export default Auth;
