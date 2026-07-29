-- An inbound status is sufficient to start the receiving workflow.
-- Supplier, expected date, and PO/reference can be supplied later.
ALTER TABLE `InboundShipment`
    MODIFY `supplierId` INTEGER NULL;
