import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByModule = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .order("asc")
      .take(500);
    return await Promise.all(
      courses.map(async (course) => {
        const attachments = await ctx.db
          .query("attachments")
          .withIndex("by_course", (q) => q.eq("courseId", course._id))
          .take(50);
        const attachmentsWithUrl = await Promise.all(
          attachments.map(async (a) => {
            const url = await ctx.storage.getUrl(a.storageId);
            return { ...a, filePath: url || "#" };
          })
        );
        return {
          ...course,
          attachments: attachmentsWithUrl,
          attachment_count: attachments.length,
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get("courses", args.id);
  },
});

export const create = mutation({
  args: {
    moduleId: v.id("modules"),
    title: v.string(),
    content: v.optional(v.string()),
    ytUrl: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const moduleDoc = await ctx.db.get("modules", args.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      const req = await ctx.db
        .query("accessRequests")
        .withIndex("by_module", (q) =>
          q.eq("moduleId", args.moduleId).eq("professorId", userId)
        )
        .unique();
      if (!req || req.status !== "approved") {
        throw new Error("Unauthorized");
      }
    }
    const courseId = await ctx.db.insert("courses", args);
    await ctx.db.patch("modules", args.moduleId, {
      courseCount: (moduleDoc.courseCount || 0) + 1,
    });
    return courseId;
  },
});

export const update = mutation({
  args: {
    id: v.id("courses"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    ytUrl: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const course = await ctx.db.get("courses", args.id);
    if (!course) throw new Error("Course not found");
    const moduleDoc = await ctx.db.get("modules", course.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      throw new Error("Unauthorized");
    }
    const { id, ...fields } = args;
    await ctx.db.patch("courses", id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const course = await ctx.db.get("courses", args.id);
    if (!course) throw new Error("Course not found");
    const moduleDoc = await ctx.db.get("modules", course.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      throw new Error("Unauthorized");
    }
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_course", (q) => q.eq("courseId", args.id))
      .take(100);
    for (const a of attachments) {
      await ctx.db.delete("attachments", a._id);
    }
    await ctx.db.delete("courses", args.id);
    await ctx.db.patch("modules", course.moduleId, {
      courseCount: Math.max((moduleDoc.courseCount || 1) - 1, 0),
    });
  },
});
