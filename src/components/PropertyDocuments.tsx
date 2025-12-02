import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Trash2, Download, Loader2, File, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface PropertyDocumentsProps {
  propertyId: string;
  canUpload?: boolean;
}

const PropertyDocuments = ({ propertyId, canUpload = false }: PropertyDocumentsProps) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("floor_plan");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["property-documents", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_documents")
        .select("*")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (doc: { id: string; file_path: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("property-documents")
        .remove([doc.file_path]);
      if (storageError) throw storageError;
      
      // Delete record
      const { error: dbError } = await supabase
        .from("property_documents")
        .delete()
        .eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-documents", propertyId] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${propertyId}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("property-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      // Create record
      const { error: dbError } = await supabase.from("property_documents").insert({
        property_id: propertyId,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        document_type: documentType,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["property-documents", propertyId] });
      toast.success("Document uploaded successfully");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const getDocumentUrl = (filePath: string) => {
    const { data } = supabase.storage.from("property-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getDocumentIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (fileType === "application/pdf") return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      floor_plan: "Floor Plan",
      brochure: "Brochure",
      contract: "Contract",
      image: "Image",
      other: "Other",
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5" />
          Documents ({documents?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canUpload && (
          <div className="flex gap-2 p-3 border rounded-lg bg-muted/30">
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="floor_plan">Floor Plan</SelectItem>
                <SelectItem value="brochure">Brochure</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleUpload}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            {uploading && <Loader2 className="w-5 h-5 animate-spin self-center" />}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : documents?.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {documents?.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getDocumentIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-muted px-2 py-0.5 rounded">
                        {getDocumentTypeLabel(doc.document_type)}
                      </span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(getDocumentUrl(doc.file_path), "_blank")}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {canUpload && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteDocument.mutate({ id: doc.id, file_path: doc.file_path })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PropertyDocuments;