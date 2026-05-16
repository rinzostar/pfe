import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function assertAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get("users", userId);
  if (!user || user.role !== "admin") throw new Error("Unauthorized");
}

export const listBySemester = query({
  args: { semesterId: v.id("semesters") },
  handler: async (ctx, args) => {
    const modules = await ctx.db
      .query("modules")
      .withIndex("by_semester", (q) => q.eq("semesterId", args.semesterId))
      .take(500);
    return await Promise.all(
      modules.map(async (mod) => {
        const owner = mod.ownerId ? await ctx.db.get("users", mod.ownerId) : null;
        return {
          ...mod,
          owner_name: owner?.name || "Unassigned",
          course_count: mod.courseCount || 0,
        };
      })
    );
  },
});

export const listByDepartment = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modules")
      .withIndex("by_department", (q) => q.eq("departmentId", args.departmentId))
      .take(500);
  },
});

export const listMyModules = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get("users", userId);
    if (!user) return [];
    if (user.role === "admin") {
      return await ctx.db.query("modules").take(500);
    }
    return await ctx.db
      .query("modules")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .take(500);
  },
});

export const get = query({
  args: { id: v.id("modules") },
  handler: async (ctx, args) => {
    const mod = await ctx.db.get("modules", args.id);
    if (!mod) return null;
    const semester = mod.semesterId ? await ctx.db.get("semesters", mod.semesterId) : null;
    const year = semester?.yearId ? await ctx.db.get("years", semester.yearId) : null;
    const program = year?.programId ? await ctx.db.get("programs", year.programId) : null;
    const department = mod.departmentId ? await ctx.db.get("departments", mod.departmentId) : null;
    const faculty = department?.facultyId ? await ctx.db.get("faculties", department.facultyId) : null;
    const owner = mod.ownerId ? await ctx.db.get("users", mod.ownerId) : null;
    return {
      ...mod,
      faculty_name: faculty?.name || "",
      department_name: department?.name || "",
      level_name: program?.name || "",
      year_name: year?.name || "",
      semester_label: semester?.label || semester?.name || "",
      owner_name: owner?.name || "Unassigned",
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    semesterId: v.id("semesters"),
    departmentId: v.optional(v.id("departments")),
    ownerId: v.optional(v.id("users")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    return await ctx.db.insert("modules", { ...args, courseCount: 0 });
  },
});

export const update = mutation({
  args: {
    id: v.id("modules"),
    name: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get("users", userId);
    const mod = await ctx.db.get("modules", args.id);
    if (!mod) throw new Error("Module not found");
    if (user?.role !== "admin" && mod.ownerId !== userId) throw new Error("Unauthorized");
    const { id, ...fields } = args;
    await ctx.db.patch("modules", id, fields);
  },
});
