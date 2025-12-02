import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, TrendingUp, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroProperty from "@/assets/hero-property.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

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
      bgColor: "bg-primary/10",
    },
    {
      title: "Active Leads",
      value: activeLeads,
      icon: Users,
      description: "Require follow-up",
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Won Deals",
      value: wonDeals,
      icon: TrendingUp,
      description: "This month",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Pending EOIs",
      value: 3,
      icon: FileText,
      description: "Awaiting approval",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'Agent';

  return (
    <Layout>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl shadow-xl">
          <div className="absolute inset-0">
            <img
              src={heroProperty}
              alt="Hero property"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/40" />
          </div>
          <div className="relative px-8 py-16 md:py-20 lg:py-24">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-primary-foreground/80">Welcome back</span>
            </div>
            <h1 className="mb-4 text-4xl font-display font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Hello, {userName}
            </h1>
            <p className="mb-8 max-w-xl text-lg text-primary-foreground/80">
              Your comprehensive dashboard for managing properties, leads, and closing deals efficiently.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg" asChild>
                <Link to="/properties">
                  Browse Properties
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20" asChild>
                <Link to="/leads">Manage Leads</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className="card-hover border-border/50 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="mt-2 text-4xl font-display font-bold text-foreground">{stat.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Recent Properties</CardTitle>
              <Link to="/properties">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {properties?.slice(0, 3).map((property) => (
                <Link 
                  key={property.id} 
                  to={`/properties/${property.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:shadow-sm group"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{property.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{property.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-foreground">${(property.price / 1000000).toFixed(1)}M</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      property.status === "available" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {property.status}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-xl">Recent Leads</CardTitle>
              <Link to="/leads">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {leads?.slice(0, 3).map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all hover:bg-muted/50 hover:shadow-sm group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {lead.client_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">{lead.client_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-semibold text-foreground">${(Number(lead.budget) / 1000000).toFixed(1)}M</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      lead.status === "qualified" ? "bg-success/10 text-success" :
                      lead.status === "contacted" ? "bg-accent/10 text-accent" :
                      lead.status === "new" ? "bg-primary/10 text-primary" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
