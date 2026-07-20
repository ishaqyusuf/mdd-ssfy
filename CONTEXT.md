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

**Merchandising Content**:
Public page copy, media, navigation, promotions, and sections that present
Storefront Offers without defining their product relationships or pricing.
_Avoid_: Product configuration
