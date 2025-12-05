import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRight, Building2, Bed, Bath, Maximize, MapPin, FolderKanban, X, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MrecAd, NativeAd } from "@/components/ads";

const Properties = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
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
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Get project IDs that have at least one property
  const projectIdsWithProperties = new Set(
    (properties || []).map((p) => p.project_id).filter(Boolean)
  );

  // Filter projects to only show those with properties
  const projectsWithProperties = (projects || []).filter(
    (project) => projectIdsWithProperties.has(project.id)
  );

  const filteredProperties = (properties || [])
    .filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesType = typeFilter === "all" || property.type === typeFilter;
      const matchesProject = projectFilter === "all" || property.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesType && matchesProject;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "newest":
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "reserved":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "sold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  // Insert native ads every 5 properties
  const renderPropertiesWithAds = () => {
    const items: JSX.Element[] = [];
    filteredProperties.forEach((property, index) => {
      // Add native ad every 5 properties (after index 4, 9, 14, etc.)
      if (index > 0 && index % 5 === 0) {
        items.push(
          <NativeAd key={`ad-${index}`} className="animate-fade-in" />
        );
      }
      
      items.push(
        <Link 
          key={property.id} 
          to={`/properties/${property.id}`}
          className="block animate-fade-in"
          style={{ animationDelay: `${index * 0.03}s` }}
        >
          <Card className="p-4 hover:bg-muted/50 transition-colors border-border/50">
            <div className="flex items-center gap-4">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedForComparison.includes(property.id)}
                  onCheckedChange={() => togglePropertyForComparison(property.id)}
                  disabled={!selectedForComparison.includes(property.id) && selectedForComparison.length >= 3}
                  className="border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-5 w-5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{property.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {property.location}
                  </span>
                  {property.project && (
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" />
                      {property.project.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Bed className="h-4 w-4" />
                  {property.bedrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Bath className="h-4 w-4" />
                  {property.bathrooms}
                </span>
                <span className="flex items-center gap-1">
                  <Maximize className="h-4 w-4" />
                  {property.area} m²
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">${property.price.toLocaleString()}</p>
              </div>
              <Badge className={`${getStatusColor(property.status)} capitalize shrink-0`}>
                {property.status}
              </Badge>
            </div>
          </Card>
        </Link>
      );
    });
    return items;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Properties</h1>
              </div>
              <p className="text-muted-foreground">
                Browse and manage all available properties
              </p>
            </div>
          </div>

          {/* Filters Skeleton */}
          <Card className="p-6 border-border/50 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input disabled placeholder="Loading..." className="pl-10 bg-muted/50 border-border/50" />
              </div>
            </div>
          </Card>

          {/* Properties List Skeleton */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </Card>
            ))}
          </div>
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
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Properties</h1>
            </div>
            <p className="text-muted-foreground">
              Browse and manage all available properties
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
                  {projectsWithProperties.map((project) => (
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
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px] bg-muted/50 border-border/50">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
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

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Properties List */}
          <div className="flex-1 flex flex-col gap-3">
            {renderPropertiesWithAds()}
          </div>

          {/* Sidebar with MREC Ads */}
          <div className="hidden lg:block w-[300px] shrink-0 space-y-6">
            <MrecAd variant="sidebar" />
            <MrecAd variant="sidebar" />
          </div>
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

        {/* Floating Comparison Bar */}
        {selectedForComparison.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <Card className="px-4 py-3 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedForComparison.length} {selectedForComparison.length === 1 ? 'property' : 'properties'} selected
                  </span>
                </div>
                <div className="h-4 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedForComparison([])}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                {selectedForComparison.length >= 2 ? (
                  <Button size="sm" asChild>
                    <Link to={`/compare?ids=${selectedForComparison.join(',')}`}>
                      Compare
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                ) : (
                  <Button size="sm" disabled>
                    Compare
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Properties;
