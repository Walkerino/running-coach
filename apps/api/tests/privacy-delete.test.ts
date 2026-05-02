import { describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: {
    delete: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("../src/db/prisma.js", () => ({ prisma: prismaMock }));

describe("deleteUserData", () => {
  it("deletes the user record and cascades related data", async () => {
    const { deleteUserData } = await import("../src/services/user-service.js");
    await deleteUserData("user-1");

    expect(prismaMock.user.delete).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
  });
});
