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
  Loader2, ChevronRight, ChevronLeft, CheckCircle2, Upload, X, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Australian validation schemas
const australianPostcodeRegex = /^[0-9]{4}$/;
const australianMobileRegex = /^4[0-9]{8}$/; // Australian mobile without +61 prefix
const australianPhoneRegex = /^(0[2-9][0-9]{8}|4[0-9]{8}|[0-9]{8,10})$/;

const purchaserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobile: z.string().regex(australianMobileRegex, "Enter 9 digits starting with 4 (e.g., 412345678)"),
  isSmsf: z.boolean(),
  streetAddress: z.string().min(5, "Enter a valid street address"),
  suburb: z.string().min(2, "Enter a valid suburb"),
  postcode: z.string().regex(australianPostcodeRegex, "Enter a 4-digit Australian postcode"),
  state: z.string().min(2, "Select a state"),
});

const solicitorSchema = z.object({
  company: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  serviceAddress: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(8, "Enter a valid phone number"),
});

const salesSchema = z.object({
  depositPercent: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, "Deposit must be between 0 and 100%"),
  firbStatus: z.string(),
  holdingDeposit: z.string().optional(),
  specialCondition: z.string().optional(),
});

type FieldErrors = { [key: string]: string };

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
  const [errors, setErrors] = useState<FieldErrors>({});

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

  // Validation helpers
  const validatePurchaser = (purchaser: typeof purchaser1, prefix: string): FieldErrors => {
    const result = purchaserSchema.safeParse(purchaser);
    if (result.success) return {};
    const fieldErrors: FieldErrors = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        fieldErrors[`${prefix}.${err.path[0]}`] = err.message;
      }
    });
    return fieldErrors;
  };

  const validateSolicitor = (): FieldErrors => {
    const result = solicitorSchema.safeParse(solicitor);
    if (result.success) return {};
    const fieldErrors: FieldErrors = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        fieldErrors[`solicitor.${err.path[0]}`] = err.message;
      }
    });
    return fieldErrors;
  };

  const validateSales = (): FieldErrors => {
    const result = salesSchema.safeParse(salesDetails);
    if (result.success) return {};
    const fieldErrors: FieldErrors = {};
    result.error.errors.forEach((err) => {
      if (err.path[0]) {
        fieldErrors[`sales.${err.path[0]}`] = err.message;
      }
    });
    return fieldErrors;
  };

  const validateStep = (step: number): boolean => {
    let newErrors: FieldErrors = {};
    
    if (step === 2) {
      newErrors = { ...validatePurchaser(purchaser1, "p1") };
      if (hasPurchaser2) {
        newErrors = { ...newErrors, ...validatePurchaser(purchaser2, "p2") };
      }
    } else if (step === 3) {
      newErrors = validateSolicitor();
    } else if (step === 4) {
      newErrors = validateSales();
    } else if (step === 5) {
      if (!purchaser1Id) {
        newErrors["docs.purchaser1Id"] = "Purchaser 1 ID is required";
      }
      if (hasPurchaser2 && !purchaser2Id) {
        newErrors["docs.purchaser2Id"] = "Purchaser 2 ID is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const ErrorMessage = ({ field }: { field: string }) => {
    if (!errors[field]) return null;
    return (
      <p className="text-sm text-destructive flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {errors[field]}
      </p>
    );
  };

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
    // Validate all steps
    const p1Errors = validatePurchaser(purchaser1, "p1");
    const p2Errors = hasPurchaser2 ? validatePurchaser(purchaser2, "p2") : {};
    const solicitorErrors = validateSolicitor();
    const salesErrors = validateSales();
    const docErrors: FieldErrors = {};
    
    if (!purchaser1Id) {
      docErrors["docs.purchaser1Id"] = "Purchaser 1 ID is required";
    }
    if (hasPurchaser2 && !purchaser2Id) {
      docErrors["docs.purchaser2Id"] = "Purchaser 2 ID is required";
    }

    const allErrors = { ...p1Errors, ...p2Errors, ...solicitorErrors, ...salesErrors, ...docErrors };
    
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Navigate to first step with errors
      if (Object.keys(p1Errors).length > 0 || Object.keys(p2Errors).length > 0) {
        setCurrentStep(2);
        toast.error("Please fix the errors in Purchaser details");
      } else if (Object.keys(solicitorErrors).length > 0) {
        setCurrentStep(3);
        toast.error("Please fix the errors in Solicitor details");
      } else if (Object.keys(salesErrors).length > 0) {
        setCurrentStep(4);
        toast.error("Please fix the errors in Sales details");
      } else {
        setCurrentStep(5);
        toast.error("Please upload required documents");
      }
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

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, 5));
    } else {
      toast.error("Please fix the errors before continuing");
    }
  };
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  const FileUploadField = ({ 
    label, 
    file, 
    setFile, 
    required = false,
    errorKey
  }: { 
    label: string; 
    file: File | null; 
    setFile: (f: File | null) => void;
    required?: boolean;
    errorKey?: string;
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
        <label className={cn(
          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
          errorKey && errors[errorKey] ? "border-destructive" : "border-border"
        )}>
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to upload</span>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              if (errorKey) clearFieldError(errorKey);
            }}
          />
        </label>
      )}
      {errorKey && <ErrorMessage field={errorKey} />}
    </div>
  );

  const renderPurchaserFields = (
    purchaser: typeof purchaser1,
    setPurchaser: typeof setPurchaser1,
    number: number
  ) => {
    const prefix = `p${number}`;
    return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`p${number}-name`}>
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-name`}
            value={purchaser.name}
            onChange={(e) => {
              setPurchaser({ ...purchaser, name: e.target.value });
              clearFieldError(`${prefix}.name`);
            }}
            placeholder="Enter full legal name"
            className={errors[`${prefix}.name`] ? "border-destructive" : ""}
          />
          <ErrorMessage field={`${prefix}.name`} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-email`}>
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-email`}
            type="email"
            value={purchaser.email}
            onChange={(e) => {
              setPurchaser({ ...purchaser, email: e.target.value });
              clearFieldError(`${prefix}.email`);
            }}
            placeholder="email@example.com"
            className={errors[`${prefix}.email`] ? "border-destructive" : ""}
          />
          <ErrorMessage field={`${prefix}.email`} />
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
              onChange={(e) => {
                setPurchaser({ ...purchaser, mobile: e.target.value });
                clearFieldError(`${prefix}.mobile`);
              }}
              placeholder="4XX XXX XXX"
              className={cn("rounded-l-none", errors[`${prefix}.mobile`] ? "border-destructive" : "")}
            />
          </div>
          <ErrorMessage field={`${prefix}.mobile`} />
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
          onChange={(e) => {
            setPurchaser({ ...purchaser, streetAddress: e.target.value });
            clearFieldError(`${prefix}.streetAddress`);
          }}
          placeholder="123 Example Street"
          className={errors[`${prefix}.streetAddress`] ? "border-destructive" : ""}
        />
        <ErrorMessage field={`${prefix}.streetAddress`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`p${number}-suburb`}>
            Suburb <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-suburb`}
            value={purchaser.suburb}
            onChange={(e) => {
              setPurchaser({ ...purchaser, suburb: e.target.value });
              clearFieldError(`${prefix}.suburb`);
            }}
            placeholder="Suburb"
            className={errors[`${prefix}.suburb`] ? "border-destructive" : ""}
          />
          <ErrorMessage field={`${prefix}.suburb`} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-postcode`}>
            Postcode <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`p${number}-postcode`}
            value={purchaser.postcode}
            onChange={(e) => {
              setPurchaser({ ...purchaser, postcode: e.target.value });
              clearFieldError(`${prefix}.postcode`);
            }}
            placeholder="2000"
            maxLength={4}
            className={errors[`${prefix}.postcode`] ? "border-destructive" : ""}
          />
          <ErrorMessage field={`${prefix}.postcode`} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`p${number}-state`}>
            State <span className="text-destructive">*</span>
          </Label>
          <Select
            value={purchaser.state}
            onValueChange={(value) => {
              setPurchaser({ ...purchaser, state: value });
              clearFieldError(`${prefix}.state`);
            }}
          >
            <SelectTrigger id={`p${number}-state`} className={errors[`${prefix}.state`] ? "border-destructive" : ""}>
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
          <ErrorMessage field={`${prefix}.state`} />
        </div>
      </div>
    </div>
  );
  };

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
                    onChange={(e) => {
                      setSolicitor({ ...solicitor, company: e.target.value });
                      clearFieldError("solicitor.company");
                    }}
                    placeholder="Law firm name"
                    className={errors["solicitor.company"] ? "border-destructive" : ""}
                  />
                  <ErrorMessage field="solicitor.company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solicitor-contact">
                    Contact Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-contact"
                    value={solicitor.contactName}
                    onChange={(e) => {
                      setSolicitor({ ...solicitor, contactName: e.target.value });
                      clearFieldError("solicitor.contactName");
                    }}
                    placeholder="Solicitor name"
                    className={errors["solicitor.contactName"] ? "border-destructive" : ""}
                  />
                  <ErrorMessage field="solicitor.contactName" />
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
                    onChange={(e) => {
                      setSolicitor({ ...solicitor, email: e.target.value });
                      clearFieldError("solicitor.email");
                    }}
                    placeholder="solicitor@lawfirm.com"
                    className={errors["solicitor.email"] ? "border-destructive" : ""}
                  />
                  <ErrorMessage field="solicitor.email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="solicitor-phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="solicitor-phone"
                    value={solicitor.phoneNumber}
                    onChange={(e) => {
                      setSolicitor({ ...solicitor, phoneNumber: e.target.value });
                      clearFieldError("solicitor.phoneNumber");
                    }}
                    placeholder="Phone number"
                    className={errors["solicitor.phoneNumber"] ? "border-destructive" : ""}
                  />
                  <ErrorMessage field="solicitor.phoneNumber" />
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
                  errorKey="docs.purchaser1Id"
                />
              </div>

              {hasPurchaser2 && (
                <FileUploadField
                  label="Purchaser 2 ID"
                  file={purchaser2Id}
                  setFile={setPurchaser2Id}
                  required
                  errorKey="docs.purchaser2Id"
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
