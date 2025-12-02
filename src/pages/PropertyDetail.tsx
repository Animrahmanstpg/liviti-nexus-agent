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
import { ArrowLeft, Bed, Bath, Maximize, MapPin, FileText, DollarSign, Loader2, Heart, FolderKanban, Share2, Calendar, Home, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFavorites } from "@/hooks/useFavorites";
import { useIsAdmin } from "@/hooks/useUserRole";
import PropertyDocuments from "@/components/PropertyDocuments";
import CommissionCalculator from "@/components/CommissionCalculator";
import { motion } from "framer-motion";

const PropertyDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useIsAdmin();

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
  const [submitting, setSubmitting] = useState(false);

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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
            </div>
            <p className="text-muted-foreground animate-pulse">Loading property details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
              <Home className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Property not found</h2>
            <p className="text-muted-foreground">The property you're looking for doesn't exist or has been removed.</p>
            <Link to="/properties">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Properties
              </Button>
            </Link>
          </motion.div>
        </div>
      </Layout>
    );
  }

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
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "reserved":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "sold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: property.title,
        text: `Check out this property: ${property.title}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header with back button */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Link to="/properties">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Badge className={`${getStatusColor(property.status)} capitalize font-medium`}>
                {property.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {property.type}
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{property.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{property.location}</span>
              </div>
              {property.project && (
                <Link 
                  to={`/projects/${property.project.id}`}
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="underline-offset-4 hover:underline">{property.project.name}</span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="rounded-full"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {user && (
              <Button
                size="icon"
                variant={isFav ? "default" : "outline"}
                onClick={handleFavoriteClick}
                className={`rounded-full ${isFav ? 'bg-rose-500 hover:bg-rose-600 border-rose-500' : ''}`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden group"
            >
              <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                <img
                  src={property.image || '/placeholder.svg'}
                  alt={property.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Quick stats overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-6 text-white">
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    <span className="font-semibold">{property.bedrooms} Beds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5" />
                    <span className="font-semibold">{property.bathrooms} Baths</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="h-5 w-5" />
                    <span className="font-semibold">{property.area.toLocaleString()} sqft</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Property Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">About this Property</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground leading-relaxed">{property.description}</p>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 text-center group hover:border-primary/30 transition-colors">
                      <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Bed className="h-6 w-6 text-primary mx-auto mb-2" />
                      <span className="block text-3xl font-bold">{property.bedrooms}</span>
                      <span className="text-sm text-muted-foreground">Bedrooms</span>
                    </div>
                    <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 text-center group hover:border-primary/30 transition-colors">
                      <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Bath className="h-6 w-6 text-primary mx-auto mb-2" />
                      <span className="block text-3xl font-bold">{property.bathrooms}</span>
                      <span className="text-sm text-muted-foreground">Bathrooms</span>
                    </div>
                    <div className="relative p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10 text-center group hover:border-primary/30 transition-colors">
                      <div className="absolute inset-0 bg-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Maximize className="h-6 w-6 text-primary mx-auto mb-2" />
                      <span className="block text-3xl font-bold">{property.area.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">Sq. Ft.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Features Card */}
            {Array.isArray(property.features) && property.features.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">Features & Amenities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(property.features as string[]).map((feature, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Sticky Price Card */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:sticky lg:top-24"
            >
              <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <CardHeader className="pb-2 relative">
                  <p className="text-sm text-muted-foreground">Listed Price</p>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    ${(property.price / 1000000).toFixed(2)}M
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 relative">
                  <div className="space-y-3 py-4 border-y border-border/50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Property Type
                      </span>
                      <span className="font-medium capitalize">{property.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Status
                      </span>
                      <Badge className={`${getStatusColor(property.status)} capitalize`}>
                        {property.status}
                      </Badge>
                    </div>
                  </div>

                  {property.status === "available" && (
                    <div className="space-y-3 pt-2">
                      <Dialog open={eoiOpen} onOpenChange={setEoiOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full h-12 text-base font-semibold gap-2 shadow-lg shadow-primary/20">
                            <FileText className="h-5 w-5" />
                            Submit EOI
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
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
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit EOI"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full h-12 text-base font-semibold gap-2 border-2">
                            <DollarSign className="h-5 w-5" />
                            Submit Offer
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
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
                            <Button onClick={handleOfferSubmit} className="w-full" disabled={submitting}>
                              {submitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                "Submit Offer"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents & Calculator below sticky card */}
              <div className="space-y-6 mt-6">
                {id && <PropertyDocuments propertyId={id} canUpload={isAdmin} />}
                {user && <CommissionCalculator defaultPrice={property.price} />}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PropertyDetail;
