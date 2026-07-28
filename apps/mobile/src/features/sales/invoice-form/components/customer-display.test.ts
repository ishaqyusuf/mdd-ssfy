import { describe, expect, it } from "bun:test";
import {
  getCustomerAddressLine,
  getCustomerContactLine,
} from "./customer-display";

describe("customer display helpers", () => {
  it("joins contact with phone when both are available", () => {
    expect(
      getCustomerContactLine({
        id: 1,
        profileId: 2,
        name: "Acme Builders",
        businessName: "Acme Builders",
        contact: "Dana Miles",
        phone: "555-0100",
        email: "dana@example.com",
        billingAddressId: 10,
        shippingAddressId: 11,
        billingAddress: "10 Market St",
        shippingAddress: "20 Site Rd",
        taxCode: "TX",
      }),
    ).toBe("Dana Miles - 555-0100");
  });

  it("does not render dangling separators for sparse customers", () => {
    expect(
      getCustomerContactLine({
        id: 1,
        profileId: null,
        name: "Acme Builders",
        businessName: "",
        contact: "Acme Builders",
        phone: "",
        email: "",
        billingAddressId: 0,
        shippingAddressId: 0,
        billingAddress: "",
        shippingAddress: "",
        taxCode: "",
      }),
    ).toBe("Acme Builders");
  });

  it("falls back from billing to shipping address", () => {
    expect(
      getCustomerAddressLine({
        id: 1,
        profileId: null,
        name: "Acme Builders",
        businessName: "",
        contact: "Acme Builders",
        phone: "",
        email: "",
        billingAddressId: 0,
        shippingAddressId: 0,
        billingAddress: "",
        shippingAddress: "20 Site Rd",
        taxCode: "",
      }),
    ).toBe("20 Site Rd");
  });
});
