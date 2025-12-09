import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, LayoutGrid } from "lucide-react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface AdPlacement {
  id: string;
  name: string;
  label: string;
  description: string | null;
  width: number;
  height: number;
  location: string;
  price_per_day: number;
  is_active: boolean;
  created_at: string;
}

const AdPlacementsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<AdPlacement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [placementToDelete, setPlacementToDelete] = useState<{ id: string; label: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    width: 300,
    height: 250,
    location: "",
    price_per_day: 0,
    is_active: true,
  });

  const { data: placements, isLoading } = useQuery({
    queryKey: ["ad-placements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_placements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdPlacement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("ad_placements").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      toast.success("Placement created successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("ad_placements").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      toast.success("Placement updated successfully");
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_placements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-placements"] });
      toast.success("Placement deleted successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      description: "",
      width: 300,
      height: 250,
      location: "",
      price_per_day: 0,
      is_active: true,
    });
    setEditingPlacement(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (placement: AdPlacement) => {
    setEditingPlacement(placement);
    setFormData({
      name: placement.name,
      label: placement.label,
      description: placement.description || "",
      width: placement.width,
      height: placement.height,
      location: placement.location,
      price_per_day: placement.price_per_day,
      is_active: placement.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingPlacement) {
      updateMutation.mutate({ id: editingPlacement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Ad Placements
          </CardTitle>
          <CardDescription>Define available ad spots on your platform</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Placement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlacement ? "Edit" : "Create"} Ad Placement</DialogTitle>
              <DialogDescription>Configure the ad spot settings</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (slug)</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="mrec_sidebar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Label</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="MREC Sidebar"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Where this ad appears..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width (px)</Label>
                  <Input
                    type="number"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
                  <Input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Sidebar sections"
                />
              </div>
              <div className="space-y-2">
                <Label>Price per Day ($)</Label>
                <Input
                  type="number"
                  value={formData.price_per_day}
                  onChange={(e) => setFormData({ ...formData, price_per_day: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              {/* Preview */}
              {formData.width > 0 && formData.height > 0 && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-xs text-muted-foreground mb-2 block">Preview (scaled)</Label>
                  <div
                    className="border-2 border-dashed border-primary/50 bg-primary/10 flex items-center justify-center text-xs text-muted-foreground mx-auto"
                    style={{
                      width: Math.min(formData.width, 200),
                      height: Math.min(formData.height, 150) * (Math.min(formData.width, 200) / formData.width),
                    }}
                  >
                    {formData.width} × {formData.height}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPlacement ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading placements...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placement</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price/Day</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {placements?.map((placement) => (
                <TableRow key={placement.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{placement.label}</div>
                      <div className="text-xs text-muted-foreground">{placement.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {placement.width > 0 ? `${placement.width}×${placement.height}` : "Flexible"}
                  </TableCell>
                  <TableCell>{placement.location}</TableCell>
                  <TableCell>${placement.price_per_day}</TableCell>
                  <TableCell>
                    <Badge variant={placement.is_active ? "default" : "secondary"}>
                      {placement.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(placement)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPlacementToDelete({ id: placement.id, label: placement.label });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (placementToDelete) {
            deleteMutation.mutate(placementToDelete.id);
            setDeleteDialogOpen(false);
            setPlacementToDelete(null);
          }
        }}
        title="Delete Ad Placement"
        itemName={placementToDelete?.label}
      />
    </Card>
  );
};

export default AdPlacementsManager;
