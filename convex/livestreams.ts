import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getActiveForModule = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const livestream = await ctx.db
      .query("livestreams")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .filter((q) => q.eq(q.field("status"), "live"))
      .unique();
    return livestream;
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("livestreams")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .take(100);
  },
});

export const create = mutation({
  args: {
    moduleId: v.id("modules"),
    moduleName: v.string(),
    roomName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const moduleDoc = await ctx.db.get("modules", args.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      throw new Error("Unauthorized");
    }
    // End any existing live stream for this module
    const existing = await ctx.db
      .query("livestreams")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .filter((q) => q.eq(q.field("status"), "live"))
      .unique();
    if (existing) {
      await ctx.db.patch("livestreams", existing._id, { status: "ended" });
    }
    return await ctx.db.insert("livestreams", {
      moduleId: args.moduleId,
      hostId: userId,
      hostName: user?.name || "Host",
      roomName: args.roomName,
      status: "live",
      startedAt: Date.now(),
    });
  },
});

export const end = mutation({
  args: { livestreamId: v.id("livestreams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const livestream = await ctx.db.get("livestreams", args.livestreamId);
    if (!livestream) throw new Error("Livestream not found");
    if (user?.role !== "admin" && livestream.hostId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.patch("livestreams", args.livestreamId, { status: "ended" });
  },
});
