import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Lock, 
  Loader2, 
  Save, 
  Mail, 
  Phone, 
  Building2, 
  Globe, 
  Linkedin, 
  Twitter, 
  Instagram,
  Link2,
  Info,
  Camera,
  Upload,
  Trash2,
  Bell,
  BellRing
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");

  // Password form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences
  const [emailNewProperties, setEmailNewProperties] = useState(true);
  const [emailEoiUpdates, setEmailEoiUpdates] = useState(true);
  const [emailLeadAssigned, setEmailLeadAssigned] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(false);
  const [inAppNewProperties, setInAppNewProperties] = useState(true);
  const [inAppEoiUpdates, setInAppEoiUpdates] = useState(true);
  const [inAppLeadAssigned, setInAppLeadAssigned] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);


  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      
      // Load user metadata
      const metadata = user.user_metadata || {};
      setDisplayName(metadata.full_name || "");
      setPhone(metadata.phone || "");
      setCompany(metadata.company || "");
      setBio(metadata.bio || "");
      setWebsite(metadata.website || "");
      setLinkedIn(metadata.linkedin || "");
      setTwitter(metadata.twitter || "");
      setInstagram(metadata.instagram || "");
      setAvatarUrl(metadata.avatar_url || null);
      
      // Load notification preferences
      const notifications = metadata.notification_preferences || {};
      setEmailNewProperties(notifications.email_new_properties ?? true);
      setEmailEoiUpdates(notifications.email_eoi_updates ?? true);
      setEmailLeadAssigned(notifications.email_lead_assigned ?? true);
      setEmailWeeklyDigest(notifications.email_weekly_digest ?? false);
      setInAppNewProperties(notifications.in_app_new_properties ?? true);
      setInAppEoiUpdates(notifications.in_app_eoi_updates ?? true);
      setInAppLeadAssigned(notifications.in_app_lead_assigned ?? true);
      
      setIsLoading(false);
    };
    getUser();
  }, [navigate]);

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, WebP, or GIF image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting query param
      const avatarUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrlWithCache }
      });

      if (updateError) throw updateError;

      setAvatarUrl(avatarUrlWithCache);
      toast({
        title: "Avatar updated",
        description: "Your profile photo has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUploadingAvatar(true);
    try {
      // List and delete all files in user's avatar folder
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('avatars').remove(filesToDelete);
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (updateError) throw updateError;

      setAvatarUrl(null);
      toast({
        title: "Avatar removed",
        description: "Your profile photo has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: displayName,
          phone,
          company,
          bio,
          website,
          linkedin: linkedIn,
          twitter,
          instagram,
        }
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsSavingNotifications(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          notification_preferences: {
            email_new_properties: emailNewProperties,
            email_eoi_updates: emailEoiUpdates,
            email_lead_assigned: emailLeadAssigned,
            email_weekly_digest: emailWeeklyDigest,
            in_app_new_properties: inAppNewProperties,
            in_app_eoi_updates: inAppEoiUpdates,
            in_app_lead_assigned: inAppLeadAssigned,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Notification preferences saved",
        description: "Your notification settings have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Photo
            </CardTitle>
            <CardDescription>Upload a profile picture to personalize your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName || user?.email || "User"} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(displayName, user?.email || "")}
                  </AvatarFallback>
                </Avatar>
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                  {avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, at least 200x200px. Max 5MB.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email - Locked */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="bg-muted pr-20"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted-foreground/10 px-2 py-0.5 rounded">
                  Locked
                </span>
              </div>
              <Alert variant="default" className="bg-muted/50 border-muted">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Email address cannot be changed directly. Please contact support if you need to update your email.
                </AlertDescription>
              </Alert>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 0412 345 678"
                />
              </div>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company / Agency
              </Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter your company or agency name"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                A brief description about yourself and your experience
              </p>
            </div>

            <Button onClick={handleUpdateProfile} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Social & Online Presence
            </CardTitle>
            <CardDescription>Add your website and social media profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* LinkedIn */}
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={linkedIn}
                  onChange={(e) => setLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              {/* Twitter */}
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-muted-foreground" />
                  Twitter / X
                </Label>
                <Input
                  id="twitter"
                  type="url"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="https://twitter.com/username"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-2">
              <Label htmlFor="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                Instagram
              </Label>
              <Input
                id="instagram"
                type="url"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="https://instagram.com/username"
              />
            </div>

            <Button onClick={handleUpdateProfile} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Social Links
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
            <Button 
              onClick={handleChangePassword} 
              disabled={isChangingPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lock className="h-4 w-4 mr-2" />
              )}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Control how and when you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Email Notifications</h4>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-new-properties" className="text-sm font-normal">New Properties</Label>
                    <p className="text-xs text-muted-foreground">Get notified when new properties are added</p>
                  </div>
                  <Switch
                    id="email-new-properties"
                    checked={emailNewProperties}
                    onCheckedChange={setEmailNewProperties}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-eoi-updates" className="text-sm font-normal">EOI Updates</Label>
                    <p className="text-xs text-muted-foreground">Receive updates on your EOI submissions</p>
                  </div>
                  <Switch
                    id="email-eoi-updates"
                    checked={emailEoiUpdates}
                    onCheckedChange={setEmailEoiUpdates}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-lead-assigned" className="text-sm font-normal">Lead Assignments</Label>
                    <p className="text-xs text-muted-foreground">Get notified when leads are assigned to you</p>
                  </div>
                  <Switch
                    id="email-lead-assigned"
                    checked={emailLeadAssigned}
                    onCheckedChange={setEmailLeadAssigned}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-weekly-digest" className="text-sm font-normal">Weekly Digest</Label>
                    <p className="text-xs text-muted-foreground">Receive a weekly summary of your activity</p>
                  </div>
                  <Switch
                    id="email-weekly-digest"
                    checked={emailWeeklyDigest}
                    onCheckedChange={setEmailWeeklyDigest}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* In-App Notifications */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">In-App Notifications</h4>
              </div>
              <div className="space-y-3 pl-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp-new-properties" className="text-sm font-normal">New Properties</Label>
                    <p className="text-xs text-muted-foreground">Show alerts for new property listings</p>
                  </div>
                  <Switch
                    id="inapp-new-properties"
                    checked={inAppNewProperties}
                    onCheckedChange={setInAppNewProperties}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp-eoi-updates" className="text-sm font-normal">EOI Updates</Label>
                    <p className="text-xs text-muted-foreground">Show alerts for EOI status changes</p>
                  </div>
                  <Switch
                    id="inapp-eoi-updates"
                    checked={inAppEoiUpdates}
                    onCheckedChange={setInAppEoiUpdates}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="inapp-lead-assigned" className="text-sm font-normal">Lead Assignments</Label>
                    <p className="text-xs text-muted-foreground">Show alerts when leads are assigned</p>
                  </div>
                  <Switch
                    id="inapp-lead-assigned"
                    checked={inAppLeadAssigned}
                    onCheckedChange={setInAppLeadAssigned}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
              {isSavingNotifications ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Preferences
            </Button>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
};

export default ProfileSettings;
