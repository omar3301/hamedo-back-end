import { describe, it, expect } from "vitest";
import { createOrderSchema } from "../../src/validators/order.js";

const validOrder = {
  customer: {
    firstName: "Ahmed",
    lastName:  "Mohamed",
    phone:     "+201012345678",
  },
  delivery: {
    address:     "123 Nile Street",
    city:        "Cairo",
    governorate: "Cairo",
  },
  items: [
    {
      productId: "abc123",
      name:      "Nox Racket",
      size:      "M",
      qty:       1,
      price:     750,
    },
  ],
};

describe("Order validator", () => {
  it("accepts a valid order", () => {
    const { error } = createOrderSchema.validate(validOrder);
    expect(error).toBeUndefined();
  });

  it("rejects missing firstName", () => {
    const bad = { ...validOrder, customer: { ...validOrder.customer, firstName: "" } };
    const { error } = createOrderSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects invalid phone format", () => {
    const bad = { ...validOrder, customer: { ...validOrder.customer, phone: "01012345678" } };
    const { error } = createOrderSchema.validate(bad);
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("Phone");
  });

  it("rejects empty items array", () => {
    const bad = { ...validOrder, items: [] };
    const { error } = createOrderSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects qty over 100", () => {
    const bad = {
      ...validOrder,
      items: [{ ...validOrder.items[0], qty: 999 }],
    };
    const { error } = createOrderSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects negative price", () => {
    const bad = {
      ...validOrder,
      items: [{ ...validOrder.items[0], price: -50 }],
    };
    const { error } = createOrderSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("accepts pickup without delivery address", () => {
    const pickup = {
      ...validOrder,
      deliveryMethod: "pickup",
      delivery: { address: "Store", city: "Shebin El Kom", governorate: "Menoufiya" },
    };
    const { error } = createOrderSchema.validate(pickup);
    expect(error).toBeUndefined();
  });
});
