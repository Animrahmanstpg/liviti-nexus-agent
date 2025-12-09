import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Building2, LayoutDashboard, Users, Heart, FileText,
    FolderKanban, Shield, ChartBar, ChevronLeft, ChevronRight,
    LucideIcon, Home, Settings, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import stTrinityLogo from "@/assets/st-trinity-logo.webp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
    user: SupabaseUser | null;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    isAdmin?: boolean;
    headerNavItems?: Array<{ label: string; path: string; icon: string; }>;
    logoUrl?: string;
    logoAlt?: string;
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

const Sidebar = ({
    user,
    collapsed,
    setCollapsed,
    mobileOpen,
    setMobileOpen,
    isAdmin = false,
    headerNavItems = [],
    logoUrl = stTrinityLogo,
    logoAlt = "ST Trinity"
}: SidebarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { toast } = useToast();

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

    const NavLink = ({ item, onClick }: { item: { label: string; path: string; icon: string; }; onClick?: () => void }) => {
        const Icon = getIcon(item.icon);
        const isActive = location.pathname === item.path;

        return (
            <Link
                to={item.path}
                onClick={onClick}
                className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive && "text-primary-foreground"
                )} />
                <span className={cn(
                    "transition-all duration-300",
                    collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}>
                    {item.label}
                </span>
                {isActive && !collapsed && (
                    <div className="absolute right-2 w-1.5 h-8 bg-primary-foreground/30 rounded-full" />
                )}
            </Link>
        );
    };

    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-6 border-b border-border/50",
                collapsed && !isMobile && "justify-center px-2"
            )}>
                <Link to="/dashboard" className="flex items-center gap-3 group">
                    <img
                        src={logoUrl}
                        alt={logoAlt}
                        className={cn(
                            "transition-all duration-300 group-hover:scale-105",
                            collapsed && !isMobile ? "h-8" : "h-10"
                        )}
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {headerNavItems.map((item) => (
                    <NavLink
                        key={item.path}
                        item={item}
                        onClick={isMobile ? () => setMobileOpen(false) : undefined}
                    />
                ))}

                {isAdmin && (
                    <>
                        <NavLink
                            item={{ label: "Admin", path: "/admin", icon: "Shield" }}
                            onClick={isMobile ? () => setMobileOpen(false) : undefined}
                        />
                        <NavLink
                            item={{ label: "Analytics", path: "/analytics", icon: "ChartBar" }}
                            onClick={isMobile ? () => setMobileOpen(false) : undefined}
                        />
                    </>
                )}
            </nav>

            {/* User Profile */}
            {user && (
                <div className={cn(
                    "p-4 border-t border-border/50 bg-muted/30",
                    collapsed && !isMobile && "px-2"
                )}>
                    <div className={cn(
                        "flex items-center gap-3 p-2 rounded-xl",
                        collapsed && !isMobile && "justify-center"
                    )}>
                        <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-300",
                            collapsed && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                        )}>
                            <p className="font-medium text-sm truncate">{userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLogout}
                        className={cn(
                            "w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all",
                            collapsed && !isMobile ? "justify-center px-2" : "justify-start"
                        )}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span className={cn(
                            "ml-2 transition-all duration-300",
                            collapsed && !isMobile ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                        )}>
                            Logout
                        </span>
                    </Button>
                </div>
            )}

            {/* Collapse Button (Desktop Only) */}
            {!isMobile && (
                <div className="p-3 border-t border-border/50">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "w-full justify-center hover:bg-muted/50 transition-all",
                            collapsed && "px-2"
                        )}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <>
                                <ChevronLeft className="h-4 w-4 mr-2" />
                                <span className="text-xs">Collapse</span>
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 flex-col",
                    collapsed ? "w-20" : "w-64"
                )}
            >
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-64 p-0">
                    <SidebarContent isMobile />
                </SheetContent>
            </Sheet>
        </>
    );
};

export default Sidebar;
