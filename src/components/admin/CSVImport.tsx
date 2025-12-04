import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download } from "lucide-react";

interface PropertyCSVRow {
  title: string;
  type: "apartment" | "villa" | "townhouse" | "penthouse";
  status: "available" | "reserved" | "sold";
  price: number;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image?: string;
  description?: string;
  features?: string;
}

export const CSVImport = ({ onImportComplete }: { onImportComplete: () => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const parseCSV = (text: string): PropertyCSVRow[] => {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(",").map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          
          if (header === "price" || header === "bedrooms" || header === "bathrooms" || header === "area") {
            row[header] = parseFloat(value);
          } else if (header === "features") {
            try {
              row[header] = JSON.parse(value || "[]");
            } catch {
              row[header] = value ? value.split(";").map(f => f.trim()) : [];
            }
          } else {
            row[header] = value;
          }
        });
        
        return row as PropertyCSVRow;
      });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const text = await file.text();
      const properties = parseCSV(text);

      const { error } = await supabase
        .from("properties")
        .insert(
          properties.map(p => ({
            ...p,
            features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]")
          }))
        );

      if (error) throw error;

      toast({
        title: "Import successful",
        description: `Imported ${properties.length} properties`,
      });

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
      event.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <a href="/property-import-template.csv" download>
        <Button variant="outline" type="button">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </a>
      <Input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isUploading}
        className="max-w-xs"
      />
      <Button disabled={isUploading} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? "Uploading..." : "Import CSV"}
      </Button>
    </div>
  );
};
