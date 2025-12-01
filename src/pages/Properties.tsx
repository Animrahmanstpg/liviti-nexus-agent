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
import { Search, SlidersHorizontal, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

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
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold tracking-tight">Property Listings</h1>
            <p className="text-muted-foreground">
              Browse and manage all available properties in your portfolio
            </p>
          </div>
          {selectedForComparison.length > 0 && (
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                {selectedForComparison.length} selected
              </Badge>
              <Link to={`/compare?ids=${selectedForComparison.join(",")}`}>
                <Button className="gap-2">
                  Compare Properties
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
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
              <SelectTrigger className="w-full md:w-[180px]">
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
              <SelectTrigger className="w-full md:w-[180px]">
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
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredProperties.length} of {properties?.length || 0} properties</span>
          {filteredProperties.length > 1 && (
            <span>Select up to 3 properties to compare</span>
          )}
        </div>

        {/* Properties Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <div key={property.id} className="relative">
              <div className="absolute top-6 left-6 z-10">
                <Checkbox
                  checked={selectedForComparison.includes(property.id)}
                  onCheckedChange={() => togglePropertyForComparison(property.id)}
                  disabled={!selectedForComparison.includes(property.id) && selectedForComparison.length >= 3}
                  className="bg-background border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                />
              </div>
              <PropertyCard property={property as any} />
            </div>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-lg font-medium">No properties found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Properties;
