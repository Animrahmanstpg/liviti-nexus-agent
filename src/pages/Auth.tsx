import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Loader2, Building2, TrendingUp, Users, FileText, DollarSign, Shield, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import PasswordStrength from "@/components/PasswordStrength";
const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});
const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // Get the intended destination from location state
  const from = (location.state as {
    from?: {
      pathname: string;
    };
  })?.from?.pathname || "/dashboard";

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session) {
        navigate(from, {
          replace: true
        });
      }
    };
    checkSession();

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === 'SIGNED_IN') {
        navigate(from, {
          replace: true
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, from]);
  const handleLogin = async () => {
    // Validate input
    try {
      emailSchema.parse(loginData.email);
      passwordSchema.parse(loginData.password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Please confirm your email address");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (data.session) {
        toast.success("Welcome back!");
        // Navigation will be handled by onAuthStateChange
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignup = async () => {
    // Validate input
    try {
      signupSchema.parse(signupData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: signupData.name
          }
        }
      });
      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("An account with this email already exists");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          toast.error("This email is already registered. Please log in instead.");
          return;
        }
        toast.success("Account created successfully! You can now log in.");
        // Clear form
        setSignupData({
          name: "",
          email: "",
          password: "",
          confirmPassword: ""
        });
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async () => {
    try {
      emailSchema.parse(resetEmail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };
  const features = [{
    icon: Building2,
    title: "Exclusive Property Access",
    description: "Browse premium off-market and pre-release listings before they hit the market"
  }, {
    icon: Users,
    title: "Smart Lead Management",
    description: "Never lose a prospect with intelligent CRM tracking for every interaction"
  }, {
    icon: FileText,
    title: "Seamless EOI Submissions",
    description: "Submit expressions of interest in minutes with our streamlined workflow"
  }, {
    icon: DollarSign,
    title: "Commission Transparency",
    description: "Real-time visibility on your pipeline and potential earnings"
  }, {
    icon: TrendingUp,
    title: "Performance Analytics",
    description: "Track your metrics and outperform your sales targets"
  }];
  const stats = [{
    value: "40%",
    label: "More deals closed"
  }, {
    value: "2x",
    label: "Faster EOI processing"
  }, {
    value: "500+",
    label: "Active agents"
  }];
  return <div className="min-h-screen flex">
      {/* Left Side - Branding & Marketing */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-hero relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-[length:30px_30px] opacity-30" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-20 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-lg">
              <Home className="h-6 w-6 text-accent-foreground" />
            </div>
            <span className="text-2xl font-display font-bold">St Trinity</span>
          </div>

          {/* Hero Content */}
          <div className="space-y-10 max-w-xl">
            <div className="space-y-6">
              <h1 className="text-5xl font-display font-bold leading-tight">
                Your Gateway to<br />
                <span className="text-accent">Premium Property Sales</span>
              </h1>
              <p className="text-xl text-primary-foreground/80 leading-relaxed">
                Join Australia's leading channel agents and unlock exclusive property inventory, streamlined lead management, and powerful sales tools.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {stats.map((stat, index) => <div key={stat.label} className="animate-fade-in" style={{
              animationDelay: `${index * 0.1}s`
            }}>
                  <div className="text-3xl font-display font-bold text-accent">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/70">{stat.label}</div>
                </div>)}
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => <div key={feature.title} className="flex items-start gap-4 animate-fade-in group" style={{
              animationDelay: `${(index + 3) * 0.1}s`
            }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10 group-hover:bg-accent/20 transition-colors shrink-0">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-primary-foreground/70">{feature.description}</p>
                  </div>
                </div>)}
            </div>
          </div>

          {/* Trust Builder */}
          <div className="flex items-center gap-3 text-primary-foreground/60">
            <Shield className="h-5 w-5" />
            <p className="text-sm">Trusted by leading developers across Australia</p>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-subtle p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo & Hero */}
          <div className="text-center lg:hidden space-y-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
              <Home className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Welcome to Liviti
            </h1>
            <p className="text-muted-foreground">
              Your gateway to premium property sales
            </p>
          </div>

          {/* Welcome text for desktop */}
          <div className="hidden lg:block text-center space-y-2">
            <h2 className="text-3xl font-display font-bold text-foreground">
              Welcome Back
            </h2>
            <p className="text-muted-foreground">
              Sign in to access your agent portal
            </p>
          </div>

          <Card className="border-border/50 shadow-xl">
            {showForgotPassword ? <CardContent className="p-6 space-y-4">
                <button type="button" onClick={() => setShowForgotPassword(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </button>
                <div className="space-y-2 text-center">
                  <h3 className="text-xl font-semibold text-foreground">Reset your password</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                  <Input id="reset-email" type="email" placeholder="agent@liviti.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="bg-muted/50" onKeyDown={e => e.key === 'Enter' && handleForgotPassword()} />
                </div>
                <Button onClick={handleForgotPassword} className="w-full shadow-md" size="lg" disabled={isLoading}>
                  {isLoading ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </> : "Send Reset Link"}
                </Button>
              </CardContent> : <Tabs defaultValue="login" className="w-full">
              <div className="p-6 pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login" className="font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="font-medium">Become an Agent</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="login" className="mt-0">
                <CardContent className="space-y-4 pt-0">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground">Email</Label>
                    <Input id="login-email" type="email" placeholder="agent@liviti.com" value={loginData.email} onChange={e => setLoginData({
                    ...loginData,
                    email: e.target.value
                  })} className="bg-muted/50" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground">Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({
                    ...loginData,
                    password: e.target.value
                  })} className="bg-muted/50" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:text-primary/80 hover:underline transition-colors">
                      Forgot your password?
                    </button>
                  </div>
                  <Button onClick={handleLogin} className="w-full shadow-md" size="lg" disabled={isLoading}>
                    {isLoading ? <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </> : "Sign In"}
                  </Button>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <CardContent className="space-y-4 pt-0">
                  {/* Sign up benefits */}
                  <div className="bg-accent/10 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">Start closing deals today:</p>
                    <div className="flex flex-wrap gap-2">
                      {["Instant access", "No fees", "Premium listings"].map(benefit => <span key={benefit} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-accent" />
                          {benefit}
                        </span>)}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground">Full Name</Label>
                    <Input id="signup-name" placeholder="John Doe" value={signupData.name} onChange={e => setSignupData({
                    ...signupData,
                    name: e.target.value
                  })} className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground">Email</Label>
                    <Input id="signup-email" type="email" placeholder="agent@company.com" value={signupData.email} onChange={e => setSignupData({
                    ...signupData,
                    email: e.target.value
                  })} className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground">Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupData.password} onChange={e => setSignupData({
                    ...signupData,
                    password: e.target.value
                  })} className="bg-muted/50" />
                    <PasswordStrength password={signupData.password} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm" className="text-foreground">Confirm Password</Label>
                    <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupData.confirmPassword} onChange={e => setSignupData({
                    ...signupData,
                    confirmPassword: e.target.value
                  })} className="bg-muted/50" onKeyDown={e => e.key === 'Enter' && handleSignup()} />
                  </div>
                  <Button onClick={handleSignup} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-md" size="lg" disabled={isLoading}>
                    {isLoading ? <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </> : "Create Agent Account"}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    By signing up, you agree to our Terms of Service and Privacy Policy
                  </p>
                </CardContent>
              </TabsContent>
            </Tabs>}
          </Card>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">© 2025 Liviti. All rights reserved.</p>
        </div>
      </div>
    </div>;
};
export default Auth;