import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { CSVImportWithMapping } from "@/components/admin/CSVImportWithMapping";
import { CustomFieldsManager } from "@/components/admin/CustomFieldsManager";
import { ProjectsManager } from "@/components/admin/ProjectsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Loader2, Copy, Settings, FolderKanban, FileText, Users, BarChart3, Download, ChevronDown, Menu, Activity, Megaphone } from "lucide-react";
import SubmissionsManager from "@/components/admin/SubmissionsManager";
import UserManagement from "@/components/admin/UserManagement";
import AgentAnalytics from "@/components/admin/AgentAnalytics";
import ExportReports from "@/components/admin/ExportReports";
import NavigationManager from "@/components/admin/NavigationManager";
import PlatformAnalytics from "@/components/admin/PlatformAnalytics";
import AdPlacementsManager from "@/components/admin/AdPlacementsManager";
import AdCampaignsManager from "@/components/admin/AdCampaignsManager";
import AdCreativesManager from "@/components/admin/AdCreativesManager";
import AdAnalytics from "@/components/admin/AdAnalytics";

type Property = {
  id: string;
  title: string;
  type: "apartment" | "villa" | "townhouse" | "penthouse";
  status: "available" | "reserved" | "sold";
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image?: string;
  description?: string;
  features: string[];
};

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to access the admin panel",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Wait for role to load
      if (!roleLoading && !isAdmin) {
        toast({
          title: "Access denied",
          description: "You don't have permission to access the admin panel",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    checkAuthAndRole();
  }, [isAdmin, roleLoading, navigate, toast]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Property[];
    },
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (propertyData: Omit<Property, "id">) => {
      const { error } = await supabase
        .from("properties")
        .insert([propertyData]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Property created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...propertyData }: Property) => {
      const { error } = await supabase
        .from("properties")
        .update(propertyData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Property updated successfully" });
      setIsDialogOpen(false);
      setEditingProperty(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: "Property deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete property",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("properties")
        .update({ status })
        .in("id", ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: `${selectedIds.length} properties updated successfully` });
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update properties",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("properties")
        .delete()
        .in("id", ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      toast({ title: `${selectedIds.length} properties deleted successfully` });
      setSelectedIds([]);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete properties",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: any) => {
    if (editingProperty) {
      await updateMutation.mutateAsync({ ...data, id: editingProperty.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDuplicate = (property: Property) => {
    const { id, ...propertyData } = property;
    setEditingProperty({
      ...propertyData,
      title: `${property.title} (Copy)`,
      id: '', // Empty id for new property
    } as Property);
    setIsDialogOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && properties) {
      setSelectedIds(properties.map((p: any) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleBulkStatusChange = (status: string) => {
    if (selectedIds.length === 0) return;
    bulkStatusMutation.mutate({ ids: selectedIds, status });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.length} properties? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  if (roleLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  const allSelected = properties && properties.length > 0 && selectedIds.length === properties.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < (properties?.length || 0);

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold mb-6">Admin Portal</h1>

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="flex w-full max-w-5xl flex-wrap">
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="submissions">
              <FileText className="w-4 h-4 mr-2" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Access
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Agent Analytics
            </TabsTrigger>
            <TabsTrigger value="platform">
              <Activity className="w-4 h-4 mr-2" />
              Platform
            </TabsTrigger>
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="custom-fields">
              <Settings className="w-4 h-4 mr-2" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="navigation">
              <Menu className="w-4 h-4 mr-2" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="ads">
              <Megaphone className="w-4 h-4 mr-2" />
              Ads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            <div className="flex justify-between items-center gap-2">
              {/* Bulk Actions */}
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.length} selected
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Status
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("available")}>
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                        Available
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("reserved")}>
                        <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                        Reserved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange("sold")}>
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                        Sold
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2 ml-auto">
                <CSVImportWithMapping
                  onImportComplete={() => {
                    queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
                  }}
                />
                <Button
                  onClick={() => {
                    setEditingProperty(null);
                    setIsDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                        className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Baths</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties?.map((property: any) => (
                    <TableRow key={property.id} className={selectedIds.includes(property.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(property.id)}
                          onCheckedChange={(checked) => handleSelectOne(property.id, checked as boolean)}
                          aria-label={`Select ${property.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{property.title}</TableCell>
                      <TableCell>
                        {property.project ? (
                          <span className="text-sm text-muted-foreground">{property.project.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No project</span>
                        )}
                      </TableCell>
                      <TableCell>{property.type}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            property.status === "available"
                              ? "bg-green-100 text-green-800"
                              : property.status === "reserved"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {property.status}
                        </span>
                      </TableCell>
                      <TableCell>${property.price.toLocaleString()}</TableCell>
                      <TableCell>{property.location}</TableCell>
                      <TableCell>{property.bedrooms}</TableCell>
                      <TableCell>{property.bathrooms}</TableCell>
                      <TableCell>{property.area} m²</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingProperty(property);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDuplicate(property)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(property.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsManager />
          </TabsContent>

          <TabsContent value="submissions">
            <SubmissionsManager />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <AgentAnalytics />
          </TabsContent>

          <TabsContent value="platform">
            <PlatformAnalytics />
          </TabsContent>

          <TabsContent value="export">
            <ExportReports />
          </TabsContent>

          <TabsContent value="custom-fields">
            <CustomFieldsManager />
          </TabsContent>

          <TabsContent value="navigation">
            <NavigationManager />
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <Tabs defaultValue="campaigns" className="w-full">
              <TabsList>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="creatives">Creatives</TabsTrigger>
                <TabsTrigger value="placements">Placements</TabsTrigger>
                <TabsTrigger value="ad-analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="campaigns" className="mt-4">
                <AdCampaignsManager />
              </TabsContent>
              <TabsContent value="creatives" className="mt-4">
                <AdCreativesManager />
              </TabsContent>
              <TabsContent value="placements" className="mt-4">
                <AdPlacementsManager />
              </TabsContent>
              <TabsContent value="ad-analytics" className="mt-4">
                <AdAnalytics />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? "Edit Property" : "Add New Property"}
              </DialogTitle>
            </DialogHeader>
            <PropertyForm
              initialData={editingProperty || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsDialogOpen(false);
                setEditingProperty(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Admin;
