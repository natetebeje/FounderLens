import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { DeleteAccountModal } from "@/components/DeleteAccountModal";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ThemeSettings } from "@/components/ui/theme-settings";
import { ModernContainer, GlassCard, ModernBackground } from "@/components/ui/modern-background";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  email_verified?: boolean;
  notification_preferences?: {
    email: boolean;
    push: boolean;
    in_app: boolean;
  };
  privacy_settings?: {
    profile_visible: boolean;
    data_sharing: boolean;
  };
  app_preferences?: {
    theme: string;
    language: string;
  };
}

const Settings = () => {
  const { user, loading: authLoading, deleteAccount, signOut, changePassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profileLoadAttempts, setProfileLoadAttempts] = useState(0);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      loadProfileData();
    }
  }, [user, authLoading, navigate]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      setProfileLoadAttempts(prev => prev + 1);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        // If no profile exists after multiple attempts, the user's account might have been deleted
        if (profileLoadAttempts >= 2) {
          console.log('No profile found after multiple attempts, signing out user');
          toast({
            title: "Account Error",
            description: "Your account data appears to be missing. Please sign in again.",
            variant: "destructive",
          });
          await signOut();
          navigate("/auth");
          return;
        }
        
        // Try to create a basic profile
        const { error: createError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            first_name: user.user_metadata?.first_name || "",
            last_name: user.user_metadata?.last_name || "",
            full_name: user.user_metadata?.full_name || "",
            is_admin: false,
            email_verified: !!user.email_confirmed_at,
            onboarding_completed: false
          });

        if (createError) {
          console.error('Error creating profile:', createError);
          toast({
            title: "Profile Error",
            description: "Unable to create profile. Please try again later.",
            variant: "destructive",
          });
          return;
        }

        // Reload after creating profile
        setTimeout(() => loadProfileData(), 1000);
        return;
      }
      
      setProfile({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        email_verified: data.email_verified || false,
        notification_preferences: (data.notification_preferences as any) || {
          email: true,
          push: true,
          in_app: true,
        },
        privacy_settings: (data.privacy_settings as any) || {
          profile_visible: true,
          data_sharing: false,
        },
        app_preferences: (data.app_preferences as any) || {
          theme: "system",
          language: "en",
        },
      });
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
      
      setProfile({ ...profile, ...updates });
      toast({
        title: "Settings updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p>Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <ModernBackground variant="mesh">
      <ModernContainer className="max-w-4xl">
      <GlassCard className="p-6 mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and settings.</p>
      </GlassCard>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and bio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name || ""}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name || ""}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows={3}
                />
              </div>
              <Button
                onClick={() => updateProfile({
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  full_name: profile.full_name,
                  bio: profile.bio,
                })}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account security and email preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email || ""} disabled />
                <p className="text-sm text-muted-foreground">
                  Contact support to change your email address.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Verified</Label>
                  <p className="text-sm text-muted-foreground">
                    Your email verification status.
                  </p>
                </div>
                <div className="text-sm">
                  {profile.email_verified ? (
                    <span className="text-green-600">Verified</span>
                  ) : (
                    <span className="text-yellow-600">Not Verified</span>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowChangePasswordModal(true)}
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="flex justify-center">
            <ThemeSettings />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about updates and activities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email.
                  </p>
                </div>
                <Switch
                  checked={profile.notification_preferences?.email}
                  onCheckedChange={(checked) => 
                    updateProfile({
                      notification_preferences: {
                        ...profile.notification_preferences!,
                        email: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device.
                  </p>
                </div>
                <Switch
                  checked={profile.notification_preferences?.push}
                  onCheckedChange={(checked) => 
                    updateProfile({
                      notification_preferences: {
                        ...profile.notification_preferences!,
                        push: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications within the application.
                  </p>
                </div>
                <Switch
                  checked={profile.notification_preferences?.in_app}
                  onCheckedChange={(checked) => 
                    updateProfile({
                      notification_preferences: {
                        ...profile.notification_preferences!,
                        in_app: checked,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control how your data is used and who can see your profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other users.
                  </p>
                </div>
                <Switch
                  checked={profile.privacy_settings?.profile_visible}
                  onCheckedChange={(checked) => 
                    updateProfile({
                      privacy_settings: {
                        ...profile.privacy_settings!,
                        profile_visible: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anonymized data to be used for product improvements.
                  </p>
                </div>
                <Switch
                  checked={profile.privacy_settings?.data_sharing}
                  onCheckedChange={(checked) => 
                    updateProfile({
                      privacy_settings: {
                        ...profile.privacy_settings!,
                        data_sharing: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium">Data Management</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Export Data
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={deleting}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onConfirm={handleChangePassword}
        loading={changingPassword}
      />
      </ModernContainer>
    </ModernBackground>
  );
};

export default Settings;
