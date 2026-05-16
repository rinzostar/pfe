import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("student"), v.literal("professor"), v.literal("admin"))),
    banned: v.optional(v.boolean()),
    departmentId: v.optional(v.id("departments")),
    yearId: v.optional(v.id("years")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  faculties: defineTable({
    name: v.string(),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
  }),

  departments: defineTable({
    name: v.string(),
    facultyId: v.id("faculties"),
    icon: v.optional(v.string()),
  })
    .index("by_faculty", ["facultyId"]),

  programs: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    icon: v.optional(v.string()),
  }),

  years: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    programId: v.id("programs"),
  })
    .index("by_program", ["programId"]),

  semesters: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    label: v.optional(v.string()),
    yearId: v.id("years"),
  })
    .index("by_year", ["yearId"]),

  modules: defineTable({
    name: v.string(),
    semesterId: v.id("semesters"),
    departmentId: v.optional(v.id("departments")),
    description: v.optional(v.string()),
    ownerId: v.optional(v.id("users")),
    courseCount: v.optional(v.number()),
  })
    .index("by_semester", ["semesterId"])
    .index("by_department", ["departmentId"])
    .index("by_owner", ["ownerId"]),

  courses: defineTable({
    title: v.string(),
    moduleId: v.id("modules"),
    content: v.optional(v.string()),
    ytUrl: v.optional(v.string()),
    order: v.optional(v.number()),
  })
    .index("by_module", ["moduleId"]),

  attachments: defineTable({
    courseId: v.id("courses"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
  })
    .index("by_course", ["courseId"]),

  favorites: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_course", ["userId", "courseId"]),

  posts: defineTable({
    authorId: v.id("users"),
    content: v.string(),
    link: v.optional(v.string()),
    filePath: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    yearId: v.optional(v.id("years")),
  })
    .index("by_department", ["departmentId"])
    .index("by_year", ["yearId"])
    .index("by_author", ["authorId"]),

  postLikes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  postFavorites: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.id("users"),
    authorName: v.string(),
    content: v.string(),
  })
    .index("by_post", ["postId"]),

  reports: defineTable({
    postId: v.id("posts"),
    reporterId: v.id("users"),
  })
    .index("by_post", ["postId"]),

  livestreams: defineTable({
    moduleId: v.id("modules"),
    hostId: v.id("users"),
    hostName: v.string(),
    roomName: v.string(),
    status: v.union(v.literal("live"), v.literal("ended")),
    startedAt: v.number(),
  })
    .index("by_module", ["moduleId"])
    .index("by_status", ["status"]),

  chatMessages: defineTable({
    livestreamId: v.id("livestreams"),
    senderId: v.id("users"),
    senderName: v.string(),
    message: v.string(),
  })
    .index("by_livestream", ["livestreamId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    moduleId: v.optional(v.id("modules")),
    read: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  accessRequests: defineTable({
    professorId: v.id("users"),
    professorName: v.string(),
    moduleId: v.id("modules"),
    moduleName: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  })
    .index("by_module", ["moduleId"])
    .index("by_professor", ["professorId"]),
});
