import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, Megaphone, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface AdCampaign {
  id: string;
  name: string;
  advertiser_name: string;
  advertiser_email: string | null;
  advertiser_type: string;
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  active: "default",
  paused: "outline",
  completed: "destructive",
};

const AdCampaignsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    advertiser_name: "",
    advertiser_email: "",
    advertiser_type: "internal",
    budget: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "draft",
    notes: "",
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["ad-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdCampaign[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ad_campaigns").insert([{ ...data, created_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Campaign created successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase.from("ad_campaigns").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Campaign updated successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns"] });
      toast.success("Campaign deleted successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      advertiser_name: "",
      advertiser_email: "",
      advertiser_type: "internal",
      budget: 0,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "draft",
      notes: "",
    });
    setEditingCampaign(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      advertiser_name: campaign.advertiser_name,
      advertiser_email: campaign.advertiser_email || "",
      advertiser_type: campaign.advertiser_type,
      budget: campaign.budget,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      status: campaign.status,
      notes: campaign.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (campaign: AdCampaign) => {
    setEditingCampaign(null);
    setFormData({
      name: `${campaign.name} (Copy)`,
      advertiser_name: campaign.advertiser_name,
      advertiser_email: campaign.advertiser_email || "",
      advertiser_type: campaign.advertiser_type,
      budget: campaign.budget,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      status: "draft",
      notes: campaign.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleStatus = (campaign: AdCampaign) => {
    const newStatus = campaign.status === "active" ? "paused" : "active";
    updateMutation.mutate({ id: campaign.id, data: { status: newStatus } });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Ad Campaigns
          </CardTitle>
          <CardDescription>Manage advertising campaigns and budgets</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Campaign</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? "Edit" : "Create"} Campaign</DialogTitle>
              <DialogDescription>Configure campaign settings and budget</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Property Promotion"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Advertiser Name</Label>
                  <Input
                    value={formData.advertiser_name}
                    onChange={(e) => setFormData({ ...formData, advertiser_name: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Advertiser Type</Label>
                  <Select
                    value={formData.advertiser_type}
                    onValueChange={(value) => setFormData({ ...formData, advertiser_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal (Own Ads)</SelectItem>
                      <SelectItem value="external">External (Sold Spot)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Advertiser Email</Label>
                <Input
                  type="email"
                  value={formData.advertiser_email}
                  onChange={(e) => setFormData({ ...formData, advertiser_email: e.target.value })}
                  placeholder="contact@company.com"
                />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Budget ($)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Campaign notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCampaign ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Advertiser</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="font-medium">{campaign.name}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{campaign.advertiser_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {campaign.advertiser_type === "internal" ? "Internal" : "External"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(campaign.start_date), "MMM d")} - {format(new Date(campaign.end_date), "MMM d, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {campaign.budget.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      ${campaign.spent.toLocaleString()}
                      <span className="text-muted-foreground ml-1">
                        ({campaign.budget > 0 ? Math.round((campaign.spent / campaign.budget) * 100) : 0}%)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusColors[campaign.status]}
                      className="cursor-pointer"
                      onClick={() => toggleStatus(campaign)}
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDuplicate(campaign)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setCampaignToDelete({ id: campaign.id, name: campaign.name });
                      setDeleteDialogOpen(true);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {campaigns?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No campaigns yet. Create your first campaign to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (campaignToDelete) {
            deleteMutation.mutate(campaignToDelete.id);
            setDeleteDialogOpen(false);
            setCampaignToDelete(null);
          }
        }}
        title="Delete Campaign"
        itemName={campaignToDelete?.name}
      />
    </Card>
  );
};

export default AdCampaignsManager;
