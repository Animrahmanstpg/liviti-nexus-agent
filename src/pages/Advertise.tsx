import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, LayoutGrid, DollarSign, Eye, MousePointer, TrendingUp, Plus, CheckCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { User } from "@supabase/supabase-js";

interface Placement {
  id: string;
  name: string;
  label: string;
  description: string | null;
  width: number;
  height: number;
  location: string;
  price_per_day: number;
  is_active: boolean;
}

interface Campaign {
  id: string;
  name: string;
  advertiser_name: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  status: string;
}

const Advertise = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    advertiser_name: "",
    advertiser_email: "",
    budget: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    notes: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setFormData(prev => ({
          ...prev,
          advertiser_email: user.email || "",
        }));
      }
    });
  }, []);

  const { data: placements, isLoading: placementsLoading } = useQuery({
    queryKey: ["public-ad-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_placements")
        .select("*")
        .eq("is_active", true)
        .order("price_per_day", { ascending: true });
      if (error) throw error;
      return data as Placement[];
    },
  });

  const { data: myCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ["my-ad-campaigns", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
    enabled: !!user,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Please log in to create a campaign");
      
      const { error } = await supabase.from("ad_campaigns").insert([{
        ...data,
        advertiser_type: "external",
        status: "draft",
        created_by: user.id,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-ad-campaigns"] });
      toast.success("Campaign created! Our team will review and activate it.");
      setIsCreateDialogOpen(false);
      setSelectedPlacement(null);
      setFormData({
        name: "",
        advertiser_name: "",
        advertiser_email: user?.email || "",
        budget: 0,
        start_date: format(new Date(), "yyyy-MM-dd"),
        end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        notes: "",
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSelectPlacement = (placement: Placement) => {
    if (!user) {
      toast.error("Please log in to purchase ad placements");
      navigate("/auth");
      return;
    }
    setSelectedPlacement(placement);
    const days = Math.ceil((new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) / (1000 * 60 * 60 * 24));
    setFormData(prev => ({
      ...prev,
      budget: placement.price_per_day * Math.max(days, 1),
    }));
    setIsCreateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.advertiser_name) {
      toast.error("Please fill in all required fields");
      return;
    }
    createCampaignMutation.mutate(formData);
  };

  const calculateDays = () => {
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    return Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1);
  };

  useEffect(() => {
    if (selectedPlacement) {
      setFormData(prev => ({
        ...prev,
        budget: selectedPlacement.price_per_day * calculateDays(),
      }));
    }
  }, [formData.start_date, formData.end_date, selectedPlacement]);

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    active: "default",
    paused: "outline",
    completed: "destructive",
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-8 md:p-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <Megaphone className="h-8 w-8 text-primary-foreground" />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Advertiser Portal
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              Reach Your Target Audience
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mb-6">
              Promote your business to thousands of property buyers, sellers, and real estate professionals. 
              Choose from various ad placements and start your campaign today.
            </p>
            <div className="flex flex-wrap gap-6 text-primary-foreground/90">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <span>High Visibility</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointer className="h-5 w-5" />
                <span>Targeted Reach</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span>Real-time Analytics</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="placements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="placements">
              <LayoutGrid className="h-4 w-4 mr-2" />
              Ad Placements
            </TabsTrigger>
            {user && (
              <TabsTrigger value="my-campaigns">
                <Megaphone className="h-4 w-4 mr-2" />
                My Campaigns
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="placements" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {placementsLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-24 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                placements?.map((placement) => (
                  <Card key={placement.id} className="flex flex-col border-border/50 hover:border-primary/50 transition-colors">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{placement.label}</CardTitle>
                          <CardDescription>{placement.location}</CardDescription>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {placement.width > 0 ? `${placement.width}×${placement.height}` : "Flexible"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {placement.description && (
                        <p className="text-sm text-muted-foreground mb-4">{placement.description}</p>
                      )}
                      {/* Preview box */}
                      <div 
                        className="border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/50 mb-4"
                        style={{
                          width: "100%",
                          height: placement.height > 0 ? Math.min(placement.height / 3, 100) : 60,
                        }}
                      >
                        <span className="text-xs text-muted-foreground">
                          {placement.width > 0 ? `${placement.width}×${placement.height}px` : "Flexible Size"}
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t pt-4">
                      <div>
                        <p className="text-2xl font-bold text-foreground">${placement.price_per_day}</p>
                        <p className="text-xs text-muted-foreground">per day</p>
                      </div>
                      <Button onClick={() => handleSelectPlacement(placement)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Select
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {user && (
            <TabsContent value="my-campaigns" className="space-y-6">
              {campaignsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
              ) : myCampaigns && myCampaigns.length > 0 ? (
                <div className="grid gap-4">
                  {myCampaigns.map((campaign) => (
                    <Card key={campaign.id} className="border-border/50">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(campaign.start_date), "MMM d")} - {format(new Date(campaign.end_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold">${campaign.budget.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Budget</p>
                            </div>
                            <Badge variant={statusColors[campaign.status]}>
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start your first advertising campaign today
                    </p>
                    <Button onClick={() => document.querySelector('[value="placements"]')?.dispatchEvent(new Event('click'))}>
                      Browse Placements
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Create Campaign Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Ad Campaign</DialogTitle>
              <DialogDescription>
                {selectedPlacement && (
                  <span>Selected placement: <strong>{selectedPlacement.label}</strong> (${selectedPlacement.price_per_day}/day)</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Ad Campaign"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company/Advertiser Name *</Label>
                  <Input
                    value={formData.advertiser_name}
                    onChange={(e) => setFormData({ ...formData, advertiser_name: e.target.value })}
                    placeholder="Your Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.advertiser_email}
                    onChange={(e) => setFormData({ ...formData, advertiser_email: e.target.value })}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any specific requirements or notes..."
                />
              </div>
              {/* Pricing Summary */}
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-medium">{calculateDays()} days</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Rate</span>
                    <span className="font-medium">${selectedPlacement?.price_per_day || 0}/day</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex items-center justify-between">
                    <span className="font-semibold">Total Budget</span>
                    <span className="text-xl font-bold text-primary">${formData.budget.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createCampaignMutation.isPending}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Advertise;
