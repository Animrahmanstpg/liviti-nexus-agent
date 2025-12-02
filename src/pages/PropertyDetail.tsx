import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bed, Bath, Maximize, MapPin, FileText, DollarSign, Loader2, Heart, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useFavorites";

const PropertyDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);
  
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(`
          *,
          project:projects(id, name)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Track property view
  useEffect(() => {
    if (id) {
      const trackView = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase
          .from("property_views")
          .insert({
            property_id: id,
            user_id: user?.id || null
          });
      };

      trackView();
    }
  }, [id]);

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
  const [eoiOpen, setEoiOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [eoiNotes, setEoiNotes] = useState("");
  const [offerTerms, setOfferTerms] = useState("");

  const { isFavorite, addFavorite, removeFavorite } = useFavorites(user?.id);
  const isFav = property ? isFavorite(property.id) : false;

  const handleFavoriteClick = () => {
    if (!user || !property) return;

    if (isFav) {
      removeFavorite(property.id);
    } else {
      addFavorite(property.id);
    }
  };

  if (propertyLoading || leadsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">Property not found</h2>
            <Link to="/properties">
              <Button variant="outline">Back to Properties</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const [submitting, setSubmitting] = useState(false);

  const handleEOISubmit = async () => {
    if (!selectedLead) {
      toast.error("Please select a lead");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to submit an EOI");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("eoi_submissions").insert({
        property_id: id,
        lead_id: selectedLead,
        agent_id: user.id,
        notes: eoiNotes || null,
      });

      if (error) throw error;

      toast.success("Expression of Interest submitted successfully!");
      setEoiOpen(false);
      setSelectedLead("");
      setEoiNotes("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit EOI");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOfferSubmit = async () => {
    if (!selectedLead || !offerAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to submit an offer");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("offer_submissions").insert({
        property_id: id,
        lead_id: selectedLead,
        agent_id: user.id,
        offer_amount: parseFloat(offerAmount),
        terms: offerTerms || null,
      });

      if (error) throw error;

      toast.success("Sales offer submitted successfully!");
      setOfferOpen(false);
      setSelectedLead("");
      setOfferAmount("");
      setOfferTerms("");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit offer");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-success/10 text-success border-success/20";
      case "reserved":
        return "bg-accent/10 text-accent border-accent/20";
      case "sold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{property.title}</h1>
            <div className="mt-1 flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center">
                <MapPin className="mr-1 h-4 w-4" />
                {property.location}
              </div>
              {property.project && (
                <>
                  <span>•</span>
                  <Link 
                    to={`/projects/${property.project.id}`}
                    className="flex items-center hover:text-primary hover:underline"
                  >
                    <FolderKanban className="mr-1 h-4 w-4" />
                    {property.project.name}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
            {user && (
              <Button
                size="lg"
                variant={isFav ? "default" : "outline"}
                onClick={handleFavoriteClick}
                className="gap-2"
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? "Saved" : "Save"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={property.image}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{property.description}</p>
                
                <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                  <div className="flex flex-col items-center gap-2">
                    <Bed className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{property.bedrooms}</span>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Bath className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{property.bathrooms}</span>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Maximize className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">{property.area}</span>
                    <span className="text-sm text-muted-foreground">Sqft</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Features & Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Array.isArray(property.features) && (property.features as string[]).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border p-3">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 text-4xl font-bold text-primary">
                  ${(property.price / 1000000).toFixed(2)}M
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="font-medium capitalize">{property.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium capitalize">{property.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Property ID:</span>
                    <span className="font-medium">#{property.id}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {property.status === "available" && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Dialog open={eoiOpen} onOpenChange={setEoiOpen}>
                    <DialogTrigger asChild>
                      <Button variant="default" className="w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        Submit EOI
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Expression of Interest</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="lead-select">Select Lead</Label>
                          <Select value={selectedLead} onValueChange={setSelectedLead}>
                            <SelectTrigger id="lead-select">
                              <SelectValue placeholder="Choose a lead" />
                            </SelectTrigger>
                            <SelectContent>
                              {leads?.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  {lead.client_name} - ${(Number(lead.budget) / 1000000).toFixed(1)}M
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="eoi-notes">Notes (Optional)</Label>
                          <Textarea
                            id="eoi-notes"
                            placeholder="Add any additional information..."
                            value={eoiNotes}
                            onChange={(e) => setEoiNotes(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <Button onClick={handleEOISubmit} className="w-full" disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit EOI"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
                    <DialogTrigger asChild>
                      <Button variant="accent" className="w-full">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Submit Offer
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Sales Offer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="offer-lead">Select Lead</Label>
                          <Select value={selectedLead} onValueChange={setSelectedLead}>
                            <SelectTrigger id="offer-lead">
                              <SelectValue placeholder="Choose a lead" />
                            </SelectTrigger>
                            <SelectContent>
                              {leads?.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  {lead.client_name} - ${(Number(lead.budget) / 1000000).toFixed(1)}M
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="offer-amount">Offer Amount ($)</Label>
                          <Input
                            id="offer-amount"
                            type="number"
                            placeholder="Enter offer amount"
                            value={offerAmount}
                            onChange={(e) => setOfferAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="offer-terms">Terms & Conditions (Optional)</Label>
                          <Textarea
                            id="offer-terms"
                            placeholder="Enter offer terms..."
                            value={offerTerms}
                            onChange={(e) => setOfferTerms(e.target.value)}
                            rows={4}
                          />
                        </div>
                        <Button onClick={handleOfferSubmit} variant="accent" className="w-full" disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit Offer"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PropertyDetail;
