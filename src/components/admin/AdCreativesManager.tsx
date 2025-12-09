import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Upload, ExternalLink } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface AdCreative {
  id: string;
  campaign_id: string;
  placement_id: string;
  name: string;
  image_url: string;
  click_url: string;
  headline: string | null;
  description: string | null;
  alt_text: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Placement {
  id: string;
  name: string;
  label: string;
  width: number;
  height: number;
}

const AdCreativesManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState<AdCreative | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [creativeToDelete, setCreativeToDelete] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    campaign_id: "",
    placement_id: "",
    name: "",
    image_url: "",
    click_url: "",
    headline: "",
    description: "",
    alt_text: "",
    is_active: true,
    priority: 0,
  });

  const { data: creatives, isLoading } = useQuery({
    queryKey: ["ad-creatives"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_creatives")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdCreative[];
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["ad-campaigns-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, name, status")
        .order("name");
      if (error) throw error;
      return data as Campaign[];
    },
  });

  const { data: placements } = useQuery({
    queryKey: ["ad-placements-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_placements")
        .select("id, name, label, width, height")
        .eq("is_active", true)
        .order("label");
      if (error) throw error;
      return data as Placement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("ad_creatives").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-creatives"] });
      toast.success("Creative created successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("ad_creatives").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-creatives"] });
      toast.success("Creative updated successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_creatives").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-creatives"] });
      toast.success("Creative deleted successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `creatives/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("ad-creatives")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ad-creatives")
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_id: "",
      placement_id: "",
      name: "",
      image_url: "",
      click_url: "",
      headline: "",
      description: "",
      alt_text: "",
      is_active: true,
      priority: 0,
    });
    setEditingCreative(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (creative: AdCreative) => {
    setEditingCreative(creative);
    setFormData({
      campaign_id: creative.campaign_id,
      placement_id: creative.placement_id,
      name: creative.name,
      image_url: creative.image_url,
      click_url: creative.click_url,
      headline: creative.headline || "",
      description: creative.description || "",
      alt_text: creative.alt_text || "",
      is_active: creative.is_active,
      priority: creative.priority,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.campaign_id || !formData.placement_id || !formData.image_url || !formData.click_url) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingCreative) {
      updateMutation.mutate({ id: editingCreative.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const selectedPlacement = placements?.find(p => p.id === formData.placement_id);

  const getCampaignName = (id: string) => campaigns?.find(c => c.id === id)?.name || "Unknown";
  const getPlacementLabel = (id: string) => placements?.find(p => p.id === id)?.label || "Unknown";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Ad Creatives
          </CardTitle>
          <CardDescription>Manage ad images and content</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Creative</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCreative ? "Edit" : "Create"} Ad Creative</DialogTitle>
              <DialogDescription>Upload and configure your ad content</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Creative Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Summer Sale Banner"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Campaign *</Label>
                  <Select
                    value={formData.campaign_id}
                    onValueChange={(value) => setFormData({ ...formData, campaign_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select campaign" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns?.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name} ({campaign.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Placement *</Label>
                  <Select
                    value={formData.placement_id}
                    onValueChange={(value) => setFormData({ ...formData, placement_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select placement" />
                    </SelectTrigger>
                    <SelectContent>
                      {placements?.map((placement) => (
                        <SelectItem key={placement.id} value={placement.id}>
                          {placement.label} ({placement.width}×{placement.height})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Click URL *</Label>
                  <Input
                    value={formData.click_url}
                    onChange={(e) => setFormData({ ...formData, click_url: e.target.value })}
                    placeholder="https://example.com/landing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    placeholder="Special Offer!"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ad description..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alt Text (accessibility)</Label>
                  <Input
                    value={formData.alt_text}
                    onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                    placeholder="Describe the image"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <Label>Active</Label>
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ad Image *</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  {formData.image_url && (
                    <Input
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="Or paste image URL"
                    />
                  )}
                </div>
                {/* Preview */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
                  {formData.image_url ? (
                    <div className="space-y-2">
                      <img
                        src={formData.image_url}
                        alt={formData.alt_text || "Ad preview"}
                        className="max-w-full h-auto rounded border"
                        style={{
                          maxHeight: selectedPlacement ? Math.min(selectedPlacement.height, 300) : 200,
                        }}
                      />
                      {selectedPlacement && selectedPlacement.width > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Recommended: {selectedPlacement.width}×{selectedPlacement.height}px
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed rounded text-muted-foreground text-sm">
                      Upload an image to preview
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingCreative ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading creatives...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creative</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creatives?.map((creative) => (
                <TableRow key={creative.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={creative.image_url}
                        alt={creative.alt_text || creative.name}
                        className="w-16 h-12 object-cover rounded border"
                      />
                      <div>
                        <div className="font-medium">{creative.name}</div>
                        {creative.headline && (
                          <div className="text-xs text-muted-foreground">{creative.headline}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getCampaignName(creative.campaign_id)}</TableCell>
                  <TableCell>{getPlacementLabel(creative.placement_id)}</TableCell>
                  <TableCell>
                    <Badge variant={creative.is_active ? "default" : "secondary"}>
                      {creative.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <a href={creative.click_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(creative)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      setCreativeToDelete({ id: creative.id, name: creative.name });
                      setDeleteDialogOpen(true);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {creatives?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No creatives yet. Upload your first ad creative to get started.
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
          if (creativeToDelete) {
            deleteMutation.mutate(creativeToDelete.id);
            setDeleteDialogOpen(false);
            setCreativeToDelete(null);
          }
        }}
        title="Delete Ad Creative"
        itemName={creativeToDelete?.name}
      />
    </Card>
  );
};

export default AdCreativesManager;
