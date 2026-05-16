import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get("users", userId);
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
}

export const listByYear = query({
  args: { yearId: v.id("years") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("semesters")
      .withIndex("by_year", (q) => q.eq("yearId", args.yearId))
      .take(500);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    label: v.optional(v.string()),
    yearId: v.id("years"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("semesters", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("semesters"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch("semesters", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("semesters") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete("semesters", args.id);
  },
});
