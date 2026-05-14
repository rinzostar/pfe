import { query } from "convex/server";
import { v } from "convex/values";

export const listSemesters = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("semesters").collect();
  },
});

export const listSemestersByDept = query({
  args: { departmentId: v.optional(v.number()), level: v.optional(v.string()), yearCode: v.optional(v.string()) },
  handler: async (ctx, { departmentId, level, yearCode }) => {
    let rows = await ctx.db.query("semesters").collect();
    if (departmentId !== undefined) rows = rows.filter(s => s.departmentId === departmentId);
    if (level) rows = rows.filter(s => s.level === level);
    if (yearCode) rows = rows.filter(s => s.yearCode === yearCode);
    return rows;
  },
});

export const listModulesBySemester = query({
  args: { semesterId: v.number() },
  handler: async (ctx, { semesterId }) => {
    const modules = await ctx.db.query("modules").withIndex("by_semester", (q) => q.eq("semesterId", semesterId)).collect();
    const courses = await ctx.db.query("courses").collect();
    return modules.map(m => ({
      ...m,
      courseCount: courses.filter(c => c.moduleId === m._id).length,
    }));
  },
});

export const getModule = query({
  args: { id: v.number() },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const listCoursesByModule = query({
  args: { moduleId: v.number() },
  handler: async (ctx, { moduleId }) => {
    return await ctx.db.query("courses").withIndex("by_module", (q) => q.eq("moduleId", moduleId)).collect();
  },
});

export const listAttachments = query({
  args: { courseId: v.optional(v.number()), moduleId: v.optional(v.number()) },
  handler: async (ctx, { courseId, moduleId }) => {
    if (courseId !== undefined) {
      return await ctx.db.query("attachments").withIndex("by_course", (q) => q.eq("courseId", courseId)).collect();
    }
    if (moduleId !== undefined) {
      const moduleCourses = await ctx.db.query("courses").withIndex("by_module", (q) => q.eq("moduleId", moduleId)).collect();
      const courseIds = moduleCourses.map(c => c._id);
      const allAttachments = await ctx.db.query("attachments").collect();
      return allAttachments.filter(a => courseIds.includes(a.courseId));
    }
    return [];
  },
});

export const listFavorites = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const favs = await ctx.db.query("favorites").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const courses = await ctx.db.query("courses").collect();
    const modules = await ctx.db.query("modules").collect();
    return favs.map(f => {
      const course = courses.find(c => c._id === f.courseId);
      const module = course ? modules.find(m => m._id === course.moduleId) : null;
      return course ? { ...course, module } : null;
    }).filter(Boolean);
  },
});

export const listPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    return posts.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
});

export const getProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profiles = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    return profiles[0] || null;
  },
});

export const getActiveLivestreamForModule = query({
  args: { moduleId: v.number() },
  handler: async (ctx, { moduleId }) => {
    const roomName = `module-${moduleId}`;
    const livestreams = await ctx.db.query("livestreams").withIndex("by_roomName", (q) => q.eq("roomName", roomName)).collect();
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    return livestreams.find(l => l.status === "live" && (!l.startedAt || l.startedAt >= cutoff)) || null;
  },
});

export const listActiveLivestreams = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const livestreams = await ctx.db.query("livestreams").withIndex("by_status", (q) => q.eq("status", "live")).collect();
    const modules = await ctx.db.query("modules").collect();
    return livestreams
      .filter(l => !l.startedAt || l.startedAt >= cutoff)
      .map(l => ({
        ...l,
        moduleName: modules.find(m => m._id === l.moduleId)?.name || "Unknown Module",
      }));
  },
});

export const listChat = query({
  args: { livestreamId: v.string() },
  handler: async (ctx, { livestreamId }) => {
    return await ctx.db.query("chatMessages").withIndex("by_livestream", (q) => q.eq("livestreamId", livestreamId)).collect();
  },
});

export const listNotifications = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db.query("notifications").collect();
    const filtered = all.filter(n => n.userId === null || n.userId === userId);
    return filtered.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
});

export const unreadNotificationCount = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db.query("notifications").collect();
    return all.filter(n => !n.read && (n.userId === null || n.userId === userId)).length;
  },
});

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.map(p => ({
      id: p.userId,
      fullName: p.fullName,
      email: p.email,
      role: p.role,
      banned: p.banned || false,
      avatar: p.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
    }));
  },
});

export const listProfessors = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").filter((q) => q.eq(q.field("role"), "professor")).collect();
    return profiles.map(p => ({ id: p.userId, fullName: p.fullName, email: p.email }));
  },
});

export const listAdminModules = query({
  args: {},
  handler: async (ctx) => {
    const modules = await ctx.db.query("modules").collect();
    const semesters = await ctx.db.query("semesters").collect();
    const profiles = await ctx.db.query("profiles").collect();
    return modules.map(m => ({
      ...m,
      semesterLabel: semesters.find(s => s._id === m.semesterId)?.label || "Unknown",
      ownerName: profiles.find(p => p.userId === m.ownerId)?.fullName || "Unassigned",
    }));
  },
});

export const listMyModules = query({
  args: { profId: v.string() },
  handler: async (ctx, { profId }) => {
    const modules = await ctx.db.query("modules").withIndex("by_owner", (q) => q.eq("ownerId", profId)).collect();
    const semesters = await ctx.db.query("semesters").collect();
    const courses = await ctx.db.query("courses").collect();
    return modules.map(m => ({
      ...m,
      semesterLabel: semesters.find(s => s._id === m.semesterId)?.label || "Unknown",
      courseCount: courses.filter(c => c.moduleId === m._id).length,
    }));
  },
});

export const listReports = query({
  args: {},
  handler: async (ctx) => {
    const reports = await ctx.db.query("reports").collect();
    const posts = await ctx.db.query("posts").collect();
    const grouped = {};
    reports.forEach(r => {
      grouped[r.postId] = (grouped[r.postId] || 0) + 1;
    });
    return Object.entries(grouped).map(([pid, count]) => {
      const p = posts.find(x => x._id === Number(pid));
      return p ? { ...p, count } : null;
    }).filter(Boolean);
  },
});

export const listAccessRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("accessRequests").collect();
    return requests.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  },
});

export const listYearAdmins = query({
  args: {},
  handler: async (ctx) => {
    return [];
  },
});