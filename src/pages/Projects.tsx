import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, MapPin, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Projects = () => {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects-with-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          properties:properties(count)
        `)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

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

          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

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

        {(() => {
          const filteredProjects = projects?.filter((project) => {
            const propertyCount = (project.properties as any)?.[0]?.count || 0;
            return propertyCount > 0;
          }) || [];

          return (
            <>
              {/* Projects Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredProjects.length}</span> projects
          </p>
        </div>

        {/* Projects List */}
        <div className="flex flex-col gap-3">
          {filteredProjects.map((project, index) => {
            const propertyCount = (project.properties as any)?.[0]?.count || 0;

            return (
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
                          {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(project.status)} capitalize shrink-0`}>
                      {project.status}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

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
            </>
          );
        })()}
      </div>
    </Layout>
  );
};

export default Projects;