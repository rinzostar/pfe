import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("professor"), v.literal("student")),
    fullName: v.string(),
    email: v.string(),
    banned: v.boolean().optional(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),
  semesters: defineTable({
    level: v.string(),
    yearCode: v.string(),
    semesterCode: v.string(),
    label: v.string(),
    departmentId: v.optional(v.number()),
  })
    .index("by_department", ["departmentId"])
    .index("by_yearCode", ["yearCode"]),

  modules: defineTable({
    semesterId: v.number(),
    name: v.string(),
    ownerId: v.string(),
    ownerName: v.optional(v.string()),
  })
    .index("by_semester", ["semesterId"])
    .index("by_owner", ["ownerId"]),

  courses: defineTable({
    moduleId: v.number(),
    title: v.string(),
    content: v.optional(v.string()),
    ytUrl: v.optional(v.string()),
    createdAt: v.optional(v.string()),
  })
    .index("by_module", ["moduleId"])
    .index("by_createdAt", ["createdAt"]),

  attachments: defineTable({
    courseId: v.number(),
    filePath: v.string(),
    fileName: v.string(),
    fileType: v.optional(v.string()),
  })
    .index("by_course", ["courseId"]),

  favorites: defineTable({
    userId: v.string(),
    courseId: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"]),

  posts: defineTable({
    authorId: v.string(),
    authorName: v.optional(v.string()),
    content: v.string(),
    link: v.optional(v.string()),
    filePath: v.optional(v.string()),
    createdAt: v.string(),
    likes: v.optional(v.array(v.string())),
    comments: v.optional(v.array(v.object({
      id: v.number(),
      authorId: v.string(),
      authorName: v.string(),
      content: v.string(),
      createdAt: v.string(),
    }))),
    favorites: v.optional(v.array(v.string())),
  })
    .index("by_author", ["authorId"])
    .index("by_createdAt", ["createdAt"]),

  reports: defineTable({
    postId: v.number(),
    reporterId: v.string(),
    createdAt: v.string(),
  })
    .index("by_post", ["postId"])
    .index("by_reporter", ["reporterId"]),

  livestreams: defineTable({
    moduleId: v.number(),
    hostId: v.string(),
    roomName: v.string(),
    status: v.union(v.literal("live"), v.literal("ended")),
    startedAt: v.string(),
  })
    .index("by_module", ["moduleId"])
    .index("by_host", ["hostId"])
    .index("by_roomName", ["roomName"])
    .index("by_status", ["status"]),

  chatMessages: defineTable({
    livestreamId: v.string(),
    senderId: v.string(),
    senderName: v.optional(v.string()),
    message: v.string(),
    createdAt: v.string(),
  })
    .index("by_livestream", ["livestreamId"])
    .index("by_createdAt", ["createdAt"]),

  notifications: defineTable({
    userId: v.union(v.string(), v.null()),
    type: v.union(v.literal("post"), v.literal("live")),
    title: v.string(),
    message: v.string(),
    createdAt: v.string(),
    read: v.optional(v.boolean()),
    postId: v.optional(v.number()),
    moduleId: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["read"]),

  accessRequests: defineTable({
    professorId: v.string(),
    professorName: v.string(),
    moduleId: v.number(),
    moduleName: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.string(),
  })
    .index("by_professor", ["professorId"])
    .index("by_status", ["status"]),
});