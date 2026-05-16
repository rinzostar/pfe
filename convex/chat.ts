import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { livestreamId: v.id("livestreams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_livestream", (q) => q.eq("livestreamId", args.livestreamId))
      .order("desc")
      .take(200);
  },
});

export const send = mutation({
  args: {
    livestreamId: v.id("livestreams"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    await ctx.db.insert("chatMessages", {
      livestreamId: args.livestreamId,
      senderId: userId,
      senderName: user?.name || "Anonymous",
      message: args.message,
    });
  },
});
