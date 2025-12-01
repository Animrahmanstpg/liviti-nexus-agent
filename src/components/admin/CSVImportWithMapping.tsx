import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, ArrowRight, X } from "lucide-react";
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

interface ColumnMapping {
  [csvColumn: string]: string | null;
}

const PROPERTY_FIELDS = [
  { value: "title", label: "Title *", required: true },
  { value: "type", label: "Type * (apartment/villa/townhouse/penthouse)", required: true },
  { value: "status", label: "Status * (available/reserved/sold)", required: true },
  { value: "price", label: "Price *", required: true },
  { value: "location", label: "Location *", required: true },
  { value: "bedrooms", label: "Bedrooms *", required: true },
  { value: "bathrooms", label: "Bathrooms *", required: true },
  { value: "area", label: "Area (sqft) *", required: true },
  { value: "image", label: "Image URL", required: false },
  { value: "description", label: "Description", required: false },
  { value: "features", label: "Features (comma or semicolon separated)", required: false },
  { value: null, label: "-- Skip this column --", required: false },
];

export const CSVImportWithMapping = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): { headers: string[]; data: string[][] } => {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(",").map(h => h.trim());
    const data = lines.slice(1).map(line => 
      line.split(",").map(v => v.trim())
    );

    return { headers, data };
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
      
      // Auto-map columns with matching names
      const autoMapping: ColumnMapping = {};
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, "");
        const matchingField = PROPERTY_FIELDS.find(
          field => field.value && normalizedHeader.includes(field.value.toLowerCase())
        );
        if (matchingField) {
          autoMapping[header] = matchingField.value;
        }
      });
      
      setColumnMapping(autoMapping);
      setShowMappingDialog(true);
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

  const transformData = (row: string[]): any => {
    const transformed: any = {};

    csvHeaders.forEach((header, index) => {
      const mappedField = columnMapping[header];
      if (!mappedField) return;

      const value = row[index];

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
        default:
          transformed[mappedField] = value;
      }
    });

    return transformed;
  };

  const handleImport = async () => {
    if (!validateMapping()) return;

    setIsUploading(true);

    try {
      const properties = csvData
        .filter(row => row.some(cell => cell.trim()))
        .map(transformData)
        .filter(prop => prop.title && prop.price > 0);

      if (properties.length === 0) {
        toast({
          title: "No valid data",
          description: "No valid properties found in the CSV",
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

      setShowMappingDialog(false);
      setFile(null);
      setCsvHeaders([]);
      setCsvData([]);
      setColumnMapping({});
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
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="max-w-xs"
        />
        <Button disabled={isUploading} variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV with Mapping
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
              {csvData.length} rows will be imported
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMappingDialog(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isUploading}>
                {isUploading ? "Importing..." : "Import Properties"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
