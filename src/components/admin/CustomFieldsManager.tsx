import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomField {
  id: string;
  name: string;
  label: string;
  field_type: string;
  options: string[];
  is_required: boolean;
  placeholder?: string;
  help_text?: string;
  display_order: number;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "textarea", label: "Text Area" },
  { value: "checkbox", label: "Checkbox" },
];

export const CustomFieldsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    label: "",
    field_type: "text",
    options: "",
    is_required: false,
    placeholder: "",
    help_text: "",
  });

  const { data: customFields, isLoading } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as CustomField[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (fieldData: any) => {
      const { error } = await supabase.from("custom_fields").insert([{
        ...fieldData,
        options: fieldData.field_type === "dropdown" 
          ? fieldData.options.split(",").map((o: string) => o.trim()).filter(Boolean)
          : [],
        display_order: (customFields?.length || 0) + 1,
      }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Custom field created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create custom field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...fieldData }: any) => {
      const { error } = await supabase
        .from("custom_fields")
        .update({
          ...fieldData,
          options: fieldData.field_type === "dropdown" 
            ? fieldData.options.split(",").map((o: string) => o.trim()).filter(Boolean)
            : [],
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Custom field updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update custom field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_fields")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Custom field deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete custom field",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      label: "",
      field_type: "text",
      options: "",
      is_required: false,
      placeholder: "",
      help_text: "",
    });
    setEditingField(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
      is_required: field.is_required,
      placeholder: field.placeholder || "",
      help_text: field.help_text || "",
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

    // Convert name to snake_case
    const sanitizedName = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, ...formData, name: sanitizedName });
    } else {
      createMutation.mutate({ ...formData, name: sanitizedName });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Fields</h2>
          <p className="text-sm text-muted-foreground">
            Add custom fields to property forms
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Field
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingField ? "Edit Custom Field" : "Add Custom Field"}
              </DialogTitle>
              <DialogDescription>
                Create dynamic fields that will appear in the property form
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Field Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., virtual_tour_url"
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-muted-foreground">
                    Internal identifier (lowercase, underscores)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Display Label *</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="e.g., Virtual Tour URL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_type">Field Type *</Label>
                <Select
                  value={formData.field_type}
                  onValueChange={(value) => setFormData({ ...formData, field_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.field_type === "dropdown" && (
                <div className="space-y-2">
                  <Label htmlFor="options">Dropdown Options *</Label>
                  <Input
                    id="options"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate options with commas
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  placeholder="Optional placeholder text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="help_text">Help Text</Label>
                <Textarea
                  id="help_text"
                  value={formData.help_text}
                  onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
                  placeholder="Optional help text to guide users"
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_required: checked })
                  }
                />
                <Label htmlFor="is_required">Required Field</Label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingField ? "Update" : "Create"} Field
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
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
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
            ) : customFields?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No custom fields yet. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              customFields?.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {field.name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {field.field_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(field)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(field.id)}
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
    </div>
  );
};
