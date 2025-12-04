import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, DollarSign, TrendingUp, Loader2, MapPin, Bed, Bath, Maximize, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ProjectDetail = () => {
  const { id } = useParams();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["project-properties", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (projectLoading || propertiesLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">Project not found</h2>
            <Link to="/properties">
              <Button variant="outline">Back to Properties</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate statistics
  const totalProperties = properties?.length || 0;
  const availableProperties = properties?.filter(p => p.status === "available").length || 0;
  const reservedProperties = properties?.filter(p => p.status === "reserved").length || 0;
  const soldProperties = properties?.filter(p => p.status === "sold").length || 0;
  
  const totalValue = properties?.reduce((sum, p) => sum + Number(p.price), 0) || 0;
  const averagePrice = totalProperties > 0 ? totalValue / totalProperties : 0;
  const soldValue = properties?.filter(p => p.status === "sold").reduce((sum, p) => sum + Number(p.price), 0) || 0;

  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "upcoming":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPropertyStatusColor = (status: string) => {
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Link to="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-display font-bold tracking-tight">{project.name}</h1>
              <Badge className={getProjectStatusColor(project.status)}>{project.status}</Badge>
            </div>
            {project.location && (
              <p className="mt-1 text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {project.location}
              </p>
            )}
          </div>
        </div>

        {/* Project Image */}
        {project.image && (
          <div className="relative w-full h-64 md:h-80 rounded-xl overflow-hidden">
            <img
              src={project.image}
              alt={project.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        {/* Description */}
        {project.description && (
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProperties}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {availableProperties} available • {reservedProperties} reserved • {soldProperties} sold
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined value of all properties
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averagePrice.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per property
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${soldValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {soldProperties} sold properties
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Properties List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold">Properties in {project.name}</h2>
          
          {totalProperties > 0 ? (
            <div className="flex flex-col gap-3">
              {properties?.map((property, index) => (
                <Link 
                  key={property.id} 
                  to={`/properties/${property.id}`}
                  className="block animate-fade-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <Card className="p-4 hover:bg-muted/50 transition-colors border-border/50">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{property.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {property.location}
                          </span>
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
                      <Badge className={`${getPropertyStatusColor(property.status)} capitalize shrink-0`}>
                        {property.status}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-12 border-border/50">
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-display font-semibold">No properties yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This project doesn't have any properties assigned yet.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetail;
