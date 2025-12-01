import { useParams, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import PropertyCard from "@/components/PropertyCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, DollarSign, Home, TrendingUp, Loader2 } from "lucide-react";
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
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (projectLoading || propertiesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "planned":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.location && (
              <p className="mt-1 text-muted-foreground">{project.location}</p>
            )}
          </div>
          <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
        </div>

        {project.description && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{project.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(totalValue / 1000000).toFixed(2)}M</div>
              <p className="text-xs text-muted-foreground mt-1">
                Combined value of all properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Price</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(averagePrice / 1000000).toFixed(2)}M</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per property
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(soldValue / 1000000).toFixed(2)}M</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {soldProperties} sold properties
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Properties List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Properties in {project.name}</h2>
          {totalProperties > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties?.map((property) => (
                <PropertyCard key={property.id} property={property as any} />
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No properties yet</h3>
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
