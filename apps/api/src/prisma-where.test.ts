import { describe, expect, it } from "bun:test";
import { whereEmployees } from "./prisma-where";
import { employeesQueryParamsSchema } from "./schemas/hrm";

describe("employees query params schema", () => {
  it("preserves q for employee search", () => {
    const parsed = employeesQueryParamsSchema.parse({
      q: "Jane",
      role: "Manager",
    });

    expect(parsed.q).toBe("Jane");
    expect(parsed.role).toBe("Manager");
  });
});

describe("whereEmployees", () => {
  it("adds text search across employee fields", () => {
    const where = whereEmployees({
      q: "Jane",
    });

    expect(where).toEqual({
      OR: [
        { name: { contains: "Jane" } },
        { email: { contains: "Jane" } },
        { username: { contains: "Jane" } },
        { phoneNo: { contains: "Jane" } },
        {
          employeeProfile: {
            name: { contains: "Jane" },
          },
        },
      ],
    });
  });
});
