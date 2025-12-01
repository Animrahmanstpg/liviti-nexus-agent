import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroProperty from "@/assets/hero-property.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Dashboard = () => {
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const availableProperties = properties?.filter((p) => p.status === "available").length || 0;
  const activeLeads = leads?.filter((l) => ["new", "contacted", "qualified"].includes(l.status)).length || 0;
  const wonDeals = leads?.filter((l) => l.status === "won").length || 0;
  
  const isLoading = propertiesLoading || leadsLoading;

  const stats = [
    {
      title: "Available Properties",
      value: availableProperties,
      icon: Building2,
      description: "Ready for sale",
      color: "text-primary",
    },
    {
      title: "Active Leads",
      value: activeLeads,
      icon: Users,
      description: "Require follow-up",
      color: "text-accent",
    },
    {
      title: "Won Deals",
      value: wonDeals,
      icon: TrendingUp,
      description: "This month",
      color: "text-success",
    },
    {
      title: "Pending EOIs",
      value: 3,
      icon: FileText,
      description: "Awaiting approval",
      color: "text-muted-foreground",
    },
  ];

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
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0">
            <img
              src={heroProperty}
              alt="Hero property"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/20" />
          </div>
          <div className="relative px-8 py-16 md:py-20">
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              Welcome to Your Agent Portal
            </h1>
            <p className="mb-6 max-w-2xl text-lg text-muted-foreground">
              Manage your property listings, track leads, and close deals efficiently with Liviti's comprehensive platform.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="accent" size="lg" asChild>
                <Link to="/properties">Browse Properties</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/leads">Manage Leads</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="transition-all hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {properties?.slice(0, 3).map((property) => (
                <div key={property.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{property.title}</p>
                    <p className="text-sm text-muted-foreground">{property.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${(property.price / 1000000).toFixed(1)}M</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      property.status === "available" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {property.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leads?.slice(0, 3).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{lead.client_name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${(Number(lead.budget) / 1000000).toFixed(1)}M</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      lead.status === "qualified" ? "bg-accent/10 text-accent" :
                      lead.status === "contacted" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
