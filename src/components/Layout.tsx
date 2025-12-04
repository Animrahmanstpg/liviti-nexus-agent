import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Building2, LayoutDashboard, Users, LogOut, Shield, Heart, FileText, 
  Menu, ChartBar, ChevronDown, Home, Settings, FolderKanban, LucideIcon 
} from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import stTrinityLogo from "@/assets/st-trinity-logo.webp";

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  path: string;
  icon: string;
  enabled: boolean;
  requiresAuth: boolean;
}

interface SiteLogo {
  url: string;
  alt: string;
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  Users,
  Heart,
  FileText,
  Home,
  Settings,
  Shield,
  ChartBar,
  FolderKanban,
};

const getIcon = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Home;
};

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Fetch site settings
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      
      const settings: { headerNav: NavItem[]; footerNav: NavItem[]; siteLogo: SiteLogo } = {
        headerNav: [],
        footerNav: [],
        siteLogo: { url: "", alt: "ST Trinity" },
      };
      
      data?.forEach(setting => {
        if (setting.key === "header_nav") {
          settings.headerNav = setting.value as unknown as NavItem[];
        } else if (setting.key === "footer_nav") {
          settings.footerNav = setting.value as unknown as NavItem[];
        } else if (setting.key === "site_logo") {
          settings.siteLogo = setting.value as unknown as SiteLogo;
        }
      });
      
      return settings;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter nav items based on auth and enabled status
  const headerNavItems = (siteSettings?.headerNav || []).filter(item => {
    if (!item.enabled) return false;
    if (item.requiresAuth && !user) return false;
    return true;
  });

  const footerNavItems = (siteSettings?.footerNav || []).filter(item => {
    if (!item.enabled) return false;
    if (item.requiresAuth && !user) return false;
    return true;
  });

  const logoUrl = siteSettings?.siteLogo?.url || stTrinityLogo;
  const logoAlt = siteSettings?.siteLogo?.alt || "ST Trinity";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled 
            ? "bg-background/95 backdrop-blur-md shadow-md border-b border-border/50" 
            : "bg-background/50 backdrop-blur-sm"
        )}
      >
        <div className="container flex h-16 items-center justify-between">
          <Link to="/dashboard" className="flex items-center group">
            <img 
              src={logoUrl} 
              alt={logoAlt} 
              className="h-8 transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-muted/50 rounded-full p-1">
            {headerNavItems.map((item) => {
              const Icon = getIcon(item.icon);
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    location.pathname === "/admin" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
                <Link
                  to="/analytics"
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    location.pathname === "/analytics" 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ChartBar className="h-4 w-4" />
                  Analytics
                </Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user && <NotificationBell />}
            
            {/* User Profile Dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 pl-2 pr-3 hover:bg-muted">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-sm font-medium">{userName}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{userName}</span>
                      <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/favorites")} className="gap-2 cursor-pointer">
                    <Heart className="h-4 w-4" />
                    My Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-submissions")} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    My Submissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
            
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center">
                    <img 
                      src={logoUrl} 
                      alt={logoAlt} 
                      className="h-7"
                    />
                  </SheetTitle>
                </SheetHeader>
                
                {user && (
                  <div className="flex items-center gap-3 mt-6 p-3 rounded-xl bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                )}
                
                <nav className="mt-6 space-y-1">
                  {headerNavItems.map((item) => {
                    const Icon = getIcon(item.icon);
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  {isAdmin && (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          location.pathname === "/admin" 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <Shield className="h-5 w-5" />
                        Admin
                      </Link>
                      <Link
                        to="/analytics"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          location.pathname === "/analytics" 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        <ChartBar className="h-5 w-5" />
                        Analytics
                      </Link>
                    </>
                  )}
                </nav>
                
                <div className="absolute bottom-6 left-6 right-6">
                  {user ? (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => {
                        navigate("/auth");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo & Copyright */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <Link to="/dashboard">
                <img 
                  src={logoUrl} 
                  alt={logoAlt} 
                  className="h-6 opacity-80 hover:opacity-100 transition-opacity"
                />
              </Link>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} ST Trinity. All rights reserved.
              </p>
            </div>

            {/* Footer Navigation */}
            {footerNavItems.length > 0 && (
              <nav className="flex flex-wrap items-center justify-center gap-6">
                {footerNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Social / Contact */}
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Channel Agent Portal
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;