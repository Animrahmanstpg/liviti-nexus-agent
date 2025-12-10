import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FolderKanban, MapPin, Building2, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type ViewMode = "card" | "list";

const Projects = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects-with-counts"],
    queryFn: async () => {
      // First get all projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .order("name");
      if (projectsError) throw projectsError;

      // Then get property counts per project
      const { data: countData, error: countError } = await supabase
        .from("properties")
        .select("project_id");
      if (countError) throw countError;

      // Count properties per project
      const countMap = (countData || []).reduce((acc, prop) => {
        if (prop.project_id) {
          acc[prop.project_id] = (acc[prop.project_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Merge counts with projects
      return (projectsData || []).map(project => ({
        ...project,
        propertyCount: countMap[project.id] || 0
      }));
    },
  });

  const getStatusColor = (status: string) => {
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

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Projects</h1>
            </div>
            <p className="text-muted-foreground">
              Browse all development projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const filteredProjects = projects?.filter((project) => project.propertyCount > 0) || [];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Projects</h1>
          </div>
          <p className="text-muted-foreground">
            Browse all development projects
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredProjects.length}</span> projects
          </p>
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("card")}
              className={cn(
                "h-8 px-3",
                viewMode === "card" && "bg-background shadow-sm"
              )}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Cards
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 px-3",
                viewMode === "list" && "bg-background shadow-sm"
              )}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        {/* Card View */}
        {viewMode === "card" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project, index) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group block animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Card className="overflow-hidden h-full border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1">
                  {/* Image Section */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                    {project.image ? (
                      <img
                        src={project.image}
                        alt={project.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <FolderKanban className="h-16 w-16 text-primary/20" />
                      </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {/* Status Badge */}
                    <Badge 
                      className={cn(
                        "absolute top-4 right-4 capitalize backdrop-blur-sm",
                        getStatusColor(project.status)
                      )}
                    >
                      {project.status}
                    </Badge>
                    {/* Property Count Badge */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/90 text-sm font-medium">
                      <Building2 className="h-4 w-4" />
                      <span>{project.propertyCount} {project.propertyCount === 1 ? 'property' : 'properties'}</span>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-display font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    {project.location && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="line-clamp-1">{project.location}</span>
                      </div>
                    )}
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Hover Accent Line */}
                  <div className="h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <div className="flex flex-col gap-3">
            {filteredProjects.map((project, index) => (
              <Link 
                key={project.id} 
                to={`/projects/${project.id}`}
                className="block animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <Card className="p-4 hover:bg-muted/50 transition-colors border-border/50">
                  <div className="flex items-center gap-4">
                    {project.image ? (
                      <img 
                        src={project.image} 
                        alt={project.name}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                        <FolderKanban className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {project.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {project.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {project.propertyCount} {project.propertyCount === 1 ? 'property' : 'properties'}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(project.status)} capitalize shrink-0`}>
                      {project.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-display font-semibold text-foreground">No projects found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Projects with properties will appear here
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Projects;
