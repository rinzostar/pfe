import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get("users", userId);
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("faculties").take(500);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("faculties", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("faculties"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch("faculties", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("faculties") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete("faculties", args.id);
  },
});
