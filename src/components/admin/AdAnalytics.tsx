import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointer, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AdAnalytics = () => {
  const { data: impressions, isLoading: impressionsLoading } = useQuery({
    queryKey: ["ad-impressions-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("ad_impressions")
        .select("*, ad_creatives(name, campaign_id, placement_id)")
        .gte("created_at", thirtyDaysAgo);
      if (error) throw error;
      return data;
    },
  });

  const { data: clicks, isLoading: clicksLoading } = useQuery({
    queryKey: ["ad-clicks-analytics"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("ad_clicks")
        .select("*, ad_creatives(name, campaign_id)")
        .gte("created_at", thirtyDaysAgo);
      if (error) throw error;
      return data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["ad-campaigns-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, name, budget, spent, status");
      if (error) throw error;
      return data;
    },
  });

  const { data: placements } = useQuery({
    queryKey: ["ad-placements-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_placements")
        .select("id, label, price_per_day");
      if (error) throw error;
      return data;
    },
  });

  const { data: creatives } = useQuery({
    queryKey: ["ad-creatives-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_creatives")
        .select("id, name, campaign_id, placement_id");
      if (error) throw error;
      return data;
    },
  });

  const isLoading = impressionsLoading || clicksLoading;

  // Calculate metrics
  const totalImpressions = impressions?.length || 0;
  const totalClicks = clicks?.length || 0;
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const totalRevenue = campaigns?.reduce((sum, c) => sum + (c.spent || 0), 0) || 0;

  // Daily performance data
  const dailyData = Array.from({ length: 30 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 29 - i));
    const dateStr = format(date, "yyyy-MM-dd");
    const dayImpressions = impressions?.filter(imp => 
      format(new Date(imp.created_at), "yyyy-MM-dd") === dateStr
    ).length || 0;
    const dayClicks = clicks?.filter(c => 
      format(new Date(c.created_at), "yyyy-MM-dd") === dateStr
    ).length || 0;
    return {
      date: format(date, "MMM d"),
      impressions: dayImpressions,
      clicks: dayClicks,
      ctr: dayImpressions > 0 ? (dayClicks / dayImpressions * 100) : 0,
    };
  });

  // Campaign performance
  const campaignPerformance = campaigns?.map(campaign => {
    const campaignCreativeIds = creatives?.filter(c => c.campaign_id === campaign.id).map(c => c.id) || [];
    const campaignImpressions = impressions?.filter(imp => 
      campaignCreativeIds.includes(imp.creative_id)
    ).length || 0;
    const campaignClicks = clicks?.filter(c => 
      campaignCreativeIds.includes(c.creative_id)
    ).length || 0;
    return {
      name: campaign.name,
      impressions: campaignImpressions,
      clicks: campaignClicks,
      ctr: campaignImpressions > 0 ? (campaignClicks / campaignImpressions * 100).toFixed(2) : "0.00",
      budget: campaign.budget,
      spent: campaign.spent,
      status: campaign.status,
    };
  }) || [];

  // Placement performance
  const placementPerformance = placements?.map(placement => {
    const placementCreativeIds = creatives?.filter(c => c.placement_id === placement.id).map(c => c.id) || [];
    const placementImpressions = impressions?.filter(imp => 
      placementCreativeIds.includes(imp.creative_id)
    ).length || 0;
    const placementClicks = clicks?.filter(c => 
      placementCreativeIds.includes(c.creative_id)
    ).length || 0;
    return {
      name: placement.label,
      value: placementImpressions,
      clicks: placementClicks,
    };
  }).filter(p => p.value > 0) || [];

  // Top performing creatives
  const creativePerformance = creatives?.map(creative => {
    const creativeImpressions = impressions?.filter(imp => imp.creative_id === creative.id).length || 0;
    const creativeClicks = clicks?.filter(c => c.creative_id === creative.id).length || 0;
    const campaign = campaigns?.find(c => c.id === creative.campaign_id);
    return {
      name: creative.name,
      campaign: campaign?.name || "Unknown",
      impressions: creativeImpressions,
      clicks: creativeClicks,
      ctr: creativeImpressions > 0 ? (creativeClicks / creativeImpressions * 100).toFixed(2) : "0.00",
    };
  }).sort((a, b) => parseFloat(b.ctr) - parseFloat(a.ctr)).slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ctr}%</div>
            <p className="text-xs text-muted-foreground">Avg CTR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ad Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total spent</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Over Time
            </CardTitle>
            <CardDescription>Daily impressions and clicks (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="impressions" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="Impressions"
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  dot={false}
                  name="Clicks"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Impressions by Placement */}
        <Card>
          <CardHeader>
            <CardTitle>By Placement</CardTitle>
            <CardDescription>Impressions distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {placementPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={placementPerformance}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {placementPerformance.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Performance metrics by campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaignPerformance.map((campaign, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.ctr}%</TableCell>
                  <TableCell className="text-right">${campaign.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${campaign.spent.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {campaignPerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No campaign data yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Performing Creatives */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Creatives</CardTitle>
          <CardDescription>Ranked by click-through rate</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creative</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creativePerformance.map((creative, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{creative.name}</TableCell>
                  <TableCell>{creative.campaign}</TableCell>
                  <TableCell className="text-right">{creative.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{creative.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={parseFloat(creative.ctr) > 2 ? "default" : "secondary"}>
                      {creative.ctr}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {creativePerformance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No creative data yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdAnalytics;
