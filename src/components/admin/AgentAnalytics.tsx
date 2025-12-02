import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, Award, Target, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const AgentAnalytics = () => {
  const { data: eoiSubmissions, isLoading: eoiLoading } = useQuery({
    queryKey: ["all-eoi-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eoi_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: offerSubmissions, isLoading: offerLoading } = useQuery({
    queryKey: ["all-offer-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["agent-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .in("role", ["agent", "admin"]);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = eoiLoading || offerLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Calculate agent statistics
  const agentStats = new Map<string, {
    totalEOIs: number;
    approvedEOIs: number;
    rejectedEOIs: number;
    pendingEOIs: number;
    totalOffers: number;
    approvedOffers: number;
    rejectedOffers: number;
    pendingOffers: number;
    totalOfferValue: number;
    approvedOfferValue: number;
  }>();

  eoiSubmissions?.forEach((eoi) => {
    const stats = agentStats.get(eoi.agent_id) || {
      totalEOIs: 0, approvedEOIs: 0, rejectedEOIs: 0, pendingEOIs: 0,
      totalOffers: 0, approvedOffers: 0, rejectedOffers: 0, pendingOffers: 0,
      totalOfferValue: 0, approvedOfferValue: 0,
    };
    stats.totalEOIs++;
    if (eoi.status === "approved") stats.approvedEOIs++;
    else if (eoi.status === "rejected") stats.rejectedEOIs++;
    else stats.pendingEOIs++;
    agentStats.set(eoi.agent_id, stats);
  });

  offerSubmissions?.forEach((offer) => {
    const stats = agentStats.get(offer.agent_id) || {
      totalEOIs: 0, approvedEOIs: 0, rejectedEOIs: 0, pendingEOIs: 0,
      totalOffers: 0, approvedOffers: 0, rejectedOffers: 0, pendingOffers: 0,
      totalOfferValue: 0, approvedOfferValue: 0,
    };
    stats.totalOffers++;
    stats.totalOfferValue += Number(offer.offer_amount);
    if (offer.status === "approved") {
      stats.approvedOffers++;
      stats.approvedOfferValue += Number(offer.offer_amount);
    } else if (offer.status === "rejected") {
      stats.rejectedOffers++;
    } else {
      stats.pendingOffers++;
    }
    agentStats.set(offer.agent_id, stats);
  });

  // Convert to array and sort by total activity
  const agentStatsArray = Array.from(agentStats.entries())
    .map(([agentId, stats]) => ({ agentId, ...stats }))
    .sort((a, b) => (b.totalEOIs + b.totalOffers) - (a.totalEOIs + a.totalOffers));

  // Overall stats
  const overallStats = {
    totalEOIs: eoiSubmissions?.length || 0,
    approvedEOIs: eoiSubmissions?.filter((e) => e.status === "approved").length || 0,
    totalOffers: offerSubmissions?.length || 0,
    approvedOffers: offerSubmissions?.filter((o) => o.status === "approved").length || 0,
    totalOfferValue: offerSubmissions?.reduce((sum, o) => sum + Number(o.offer_amount), 0) || 0,
    approvedOfferValue: offerSubmissions?.filter((o) => o.status === "approved").reduce((sum, o) => sum + Number(o.offer_amount), 0) || 0,
  };

  const eoiSuccessRate = overallStats.totalEOIs > 0 
    ? ((overallStats.approvedEOIs / overallStats.totalEOIs) * 100).toFixed(1) 
    : "0";
  const offerSuccessRate = overallStats.totalOffers > 0 
    ? ((overallStats.approvedOffers / overallStats.totalOffers) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              EOI Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{eoiSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">{overallStats.approvedEOIs} of {overallStats.totalEOIs} approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Offer Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{offerSuccessRate}%</div>
            <p className="text-xs text-muted-foreground">{overallStats.approvedOffers} of {overallStats.totalOffers} approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Total Offer Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(overallStats.totalOfferValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Across all submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Approved Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">${(overallStats.approvedOfferValue / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-muted-foreground">Successful deals</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Agent Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Agent ID</TableHead>
                <TableHead className="text-center">EOIs</TableHead>
                <TableHead className="text-center">EOI Rate</TableHead>
                <TableHead className="text-center">Offers</TableHead>
                <TableHead className="text-center">Offer Rate</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentStatsArray.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No agent activity yet
                  </TableCell>
                </TableRow>
              ) : (
                agentStatsArray.map((agent, index) => {
                  const eoiRate = agent.totalEOIs > 0 
                    ? ((agent.approvedEOIs / agent.totalEOIs) * 100).toFixed(0) 
                    : "0";
                  const offerRate = agent.totalOffers > 0 
                    ? ((agent.approvedOffers / agent.totalOffers) * 100).toFixed(0) 
                    : "0";
                  return (
                    <TableRow key={agent.agentId}>
                      <TableCell>
                        {index === 0 && <Badge className="bg-yellow-500 text-yellow-950">🥇</Badge>}
                        {index === 1 && <Badge className="bg-gray-300 text-gray-800">🥈</Badge>}
                        {index === 2 && <Badge className="bg-amber-600 text-amber-950">🥉</Badge>}
                        {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {agent.agentId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-500">{agent.approvedEOIs}</span>
                        <span className="text-muted-foreground"> / {agent.totalEOIs}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={Number(eoiRate) >= 50 ? "bg-green-500/10 text-green-500" : ""}>
                          {eoiRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-500">{agent.approvedOffers}</span>
                        <span className="text-muted-foreground"> / {agent.totalOffers}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={Number(offerRate) >= 50 ? "bg-green-500/10 text-green-500" : ""}>
                          {offerRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(agent.totalOfferValue / 1000000).toFixed(2)}M
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentAnalytics;