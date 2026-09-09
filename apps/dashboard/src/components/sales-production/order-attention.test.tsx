/** @jsxImportSource react */
import {expect, mock, test} from "bun:test";
import type {ReactNode} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import type {ProductionOrderPresentation} from "@sales/production-order-presentation";
const Pass = ({children}: {children?: ReactNode}) => <>{children}</>;
mock.module("@gnd/ui/tooltip", () => ({Tooltip:Pass,TooltipProvider:Pass,TooltipTrigger:Pass,TooltipContent:Pass}));
const {ProductionAttentionTooltip,ProductionAttentionButton,calendarExpandedPresentation} = await import("./order-attention");
const presentation: ProductionOrderPresentation = {
 primary:{code:"completed",label:"Production completed",detail:"2 of 2 submitted",basis:"reported"},
 attention:[{code:"material",message:"Materials are missing."},{code:"review",message:"Allocation needs approval."}],
 reportedQty:2,
};
const props={presentation,orderNo:"TEST-1",lockReason:"Completed work cannot be moved."};
test("tooltip gives each alert its own icon and includes the lock reason",()=>{
 const html=renderToStaticMarkup(<ProductionAttentionTooltip {...props}><button>Order</button></ProductionAttentionTooltip>);
 expect(html).toContain("🔒");
 expect(html).toContain(props.lockReason);
 expect(html).toContain("Reported work; approval is still required");
 expect(html.match(/<li /g)?.length).toBe(2);
 expect(html.match(/<svg /g)?.length).toBe(2);
 for(const reason of presentation.attention) expect(html).toContain(reason.message);
});
test("lock-only explanation does not introduce an alert button",()=>{
 const quiet={...props,presentation:{...presentation,attention:[]}};
 expect(renderToStaticMarkup(<ProductionAttentionButton {...quiet}/>)).toBe("");
 const html=renderToStaticMarkup(<ProductionAttentionTooltip {...quiet}><button>Order</button></ProductionAttentionTooltip>);
 expect(html).toContain(quiet.lockReason);
 expect(html).not.toContain("<li");
});
test("worker tooltip suppression renders only the original control",()=>{
 const html=renderToStaticMarkup(<ProductionAttentionTooltip {...props} disabled><button>Order</button></ProductionAttentionTooltip>);
 expect(html).toBe("<button>Order</button>");
});

test("lock-only card offers a separate tappable reason without an alert icon",()=>{
 const quiet={...props,presentation:{...presentation,attention:[]}};
 const html=renderToStaticMarkup(<ProductionAttentionButton {...quiet} kind="lock"/>);
 expect(html).toContain('aria-label="Why TEST-1 cannot be rescheduled"');
 expect(html).toContain("🔒");
 expect(html).not.toContain("<svg");
});

test("expanded calendar details replace material prose and retain independent blockers",()=>{
 const input={...presentation,attention:[{code:"material_review_blocked",message:"Material review has an unresolved blocker."},{code:"allocation_review",message:"Allocation needs approval."},{code:"conflict:schedule",message:"Schedule needs review."}]};
 expect(calendarExpandedPresentation(input).attention).toEqual([{code:"conflict:schedule",message:"Schedule needs review."}]);
 expect(input.attention.length).toBe(3);
});

test("calendar cards render an explicit details control without mounting material queries",()=>{
 const html=renderToStaticMarkup(<ProductionAttentionTooltip {...props} salesOrderId={123}><div><button>Order</button><ProductionAttentionButton {...props}/></div></ProductionAttentionTooltip>);
 expect(html).toContain('aria-label="Material details for TEST-1"');
 expect(html).not.toContain("Checking material availability");
 expect(html).not.toContain("Select available materials");
});
