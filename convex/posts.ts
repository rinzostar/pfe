import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    departmentId: v.optional(v.id("departments")),
    yearId: v.optional(v.id("years")),
  },
  handler: async (ctx, args) => {
    let posts: any[] = [];
    if (args.departmentId) {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
        .order("desc")
        .take(200);
    } else if (args.yearId) {
      posts = await ctx.db
        .query("posts")
        .withIndex("by_year", (q) => q.eq("yearId", args.yearId))
        .order("desc")
        .take(200);
    } else {
      posts = await ctx.db.query("posts").order("desc").take(200);
    }
    return await Promise.all(
      posts.map(async (post) => {
        const likes = await ctx.db
          .query("postLikes")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .take(500);
        const favorites = await ctx.db
          .query("postFavorites")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .take(500);
        const comments = await ctx.db
          .query("comments")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .take(100);
        const reports = await ctx.db
          .query("reports")
          .withIndex("by_post", (q) => q.eq("postId", post._id))
          .take(100);
        return {
          ...post,
          likes: likes.map((l) => l.userId),
          favorites: favorites.map((f) => f.userId),
          comments,
          reportCount: reports.length,
        };
      })
    );
  },
});

export const create = mutation({
  args: {
    content: v.string(),
    link: v.optional(v.string()),
    filePath: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    yearId: v.optional(v.id("years")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    return await ctx.db.insert("posts", {
      authorId: userId,
      content: args.content,
      link: args.link,
      filePath: args.filePath,
      departmentId: args.departmentId,
      yearId: args.yearId,
    });
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("postLikes")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete("postLikes", existing._id);
    } else {
      await ctx.db.insert("postLikes", { userId, postId: args.postId });
    }
  },
});

export const toggleFavorite = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("postFavorites")
      .withIndex("by_user_and_post", (q) =>
        q.eq("userId", userId).eq("postId", args.postId)
      )
      .unique();
    if (existing) {
      await ctx.db.delete("postFavorites", existing._id);
    } else {
      await ctx.db.insert("postFavorites", { userId, postId: args.postId });
    }
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("posts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    return await ctx.db.insert("comments", {
      postId: args.postId,
      authorId: userId,
      authorName: user?.name || "Anonymous",
      content: args.content,
    });
  },
});

export const report = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("reports", { postId: args.postId, reporterId: userId });
  },
});

export const listReports = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get("users", userId);
    if (!user || user.role !== "admin") return [];
    const reports = await ctx.db.query("reports").take(500);
    return await Promise.all(
      reports.map(async (r) => {
        const post = await ctx.db.get("posts", r.postId);
        const reporter = await ctx.db.get("users", r.reporterId);
        const author = post ? await ctx.db.get("users", post.authorId) : null;
        return {
          ...r,
          post,
          reporter_name: reporter?.name || "Unknown",
          author_id: post?.authorId,
          author_name: author?.name || "Unknown",
          content: post?.content,
          link: post?.link,
          created_at: post?._creationTime,
        };
      })
    );
  },
});

export const dismissReports = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    if (!user || user.role !== "admin") throw new Error("Unauthorized");
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .take(500);
    for (const r of reports) {
      await ctx.db.delete("reports", r._id);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("posts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const post = await ctx.db.get("posts", args.id);
    if (!post) throw new Error("Post not found");
    if (user?.role !== "admin" && post.authorId !== userId) {
      throw new Error("Unauthorized");
    }
    // Delete related data
    const likes = await ctx.db
      .query("postLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.id))
      .take(500);
    for (const l of likes) await ctx.db.delete("postLikes", l._id);
    const favorites = await ctx.db
      .query("postFavorites")
      .withIndex("by_post", (q) => q.eq("postId", args.id))
      .take(500);
    for (const f of favorites) await ctx.db.delete("postFavorites", f._id);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.id))
      .take(500);
    for (const c of comments) await ctx.db.delete("comments", c._id);
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_post", (q) => q.eq("postId", args.id))
      .take(500);
    for (const r of reports) await ctx.db.delete("reports", r._id);
    await ctx.db.delete("posts", args.id);
  },
});
