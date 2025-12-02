import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PropertyCard from "@/components/PropertyCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, Loader2, ArrowRight, Building2, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
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

  const filteredProperties = (properties || []).filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || property.status === statusFilter;
    const matchesType = typeFilter === "all" || property.type === typeFilter;
    const matchesProject = projectFilter === "all" || property.project_id === projectFilter;
    return matchesSearch && matchesStatus && matchesType && matchesProject;
  });

  const togglePropertyForComparison = (propertyId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Property Listings</h1>
            </div>
            <p className="text-muted-foreground">
              Browse and manage all available properties in your portfolio
            </p>
          </div>
          {selectedForComparison.length > 0 && (
            <div className="flex items-center gap-4 animate-fade-in">
              <Badge variant="secondary" className="text-sm font-medium px-3 py-1.5">
                {selectedForComparison.length} selected
              </Badge>
              <Link to={`/compare?ids=${selectedForComparison.join(",")}`}>
                <Button className="gap-2 shadow-md">
                  Compare Properties
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="p-6 border-border/50 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="penthouse">Penthouse</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-lg overflow-hidden bg-muted/50 border-border/50">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-none h-10"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  className="rounded-none h-10"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredProperties.length}</span> of{" "}
            <span className="font-semibold text-foreground">{properties?.length || 0}</span> properties
          </p>
          {filteredProperties.length > 1 && (
            <p className="text-sm text-muted-foreground hidden sm:block">
              Select up to 3 properties to compare
            </p>
          )}
        </div>

        {/* Properties Grid */}
        <div className={viewMode === "grid" 
          ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" 
          : "flex flex-col gap-4"
        }>
          {filteredProperties.map((property, index) => (
            <div 
              key={property.id} 
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="absolute top-6 left-6 z-10">
                <Checkbox
                  checked={selectedForComparison.includes(property.id)}
                  onCheckedChange={() => togglePropertyForComparison(property.id)}
                  disabled={!selectedForComparison.includes(property.id) && selectedForComparison.length >= 3}
                  className="bg-background/90 backdrop-blur-sm border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5 shadow-sm"
                />
              </div>
              <PropertyCard property={property as any} />
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-display font-semibold text-foreground">No properties found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setProjectFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Properties;
