import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, User as UserIcon, Users, Scale, DollarSign, FileUp, 
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, Upload, X, Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Property {
  id: string;
  title: string;
  price: number;
  project?: { id: string; name: string } | null;
}

interface EOIFormProps {
  property: Property;
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

const STEPS = [
  { id: 1, title: "Property", icon: Building2 },
  { id: 2, title: "Purchaser", icon: UserIcon },
  { id: 3, title: "Solicitor", icon: Scale },
  { id: 4, title: "Sales", icon: DollarSign },
  { id: 5, title: "Documents", icon: FileUp },
];

const EOIForm = ({ property, user, onSuccess, onCancel }: EOIFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Purchaser 1 state
  const [purchaser1, setPurchaser1] = useState({
    name: "",
    email: "",
    mobile: "",
    isSmsf: false,
    streetAddress: "",
    suburb: "",
    postcode: "",
    state: "",
  });

  // Purchaser 2 state
  const [hasPurchaser2, setHasPurchaser2] = useState(false);
  const [purchaser2, setPurchaser2] = useState({
    name: "",
    email: "",
    mobile: "",
    isSmsf: false,
    streetAddress: "",
    suburb: "",
    postcode: "",
    state: "",
  });

  // Solicitor state
  const [solicitor, setSolicitor] = useState({
    company: "",
    contactName: "",
    serviceAddress: "",
    email: "",
    phoneNumber: "",
  });

  // Sales details state
  const [salesDetails, setSalesDetails] = useState({
    depositPercent: "10",
    firbStatus: "na",
    holdingDeposit: "",
    specialCondition: "",
  });

  // Documents state
  const [holdingDepositReceipt, setHoldingDepositReceipt] = useState<File | null>(null);
  const [purchaser1Id, setPurchaser1Id] = useState<File | null>(null);
  const [purchaser2Id, setPurchaser2Id] = useState<File | null>(null);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("eoi-documents")
      .upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return data.path;
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!purchaser1.name || !purchaser1.email || !purchaser1.mobile || 
        !purchaser1.streetAddress || !purchaser1.suburb || !purchaser1.postcode || !purchaser1.state) {
      toast.error("Please fill in all required Purchaser 1 fields");
      setCurrentStep(2);
      return;
    }

    if (!solicitor.company || !solicitor.contactName || !solicitor.email || !solicitor.phoneNumber) {
      toast.error("Please fill in all required Solicitor fields");
      setCurrentStep(3);
      return;
    }

    if (!purchaser1Id) {
      toast.error("Please upload Purchaser 1 ID");
      setCurrentStep(5);
      return;
    }

    if (hasPurchaser2 && !purchaser2Id) {
      toast.error("Please upload Purchaser 2 ID");
      setCurrentStep(5);
      return;
    }

    setSubmitting(true);

    try {
      // Upload documents
      const timestamp = Date.now();
      const basePath = `${user.id}/${timestamp}`;

      let holdingReceiptPath: string | null = null;
      let p1IdPath: string | null = null;
      let p2IdPath: string | null = null;

      if (holdingDepositReceipt) {
        holdingReceiptPath = await uploadFile(holdingDepositReceipt, `${basePath}/holding-deposit-receipt.${holdingDepositReceipt.name.split('.').pop()}`);
      }

      p1IdPath = await uploadFile(purchaser1Id, `${basePath}/purchaser-1-id.${purchaser1Id.name.split('.').pop()}`);

      if (hasPurchaser2 && purchaser2Id) {
        p2IdPath = await uploadFile(purchaser2Id, `${basePath}/purchaser-2-id.${purchaser2Id.name.split('.').pop()}`);
      }

      // Create EOI submission
      const { data: eoiData, error: eoiError } = await supabase
        .from("eoi_submissions")
        .insert({
          property_id: property.id,
          agent_id: user.id,
          lead_id: null,
          deposit_percent: parseFloat(salesDetails.depositPercent),
          firb_status: salesDetails.firbStatus,
          holding_deposit: salesDetails.holdingDeposit ? parseFloat(salesDetails.holdingDeposit) : null,
          special_condition: salesDetails.specialCondition || null,
          holding_deposit_receipt_path: holdingReceiptPath,
          purchaser_1_id_path: p1IdPath,
          purchaser_2_id_path: p2IdPath,
        } as any)
        .select()
        .single();

      if (eoiError) throw eoiError;

      // Insert purchaser 1
      const { error: p1Error } = await supabase
        .from("eoi_purchasers")
        .insert({
          eoi_id: eoiData.id,
          purchaser_number: 1,
          name: purchaser1.name,
          email: purchaser1.email,
          mobile: purchaser1.mobile,
          is_smsf: purchaser1.isSmsf,
          street_address: purchaser1.streetAddress,
          suburb: purchaser1.suburb,
          postcode: purchaser1.postcode,
          state: purchaser1.state,
        });

      if (p1Error) throw p1Error;

      // Insert purchaser 2 if applicable
      if (hasPurchaser2) {
        const { error: p2Error } = await supabase
          .from("eoi_purchasers")
          .insert({
            eoi_id: eoiData.id,
            purchaser_number: 2,
            name: purchaser2.name,
            email: purchaser2.email,
            mobile: purchaser2.mobile,
            is_smsf: purchaser2.isSmsf,
            street_address: purchaser2.streetAddress,
            suburb: purchaser2.suburb,
            postcode: purchaser2.postcode,
            state: purchaser2.state,
          });

        if (p2Error) throw p2Error;
      }

      // Insert solicitor
      const { error: solicitorError } = await supabase
        .from("eoi_solicitors")
        .insert({
          eoi_id: eoiData.id,
          company: solicitor.company,
          contact_name: solicitor.contactName,
          service_address: solicitor.serviceAddress || null,
          email: solicitor.email,
          phone_number: solicitor.phoneNumber,
        });

      if (solicitorError) throw solicitorError;

      toast.success("Expression of Interest submitted successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("EOI submission error:", error);
      toast.error(error.message || "Failed to submit EOI");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const FileUploadField = ({ 
    label, 
    file, 
    setFile, 
    required = false 
  }: { 
    label: string; 
    file: File | null; 
    setFile: (f: File | null) => void;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {file ? (
        <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
          <FileUp className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to upload</span>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );

  const renderPurchaserFields = (
    purchaser: typeof purchaser1,
    setPurchaser: typeof setPurchaser1,
    number: number
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`p${number}-name`}>
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-name`}
            value={purchaser.name}
            onChange={(e) => setPurchaser({ ...purchaser, name: e.target.value })}
            placeholder="Enter full legal name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-email`}>
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-email`}
            type="email"
            value={purchaser.email}
            onChange={(e) => setPurchaser({ ...purchaser, email: e.target.value })}
            placeholder="email@example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`p${number}-mobile`}>
            Mobile <span className="text-destructive">*</span>
          </Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
              +61
            </span>
            <Input
              id={`p${number}-mobile`}
              value={purchaser.mobile}
              onChange={(e) => setPurchaser({ ...purchaser, mobile: e.target.value })}
              placeholder="4XX XXX XXX"
              className="rounded-l-none"
            />
          </div>
        </div>
        <div className="flex items-end">
          <div className="flex items-center space-x-2 h-10">
            <Checkbox
              id={`p${number}-smsf`}
              checked={purchaser.isSmsf}
              onCheckedChange={(checked) => setPurchaser({ ...purchaser, isSmsf: checked === true })}
            />
            <Label htmlFor={`p${number}-smsf`} className="text-sm font-normal cursor-pointer">
              SMSF Purchase
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor={`p${number}-street`}>
          Street Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`p${number}-street`}
          value={purchaser.streetAddress}
          onChange={(e) => setPurchaser({ ...purchaser, streetAddress: e.target.value })}
          placeholder="123 Example Street"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`p${number}-suburb`}>
            Suburb <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-suburb`}
            value={purchaser.suburb}
            onChange={(e) => setPurchaser({ ...purchaser, suburb: e.target.value })}
            placeholder="Suburb"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-postcode`}>
            Postcode <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-postcode`}
            value={purchaser.postcode}
            onChange={(e) => setPurchaser({ ...purchaser, postcode: e.target.value })}
            placeholder="2000"
            maxLength={4}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-state`}>
            State <span className="text-destructive">*</span>
          </Label>
          <Select
            value={purchaser.state}
            onValueChange={(value) => setPurchaser({ ...purchaser, state: value })}
          >
            <SelectTrigger id={`p${number}-state`}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {AUSTRALIAN_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                currentStep === step.id ? "text-primary" : currentStep > step.id ? "text-success" : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                currentStep === step.id 
                  ? "border-primary bg-primary/10" 
                  : currentStep > step.id 
                    ? "border-success bg-success/10"
                    : "border-muted-foreground/30"
              )}>
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.title}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className={cn(
                "w-8 md:w-16 h-0.5 mx-2",
                currentStep > step.id ? "bg-success" : "bg-border"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          {/* Step 1: Property Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Project</Label>
                    <p className="font-medium">{property.project?.name || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm">Property</Label>
                    <p className="font-medium">{property.title}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-sm">Price</Label>
                    <p className="text-2xl font-bold text-primary">
                      ${property.price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Purchaser Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary" />
                  Purchaser 1 Details
                </CardTitle>
              </CardHeader>
              {renderPurchaserFields(purchaser1, setPurchaser1, 1)}

              <Separator className="my-6" />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-purchaser-2"
                  checked={hasPurchaser2}
                  onCheckedChange={(checked) => setHasPurchaser2(checked === true)}
                />
                <Label htmlFor="add-purchaser-2" className="cursor-pointer flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Add Purchaser 2
                </Label>
              </div>

              {hasPurchaser2 && (
                <div className="mt-6 space-y-6">
                  <h3 className="font-semibold flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    Purchaser 2 Details
                  </h3>
                  {renderPurchaserFields(purchaser2, setPurchaser2, 2)}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Solicitor Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Solicitor Details
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="solicitor-company">
                    Company / Firm <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-company"
                    value={solicitor.company}
                    onChange={(e) => setSolicitor({ ...solicitor, company: e.target.value })}
                    placeholder="Law firm name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solicitor-contact">
                    Contact Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-contact"
                    value={solicitor.contactName}
                    onChange={(e) => setSolicitor({ ...solicitor, contactName: e.target.value })}
                    placeholder="Solicitor name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="solicitor-address">Service Address</Label>
                <Input
                  id="solicitor-address"
                  value={solicitor.serviceAddress}
                  onChange={(e) => setSolicitor({ ...solicitor, serviceAddress: e.target.value })}
                  placeholder="Service address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="solicitor-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-email"
                    type="email"
                    value={solicitor.email}
                    onChange={(e) => setSolicitor({ ...solicitor, email: e.target.value })}
                    placeholder="solicitor@lawfirm.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solicitor-phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-phone"
                    value={solicitor.phoneNumber}
                    onChange={(e) => setSolicitor({ ...solicitor, phoneNumber: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Sales Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Sales Details
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit-percent">Deposit %</Label>
                  <Input
                    id="deposit-percent"
                    type="number"
                    value={salesDetails.depositPercent}
                    onChange={(e) => setSalesDetails({ ...salesDetails, depositPercent: e.target.value })}
                    placeholder="10"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firb-status">FIRB</Label>
                  <Select
                    value={salesDetails.firbStatus}
                    onValueChange={(value) => setSalesDetails({ ...salesDetails, firbStatus: value })}
                  >
                    <SelectTrigger id="firb-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="na">N/A</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="holding-deposit">Holding Deposit ($)</Label>
                <Input
                  id="holding-deposit"
                  type="number"
                  value={salesDetails.holdingDeposit}
                  onChange={(e) => setSalesDetails({ ...salesDetails, holdingDeposit: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="special-condition">Special Condition</Label>
                <Textarea
                  id="special-condition"
                  value={salesDetails.specialCondition}
                  onChange={(e) => setSalesDetails({ ...salesDetails, specialCondition: e.target.value })}
                  placeholder="Enter any special conditions..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Step 5: Documents */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-primary" />
                  Documents
                </CardTitle>
              </CardHeader>

              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-medium mb-2">Bank Account for Holding Deposit</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Account Name: Liviti Property Trust</p>
                  <p>BSB: 062-000</p>
                  <p>Account: 1234 5678</p>
                  <p>Reference: {property.title.substring(0, 20)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUploadField
                  label="Holding Deposit Receipt"
                  file={holdingDepositReceipt}
                  setFile={setHoldingDepositReceipt}
                />
                <FileUploadField
                  label="Purchaser 1 ID"
                  file={purchaser1Id}
                  setFile={setPurchaser1Id}
                  required
                />
              </div>

              {hasPurchaser2 && (
                <FileUploadField
                  label="Purchaser 2 ID"
                  file={purchaser2Id}
                  setFile={setPurchaser2Id}
                  required
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={currentStep === 1 ? onCancel : prevStep}>
          {currentStep === 1 ? "Cancel" : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </>
          )}
        </Button>
        {currentStep < 5 ? (
          <Button onClick={nextStep}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit EOI
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EOIForm;
