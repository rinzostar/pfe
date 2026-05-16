import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByCourse = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .take(100);
    return await Promise.all(
      attachments.map(async (a) => {
        const url = await ctx.storage.getUrl(a.storageId);
        return { ...a, filePath: url || "#" };
      })
    );
  },
});

export const listByModule = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_module", (q) => q.eq("moduleId", args.moduleId))
      .take(50);
    const allAttachments: any[] = [];
    for (const course of courses) {
      const attachments = await ctx.db
        .query("attachments")
        .withIndex("by_course", (q) => q.eq("courseId", course._id))
        .take(20);
      for (const a of attachments) {
        const url = await ctx.storage.getUrl(a.storageId);
        allAttachments.push({ ...a, filePath: url || "#" });
      }
    }
    return allAttachments;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const course = await ctx.db.get("courses", args.courseId);
    if (!course) throw new Error("Course not found");
    const moduleDoc = await ctx.db.get("modules", course.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      throw new Error("Unauthorized");
    }
    return await ctx.db.insert("attachments", args);
  },
});

export const remove = mutation({
  args: { id: v.id("attachments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const attachment = await ctx.db.get("attachments", args.id);
    if (!attachment) throw new Error("Attachment not found");
    const course = await ctx.db.get("courses", attachment.courseId);
    if (!course) throw new Error("Course not found");
    const moduleDoc = await ctx.db.get("modules", course.moduleId);
    if (!moduleDoc) throw new Error("Module not found");
    if (user?.role !== "admin" && moduleDoc.ownerId !== userId) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete("attachments", args.id);
  },
});
