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
    return await ctx.db.query("programs").take(500);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("programs", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("programs"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch("programs", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete("programs", args.id);
  },
});
