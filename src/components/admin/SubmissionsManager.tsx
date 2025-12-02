import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, DollarSign, Loader2, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const SubmissionsManager = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; type: "eoi" | "offer"; item: any }>({
    open: false,
    type: "eoi",
    item: null,
  });
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: eoiSubmissions, isLoading: eoiLoading } = useQuery({
    queryKey: ["admin-eoi-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eoi_submissions")
        .select(`
          *,
          property:properties(id, title, location, price),
          lead:leads(id, client_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: offerSubmissions, isLoading: offerLoading } = useQuery({
    queryKey: ["admin-offer-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_submissions")
        .select(`
          *,
          property:properties(id, title, location, price),
          lead:leads(id, client_name, email)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateEOIMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes, agentId, propertyTitle }: { id: string; status: string; reviewNotes: string; agentId: string; propertyTitle: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("eoi_submissions")
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      
      // Create notification for the agent
      await supabase.from("notifications").insert({
        user_id: agentId,
        title: `EOI ${status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your EOI for "${propertyTitle}" has been ${status}${reviewNotes ? `: ${reviewNotes}` : ""}`,
        type: status === "approved" ? "success" : "warning",
        link: "/my-submissions",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-eoi-submissions"] });
      toast.success("EOI updated successfully");
      setReviewDialog({ open: false, type: "eoi", item: null });
      setReviewNotes("");
    },
    onError: () => toast.error("Failed to update EOI"),
  });

  const updateOfferMutation = useMutation({
    mutationFn: async ({ id, status, reviewNotes, agentId, propertyTitle }: { id: string; status: string; reviewNotes: string; agentId: string; propertyTitle: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("offer_submissions")
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      
      // Create notification for the agent
      await supabase.from("notifications").insert({
        user_id: agentId,
        title: `Sales Offer ${status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your offer for "${propertyTitle}" has been ${status}${reviewNotes ? `: ${reviewNotes}` : ""}`,
        type: status === "approved" ? "success" : "warning",
        link: "/my-submissions",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offer-submissions"] });
      toast.success("Offer updated successfully");
      setReviewDialog({ open: false, type: "offer", item: null });
      setReviewNotes("");
    },
    onError: () => toast.error("Failed to update Offer"),
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

  const handleReview = (action: "approve" | "reject") => {
    const status = action === "approve" ? "approved" : "rejected";
    const agentId = reviewDialog.item.agent_id;
    const propertyTitle = reviewDialog.item.property?.title || "Property";
    
    if (reviewDialog.type === "eoi") {
      updateEOIMutation.mutate({ id: reviewDialog.item.id, status, reviewNotes, agentId, propertyTitle });
    } else {
      updateOfferMutation.mutate({ id: reviewDialog.item.id, status, reviewNotes, agentId, propertyTitle });
    }
  };

  const isLoading = eoiLoading || offerLoading;
  const filteredEOIs = filterByStatus(eoiSubmissions);
  const filteredOffers = filterByStatus(offerSubmissions);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const pendingCount = 
    (eoiSubmissions?.filter(e => e.status === "pending").length || 0) + 
    (offerSubmissions?.filter(o => o.status === "pending").length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
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
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>
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
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
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
                        <TableCell className="max-w-[150px] truncate">{eoi.notes || "-"}</TableCell>
                        <TableCell>{getStatusBadge(eoi.status)}</TableCell>
                        <TableCell>{format(new Date(eoi.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/properties/${eoi.property_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {eoi.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewDialog({ open: true, type: "eoi", item: eoi })}
                            >
                              Review
                            </Button>
                          )}
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
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/properties/${offer.property_id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {offer.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewDialog({ open: true, type: "offer", item: offer })}
                            >
                              Review
                            </Button>
                          )}
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

      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ ...reviewDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Review {reviewDialog.type === "eoi" ? "Expression of Interest" : "Sales Offer"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewDialog.item && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Property:</span>
                    <p className="font-medium">{reviewDialog.item.property?.title}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead:</span>
                    <p className="font-medium">{reviewDialog.item.lead?.client_name}</p>
                  </div>
                  {reviewDialog.type === "offer" && (
                    <div>
                      <span className="text-muted-foreground">Offer Amount:</span>
                      <p className="font-medium">${(Number(reviewDialog.item.offer_amount) / 1000000).toFixed(2)}M</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Submitted:</span>
                    <p className="font-medium">{format(new Date(reviewDialog.item.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
                {reviewDialog.item.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Agent Notes:</span>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">{reviewDialog.item.notes}</p>
                  </div>
                )}
                {reviewDialog.item.terms && (
                  <div>
                    <span className="text-sm text-muted-foreground">Offer Terms:</span>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">{reviewDialog.item.terms}</p>
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label>Review Notes (Optional)</Label>
              <Textarea
                placeholder="Add notes for the agent..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleReview("reject")}
              disabled={updateEOIMutation.isPending || updateOfferMutation.isPending}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleReview("approve")}
              disabled={updateEOIMutation.isPending || updateOfferMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubmissionsManager;