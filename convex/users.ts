import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, createAccount } from "@convex-dev/auth/server";

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    if (user?.banned) return null;
    return user;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const currentUser = await ctx.db.get("users", userId);
    if (!currentUser || currentUser.role !== "admin") return [];
    return await ctx.db.query("users").take(500);
  },
});

export const listProfessors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "professor"))
      .take(500);
  },
});

export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("student"), v.literal("professor"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await ctx.db.get("users", callerId);
    if (!caller || caller.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.patch("users", args.userId, { role: args.role });
  },
});

export const setBanned = mutation({
  args: {
    userId: v.id("users"),
    banned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await ctx.db.get("users", callerId);
    if (!caller || caller.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.patch("users", args.userId, { banned: args.banned });
  },
});

export const updateUser = mutation({
  args: {
    departmentId: v.optional(v.id("departments")),
    yearId: v.optional(v.id("years")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch("users", userId, {
      departmentId: args.departmentId,
      yearId: args.yearId,
    });
  },
});

export const createUser = action({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("student"), v.literal("professor"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (!callerId) throw new Error("Not authenticated");
    const caller = await ctx.db.get("users", callerId);
    if (!caller || caller.role !== "admin") throw new Error("Unauthorized");
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile: {
        email: args.email,
        name: args.name,
        role: args.role,
      },
    });
    return { userId: user._id };
  },
});
