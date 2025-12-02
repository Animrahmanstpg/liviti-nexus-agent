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
import { FileText, DollarSign, Loader2, Eye, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const MySubmissions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  const filteredEOIs = filterByStatus(eoiSubmissions);
  const filteredOffers = filterByStatus(offerSubmissions);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Submissions</h1>
            <p className="text-muted-foreground">Track your EOIs and Sales Offers</p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total EOIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{eoiSubmissions?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Offers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offerSubmissions?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {(eoiSubmissions?.filter(e => e.status === "pending").length || 0) + 
                 (offerSubmissions?.filter(o => o.status === "pending").length || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="eoi" className="space-y-4">
          <TabsList>
            <TabsTrigger value="eoi" className="gap-2">
              <FileText className="w-4 h-4" />
              EOI Submissions ({filteredEOIs.length})
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Sales Offers ({filteredOffers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eoi">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Review Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEOIs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No EOI submissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEOIs.map((eoi: any) => (
                        <TableRow key={eoi.id}>
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
                          <TableCell>{format(new Date(eoi.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {eoi.review_notes || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/properties/${eoi.property_id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="offers">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Offer Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No offer submissions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOffers.map((offer: any) => (
                        <TableRow key={offer.id}>
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
                          <TableCell className="font-medium">
                            ${(Number(offer.offer_amount) / 1000000).toFixed(2)}M
                          </TableCell>
                          <TableCell>{getStatusBadge(offer.status)}</TableCell>
                          <TableCell>{format(new Date(offer.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/properties/${offer.property_id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default MySubmissions;