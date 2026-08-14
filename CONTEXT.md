# GND Commerce and Sales

GND commerce uses one sales configuration and order domain across office,
dealer, mobile, and customer-facing surfaces. Each surface may simplify what a
person sees, but product relationships, pricing, and order meaning stay shared.

## Language

**Dyke Sales Configuration**:
The shared step graph, components, compatibility rules, and pricing dependencies
used to configure GND sales lines.
_Avoid_: DAX, storefront builder, website-only configuration

**Sales Form**:
A surface that creates or edits a configured quote or order using the Dyke Sales
Configuration.
_Avoid_: Product configurator

**Storefront Offer**:
A published customer-facing entry into an existing Dyke root configuration,
with public content and a permitted subset of its steps and components.
_Avoid_: Storefront product, duplicate inventory product

**Storefront Configuration Policy**:
The public visibility, label, order, default, requirement, and skip rules applied
to existing Dyke steps and components for a Storefront Offer.
_Avoid_: Separate storefront workflow

**Customer Configuration**:
A customer's valid selection snapshot produced by the shared sales
configuration rules.
_Avoid_: Custom product

**Commerce Cart**:
A customer-owned collection of Customer Configurations that can be promoted
losslessly into the standard sales workflow.
_Avoid_: Draft order

**Storefront Order**:
A standard GND sales order created through the storefront and identified by its
sales channel.
_Avoid_: Web order, separate e-commerce order

**Customer Order View**:
The customer-safe projection of a Storefront Order, its payment, documents, and
fulfillment progress.
_Avoid_: Customer copy of an order

**Special Order Declaration**:
The required Yes or No decision that classifies an entire Sales Order as
containing special-order or non-returnable items. It applies to the order as a
whole, not to individual invoice lines, service lines, HPT sizes, moulding
lines, or components.
_Avoid_: Special-order item flag, component-level special order

**Special Order**:
A Sales Order whose Special Order Declaration is Yes. The classification
belongs only to that order and is never inherited by another order for the same
customer.
_Avoid_: Special-order customer, permanently non-returnable account

**Special Order Enforcement Mode**:
The single global Sales policy selected by a Super Admin that determines
whether an unapproved Special Order produces warnings only, blocks purchasing
and production, or blocks purchasing, production, packing, and dispatch.
_Avoid_: Order status, per-user approval policy

**Approval Revision**:
The exact customer-visible version of a Special Order presented for customer
acknowledgment and signature.
_Avoid_: Current order state, mutable approval link

**Current Approval**:
A completed customer acknowledgment and signature that matches the current
Approval Revision of a Special Order.
_Avoid_: Customer-approved account, reusable customer approval

**Reapproval Required**:
The state of a Special Order when its customer-visible content changed after a
Current Approval or when an authorized salesperson explicitly requests a new
approval.
_Avoid_: Cancelled approval

**Superseded Approval**:
A prior customer acknowledgment retained as historical evidence after it stops
matching the current Approval Revision or reapproval is requested.
_Avoid_: Deleted approval, cancelled signature

**Special Order Approval Override**:
A role-configured capability that lets a user who already holds the relevant
operational permission continue purchasing, production, packing, or dispatch
for a Special Order that is Signature Pending or Reapproval Required. It never
grants the underlying operation, never overrides Customer Declined, and always
produces attributable override evidence.
_Avoid_: Special sale override, unsigned-order permission, general operations override

**Merchandising Content**:
Public page copy, media, navigation, promotions, and sections that present
Storefront Offers without defining their product relationships or pricing.
_Avoid_: Product configuration
