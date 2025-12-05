import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { toast } from "sonner";
import { Megaphone, LayoutGrid, Eye, MousePointer, TrendingUp, Plus, ArrowRight, Upload, CreditCard, Image, Loader2 } from "lucide-react";
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

interface Creative {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string;
  click_url: string;
  headline: string | null;
  description: string | null;
  is_active: boolean;
}

const Advertise = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreativeDialogOpen, setIsCreativeDialogOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    advertiser_name: "",
    advertiser_email: "",
    budget: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    notes: "",
  });
  const [creativeData, setCreativeData] = useState({
    name: "",
    image_url: "",
    click_url: "",
    headline: "",
    description: "",
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

  // Handle payment success/cancel from URL params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const campaignId = searchParams.get("campaign");

    if (success === "true" && campaignId) {
      toast.success("Payment successful! Your campaign is now pending review.");
      // Update campaign status to pending
      supabase
        .from("ad_campaigns")
        .update({ status: "pending" })
        .eq("id", campaignId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["my-ad-campaigns"] });
        });
      // Clear URL params
      navigate("/advertise", { replace: true });
    } else if (canceled === "true") {
      toast.error("Payment was canceled. You can try again later.");
      navigate("/advertise", { replace: true });
    }
  }, [searchParams, navigate, queryClient]);

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

  const { data: myCreatives } = useQuery({
    queryKey: ["my-ad-creatives", user?.id],
    queryFn: async () => {
      if (!user || !myCampaigns?.length) return [];
      const campaignIds = myCampaigns.map(c => c.id);
      const { data, error } = await supabase
        .from("ad_creatives")
        .select("*")
        .in("campaign_id", campaignIds);
      if (error) throw error;
      return data as Creative[];
    },
    enabled: !!user && !!myCampaigns?.length,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user) throw new Error("Please log in to create a campaign");
      
      const { data: campaign, error } = await supabase.from("ad_campaigns").insert([{
        ...data,
        advertiser_type: "external",
        status: "draft",
        created_by: user.id,
      }]).select().single();
      if (error) throw error;
      return campaign;
    },
    onSuccess: async (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["my-ad-campaigns"] });
      
      // Initiate payment
      setIsProcessingPayment(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-ad-payment", {
          body: {
            campaignId: campaign.id,
            amount: formData.budget,
            placementName: selectedPlacement?.label || "Ad Placement",
            days: calculateDays(),
          },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, "_blank");
          toast.success("Redirecting to payment...");
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to create payment session");
      } finally {
        setIsProcessingPayment(false);
      }

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

  const createCreativeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCampaign || !selectedPlacement) throw new Error("Missing campaign or placement");
      
      const { error } = await supabase.from("ad_creatives").insert([{
        campaign_id: selectedCampaign.id,
        placement_id: selectedPlacement.id,
        name: creativeData.name,
        image_url: creativeData.image_url,
        click_url: creativeData.click_url,
        headline: creativeData.headline || null,
        description: creativeData.description || null,
        is_active: false, // Pending review
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-ad-creatives"] });
      toast.success("Creative uploaded! It will be reviewed and activated soon.");
      setIsCreativeDialogOpen(false);
      setCreativeData({ name: "", image_url: "", click_url: "", headline: "", description: "" });
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

  const handleUploadCreative = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    // Find the placement for this campaign or use first available
    if (placements?.length) {
      setSelectedPlacement(placements[0]);
    }
    setIsCreativeDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ad-creatives")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ad-creatives")
        .getPublicUrl(fileName);

      setCreativeData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Image uploaded!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.advertiser_name) {
      toast.error("Please fill in all required fields");
      return;
    }
    createCampaignMutation.mutate(formData);
  };

  const handleSubmitCreative = () => {
    if (!creativeData.name || !creativeData.image_url || !creativeData.click_url) {
      toast.error("Please fill in all required fields");
      return;
    }
    createCreativeMutation.mutate();
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
    pending: "outline",
    active: "default",
    paused: "outline",
    completed: "destructive",
  };

  const getCampaignCreatives = (campaignId: string) => {
    return myCreatives?.filter(c => c.campaign_id === campaignId) || [];
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
                  {myCampaigns.map((campaign) => {
                    const creatives = getCampaignCreatives(campaign.id);
                    return (
                      <Card key={campaign.id} className="border-border/50">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between mb-4">
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
                          
                          {/* Creatives Section */}
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium">Ad Creatives</h4>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleUploadCreative(campaign)}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Creative
                              </Button>
                            </div>
                            {creatives.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {creatives.map((creative) => (
                                  <div key={creative.id} className="relative group">
                                    <img 
                                      src={creative.image_url} 
                                      alt={creative.name}
                                      className="w-full h-20 object-cover rounded-lg border"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                      <span className="text-white text-xs">{creative.name}</span>
                                    </div>
                                    {!creative.is_active && (
                                      <Badge className="absolute top-1 right-1 text-xs" variant="secondary">
                                        Pending
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No creatives uploaded yet. Upload your banner images to start advertising.
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createCampaignMutation.isPending || isProcessingPayment}
              >
                {createCampaignMutation.isPending || isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay & Create Campaign
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload Creative Dialog */}
        <Dialog open={isCreativeDialogOpen} onOpenChange={setIsCreativeDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload Ad Creative</DialogTitle>
              <DialogDescription>
                Upload your banner image for {selectedCampaign?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Creative Name *</Label>
                <Input
                  value={creativeData.name}
                  onChange={(e) => setCreativeData({ ...creativeData, name: e.target.value })}
                  placeholder="Banner v1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Banner Image *</Label>
                {creativeData.image_url ? (
                  <div className="relative">
                    <img 
                      src={creativeData.image_url} 
                      alt="Preview" 
                      className="w-full h-40 object-contain rounded-lg border bg-muted"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => setCreativeData({ ...creativeData, image_url: "" })}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                      ) : (
                        <>
                          <Image className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload banner image</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label>Click URL *</Label>
                <Input
                  type="url"
                  value={creativeData.click_url}
                  onChange={(e) => setCreativeData({ ...creativeData, click_url: e.target.value })}
                  placeholder="https://yourwebsite.com/landing-page"
                />
              </div>

              <div className="space-y-2">
                <Label>Headline (for native ads)</Label>
                <Input
                  value={creativeData.headline}
                  onChange={(e) => setCreativeData({ ...creativeData, headline: e.target.value })}
                  placeholder="Your compelling headline"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (for native ads)</Label>
                <Textarea
                  value={creativeData.description}
                  onChange={(e) => setCreativeData({ ...creativeData, description: e.target.value })}
                  placeholder="A brief description of your offer..."
                />
              </div>

              {selectedPlacement && (
                <p className="text-xs text-muted-foreground">
                  Recommended size: {selectedPlacement.width > 0 ? `${selectedPlacement.width}×${selectedPlacement.height}px` : "Flexible"}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreativeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitCreative} 
                disabled={createCreativeMutation.isPending || uploadingImage}
              >
                {createCreativeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Creative
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Advertise;
