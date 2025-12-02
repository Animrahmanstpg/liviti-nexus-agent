import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

const ExportReports = () => {
  const [reportType, setReportType] = useState<string>("leads");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [exporting, setExporting] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = "";

      switch (reportType) {
        case "leads": {
          let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
          if (dateRange?.from) {
            query = query.gte("created_at", dateRange.from.toISOString());
          }
          if (dateRange?.to) {
            query = query.lte("created_at", dateRange.to.toISOString());
          }
          const { data: leads, error } = await query;
          if (error) throw error;
          data = leads.map((l) => ({
            client_name: l.client_name,
            email: l.email,
            phone: l.phone,
            budget: l.budget,
            status: l.status,
            notes: l.notes,
            created_at: format(new Date(l.created_at!), "yyyy-MM-dd HH:mm"),
            last_contact: l.last_contact ? format(new Date(l.last_contact), "yyyy-MM-dd HH:mm") : "",
          }));
          filename = "leads_report";
          break;
        }
        case "eoi": {
          let query = supabase.from("eoi_submissions").select(`
            *,
            property:properties(title, location),
            lead:leads(client_name, email)
          `).order("created_at", { ascending: false });
          if (dateRange?.from) {
            query = query.gte("created_at", dateRange.from.toISOString());
          }
          if (dateRange?.to) {
            query = query.lte("created_at", dateRange.to.toISOString());
          }
          const { data: eois, error } = await query;
          if (error) throw error;
          data = eois.map((e: any) => ({
            property: e.property?.title,
            location: e.property?.location,
            client_name: e.lead?.client_name,
            client_email: e.lead?.email,
            status: e.status,
            notes: e.notes,
            review_notes: e.review_notes,
            submitted_at: format(new Date(e.created_at), "yyyy-MM-dd HH:mm"),
            reviewed_at: e.reviewed_at ? format(new Date(e.reviewed_at), "yyyy-MM-dd HH:mm") : "",
          }));
          filename = "eoi_submissions_report";
          break;
        }
        case "offers": {
          let query = supabase.from("offer_submissions").select(`
            *,
            property:properties(title, location, price),
            lead:leads(client_name, email)
          `).order("created_at", { ascending: false });
          if (dateRange?.from) {
            query = query.gte("created_at", dateRange.from.toISOString());
          }
          if (dateRange?.to) {
            query = query.lte("created_at", dateRange.to.toISOString());
          }
          const { data: offers, error } = await query;
          if (error) throw error;
          data = offers.map((o: any) => ({
            property: o.property?.title,
            location: o.property?.location,
            asking_price: o.property?.price,
            offer_amount: o.offer_amount,
            client_name: o.lead?.client_name,
            client_email: o.lead?.email,
            status: o.status,
            terms: o.terms,
            review_notes: o.review_notes,
            submitted_at: format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
            reviewed_at: o.reviewed_at ? format(new Date(o.reviewed_at), "yyyy-MM-dd HH:mm") : "",
          }));
          filename = "sales_offers_report";
          break;
        }
        case "performance": {
          const { data: eois } = await supabase.from("eoi_submissions").select("agent_id, status");
          const { data: offers } = await supabase.from("offer_submissions").select("agent_id, status, offer_amount");
          
          const agentStats = new Map<string, any>();
          
          eois?.forEach((e) => {
            const stats = agentStats.get(e.agent_id) || {
              agent_id: e.agent_id,
              total_eois: 0, approved_eois: 0, rejected_eois: 0, pending_eois: 0,
              total_offers: 0, approved_offers: 0, rejected_offers: 0, pending_offers: 0,
              total_offer_value: 0, approved_offer_value: 0,
            };
            stats.total_eois++;
            if (e.status === "approved") stats.approved_eois++;
            else if (e.status === "rejected") stats.rejected_eois++;
            else stats.pending_eois++;
            agentStats.set(e.agent_id, stats);
          });
          
          offers?.forEach((o) => {
            const stats = agentStats.get(o.agent_id) || {
              agent_id: o.agent_id,
              total_eois: 0, approved_eois: 0, rejected_eois: 0, pending_eois: 0,
              total_offers: 0, approved_offers: 0, rejected_offers: 0, pending_offers: 0,
              total_offer_value: 0, approved_offer_value: 0,
            };
            stats.total_offers++;
            stats.total_offer_value += Number(o.offer_amount);
            if (o.status === "approved") {
              stats.approved_offers++;
              stats.approved_offer_value += Number(o.offer_amount);
            } else if (o.status === "rejected") {
              stats.rejected_offers++;
            } else {
              stats.pending_offers++;
            }
            agentStats.set(o.agent_id, stats);
          });
          
          data = Array.from(agentStats.values()).map((s) => ({
            agent_id: s.agent_id,
            total_eois: s.total_eois,
            eoi_approval_rate: s.total_eois > 0 ? ((s.approved_eois / s.total_eois) * 100).toFixed(1) + "%" : "0%",
            total_offers: s.total_offers,
            offer_approval_rate: s.total_offers > 0 ? ((s.approved_offers / s.total_offers) * 100).toFixed(1) + "%" : "0%",
            total_offer_value: s.total_offer_value,
            approved_offer_value: s.approved_offer_value,
          }));
          filename = "agent_performance_report";
          break;
        }
      }

      exportToCSV(data, filename);
      toast.success(`${data.length} records exported successfully`);
    } catch (error: any) {
      toast.error("Export failed: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Export Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads Report</SelectItem>
                  <SelectItem value="eoi">EOI Submissions Report</SelectItem>
                  <SelectItem value="offers">Sales Offers Report</SelectItem>
                  <SelectItem value="performance">Agent Performance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range (Optional)</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleExport} disabled={exporting} className="w-full">
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export CSV
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a report type and optionally filter by date range. The report will be downloaded as a CSV file.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportReports;