import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuditLog } from "@/lib/api";
import type { AuditLogEntry } from "@/types/insurance";

const ACTION_COLORS: Record<string, string> = {
  risk_assessed: "bg-primary text-primary-foreground",
  claim_predicted: "bg-warning text-warning-foreground",
  report_generated: "bg-info text-info-foreground",
  policy_created: "bg-success text-success-foreground",
  batch_analysis: "bg-secondary text-secondary-foreground",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    getAuditLog().then(setLogs);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Complete activity trail for compliance (IRDAI)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}>
                      {log.action.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{log.entity_type.replace("_", " ")}</TableCell>
                  <TableCell className="text-sm">{log.user_id}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{log.details}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
