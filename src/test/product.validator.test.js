import { describe, it, expect } from "vitest";
import { createProductSchema } from "../../src/validators/product.js";

const validProduct = {
  slug:     "nox-at10",
  sport:    "padel",
  category: "Rackets",
  brand:    "Nox",
  name:     "Nox AT10",
  price:    3500,
};

describe("Product validator", () => {
  it("accepts a valid product", () => {
    const { error } = createProductSchema.validate(validProduct);
    expect(error).toBeUndefined();
  });

  it("rejects invalid slug (has spaces)", () => {
    const bad = { ...validProduct, slug: "nox at 10" };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects invalid slug (uppercase)", () => {
    const bad = { ...validProduct, slug: "NOX-AT10" };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects invalid sport value", () => {
    const bad = { ...validProduct, sport: "tennis" };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects negative price", () => {
    const bad = { ...validProduct, price: -100 };
    const { error } = createProductSchema.validate(bad);
    expect(error).toBeDefined();
  });

  it("rejects missing required fields", () => {
    const { error } = createProductSchema.validate({ slug: "test" });
    expect(error).toBeDefined();
  });

  it("accepts all valid sports", () => {
    ["padel", "football", "all"].forEach((sport) => {
      const { error } = createProductSchema.validate({ ...validProduct, sport });
      expect(error).toBeUndefined();
    });
  });
});
