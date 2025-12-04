import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ArrowRight, AlertCircle, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ColumnMapping {
  [csvColumn: string]: string | null;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: "error" | "warning";
}

interface PreviewRow {
  rowIndex: number;
  data: any;
  errors: ValidationError[];
  isValid: boolean;
}

const STANDARD_PROPERTY_FIELDS = [
  { value: "title", label: "Title *", required: true, isCustom: false },
  { value: "type", label: "Type * (apartment/villa/townhouse/penthouse)", required: true, isCustom: false },
  { value: "status", label: "Status * (available/reserved/sold)", required: true, isCustom: false },
  { value: "price", label: "Price *", required: true, isCustom: false },
  { value: "location", label: "Location *", required: true, isCustom: false },
  { value: "bedrooms", label: "Bedrooms *", required: true, isCustom: false },
  { value: "bathrooms", label: "Bathrooms *", required: true, isCustom: false },
  { value: "area", label: "Area (sqft) *", required: true, isCustom: false },
  { value: "image", label: "Image URL", required: false, isCustom: false },
  { value: "description", label: "Description", required: false, isCustom: false },
  { value: "features", label: "Features (comma or semicolon separated)", required: false, isCustom: false },
  { value: "project_name", label: "Project Name", required: false, isCustom: false },
];

export const CSVImportWithMapping = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Fetch custom fields from database
  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_fields")
        .select("*")
        .order("display_order");

      if (error) throw error;
      return data;
    },
  });

  // Fetch projects from database
  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Combine standard and custom fields
  const PROPERTY_FIELDS = [
    ...STANDARD_PROPERTY_FIELDS,
    ...customFields.map(field => ({
      value: `custom_${field.name}`,
      label: `${field.label}${field.is_required ? ' *' : ''} (Custom)`,
      required: field.is_required,
      isCustom: true,
      fieldType: field.field_type,
    })),
    { value: null, label: "-- Skip this column --", required: false, isCustom: false },
  ];

  const parseCSV = (text: string): { headers: string[]; data: string[][] } => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(",").map(h => h.trim());
    const data = lines.slice(1).map(line => 
      line.split(",").map(v => v.trim())
    );

    return { headers, data };
  };

  const autoMapColumn = (csvHeader: string): string | null => {
    const normalizedHeader = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Try exact match first
    let matchingField = PROPERTY_FIELDS.find(
      field => field.value && normalizedHeader === field.value.toLowerCase().replace(/[^a-z0-9]/g, "")
    );
    
    if (matchingField) return matchingField.value;
    
    // Try partial match - header contains field name or vice versa
    matchingField = PROPERTY_FIELDS.find(field => {
      if (!field.value) return false;
      const normalizedFieldValue = field.value.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normalizedFieldLabel = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      // For custom fields, remove "custom_" prefix for matching
      const fieldNameForMatching = normalizedFieldValue.replace("custom_", "");
      
      return normalizedHeader.includes(fieldNameForMatching) || 
             fieldNameForMatching.includes(normalizedHeader) ||
             normalizedHeader.includes(normalizedFieldLabel) ||
             normalizedFieldLabel.includes(normalizedHeader);
    });
    
    if (matchingField) return matchingField.value;
    
    // Try common aliases
    const aliases: { [key: string]: string[] } = {
      "title": ["name", "propertyname", "propertytitle"],
      "type": ["propertytype", "category"],
      "status": ["propertystatus", "availability", "state"],
      "price": ["cost", "amount", "value"],
      "location": ["address", "city", "area", "region"],
      "bedrooms": ["beds", "bedroom", "bed", "numberbedrooms"],
      "bathrooms": ["baths", "bathroom", "bath", "numberbathrooms"],
      "area": ["sqft", "squarefeet", "size", "aream2", "sqm"],
      "image": ["photo", "picture", "imageurl", "img"],
      "description": ["desc", "details", "info"],
      "features": ["amenities", "facilities"],
      "project_name": ["project", "projectname", "development"],
    };
    
    for (const [field, aliasList] of Object.entries(aliases)) {
      if (aliasList.some(alias => normalizedHeader.includes(alias) || alias.includes(normalizedHeader))) {
        return field;
      }
    }
    
    return null;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const { headers, data } = parseCSV(text);

      if (headers.length === 0) {
        toast({
          title: "Invalid CSV",
          description: "The CSV file appears to be empty",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      setCsvHeaders(headers);
      setCsvData(data);
      
      // Auto-map columns with intelligent matching
      const autoMapping: ColumnMapping = {};
      headers.forEach(header => {
        const matchedField = autoMapColumn(header);
        if (matchedField) {
          autoMapping[header] = matchedField;
        }
      });
      
      setColumnMapping(autoMapping);
      setShowMappingDialog(true);
      
      // Show feedback about auto-mapping
      const mappedCount = Object.values(autoMapping).filter(Boolean).length;
      if (mappedCount > 0) {
        toast({
          title: "Auto-mapped columns",
          description: `Automatically mapped ${mappedCount} of ${headers.length} columns. Review and adjust as needed.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error reading file",
        description: error.message,
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  const handleMappingChange = (csvColumn: string, propertyField: string | null) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: propertyField,
    }));
  };

  const validateMapping = (): boolean => {
    const requiredFields = PROPERTY_FIELDS.filter(f => f.required).map(f => f.value);
    const mappedFields = Object.values(columnMapping).filter(Boolean);
    
    const missingFields = requiredFields.filter(
      field => !mappedFields.includes(field)
    );

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please map: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const validateRow = (row: string[], rowIndex: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const transformed: any = {};

    csvHeaders.forEach((header, index) => {
      const mappedField = columnMapping[header];
      if (!mappedField) return;

      const value = row[index]?.trim() || "";

      // Check required fields
      if (PROPERTY_FIELDS.find(f => f.value === mappedField)?.required && !value) {
        const fieldLabel = PROPERTY_FIELDS.find(f => f.value === mappedField)?.label || mappedField;
        errors.push({
          row: rowIndex,
          field: mappedField,
          message: `${fieldLabel} is required but empty`,
          severity: "error",
        });
        return;
      }

      // Handle custom fields validation
      if (mappedField.startsWith("custom_")) {
        const customFieldName = mappedField.replace("custom_", "");
        const customField = customFields.find(f => f.name === customFieldName);
        
        if (customField && customField.field_type === "number" && value) {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              row: rowIndex,
              field: mappedField,
              message: `Invalid ${customField.label}: "${value}" is not a valid number`,
              severity: "error",
            });
          }
        }
        return;
      }

      // Handle standard fields validation
      switch (mappedField) {
        case "price":
        case "bedrooms":
        case "bathrooms":
        case "area":
          const numValue = parseFloat(value.replace(/[$,]/g, ""));
          if (value && (isNaN(numValue) || numValue <= 0)) {
            errors.push({
              row: rowIndex,
              field: mappedField,
              message: `Invalid ${mappedField}: "${value}" is not a valid number`,
              severity: "error",
            });
          }
          transformed[mappedField] = numValue || 0;
          break;
        case "type":
          const normalizedType = value.toLowerCase();
          if (value && !["apartment", "villa", "townhouse", "penthouse"].includes(normalizedType)) {
            errors.push({
              row: rowIndex,
              field: mappedField,
              message: `Invalid type: "${value}". Must be apartment, villa, townhouse, or penthouse`,
              severity: "error",
            });
            transformed[mappedField] = "apartment";
          } else {
            transformed[mappedField] = normalizedType || "apartment";
          }
          break;
        case "status":
          const normalizedStatus = value.toLowerCase();
          if (value && !["available", "reserved", "sold"].includes(normalizedStatus)) {
            errors.push({
              row: rowIndex,
              field: mappedField,
              message: `Invalid status: "${value}". Must be available, reserved, or sold`,
              severity: "warning",
            });
            transformed[mappedField] = "available";
          } else {
            transformed[mappedField] = normalizedStatus || "available";
          }
          break;
        case "features":
          if (value) {
            const separator = value.includes(";") ? ";" : ",";
            transformed[mappedField] = value.split(separator).map(f => f.trim()).filter(Boolean);
          } else {
            transformed[mappedField] = [];
          }
          break;
        default:
          transformed[mappedField] = value;
      }
    });

    return errors;
  };

  const transformData = (row: string[]): any => {
    const transformed: any = {};
    const customFieldsData: any = {};

    csvHeaders.forEach((header, index) => {
      const mappedField = columnMapping[header];
      if (!mappedField) return;

      const value = row[index]?.trim() || "";

      // Handle custom fields
      if (mappedField.startsWith("custom_")) {
        const customFieldName = mappedField.replace("custom_", "");
        const customField = customFields.find(f => f.name === customFieldName);
        
        if (customField) {
          // Process based on field type
          switch (customField.field_type) {
            case "number":
              customFieldsData[customFieldName] = parseFloat(value) || 0;
              break;
            case "checkbox":
              customFieldsData[customFieldName] = value.toLowerCase() === "true" || value === "1";
              break;
            default:
              customFieldsData[customFieldName] = value;
          }
        }
        return;
      }

      // Handle standard fields
      switch (mappedField) {
        case "price":
        case "bedrooms":
        case "bathrooms":
        case "area":
          transformed[mappedField] = parseFloat(value.replace(/[$,]/g, "")) || 0;
          break;
        case "features":
          if (value) {
            const separator = value.includes(";") ? ";" : ",";
            transformed[mappedField] = value.split(separator).map(f => f.trim()).filter(Boolean);
          } else {
            transformed[mappedField] = [];
          }
          break;
        case "type":
          const normalizedType = value.toLowerCase();
          if (["apartment", "villa", "townhouse", "penthouse"].includes(normalizedType)) {
            transformed[mappedField] = normalizedType;
          } else {
            transformed[mappedField] = "apartment";
          }
          break;
        case "status":
          const normalizedStatus = value.toLowerCase();
          if (["available", "reserved", "sold"].includes(normalizedStatus)) {
            transformed[mappedField] = normalizedStatus;
          } else {
            transformed[mappedField] = "available";
          }
          break;
        case "project_name":
          // Look up project by name and convert to project_id
          if (value) {
            const project = projects.find((p: any) => 
              p.name.toLowerCase() === value.toLowerCase()
            );
            if (project) {
              transformed.project_id = project.id;
            }
          }
          break;
        default:
          transformed[mappedField] = value;
      }
    });

    // Add custom fields data if any
    if (Object.keys(customFieldsData).length > 0) {
      transformed.custom_fields_data = customFieldsData;
    }

    return transformed;
  };

  const handlePreview = () => {
    if (!validateMapping()) return;

    const preview: PreviewRow[] = csvData
      .filter(row => row.some(cell => cell.trim()))
      .map((row, index) => {
        const errors = validateRow(row, index + 2); // +2 for header row and 1-based indexing
        const data = transformData(row);
        
        return {
          rowIndex: index + 2,
          data,
          errors,
          isValid: errors.filter(e => e.severity === "error").length === 0,
        };
      });

    setPreviewData(preview);
    setShowMappingDialog(false);
    setShowPreviewDialog(true);
  };

  const handleImport = async () => {
    setIsUploading(true);

    try {
      const validRows = previewData.filter(row => row.isValid);
      const properties = validRows.map(row => row.data);

      if (properties.length === 0) {
        toast({
          title: "No valid data",
          description: "No valid properties to import",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("properties")
        .insert(properties);

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Imported ${properties.length} properties`,
      });

      setShowPreviewDialog(false);
      setShowMappingDialog(false);
      setFile(null);
      setCsvHeaders([]);
      setCsvData([]);
      setColumnMapping({});
      setPreviewData([]);
      onImportComplete();
    } catch (error: any) {
      console.error("CSV import error:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          type="button"
          onClick={() => {
            const link = document.createElement('a');
            link.href = '/property-import-template.csv';
            link.download = 'property-import-template.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="max-w-xs"
        />
        <Button disabled={isUploading} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </div>

      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Map CSV Columns to Property Fields</DialogTitle>
            <DialogDescription>
              Match your CSV columns with the property database fields. Required fields are marked with *
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">{header}</Label>
                    {csvData[0] && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Example: {csvData[0][csvHeaders.indexOf(header)]?.substring(0, 50)}
                        {csvData[0][csvHeaders.indexOf(header)]?.length > 50 ? "..." : ""}
                      </p>
                    )}
                  </div>
                  
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1">
                    <Select
                      value={columnMapping[header] || "skip"}
                      onValueChange={(value) => 
                        handleMappingChange(header, value === "skip" ? null : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_FIELDS.map((field) => (
                          <SelectItem 
                            key={field.value || "skip"} 
                            value={field.value || "skip"}
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {csvData.length} rows ready for preview
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMappingDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handlePreview}>
                Preview & Validate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Preview & Validate Data</DialogTitle>
            <DialogDescription>
              Review your data before importing. Rows with errors cannot be imported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">{previewData.filter(r => r.isValid).length}</div>
                  <div className="text-xs text-muted-foreground">Valid rows</div>
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold">
                    {previewData.filter(r => r.errors.some(e => e.severity === "error")).length}
                  </div>
                  <div className="text-xs">Rows with errors</div>
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <div className="font-semibold">
                    {previewData.filter(r => 
                      r.errors.some(e => e.severity === "warning") && 
                      !r.errors.some(e => e.severity === "error")
                    ).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Rows with warnings</div>
                </AlertDescription>
              </Alert>
            </div>

            {/* Data Table */}
            <ScrollArea className="h-[500px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Beds</TableHead>
                    <TableHead>Baths</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row) => (
                    <TableRow key={row.rowIndex} className={!row.isValid ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valid
                          </Badge>
                        ) : row.errors.some(e => e.severity === "error") ? (
                          <Badge variant="destructive">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Warning
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.data.title || "-"}</TableCell>
                      <TableCell className="capitalize">{row.data.type || "-"}</TableCell>
                      <TableCell>${row.data.price?.toLocaleString() || "0"}</TableCell>
                      <TableCell>{row.data.bedrooms || "-"}</TableCell>
                      <TableCell>{row.data.bathrooms || "-"}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <div className="space-y-1 max-w-[300px]">
                            {row.errors.map((error, idx) => (
                              <div 
                                key={idx} 
                                className={`text-xs ${
                                  error.severity === "error" 
                                    ? "text-destructive" 
                                    : "text-yellow-600"
                                }`}
                              >
                                • {error.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewDialog(false);
                  setShowMappingDialog(true);
                }}
              >
                Back to Mapping
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewDialog(false);
                  setFile(null);
                  setCsvHeaders([]);
                  setCsvData([]);
                  setColumnMapping({});
                  setPreviewData([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isUploading || previewData.filter(r => r.isValid).length === 0}
              >
                {isUploading 
                  ? "Importing..." 
                  : `Import ${previewData.filter(r => r.isValid).length} Valid Rows`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
