import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";

const BulkImportPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number; failed: number } | null>(null);
  const { toast } = useToast();

  const parseAndImportData = async (text: string) => {
    // Parse the markdown table
    const lines = text.trim().split('\n');
    const dataLines = lines.filter(line => line.startsWith('||') && line.includes('|'));

    const properties = dataLines.map(line => {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);

      if (cols.length < 30) return null;

      try {
        const aspect = cols[0] || '';
        const bathrooms = parseInt(cols[1]) || 1;
        const bedrooms = parseInt(cols[2]) || 0;
        const buildingName = cols[3] || '';
        const city = cols[4] || '';
        const internalArea = parseFloat(cols[10]) || 0;
        const investmentStrategy = cols[11] || '';
        const level = cols[14] || '';
        const parkingSpace = parseInt(cols[16]) || 0;
        const propertyName = cols[20] || '';
        const unitNumber = cols[26] || '';
        const unitPriceStr = cols[27] || '0';
        const price = parseFloat(unitPriceStr.replace(/[$,]/g, '')) || 0;
        const state = cols[24] || '';
        const street = cols[30] || '';

        if (price === 0 || internalArea === 0) return null;

        let type: "apartment" | "villa" | "townhouse" | "penthouse" = "apartment";
        if (bedrooms >= 4) type = "penthouse";

        const location = `${city}, ${state}`.trim();

        const features: string[] = [];
        if (investmentStrategy) {
          features.push(...investmentStrategy.split(';').map((s: string) => s.trim()).filter(Boolean));
        }
        if (parkingSpace > 0) features.push(`${parkingSpace} Parking`);
        if (aspect) features.push(`${aspect} Aspect`);

        const title = propertyName || `${bedrooms} Bed ${buildingName} ${unitNumber}`.trim();
        const description = `${type.charAt(0).toUpperCase() + type.slice(1)} in ${buildingName} at ${street}. ${bedrooms} bedroom${bedrooms !== 1 ? 's' : ''}, ${bathrooms} bathroom${bathrooms !== 1 ? 's' : ''}. ${internalArea}sqm internal area. Level ${level}.`;

        return {
          title: title.substring(0, 200),
          type,
          status: "available" as const,
          price,
          location: location.substring(0, 200),
          bedrooms,
          bathrooms,
          area: internalArea,
          image: "/placeholder.svg",
          description: description.substring(0, 500),
          features: JSON.parse(JSON.stringify(features)),
        };
      } catch (err) {
        console.error("Error parsing row:", err);
        return null;
      }
    }).filter(Boolean);

    // Batch insert
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < properties.length; i += batchSize) {
      const batch = properties.slice(i, i + batchSize);

      try {
        const { error } = await supabase.from("properties").insert(batch);

        if (error) {
          errorCount += batch.length;
          console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        } else {
          successCount += batch.length;
        }
      } catch (err) {
        errorCount += batch.length;
        console.error(`Batch ${Math.floor(i / batchSize) + 1} exception:`, err);
      }
    }

    return {
      total: properties.length,
      success: successCount,
      failed: errorCount,
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const text = await file.text();

      if (!text.includes('|Bathroom|') && !text.includes('||')) {
        toast({
          title: "Invalid file format",
          description: "Please upload the parsed Excel markdown file",
          variant: "destructive",
        });
        return;
      }

      const importResult = await parseAndImportData(text);
      setResult(importResult);

      toast({
        title: "Import completed",
        description: `Successfully imported ${importResult.success} of ${importResult.total} properties`,
        variant: importResult.failed > 0 ? "destructive" : "default",
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Bulk Property Import</CardTitle>
            <CardDescription>
              Upload the Portal_Properties.xlsx file (parsed as markdown) to import all properties
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80 font-medium">
                    Click to upload
                  </span>
                  <span className="text-muted-foreground"> or drag and drop</span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports .txt or .md files with parsed Excel data
                </p>
              </div>

              {isProcessing && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing and importing properties...</span>
                </div>
              )}

              {result && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Properties:</span>
                        <span className="text-sm">{result.total}</span>
                      </div>
                      <div className="flex items-center justify-between text-success">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Successfully Imported:
                        </span>
                        <span className="text-sm font-bold">{result.success}</span>
                      </div>
                      {result.failed > 0 && (
                        <div className="flex items-center justify-between text-destructive">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Failed:
                          </span>
                          <span className="text-sm font-bold">{result.failed}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Parse your Portal_Properties.xlsx file to markdown format</li>
                <li>Upload the .txt or .md file containing the parsed data</li>
                <li>The system will automatically import all valid properties</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default BulkImportPage;
