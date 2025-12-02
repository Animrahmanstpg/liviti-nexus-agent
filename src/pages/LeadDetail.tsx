import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User as UserIcon, Mail, Phone, DollarSign, Calendar, FileText, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [newNote, setNewNote] = useState("");
  const [interactionType, setInteractionType] = useState("note");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    });
  }, [navigate]);

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, property:properties(id, title, location)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: eoiSubmissions } = useQuery({
    queryKey: ["lead-eois", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eoi_submissions")
        .select("*, property:properties(id, title, location)")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: offerSubmissions } = useQuery({
    queryKey: ["lead-offers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_submissions")
        .select("*, property:properties(id, title, location)")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: interactions } = useQuery({
    queryKey: ["lead-interactions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_interactions")
        .select("*")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  const addInteraction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_interactions").insert({
        lead_id: id!,
        user_id: user!.id,
        type: interactionType,
        notes: newNote,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-interactions", id] });
      setNewNote("");
      toast({ title: "Interaction added" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, last_contact: new Date().toISOString() })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      toast({ title: "Status updated" });
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      qualified: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      proposal: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      won: "bg-green-500/10 text-green-500 border-green-500/20",
      lost: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const getSubmissionStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      approved: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  if (leadLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lead not found</p>
          <Button onClick={() => navigate("/leads")} className="mt-4">Back to Leads</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{lead.client_name}</h1>
            <p className="text-muted-foreground">Lead Details</p>
          </div>
          <Select value={lead.status} onValueChange={(v) => updateStatus.mutate(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="w-5 h-5 text-muted-foreground" />
                <span>{lead.client_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <span>Budget: ${(Number(lead.budget) / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span>Created: {format(new Date(lead.created_at!), "MMM d, yyyy")}</span>
              </div>
              {lead.last_contact && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span>Last Contact: {format(new Date(lead.last_contact), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {getStatusBadge(lead.status)}
              </div>
              {lead.notes && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{lead.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  EOI Submissions ({eoiSubmissions?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eoiSubmissions?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No EOI submissions</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eoiSubmissions?.map((eoi: any) => (
                        <TableRow key={eoi.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/properties/${eoi.property_id}`)}>
                          <TableCell>{eoi.property?.title}</TableCell>
                          <TableCell>{getSubmissionStatusBadge(eoi.status)}</TableCell>
                          <TableCell>{format(new Date(eoi.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Sales Offers ({offerSubmissions?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {offerSubmissions?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No offer submissions</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offerSubmissions?.map((offer: any) => (
                        <TableRow key={offer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/properties/${offer.property_id}`)}>
                          <TableCell>{offer.property?.title}</TableCell>
                          <TableCell>${(Number(offer.offer_amount) / 1000000).toFixed(2)}M</TableCell>
                          <TableCell>{getSubmissionStatusBadge(offer.status)}</TableCell>
                          <TableCell>{format(new Date(offer.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Interaction History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={interactionType} onValueChange={setInteractionType}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea 
                    placeholder="Add a note..." 
                    value={newNote} 
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 min-h-[40px]"
                  />
                  <Button onClick={() => addInteraction.mutate()} disabled={!newNote.trim()}>Add</Button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {interactions?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No interactions yet</p>
                  ) : (
                    interactions?.map((interaction: any) => (
                      <div key={interaction.id} className="border rounded-lg p-3 bg-muted/30">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary" className="capitalize">{interaction.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(interaction.created_at), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm">{interaction.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeadDetail;