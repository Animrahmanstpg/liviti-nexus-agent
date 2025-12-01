import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Heart, TrendingUp } from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

export default function Analytics() {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["propertyAnalytics"],
    queryFn: async () => {
      const { data: properties, error: propError } = await supabase
        .from("properties")
        .select("id, title, location, status");

      if (propError) throw propError;

      const propertyIds = properties?.map(p => p.id) || [];

      const [viewsResult, favoritesResult] = await Promise.all([
        supabase
          .from("property_views")
          .select("property_id, viewed_at"),
        supabase
          .from("property_favorites")
          .select("property_id")
      ]);

      const viewsByProperty = viewsResult.data?.reduce((acc: any, view) => {
        acc[view.property_id] = (acc[view.property_id] || 0) + 1;
        return acc;
      }, {});

      const favoritesByProperty = favoritesResult.data?.reduce((acc: any, fav) => {
        acc[fav.property_id] = (acc[fav.property_id] || 0) + 1;
        return acc;
      }, {});

      const analytics = properties?.map(property => ({
        id: property.id,
        title: property.title,
        location: property.location,
        status: property.status,
        views: viewsByProperty?.[property.id] || 0,
        favorites: favoritesByProperty?.[property.id] || 0,
        engagement: ((viewsByProperty?.[property.id] || 0) + (favoritesByProperty?.[property.id] || 0) * 5)
      })) || [];

      return analytics.sort((a, b) => b.engagement - a.engagement);
    },
    enabled: isAdmin && !roleLoading,
  });

  const { data: viewsOverTime, isLoading: viewsLoading } = useQuery({
    queryKey: ["viewsOverTime"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("property_views")
        .select("viewed_at")
        .gte("viewed_at", thirtyDaysAgo.toISOString())
        .order("viewed_at");

      if (error) throw error;

      const viewsByDate = data?.reduce((acc: any, view) => {
        const date = new Date(view.viewed_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(viewsByDate || {}).map(([date, views]) => ({
        date,
        views
      }));
    },
    enabled: isAdmin && !roleLoading,
  });

  if (roleLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const totalViews = analyticsData?.reduce((sum, p) => sum + p.views, 0) || 0;
  const totalFavorites = analyticsData?.reduce((sum, p) => sum + p.favorites, 0) || 0;
  const avgEngagement = analyticsData?.length 
    ? Math.round(analyticsData.reduce((sum, p) => sum + p.engagement, 0) / analyticsData.length)
    : 0;

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8">Property Analytics Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews}</div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Favorites</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFavorites}</div>
              <p className="text-xs text-muted-foreground">
                Properties saved by users
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgEngagement}</div>
              <p className="text-xs text-muted-foreground">
                Per property
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Views Over Time Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Views Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {viewsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={viewsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Property Performance Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top 10 Properties by Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData?.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" name="Views" />
                  <Bar dataKey="favorites" fill="hsl(var(--accent))" name="Favorites" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Detailed Property Table */}
        <Card>
          <CardHeader>
            <CardTitle>Property Performance Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Favorites</TableHead>
                    <TableHead className="text-right">Engagement Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData?.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell className="font-medium">{property.title}</TableCell>
                      <TableCell>{property.location}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          property.status === 'available' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {property.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{property.views}</TableCell>
                      <TableCell className="text-right">{property.favorites}</TableCell>
                      <TableCell className="text-right font-semibold">{property.engagement}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
