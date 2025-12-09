import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

interface FieldGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_collapsed: boolean;
  display_order: number;
}

interface FieldGroupManagerProps {
  groups: FieldGroup[];
  isLoading: boolean;
}

export const FieldGroupManager = ({ groups, isLoading }: FieldGroupManagerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; label: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    description: "",
    is_collapsed: false,
  });

  const createMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const { error } = await supabase.from("custom_field_groups").insert([{
        ...groupData,
        display_order: (groups?.length || 0) + 1,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-groups"] });
      toast({ title: "Field group created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create field group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...groupData }: any) => {
      const { error } = await supabase
        .from("custom_field_groups")
        .update(groupData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-groups"] });
      toast({ title: "Field group updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update field group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_field_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-field-groups"] });
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Field group deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete field group",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      description: "",
      is_collapsed: false,
    });
    setEditingGroup(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (group: FieldGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      label: group.label,
      description: group.description || "",
      is_collapsed: group.is_collapsed,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.label) {
      toast({
        title: "Validation error",
        description: "Name and label are required",
        variant: "destructive",
      });
      return;
    }

    const sanitizedName = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, ...formData, name: sanitizedName });
    } else {
      createMutation.mutate({ ...formData, name: sanitizedName });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Field Groups</h3>
          <p className="text-sm text-muted-foreground">
            Organize fields into collapsible sections
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} size="sm">
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Field Group" : "Add Field Group"}
              </DialogTitle>
              <DialogDescription>
                Create groups to organize custom fields into sections
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., amenities"
                  disabled={!!editingGroup}
                />
                <p className="text-xs text-muted-foreground">
                  Internal identifier (lowercase, underscores)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-label">Display Label *</Label>
                <Input
                  id="group-label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Property Amenities"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="group-description">Description</Label>
                <Textarea
                  id="group-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is-collapsed"
                  checked={formData.is_collapsed}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_collapsed: checked })
                  }
                />
                <Label htmlFor="is-collapsed">Collapsed by default</Label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGroup ? "Update" : "Create"} Group
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Default State</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : groups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No field groups yet. Create one to organize your fields.
                </TableCell>
              </TableRow>
            ) : (
              groups?.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.label}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {group.name}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {group.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={group.is_collapsed ? "secondary" : "outline"}>
                      {group.is_collapsed ? "Collapsed" : "Expanded"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(group)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setGroupToDelete({ id: group.id, label: group.label });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (groupToDelete) {
            deleteMutation.mutate(groupToDelete.id);
            setDeleteDialogOpen(false);
            setGroupToDelete(null);
          }
        }}
        title="Delete Field Group"
        itemName={groupToDelete?.label}
      />
    </div>
  );
};
