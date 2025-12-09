import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, DollarSign, Loader2, Eye, Clock, CheckCircle, XCircle, ArrowRight, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import EOIDetailView from "@/components/EOIDetailView";

const MySubmissions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eoiDetailSheet, setEoiDetailSheet] = useState<{ open: boolean; eoiId: string | null }>({
    open: false,
    eoiId: null,
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    });
  }, [navigate]);

  const { data: eoiSubmissions, isLoading: eoiLoading } = useQuery({
    queryKey: ["my-eoi-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eoi_submissions")
        .select(`
          *,
          property:properties(id, title, location, price),
          lead:leads(id, client_name, email)
        `)
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: offerSubmissions, isLoading: offerLoading } = useQuery({
    queryKey: ["my-offer-submissions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_submissions")
        .select(`
          *,
          property:properties(id, title, location, price),
          lead:leads(id, client_name, email)
        `)
        .eq("agent_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-warning/10 text-warning gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-success/10 text-success gap-1"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case "offer_submitted":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Offer Submitted</Badge>;
      case "offer_accepted":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Offer Accepted</Badge>;
      case "exchanged":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Exchanged</Badge>;
      case "settled":
        return <Badge variant="outline" className="bg-green-600/10 text-green-600 border-green-600/20">Settled</Badge>;
      default:
        return <Badge variant="outline">{stage || "Offer Submitted"}</Badge>;
    }
  };

  const filterByStatus = <T extends { status: string }>(items: T[] | undefined) => {
    if (!items) return [];
    if (statusFilter === "all") return items;
    return items.filter(item => item.status === statusFilter);
  };

  const isLoading = eoiLoading || offerLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const filteredEOIs = filterByStatus(eoiSubmissions);
  const filteredOffers = filterByStatus(offerSubmissions);

  const pendingCount = (eoiSubmissions?.filter(e => e.status === "pending").length || 0) + 
                       (offerSubmissions?.filter(o => o.status === "pending").length || 0);
  const approvedCount = (eoiSubmissions?.filter(e => e.status === "approved").length || 0) + 
                        (offerSubmissions?.filter(o => o.status === "approved").length || 0);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">My Submissions</h1>
            </div>
            <p className="text-muted-foreground">Track your EOIs and Sales Offers</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-muted/50 border-border/50">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total EOIs</p>
                  <p className="text-3xl font-display font-bold">{eoiSubmissions?.length || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                  <p className="text-3xl font-display font-bold">{offerSubmissions?.length || 0}</p>
                </div>
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-display font-bold text-warning">{pendingCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-3xl font-display font-bold text-success">{approvedCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="eoi" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="eoi" className="gap-2 data-[state=active]:bg-background">
              <FileText className="w-4 h-4" />
              EOI Submissions ({filteredEOIs.length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2 data-[state=active]:bg-background">
              <DollarSign className="w-4 h-4" />
              Sales Offers ({filteredOffers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eoi">
            <Card className="border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Lead</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Stage</TableHead>
                    <TableHead className="font-semibold">Submitted</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEOIs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-10 w-10 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No EOI submissions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEOIs.map((eoi: any, index: number) => (
                      <TableRow 
                        key={eoi.id}
                        className="hover:bg-muted/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{eoi.property?.title}</div>
                            <div className="text-sm text-muted-foreground">{eoi.property?.location}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{eoi.lead?.client_name}</div>
                            <div className="text-sm text-muted-foreground">{eoi.lead?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(eoi.status)}</TableCell>
                        <TableCell>{getStageBadge(eoi.stage)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(eoi.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEoiDetailSheet({ open: true, eoiId: eoi.id })}
                            title="View Full Details"
                          >
                            <FileSearch className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/properties/${eoi.property_id}`)}
                            className="gap-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card className="border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Lead</TableHead>
                    <TableHead className="font-semibold">Offer Amount</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Submitted</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOffers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <DollarSign className="h-10 w-10 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No offer submissions found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffers.map((offer: any, index: number) => (
                      <TableRow 
                        key={offer.id}
                        className="hover:bg-muted/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{offer.property?.title}</div>
                            <div className="text-sm text-muted-foreground">{offer.property?.location}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{offer.lead?.client_name}</div>
                            <div className="text-sm text-muted-foreground">{offer.lead?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-display font-semibold">
                            ${(Number(offer.offer_amount) / 1000000).toFixed(2)}M
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(offer.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(offer.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/properties/${offer.property_id}`)}
                            className="gap-1"
                          >
                            View
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* EOI Detail Sheet */}
        <Sheet open={eoiDetailSheet.open} onOpenChange={(open) => setEoiDetailSheet({ open, eoiId: open ? eoiDetailSheet.eoiId : null })}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>EOI Details</SheetTitle>
            </SheetHeader>
            {eoiDetailSheet.eoiId && <EOIDetailView eoiId={eoiDetailSheet.eoiId} />}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default MySubmissions;
