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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Pencil, Trash2, Settings, FolderPlus, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldGroupManager } from "./FieldGroupManager";

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
  group_id?: string;
}

interface FieldGroup {
  id: string;
  name: string;
  label: string;
  description?: string;
  is_collapsed: boolean;
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
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [editingGroup, setEditingGroup] = useState<FieldGroup | null>(null);
  
  const [fieldFormData, setFieldFormData] = useState({
    name: "",
    label: "",
    field_type: "text",
    options: "",
    is_required: false,
    placeholder: "",
    help_text: "",
    group_id: "",
  });

  const [groupFormData, setGroupFormData] = useState({
    name: "",
    label: "",
    description: "",
    is_collapsed: false,
  });

  const { data: fieldGroups = [] } = useQuery({
    queryKey: ["custom-field-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_groups")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data as FieldGroup[];
    },
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
        group_id: fieldData.group_id || null,
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
      resetFieldForm();
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
          group_id: fieldData.group_id || null,
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
      resetFieldForm();
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

  const resetFieldForm = () => {
    setFieldFormData({
      name: "",
      label: "",
      field_type: "text",
      options: "",
      is_required: false,
      placeholder: "",
      help_text: "",
      group_id: "",
    });
    setEditingField(null);
    setIsFieldDialogOpen(false);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setFieldFormData({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      options: Array.isArray(field.options) ? field.options.join(", ") : "",
      is_required: field.is_required,
      placeholder: field.placeholder || "",
      help_text: field.help_text || "",
      group_id: field.group_id || "",
    });
    setIsFieldDialogOpen(true);
  };

  const handleFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fieldFormData.name || !fieldFormData.label) {
      toast({
        title: "Validation error",
        description: "Name and label are required",
        variant: "destructive",
      });
      return;
    }

    // Convert name to snake_case
    const sanitizedName = fieldFormData.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (editingField) {
      updateMutation.mutate({ id: editingField.id, ...fieldFormData, name: sanitizedName });
    } else {
      createMutation.mutate({ ...fieldFormData, name: sanitizedName });
    }
  };

  return (
    <Tabs defaultValue="fields" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="fields">Fields</TabsTrigger>
        <TabsTrigger value="groups">
          <Folder className="w-4 h-4 mr-2" />
          Groups
        </TabsTrigger>
      </TabsList>

      <TabsContent value="fields" className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Custom Fields</h3>
            <p className="text-sm text-muted-foreground">
              Add custom fields to property forms
            </p>
          </div>
          <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetFieldForm()}>
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

              <form onSubmit={handleFieldSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Field Name *</Label>
                    <Input
                      id="name"
                      value={fieldFormData.name}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, name: e.target.value })}
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
                      value={fieldFormData.label}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, label: e.target.value })}
                      placeholder="e.g., Virtual Tour URL"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="field_type">Field Type *</Label>
                  <Select
                    value={fieldFormData.field_type}
                    onValueChange={(value) => setFieldFormData({ ...fieldFormData, field_type: value })}
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

                {fieldFormData.field_type === "dropdown" && (
                  <div className="space-y-2">
                    <Label htmlFor="options">Dropdown Options *</Label>
                    <Input
                      id="options"
                      value={fieldFormData.options}
                      onChange={(e) => setFieldFormData({ ...fieldFormData, options: e.target.value })}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                    <p className="text-xs text-muted-foreground">
                      Separate options with commas
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="group_id">Field Group (Optional)</Label>
                  <Select
                    value={fieldFormData.group_id || "none"}
                    onValueChange={(value) => setFieldFormData({ ...fieldFormData, group_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No group</SelectItem>
                      {fieldGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="placeholder">Placeholder Text</Label>
                  <Input
                    id="placeholder"
                    value={fieldFormData.placeholder}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, placeholder: e.target.value })}
                    placeholder="Optional placeholder text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="help_text">Help Text</Label>
                  <Textarea
                    id="help_text"
                    value={fieldFormData.help_text}
                    onChange={(e) => setFieldFormData({ ...fieldFormData, help_text: e.target.value })}
                    placeholder="Optional help text to guide users"
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={fieldFormData.is_required}
                    onCheckedChange={(checked) =>
                      setFieldFormData({ ...fieldFormData, is_required: checked })
                    }
                  />
                  <Label htmlFor="is_required">Required Field</Label>
                </div>

                <div className="flex gap-2 justify-end pt-4">
                  <Button type="button" variant="outline" onClick={resetFieldForm}>
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

        <Accordion type="multiple" className="w-full">
          {/* Ungrouped fields */}
          {customFields?.filter(f => !f.group_id).length > 0 && (
            <AccordionItem value="ungrouped">
              <AccordionTrigger>Ungrouped Fields</AccordionTrigger>
              <AccordionContent>
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
                    {customFields?.filter(f => !f.group_id).map((field) => (
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
                              onClick={() => handleEditField(field)}
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
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Grouped fields */}
          {fieldGroups.map((group) => {
            const groupFields = customFields?.filter(f => f.group_id === group.id) || [];
            if (groupFields.length === 0) return null;

            return (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    {group.label}
                    <Badge variant="secondary" className="ml-2">
                      {groupFields.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
                      {groupFields.map((field) => (
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
                                onClick={() => handleEditField(field)}
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
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </TabsContent>

      <TabsContent value="groups" className="mt-6">
        <FieldGroupManager groups={fieldGroups} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
};
