import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getPolicies, createPolicy } from "@/lib/api";
import type { Policy, VehicleType, UsageType } from "@/types/insurance";
import { Plus, Search, Upload, Download, FileWarning } from "lucide-react";
import { toast } from "sonner";
import { parseCSV, generateSampleCSV } from "@/lib/csv-import";

export default function Policies() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  useEffect(() => {
    getPolicies().then(setPolicies);
  }, []);

  const filtered = policies.filter(
    (p) =>
      p.holder_name.toLowerCase().includes(search.toLowerCase()) ||
      p.policy_number.toLowerCase().includes(search.toLowerCase()) ||
      p.vehicle_make.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const policy = await createPolicy({
      policy_number: `INS-${Date.now().toString().slice(-6)}`,
      holder_name: fd.get("holder_name") as string,
      vehicle_type: fd.get("vehicle_type") as VehicleType,
      vehicle_make: fd.get("vehicle_make") as string,
      vehicle_model: fd.get("vehicle_model") as string,
      production_year: Number(fd.get("production_year")),
      engine_cc: Number(fd.get("engine_cc")),
      seats: Number(fd.get("seats")),
      insured_value: Number(fd.get("insured_value")),
      premium_amount: Number(fd.get("premium_amount")),
      usage_type: fd.get("usage_type") as UsageType,
      prior_claims: Number(fd.get("prior_claims")),
      region: fd.get("region") as string,
    });
    setPolicies((prev) => [...prev, policy]);
    setDialogOpen(false);
    toast.success("Policy created successfully");
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { policies: parsed, errors } = parseCSV(text);
    setCsvErrors(errors);
    if (parsed.length === 0) {
      toast.error("No valid policies found in CSV");
      return;
    }
    let created = 0;
    for (const p of parsed) {
      const newPolicy = await createPolicy(p);
      setPolicies((prev) => [...prev, newPolicy]);
      created++;
    }
    toast.success(`Imported ${created} policies${errors.length > 0 ? ` (${errors.length} rows skipped)` : ""}`);
    e.target.value = "";
  }

  function handleDownloadSample() {
    const blob = new Blob([generateSampleCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "insureiq_sample_policies.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
          <p className="text-sm text-muted-foreground">Manage vehicle insurance policies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadSample}>
            <Download className="h-4 w-4 mr-1" />Sample CSV
          </Button>
          <label>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            <Button variant="outline" asChild>
              <span><Upload className="h-4 w-4 mr-2" />Import CSV</span>
            </Button>
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Policy</Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Policy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="holder_name">Holder Name</Label>
                  <Input name="holder_name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region">Region</Label>
                  <Input name="region" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle Type</Label>
                  <Select name="vehicle_type" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["sedan", "suv", "hatchback", "truck", "two_wheeler", "commercial"].map((v) => (
                        <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Usage Type</Label>
                  <Select name="usage_type" required>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["personal", "commercial", "taxi", "fleet"].map((v) => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle Make</Label>
                  <Input name="vehicle_make" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Vehicle Model</Label>
                  <Input name="vehicle_model" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Production Year</Label>
                  <Input name="production_year" type="number" min="2000" max="2025" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Engine CC</Label>
                  <Input name="engine_cc" type="number" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Seats</Label>
                  <Input name="seats" type="number" min="1" max="50" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Insured Value (₹)</Label>
                  <Input name="insured_value" type="number" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Premium Amount (₹)</Label>
                  <Input name="premium_amount" type="number" required />
                </div>
                <div className="space-y-1.5">
                  <Label>Prior Claims</Label>
                  <Input name="prior_claims" type="number" min="0" defaultValue="0" required />
                </div>
              </div>
              <Button type="submit" className="w-full">Create Policy</Button>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {csvErrors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <FileWarning className="h-4 w-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">CSV Import Warnings</p>
                {csvErrors.map((err, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{err}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search policies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy #</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Insured Value</TableHead>
                <TableHead className="text-right">Premium</TableHead>
                <TableHead>Claims</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/policies/${p.id}`)}
                >
                  <TableCell className="font-mono text-xs">{p.policy_number}</TableCell>
                  <TableCell className="font-medium">{p.holder_name}</TableCell>
                  <TableCell>{p.vehicle_make} {p.vehicle_model}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{p.vehicle_type.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{p.usage_type}</TableCell>
                  <TableCell className="text-right">₹{p.insured_value.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">₹{p.premium_amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge variant={p.prior_claims > 1 ? "destructive" : p.prior_claims === 1 ? "secondary" : "outline"}>
                      {p.prior_claims}
                    </Badge>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
