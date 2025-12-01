import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bulkImportProperties } from "@/utils/bulkPropertyImport";

interface ExcelBulkImportProps {
  onImportComplete: () => void;
}

export const ExcelBulkImport = ({ onImportComplete }: ExcelBulkImportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const parseExcelData = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    // Find the header line (contains column names)
    const headerLine = lines.find(line => line.includes('|Bathroom|'));
    if (!headerLine) return [];

    const headerIndex = lines.indexOf(headerLine);
    const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean);

    // Process data rows (skip header and separator line)
    const dataRows = lines.slice(headerIndex + 2).filter(line => {
      return line.includes('|') && !line.startsWith('|-') && line.trim().length > 10;
    });

    return dataRows.map(line => {
      const values = line.split('|').map(v => v.trim()).filter((_, i) => i > 0 && i <= headers.length);
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      // For Excel files, we need to parse them
      // Since we already have the parsed data from the document parser,
      // we'll use a simple approach for now
      const text = await file.text();
      
      // Check if it's markdown table format (from our parser)
      let rows: any[] = [];
      
      if (text.includes('|Bathroom|')) {
        rows = parseExcelData(text);
      } else {
        toast({
          title: "Invalid file format",
          description: "Please upload the parsed Excel data in markdown table format",
          variant: "destructive",
        });
        return;
      }

      if (rows.length === 0) {
        toast({
          title: "No data found",
          description: "The file doesn't contain any valid property data",
          variant: "destructive",
        });
        return;
      }

      // Import the properties
      const result = await bulkImportProperties(rows);

      toast({
        title: "Import completed",
        description: `Successfully imported ${result.success} of ${result.total} properties. ${result.failed > 0 ? `Failed: ${result.failed}` : ''}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });

      if (result.success > 0) {
        onImportComplete();
        setIsOpen(false);
      }

      // Log errors if any
      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
      }
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Import from Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Upload your Excel file (parsed as markdown table) to bulk import properties.</p>
            <p className="mb-2 font-medium">Expected format:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Markdown table with property data</li>
              <li>Columns: Bathroom, Bedroom, Building Name, City, Property Name, Unit Price, etc.</li>
              <li>Prices in format: $ 1,234,567.00</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".txt,.md"
              onChange={handleFileUpload}
              disabled={isImporting}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isImporting && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing properties...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
