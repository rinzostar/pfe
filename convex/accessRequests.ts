import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("accessRequests")
      .withIndex("by_module")
      .take(500);
  },
});

export const create = mutation({
  args: {
    moduleId: v.id("modules"),
    moduleName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    if (!user || user.role !== "professor") throw new Error("Only professors can request access");
    return await ctx.db.insert("accessRequests", {
      professorId: userId,
      professorName: user.name || "Professor",
      moduleId: args.moduleId,
      moduleName: args.moduleName,
      status: "pending",
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("accessRequests"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    if (!user || user.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.patch("accessRequests", args.id, { status: args.status });
  },
});
