import { salesOrder } from "./dummy-data";
import { Button } from "@gnd/ui/button";
import { Progress } from "@gnd/ui/progress";
import { Separator } from "@gnd/ui/separator";
import {
  ChevronDown,
  Copy,
  Edit,
  Mail,
  Printer,
  Share2,
  Eye,
  FileText,
  FileBox,
  ArrowRightLeft,
} from "lucide-react";

export function GeneralTab() {
  const { customer, payment, poNumber, date, dispatchOption } = salesOrder;

  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Customer</h3>
          {customer.isBusiness && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Business
            </span>
          )}
        </div>
        <Separator className="my-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">{customer.name}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
          <div className="text-sm">
            <p>
              <span className="font-medium">P.O. Number:</span> {poNumber}
            </p>
            <p>
              <span className="font-medium">Date:</span> {date}
            </p>
            <p>
              <span className="font-medium">Dispatch:</span> {dispatchOption}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold">Payment</h3>
        <Separator className="my-2" />
        <div>
          <div className="flex justify-between items-center mb-2">
            <span>Progress</span>
            <span>{payment.progress}%</span>
          </div>
          <Progress value={payment.progress} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
            <div>
              <p className="text-muted-foreground">Paid</p>
              <p className="font-semibold">${payment.breakdown.paid}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pending</p>
              <p className="font-semibold">${payment.breakdown.pending}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Subtotal</p>
              <p className="font-semibold">${payment.breakdown.subtotal}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Taxes</p>
              <p className="font-semibold">${payment.breakdown.taxes}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Discount</p>
              <p className="font-semibold">${payment.breakdown.discount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Labor</p>
              <p className="font-semibold">${payment.breakdown.labor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border rounded-lg">
        <h3 className="text-lg font-semibold">Actions</h3>
        <Separator className="my-2" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" /> Edit Order
          </Button>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" /> Send Email
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print
            <ChevronDown className="ml-auto h-4 w-4" />
          </Button>
          <Button variant="outline">
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Move to...
          </Button>
          <Button variant="outline">
            <Copy className="mr-2 h-4 w-4" /> Copy as...
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button>Send Payment Link</Button>
        </div>
      </div>
    </div>
  );
}