import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PropertyCard from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const propertyFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["apartment", "villa", "townhouse", "penthouse"]),
  status: z.enum(["available", "reserved", "sold"]),
  price: z.coerce.number().positive("Price must be positive"),
  location: z.string().min(1, "Location is required"),
  bedrooms: z.coerce.number().int().positive(),
  bathrooms: z.coerce.number().int().positive(),
  area: z.coerce.number().positive(),
  image: z.string().optional(),
  description: z.string().optional(),
  features: z.string().optional(),
  project_id: z.string().optional(),
});

type PropertyFormValues = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  initialData?: {
    title?: string;
    type?: "apartment" | "villa" | "townhouse" | "penthouse";
    status?: "available" | "reserved" | "sold";
    price?: number;
    location?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
    image?: string;
    description?: string;
    features?: string[];
    custom_fields_data?: Record<string, any>;
    project_id?: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const PropertyForm = ({ initialData, onSubmit, onCancel }: PropertyFormProps) => {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(initialData?.image || "");
  
  // Fetch custom fields and groups
  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data;
    },
  });

  const { data: fieldGroups = [] } = useQuery({
    queryKey: ["custom-field-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_field_groups")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
  
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      type: initialData?.type || "apartment",
      status: initialData?.status || "available",
      price: initialData?.price || 0,
      location: initialData?.location || "",
      bedrooms: initialData?.bedrooms || 1,
      bathrooms: initialData?.bathrooms || 1,
      area: initialData?.area || 0,
      image: initialData?.image || "",
      description: initialData?.description || "",
      features: initialData?.features?.join(", ") || "",
      project_id: initialData?.project_id || "",
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setUploadedImageUrl(publicUrl);
      form.setValue('image', publicUrl);
      
      toast({
        title: "Image uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to upload image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (values: PropertyFormValues) => {
    const features = values.features
      ? values.features.split(",").map(f => f.trim()).filter(Boolean)
      : [];
    
    // Extract custom field values
    const customFieldsData: Record<string, any> = {};
    customFields.forEach(field => {
      const fieldValue = (values as any)[`custom_${field.name}`];
      if (fieldValue !== undefined && fieldValue !== "") {
        customFieldsData[field.name] = fieldValue;
      }
    });
    
    // Handle project_id - convert "none" to null
    const project_id = values.project_id && values.project_id !== "none" ? values.project_id : null;
    
    await onSubmit({ 
      ...values, 
      features,
      custom_fields_data: customFieldsData,
      project_id,
    });
  };

  const getPreviewData = () => {
    const values = form.getValues();
    const features = values.features
      ? values.features.split(",").map(f => f.trim()).filter(Boolean)
      : [];
    
    return {
      id: 'preview',
      title: values.title || 'Property Title',
      type: values.type,
      status: values.status,
      price: values.price || 0,
      location: values.location || 'Location',
      bedrooms: values.bedrooms || 0,
      bathrooms: values.bathrooms || 0,
      area: values.area || 0,
      image: uploadedImageUrl || values.image || '/placeholder.svg',
      description: values.description || '',
      features,
    };
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="project_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects?.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <LocationAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter property location"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="area"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area (sqm)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Image</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="cursor-pointer"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {(uploadedImageUrl || field.value) && (
                    <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-lg border">
                      <img
                        src={uploadedImageUrl || field.value}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <Input {...field} placeholder="Or enter image URL" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Features (comma-separated)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Pool, Garden, Parking" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {(customFields.length > 0 || fieldGroups.length > 0) && (
          <>
            <Separator className="my-6" />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Custom Fields</h3>
              
              {/* Ungrouped fields */}
              {customFields.filter(f => !f.group_id).map((field) => {
                const fieldName = `custom_${field.name}`;
                const defaultValue = initialData?.custom_fields_data?.[field.name] || "";

                return (
                  <FormField
                    key={field.id}
                    control={form.control}
                    name={fieldName as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>
                          {field.label}
                          {field.is_required && <span className="text-destructive ml-1">*</span>}
                        </FormLabel>
                        <FormControl>
                          {field.field_type === "textarea" ? (
                            <Textarea 
                              {...formField} 
                              placeholder={field.placeholder}
                              defaultValue={defaultValue}
                            />
                          ) : field.field_type === "checkbox" ? (
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                checked={formField.value as boolean}
                                onCheckedChange={formField.onChange}
                                defaultChecked={defaultValue}
                              />
                            </div>
                          ) : field.field_type === "dropdown" ? (
                            <Select 
                              onValueChange={formField.onChange} 
                              defaultValue={defaultValue || formField.value}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || "Select an option"} />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(field.options) && field.options.map((option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              type={field.field_type}
                              {...formField}
                              placeholder={field.placeholder}
                              defaultValue={defaultValue}
                            />
                          )}
                        </FormControl>
                        {field.help_text && (
                          <FormDescription>{field.help_text}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                );
              })}

              {/* Grouped fields in collapsible sections */}
              {fieldGroups.map((group) => {
                const groupFields = customFields.filter(f => f.group_id === group.id);
                if (groupFields.length === 0) return null;

                return (
                  <Collapsible key={group.id} defaultOpen={!group.is_collapsed}>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                      <div className="text-left">
                        <h4 className="font-semibold">{group.label}</h4>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 space-y-4">
                      {groupFields.map((field) => {
                        const fieldName = `custom_${field.name}`;
                        const defaultValue = initialData?.custom_fields_data?.[field.name] || "";

                        return (
                          <FormField
                            key={field.id}
                            control={form.control}
                            name={fieldName as any}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>
                                  {field.label}
                                  {field.is_required && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  {field.field_type === "textarea" ? (
                                    <Textarea 
                                      {...formField} 
                                      placeholder={field.placeholder}
                                      defaultValue={defaultValue}
                                    />
                                  ) : field.field_type === "checkbox" ? (
                                    <div className="flex items-center space-x-2">
                                      <Checkbox 
                                        checked={formField.value as boolean}
                                        onCheckedChange={formField.onChange}
                                        defaultChecked={defaultValue}
                                      />
                                    </div>
                                  ) : field.field_type === "dropdown" ? (
                                    <Select 
                                      onValueChange={formField.onChange} 
                                      defaultValue={defaultValue || formField.value}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.isArray(field.options) && field.options.map((option: string) => (
                                          <SelectItem key={option} value={option}>
                                            {option}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Input 
                                      type={field.field_type}
                                      {...formField}
                                      placeholder={field.placeholder}
                                      defaultValue={defaultValue}
                                    />
                                  )}
                                </FormControl>
                                {field.help_text && (
                                  <FormDescription>{field.help_text}</FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Property Preview</DialogTitle>
          </DialogHeader>
          <PropertyCard property={getPreviewData()} />
        </DialogContent>
      </Dialog>
    </Form>
  );
};
