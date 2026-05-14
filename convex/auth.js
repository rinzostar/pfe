import { query, mutation } from "convex/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .first();
    if (!user) return null;
    return { _id: user._id, email: user.email, name: user.fullName, role: user.role };
  },
});

export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!profile) throw new Error("Invalid credentials");
    if (profile.passwordHash !== password) throw new Error("Invalid credentials");
    if (profile.banned) throw new Error("Account banned");
    await ctx.auth.signIn({
      subject: profile.userId,
      name: profile.fullName,
    });
    return { _id: profile._id, email: profile.email, name: profile.fullName, role: profile.role };
  },
});

export const signOut = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.auth.signOut();
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { email, password, fullName, role }) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new Error("Email already in use");

    const userId = await ctx.auth.createUser({
      email,
      name: fullName,
    });

    await ctx.db.insert("profiles", {
      userId,
      email,
      fullName,
      passwordHash: password,
      role: role === "admin" || role === "professor" ? role : "student",
      banned: false,
    });

    return { _id: userId, email, name: fullName };
  },
});