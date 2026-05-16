import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get("users", userId);
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
}

export const listByProgram = query({
  args: { programId: v.id("programs") },
  handler: async (ctx, args) => {
    const years = await ctx.db
      .query("years")
      .withIndex("by_program", (q) => q.eq("programId", args.programId))
      .take(500);
    return years.map((y) => ({ ...y, levelId: y.programId }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    programId: v.id("programs"),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("years", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("years"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch("years", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("years") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete("years", args.id);
  },
});
