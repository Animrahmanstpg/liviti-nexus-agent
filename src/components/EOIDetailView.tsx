import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, User as UserIcon, Scale, DollarSign, FileUp, 
  Download, ExternalLink, Clock, CheckCircle, XCircle, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface EOIDetailViewProps {
  eoiId: string;
  onClose?: () => void;
}

const EOIDetailView = ({ eoiId, onClose }: EOIDetailViewProps) => {
  const [loading, setLoading] = useState(true);
  const [eoi, setEoi] = useState<any>(null);
  const [purchasers, setPurchasers] = useState<any[]>([]);
  const [solicitor, setSolicitor] = useState<any>(null);

  useEffect(() => {
    const fetchEOIDetails = async () => {
      setLoading(true);
      try {
        // Fetch EOI submission with property
        const { data: eoiData, error: eoiError } = await supabase
          .from("eoi_submissions")
          .select(`
            *,
            property:properties(id, title, location, price, project:projects(name))
          `)
          .eq("id", eoiId)
          .single();

        if (eoiError) throw eoiError;
        setEoi(eoiData);

        // Fetch purchasers
        const { data: purchasersData, error: purchasersError } = await supabase
          .from("eoi_purchasers")
          .select("*")
          .eq("eoi_id", eoiId)
          .order("purchaser_number");

        if (!purchasersError) setPurchasers(purchasersData || []);

        // Fetch solicitor
        const { data: solicitorData, error: solicitorError } = await supabase
          .from("eoi_solicitors")
          .select("*")
          .eq("eoi_id", eoiId)
          .single();

        if (!solicitorError) setSolicitor(solicitorData);
      } catch (error) {
        console.error("Error fetching EOI details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEOIDetails();
  }, [eoiId]);

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

  const getDocumentUrl = async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage.from("eoi-documents").createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleDownloadDocument = async (path: string, filename: string) => {
    const url = await getDocumentUrl(path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eoi) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        EOI not found
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">EOI Details</h2>
          <p className="text-sm text-muted-foreground">
            Submitted {format(new Date(eoi.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        {getStatusBadge(eoi.status)}
      </div>

      {/* Property Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Project:</span>
              <p className="font-medium">{eoi.property?.project?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Property:</span>
              <p className="font-medium">{eoi.property?.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>
              <p className="font-medium">{eoi.property?.location}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Price:</span>
              <p className="font-medium text-primary">${eoi.property?.price?.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchasers */}
      {purchasers.map((purchaser, index) => (
        <Card key={purchaser.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-primary" />
              Purchaser {purchaser.purchaser_number}
              {purchaser.is_smsf && <Badge variant="outline" className="text-xs">SMSF</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{purchaser.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{purchaser.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Mobile:</span>
                <p className="font-medium">+61 {purchaser.mobile}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span>
                <p className="font-medium">
                  {purchaser.street_address}, {purchaser.suburb} {purchaser.state} {purchaser.postcode}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Solicitor */}
      {solicitor && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Solicitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>
                <p className="font-medium">{solicitor.company}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Contact:</span>
                <p className="font-medium">{solicitor.contact_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{solicitor.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{solicitor.phone_number}</p>
              </div>
              {solicitor.service_address && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Service Address:</span>
                  <p className="font-medium">{solicitor.service_address}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Sales Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Deposit:</span>
              <p className="font-medium">{eoi.deposit_percent}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">FIRB:</span>
              <p className="font-medium uppercase">{eoi.firb_status || "N/A"}</p>
            </div>
            {eoi.holding_deposit && (
              <div>
                <span className="text-muted-foreground">Holding Deposit:</span>
                <p className="font-medium">${Number(eoi.holding_deposit).toLocaleString()}</p>
              </div>
            )}
            {eoi.special_condition && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Special Condition:</span>
                <p className="font-medium">{eoi.special_condition}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {eoi.holding_deposit_receipt_path && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Holding Deposit Receipt</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDownloadDocument(eoi.holding_deposit_receipt_path, "holding-deposit-receipt")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
            {eoi.purchaser_1_id_path && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Purchaser 1 ID</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDownloadDocument(eoi.purchaser_1_id_path, "purchaser-1-id")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
            {eoi.purchaser_2_id_path && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Purchaser 2 ID</span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDownloadDocument(eoi.purchaser_2_id_path, "purchaser-2-id")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            )}
            {!eoi.holding_deposit_receipt_path && !eoi.purchaser_1_id_path && !eoi.purchaser_2_id_path && (
              <p className="text-sm text-muted-foreground text-center py-2">No documents uploaded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Notes */}
      {eoi.review_notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{eoi.review_notes}</p>
            {eoi.reviewed_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Reviewed on {format(new Date(eoi.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EOIDetailView;
