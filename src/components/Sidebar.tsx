import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Building2, LayoutDashboard, Users, Heart, FileText,
    FolderKanban, Shield, ChartBar, ChevronLeft, ChevronRight,
    LucideIcon, Home, Settings, LogOut, UserCog
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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
    const avatarUrl = user?.user_metadata?.avatar_url || null;

    const NavLink = ({ item, onClick }: { item: { label: string; path: string; icon: string; }; onClick?: () => void }) => {
        const Icon = getIcon(item.icon);
        const isActive = location.pathname === item.path;

        const handleClick = (e: React.MouseEvent) => {
            // Navigate immediately without affecting sidebar state
            if (onClick) {
                onClick();
            }
        };

        return (
            <Link
                to={item.path}
                onClick={handleClick}
                className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    collapsed ? "px-3 py-3 justify-center" : "px-4 py-3",
                    isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
            >
                <Icon className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive && "text-primary-foreground"
                )} />
                {!collapsed && (
                    <span>{item.label}</span>
                )}
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
                    collapsed && !isMobile && "p-2"
                )}>
                    <div className={cn(
                        "flex items-center gap-3 p-2 rounded-xl",
                        collapsed && !isMobile && "flex-col justify-center p-1"
                    )}>
                        <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={avatarUrl || undefined} alt={userName} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                        {!collapsed || isMobile ? (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{userName}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                        ) : null}
                    </div>
                    <Link
                        to="/profile-settings"
                        onClick={isMobile ? () => setMobileOpen(false) : undefined}
                        className={cn(
                            "flex items-center gap-2 w-full mt-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all",
                            collapsed && !isMobile ? "justify-center p-2" : "px-3 py-2"
                        )}
                    >
                        <UserCog className="h-4 w-4 shrink-0" />
                        {!collapsed || isMobile ? (
                            <span>Profile Settings</span>
                        ) : null}
                    </Link>
                    <Button
                        variant="ghost"
                        size={collapsed && !isMobile ? "icon" : "sm"}
                        onClick={() => setShowLogoutDialog(true)}
                        className={cn(
                            "w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all",
                            collapsed && !isMobile ? "justify-center h-9 w-full" : "justify-start"
                        )}
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        {!collapsed || isMobile ? (
                            <span className="ml-2">Logout</span>
                        ) : null}
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

            {/* Logout Confirmation Dialog */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be redirected to the login page and will need to sign in again to access your account.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default Sidebar;
