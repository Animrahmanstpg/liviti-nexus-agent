import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Heart, FileText, Menu } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NotificationBell from "@/components/NotificationBell";
import Sidebar from "@/components/Sidebar";
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

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    staleTime: 5 * 60 * 1000,
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

  const headerNavItems = (siteSettings?.headerNav || []).filter(item => {
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
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Sidebar */}
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        isAdmin={isAdmin}
        headerNavItems={headerNavItems}
        logoUrl={logoUrl}
        logoAlt={logoAlt}
      />

      {/* Main Content Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {/* Top Header */}
        <header
          className={cn(
            "sticky top-0 z-30 w-full h-16 px-6 flex items-center justify-between transition-all duration-300",
            scrolled
              ? "bg-background/80 backdrop-blur-md shadow-sm border-b border-border/50"
              : "bg-transparent"
          )}
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {user && <NotificationBell />}

            {/* User Profile Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
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
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;