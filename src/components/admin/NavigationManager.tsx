import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  GripVertical, Plus, Trash2, Save, Upload, X, Image as ImageIcon,
  LayoutDashboard, Building2, Users, Heart, FileText, Home, Settings, Shield, ChartBar, FolderKanban
} from "lucide-react";

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

const iconOptions = [
  { value: "LayoutDashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "Building2", label: "Building", icon: Building2 },
  { value: "Users", label: "Users", icon: Users },
  { value: "Heart", label: "Heart", icon: Heart },
  { value: "FileText", label: "File", icon: FileText },
  { value: "Home", label: "Home", icon: Home },
  { value: "Settings", label: "Settings", icon: Settings },
  { value: "Shield", label: "Shield", icon: Shield },
  { value: "ChartBar", label: "Chart", icon: ChartBar },
  { value: "FolderKanban", label: "Folder", icon: FolderKanban },
];

const getIconComponent = (iconName: string) => {
  const option = iconOptions.find(o => o.value === iconName);
  return option?.icon || Home;
};

const NavigationManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [headerNav, setHeaderNav] = useState<NavItem[]>([]);
  const [footerNav, setFooterNav] = useState<NavItem[]>([]);
  const [siteLogo, setSiteLogo] = useState<SiteLogo>({ url: "", alt: "ST Trinity" });
  const [uploading, setUploading] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");
      if (error) throw error;
      
      data?.forEach(setting => {
        if (setting.key === "header_nav") {
          setHeaderNav(setting.value as unknown as NavItem[]);
        } else if (setting.key === "footer_nav") {
          setFooterNav(setting.value as unknown as NavItem[]);
        } else if (setting.key === "site_logo") {
          setSiteLogo(setting.value as unknown as SiteLogo);
        }
      });
      
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ value })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Settings saved", description: "Navigation settings have been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be less than 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);

      const newLogo = { ...siteLogo, url: publicUrl };
      setSiteLogo(newLogo);
      await saveMutation.mutateAsync({ key: "site_logo", value: newLogo });
    } catch (error) {
      toast({ title: "Upload failed", description: "Could not upload logo.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setSiteLogo({ url: "", alt: siteLogo.alt });
  };

  const addNavItem = (type: "header" | "footer") => {
    const newItem: NavItem = {
      label: "New Link",
      path: "/",
      icon: "Home",
      enabled: true,
      requiresAuth: false,
    };

    if (type === "header") {
      setHeaderNav([...headerNav, newItem]);
    } else {
      setFooterNav([...footerNav, newItem]);
    }
  };

  const updateNavItem = (type: "header" | "footer", index: number, updates: Partial<NavItem>) => {
    if (type === "header") {
      const updated = [...headerNav];
      updated[index] = { ...updated[index], ...updates };
      setHeaderNav(updated);
    } else {
      const updated = [...footerNav];
      updated[index] = { ...updated[index], ...updates };
      setFooterNav(updated);
    }
  };

  const removeNavItem = (type: "header" | "footer", index: number) => {
    if (type === "header") {
      setHeaderNav(headerNav.filter((_, i) => i !== index));
    } else {
      setFooterNav(footerNav.filter((_, i) => i !== index));
    }
  };

  const saveAllSettings = async () => {
    await saveMutation.mutateAsync({ key: "header_nav", value: headerNav });
    await saveMutation.mutateAsync({ key: "footer_nav", value: footerNav });
    await saveMutation.mutateAsync({ key: "site_logo", value: siteLogo });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading settings...</div>;
  }

  const renderNavItemEditor = (item: NavItem, index: number, type: "header" | "footer") => {
    const IconComponent = getIconComponent(item.icon);
    
    return (
      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            value={item.label}
            onChange={(e) => updateNavItem(type, index, { label: e.target.value })}
            placeholder="Label"
          />
          <Input
            value={item.path}
            onChange={(e) => updateNavItem(type, index, { path: e.target.value })}
            placeholder="/path"
          />
          <Select
            value={item.icon}
            onValueChange={(value) => updateNavItem(type, index, { icon: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={item.enabled}
                onCheckedChange={(checked) => updateNavItem(type, index, { enabled: checked })}
              />
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={item.requiresAuth}
                onCheckedChange={(checked) => updateNavItem(type, index, { requiresAuth: checked })}
              />
              <span className="text-sm text-muted-foreground">Auth</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeNavItem(type, index)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Site Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Site Logo
          </CardTitle>
          <CardDescription>
            Upload and manage the site logo displayed in the header
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {siteLogo.url ? (
              <div className="relative">
                <img
                  src={siteLogo.url}
                  alt={siteLogo.alt}
                  className="h-12 object-contain bg-muted rounded-lg p-2"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removeLogo}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="h-12 w-32 bg-muted rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP. Max 2MB.</p>
            </div>
          </div>

          <div className="max-w-sm">
            <Label>Alt Text</Label>
            <Input
              value={siteLogo.alt}
              onChange={(e) => setSiteLogo({ ...siteLogo, alt: e.target.value })}
              placeholder="Logo alt text"
            />
          </div>
        </CardContent>
      </Card>

      {/* Header Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Header Navigation</CardTitle>
          <CardDescription>
            Configure the navigation links displayed in the header menu
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {headerNav.map((item, index) => renderNavItemEditor(item, index, "header"))}
          
          <Button variant="outline" onClick={() => addNavItem("header")} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Header Link
          </Button>
        </CardContent>
      </Card>

      {/* Footer Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Footer Navigation</CardTitle>
          <CardDescription>
            Configure the navigation links displayed in the footer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {footerNav.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No footer links configured
            </p>
          ) : (
            footerNav.map((item, index) => renderNavItemEditor(item, index, "footer"))
          )}
          
          <Button variant="outline" onClick={() => addNavItem("footer")} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Footer Link
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveAllSettings} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
};

export default NavigationManager;