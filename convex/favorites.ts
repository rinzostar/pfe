import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("favorites").take(500);
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("favorites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(500);
  },
});

export const toggle = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", userId).eq("courseId", args.courseId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete("favorites", existing._id);
      return { favorited: false };
    } else {
      await ctx.db.insert("favorites", { userId, courseId: args.courseId });
      return { favorited: true };
    }
  },
});
