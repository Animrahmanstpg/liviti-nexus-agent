import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import PasswordStrength from "@/components/PasswordStrength";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if there's a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // User should have a session from the recovery link
      setIsValidSession(!!session);
    };

    // Listen for auth state changes (recovery link will trigger this)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
      }
    });

    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async () => {
    // Validate passwords
    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 2000);
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid or expired session
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Invalid or Expired Link
              </h2>
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full" size="lg">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardContent className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Password Updated!
              </h2>
              <p className="text-muted-foreground">
                Your password has been successfully updated. Redirecting you to the dashboard...
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
            <Home className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Set New Password
          </h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50"
              />
              <PasswordStrength password={password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-muted/50"
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
            </div>
            <Button 
              onClick={handleResetPassword} 
              className="w-full shadow-md" 
              size="lg" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          © 2024 Liviti. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
