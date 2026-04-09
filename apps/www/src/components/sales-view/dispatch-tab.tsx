import { Icons } from "@gnd/ui/icons";
import { dispatches } from "./dummy-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";

export function DispatchTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Dispatch Information</h3>
          <Button>
            <Icons.Plus className="mr-2 h-4 w-4" /> Create Dispatch
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dispatch No.</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispatches.map((dispatch) => (
              <TableRow key={dispatch.id}>
                <TableCell>{dispatch.dispatchNo}</TableCell>
                <TableCell>
                  {dispatch.items.map((item) => (
                    <div key={item.name}>
                      {item.name} (Qty: {item.quantity})
                    </div>
                  ))}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      dispatch.status === "Completed" ? "default" : "secondary"
                    }
                  >
                    {dispatch.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}