import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get("users", userId);
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
}

export const listByFaculty = query({
  args: { facultyId: v.id("faculties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("departments")
      .withIndex("by_faculty", (q) => q.eq("facultyId", args.facultyId))
      .take(500);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    facultyId: v.id("faculties"),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("departments", args);
  },
});

export const update = mutation({
  args: {
    id: v.id("departments"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const { id, ...fields } = args;
    await ctx.db.patch("departments", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.delete("departments", args.id);
  },
});
