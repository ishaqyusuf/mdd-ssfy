import { productionItems } from "./dummy-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { Separator } from "@gnd/ui/separator";
import { Check, Trash2, Plus, Minus } from "lucide-react";

export function ProductionTab() {
  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Production Items</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Check className="mr-2 h-4 w-4" /> Assign All
            </Button>
            <Button variant="outline" size="sm">
              <Check className="mr-2 h-4 w-4" /> Submit All
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete All
            </Button>
          </div>
        </div>
        <Separator className="my-2" />
        <Accordion type="single" collapsible className="w-full">
          {productionItems.map((item) => (
            <AccordionItem value={`item-${item.id}`} key={item.id}>
              <AccordionTrigger>
                <div className="flex justify-between w-full pr-4">
                  <span>{item.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  {/* Status */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm font-medium">Assigned</p>
                      <p>{item.status.assigned}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Produced</p>
                      <p>{item.status.produced}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Delivered</p>
                      <p>{item.status.delivered}</p>
                    </div>
                  </div>
                  <Separator />
                  {/* Details */}
                  <div>
                    <h4 className="font-semibold mb-2">Details</h4>
                    <ul className="space-y-1 text-sm">
                      {item.details.map((detail) => (
                        <li key={detail.label}>
                          <span className="font-medium">{detail.label}:</span>{" "}
                          {detail.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Separator />
                  {/* Assignments */}
                  <div>
                    <h4 className="font-semibold mb-2">Assignments</h4>
                    {item.assignments.map((a) => (
                      <div key={a.id} className="text-sm">
                        <p>
                          {a.quantity} assigned to {a.assignedTo} on {a.date}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  {/* Submissions */}
                  <div>
                    <h4 className="font-semibold mb-2">Submissions</h4>
                    {item.submissions.map((s) => (
                      <div key={s.id} className="text-sm">
                        <p>
                          {s.quantity} submitted by {s.submittedBy} on {s.date}
                        </p>
                      </div>
                    ))}
                  </div>
                  {item.notes && (
                    <>
                      <Separator />
                      {/* Notes */}
                      <div>
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-sm">{item.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}