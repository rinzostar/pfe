import { mutation } from "convex/server";
import { v } from "convex/values";

export const createProfile = mutation({
  args: {
    userId: v.string(),
    fullName: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("professor"), v.literal("student")),
    banned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("profiles", { ...args, banned: args.banned || false });
  },
});

export const createLivestream = mutation({
  args: {
    moduleId: v.number(),
    hostId: v.string(),
    roomName: v.string(),
    status: v.union(v.literal("live"), v.literal("ended")),
    startedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("livestreams")
      .withIndex("by_roomName", (q) => q.eq("roomName", args.roomName))
      .filter((q) => q.and(q.eq(q.field("status"), "live")))
      .first();
    if (existing) return existing;
    const id = await ctx.db.insert("livestreams", args);
    return { ...args, _id: id };
  },
});

export const endLivestream = mutation({
  args: { livestreamId: v.optional(v.string()), moduleId: v.optional(v.number()) },
  handler: async (ctx, { livestreamId, moduleId }) => {
    if (livestreamId) {
      const ls = await ctx.db.get(livestreamId);
      if (ls) await ctx.db.patch(livestreamId, { status: "ended" });
    } else if (moduleId) {
      const roomName = `module-${moduleId}`;
      const livestreams = await ctx.db.query("livestreams").withIndex("by_roomName", (q) => q.eq("roomName", roomName)).collect();
      for (const ls of livestreams) {
        if (ls.status === "live") await ctx.db.patch(ls._id, { status: "ended" });
      }
    }
    return true;
  },
});

export const sendChat = mutation({
  args: { livestreamId: v.string(), senderId: v.string(), senderName: v.string(), message: v.string() },
  handler: async (ctx, { livestreamId, senderId, senderName, message }) => {
    await ctx.db.insert("chatMessages", {
      livestreamId,
      senderId,
      senderName,
      message,
      createdAt: new Date().toISOString(),
    });
    return true;
  },
});

export const createPost = mutation({
  args: { authorId: v.string(), content: v.string(), link: v.optional(v.string()), filePath: v.optional(v.string()) },
  handler: async (ctx, { authorId, content, link, filePath }) => {
    const postId = await ctx.db.insert("posts", {
      authorId,
      content,
      link,
      filePath,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      favorites: [],
    });
    await ctx.db.insert("notifications", {
      userId: null,
      type: "post",
      title: "Nouveau post",
      message: `New post in community`,
      createdAt: new Date().toISOString(),
      read: false,
      postId: postId,
    });
    return { ...args, _id: postId };
  },
});

export const deletePost = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    const reports = await ctx.db.query("reports").withIndex("by_post", (q) => q.eq("postId", id)).collect();
    for (const r of reports) await ctx.db.delete(r._id);
    return true;
  },
});

export const reportPost = mutation({
  args: { postId: v.number(), reporterId: v.string() },
  handler: async (ctx, { postId, reporterId }) => {
    await ctx.db.insert("reports", { postId, reporterId, createdAt: new Date().toISOString() });
    return true;
  },
});

export const dismissReports = mutation({
  args: { postId: v.number() },
  handler: async (ctx, { postId }) => {
    const reports = await ctx.db.query("reports").withIndex("by_post", (q) => q.eq("postId", postId)).collect();
    for (const r of reports) await ctx.db.delete(r._id);
    return true;
  },
});

export const toggleLike = mutation({
  args: { postId: v.number(), userId: v.string() },
  handler: async (ctx, { postId, userId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const likes = post.likes || [];
    const idx = likes.indexOf(userId);
    if (idx >= 0) likes.splice(idx, 1);
    else likes.push(userId);
    await ctx.db.patch(postId, { likes });
    return likes.length;
  },
});

export const addComment = mutation({
  args: { postId: v.number(), authorId: v.string(), authorName: v.string(), content: v.string() },
  handler: async (ctx, { postId, authorId, authorName, content }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const comments = post.comments || [];
    const comment = { id: Date.now(), authorId, authorName, content, createdAt: new Date().toISOString() };
    comments.push(comment);
    await ctx.db.patch(postId, { comments });
    return comment;
  },
});

export const toggleFavoritePost = mutation({
  args: { postId: v.number(), userId: v.string() },
  handler: async (ctx, { postId, userId }) => {
    const post = await ctx.db.get(postId);
    if (!post) throw new Error("Post not found");
    const favorites = post.favorites || [];
    const idx = favorites.indexOf(userId);
    if (idx >= 0) favorites.splice(idx, 1);
    else favorites.push(userId);
    await ctx.db.patch(postId, { favorites });
    return favorites.length;
  },
});

export const toggleFavorite = mutation({
  args: { userId: v.string(), courseId: v.number() },
  handler: async (ctx, { userId, courseId }) => {
    const existing = await ctx.db
      .query("favorites")
      .withIndex("by_user_course", (q) => q.eq(q.field("userId"), userId).eq(q.field("courseId"), courseId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("favorites", { userId, courseId });
    }
    return true;
  },
});

export const createCourse = mutation({
  args: { moduleId: v.number(), title: v.string(), content: v.optional(v.string()), ytUrl: v.optional(v.string()) },
  handler: async (ctx, { moduleId, title, content, ytUrl }) => {
    const id = await ctx.db.insert("courses", {
      moduleId,
      title,
      content: content || "",
      ytUrl,
      createdAt: new Date().toISOString(),
    });
    return { _id: id, moduleId, title, content, ytUrl, createdAt: new Date().toISOString() };
  },
});

export const updateCourse = mutation({
  args: { id: v.number(), title: v.optional(v.string()), content: v.optional(v.string()), ytUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return true;
  },
});

export const deleteCourse = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    const attachments = await ctx.db.query("attachments").withIndex("by_course", (q) => q.eq("courseId", id)).collect();
    for (const a of attachments) await ctx.db.delete(a._id);
    return true;
  },
});

export const createModule = mutation({
  args: { name: v.string(), semesterId: v.number(), ownerId: v.string() },
  handler: async (ctx, { name, semesterId, ownerId }) => {
    const id = await ctx.db.insert("modules", { name, semesterId, ownerId });
    return { _id: id, name, semesterId, ownerId };
  },
});

export const updateModule = mutation({
  args: { id: v.number(), name: v.string() },
  handler: async (ctx, { id, name }) => {
    await ctx.db.patch(id, { name });
    return true;
  },
});

export const createAttachment = mutation({
  args: { courseId: v.number(), filePath: v.string(), fileName: v.string(), fileType: v.optional(v.string()) },
  handler: async (ctx, { courseId, filePath, fileName, fileType }) => {
    const id = await ctx.db.insert("attachments", { courseId, filePath, fileName, fileType });
    return { _id: id, courseId, filePath, fileName, fileType };
  },
});

export const deleteAttachment = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return true;
  },
});

export const markNotificationRead = mutation({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { read: true });
    return true;
  },
});

export const markAllNotificationsRead = mutation({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    const notifs = await ctx.db.query("notifications").collect();
    for (const n of notifs) {
      if (n.userId === null || n.userId === userId) await ctx.db.patch(n._id, { read: true });
    }
    return true;
  },
});

export const setBanned = mutation({
  args: { userId: v.string(), banned: v.boolean() },
  handler: async (ctx, { userId, banned }) => {
    const profiles = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    if (profiles[0]) await ctx.db.patch(profiles[0]._id, { banned });
    return true;
  },
});

export const createAccessRequest = mutation({
  args: { professorId: v.string(), professorName: v.string(), moduleId: v.number(), moduleName: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("accessRequests", { ...args, status: "pending", createdAt: new Date().toISOString() });
    return { _id: id, ...args, status: "pending", createdAt: new Date().toISOString() };
  },
});

export const updateAccessRequest = mutation({
  args: { id: v.number(), status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")) },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
    return true;
  },
});

export const seedSemesters = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("semesters").collect();
    if (existing.length > 0) return "already seeded";
    const semesters = [
      { level: "Licence", yearCode: "L1", semesterCode: "S1", label: "Licence 1 - S1" },
      { level: "Licence", yearCode: "L1", semesterCode: "S2", label: "Licence 1 - S2" },
      { level: "Licence", yearCode: "L2", semesterCode: "S3", label: "Licence 2 - S3" },
      { level: "Licence", yearCode: "L2", semesterCode: "S4", label: "Licence 2 - S4" },
      { level: "Licence", yearCode: "L3", semesterCode: "S5", label: "Licence 3 - S5" },
      { level: "Licence", yearCode: "L3", semesterCode: "S6", label: "Licence 3 - S6" },
      { level: "Master", yearCode: "M1", semesterCode: "S1", label: "Master 1 - S1" },
      { level: "Master", yearCode: "M1", semesterCode: "S2", label: "Master 1 - S2" },
      { level: "Master", yearCode: "M2", semesterCode: "S3", label: "Master 2 - S3" },
      { level: "Doctorat", yearCode: "D1", semesterCode: "R1", label: "Doctorat - Recherche 1" },
    ];
    for (const s of semesters) await ctx.db.insert("semesters", s);
    return "seeded";
  },
});