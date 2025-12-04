import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock, Eye, Activity, Globe, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay, differenceInMinutes } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#10b981', '#f59e0b', '#ef4444'];

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const PlatformAnalytics = () => {
  // Fetch user sessions for analytics
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["platform-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .order("session_start", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch page views for traffic analytics
  const { data: pageViews, isLoading: pageViewsLoading } = useQuery({
    queryKey: ["platform-page-views"],
    queryFn: async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .gte("viewed_at", thirtyDaysAgo)
        .order("viewed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch users list for display
  const { data: usersData } = useQuery({
    queryKey: ["platform-users-list"],
    queryFn: async () => {
      const response = await supabase.functions.invoke("list-users");
      if (response.error) throw response.error;
      return response.data?.users || [];
    },
  });

  const isLoading = sessionsLoading || pageViewsLoading;

  // Calculate overview stats
  const now = new Date();
  const fiveMinutesAgo = subDays(now, 0);
  fiveMinutesAgo.setMinutes(now.getMinutes() - 5);

  const onlineNow = sessions?.filter(s => 
    s.last_activity && differenceInMinutes(now, new Date(s.last_activity)) < 5 && !s.session_end
  ).length || 0;

  const totalSessions = sessions?.length || 0;
  
  const avgSessionDuration = sessions?.length 
    ? Math.floor(sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / sessions.length)
    : 0;

  const uniqueUsers = new Set(sessions?.map(s => s.user_id)).size;

  // User activity data (aggregated by user)
  const userActivityMap = new Map<string, { 
    totalTime: number; 
    sessions: number; 
    pagesViewed: number; 
    lastActivity: string;
  }>();

  sessions?.forEach(session => {
    const existing = userActivityMap.get(session.user_id) || {
      totalTime: 0,
      sessions: 0,
      pagesViewed: 0,
      lastActivity: session.last_activity || session.session_start,
    };
    
    userActivityMap.set(session.user_id, {
      totalTime: existing.totalTime + (session.duration_seconds || 0),
      sessions: existing.sessions + 1,
      pagesViewed: existing.pagesViewed + (session.pages_viewed || 0),
      lastActivity: new Date(session.last_activity || session.session_start) > new Date(existing.lastActivity)
        ? (session.last_activity || session.session_start)
        : existing.lastActivity,
    });
  });

  const userActivity = Array.from(userActivityMap.entries())
    .map(([userId, stats]) => {
      const userInfo = usersData?.find((u: any) => u.id === userId);
      return {
        userId,
        email: userInfo?.email || userId.slice(0, 8) + "...",
        ...stats,
      };
    })
    .sort((a, b) => b.totalTime - a.totalTime);

  // Page views over time (last 30 days)
  const pageViewsByDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const day = format(subDays(now, i), "MMM dd");
    pageViewsByDay.set(day, 0);
  }
  
  pageViews?.forEach(pv => {
    const day = format(new Date(pv.viewed_at), "MMM dd");
    if (pageViewsByDay.has(day)) {
      pageViewsByDay.set(day, (pageViewsByDay.get(day) || 0) + 1);
    }
  });

  const pageViewsChartData = Array.from(pageViewsByDay.entries()).map(([date, views]) => ({
    date,
    views,
  }));

  // Most visited pages
  const pagePathCounts = new Map<string, number>();
  pageViews?.forEach(pv => {
    const path = pv.page_path || "/";
    pagePathCounts.set(path, (pagePathCounts.get(path) || 0) + 1);
  });

  const popularPages = Array.from(pagePathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Traffic sources
  const referrerCounts = new Map<string, number>();
  pageViews?.forEach(pv => {
    let source = "Direct";
    if (pv.referrer) {
      try {
        const url = new URL(pv.referrer);
        source = url.hostname;
      } catch {
        source = pv.referrer;
      }
    }
    referrerCounts.set(source, (referrerCounts.get(source) || 0) + 1);
  });

  const trafficSources = Array.from(referrerCounts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onlineNow}</div>
            <p className="text-xs text-muted-foreground">Active in last 5 min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">{uniqueUsers} unique users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Session</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(avgSessionDuration)}</div>
            <p className="text-xs text-muted-foreground">Time on platform</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageViews?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Page Views Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Page Views Over Time
            </CardTitle>
            <CardDescription>Daily page views for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pageViewsChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
            <CardDescription>Where your visitors come from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficSources}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {trafficSources.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Most Popular Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Visited Pages</CardTitle>
          <CardDescription>Top 10 pages by view count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={popularPages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="path" 
                  width={150} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* User Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Activity Leaderboard</CardTitle>
          <CardDescription>Users ranked by time spent on platform</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Total Time</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Pages Viewed</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userActivity.slice(0, 20).map((user) => (
                <TableRow key={user.userId}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{formatDuration(user.totalTime)}</TableCell>
                  <TableCell>{user.sessions}</TableCell>
                  <TableCell>{user.pagesViewed}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.lastActivity), "MMM dd, HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
              {userActivity.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No user activity data yet
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

export default PlatformAnalytics;
