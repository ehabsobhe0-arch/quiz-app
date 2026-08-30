// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  users: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    avatar: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    deviceFingerprint: v.string(),
    ipAddress: v.string(),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    isAdmin: v.boolean(),
    isModerator: v.boolean(),
    canAssignModerators: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
    lastLogin: v.optional(v.number()),
    createdAt: v.number(),
    tokenIdentifier: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_device_fingerprint", ["deviceFingerprint"])
    .index("by_ip", ["ipAddress"])
    .index("by_email", ["email"])
    .index("by_name", ["name"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_active", ["isActive"]),

  quizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    isActive: v.boolean(),
    maxAttempts: v.number(),
    shuffleQuestions: v.boolean(),
    shuffleAnswers: v.boolean(),
    reviewMode: v.optional(v.boolean()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_created_by", ["createdBy"]),

  questions: defineTable({
    quizId: v.id("quizzes"),
    question: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("true_false")),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    image: v.optional(v.id("_storage")),
    order: v.number(),
     createdAt: v.number(), 
  })
    .index("by_quiz", ["quizId"]),
  attempts: defineTable({
    userId: v.id("users"),
    quizId: v.id("quizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    timeSpent: v.number(),
    completedAt: v.number(),
    attemptNumber: v.number(),
  })
    .index("by_user_quiz", ["userId", "quizId"])
    .index("by_quiz_score", ["quizId", "score"])
    .index("by_quiz_completed", ["quizId", "completedAt"])
    .index("by_quiz", ["quizId"]),

  answers: defineTable({
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    selectedAnswer: v.number(),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
    points: v.number(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_question", ["questionId"]),

  // جدول التعليقات الجديد
  comments: defineTable({
    quizId: v.id("quizzes"),
    userId: v.id("users"),
    text: v.string(),
    likes: v.array(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});