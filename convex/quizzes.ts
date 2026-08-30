// convex/quizzes.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createQuiz = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
    maxAttempts: v.number(),
    shuffleQuestions: v.boolean(),
    shuffleAnswers: v.boolean(),
    creatorFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const creator = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.creatorFingerprint))
      .first();

    if (!creator || (!creator.isAdmin && !creator.isModerator)) {
      throw new Error("غير مصرح لك بإنشاء مسابقة");
    }

    const quizId = await ctx.db.insert("quizzes", {
      title: args.title,
      description: args.description,
      image: args.image,
      isActive: false,
      maxAttempts: args.maxAttempts,
      shuffleQuestions: args.shuffleQuestions,
      shuffleAnswers: args.shuffleAnswers,
      reviewMode: false, // القيمة الافتراضية
      createdBy: creator._id,
      createdAt: Date.now(),
    });

    return quizId;
  },
});

export const getAllQuizzes = query({
  handler: async (ctx) => {
    const quizzes = await ctx.db.query("quizzes").collect();
    
    return Promise.all(
      quizzes.map(async (quiz) => {
        const creator = await ctx.db.get(quiz.createdBy);
        const questionCount = await ctx.db
          .query("questions")
          .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
          .collect();

        return {
          ...quiz,
          imageUrl: quiz.image ? await ctx.storage.getUrl(quiz.image) : null,
          creatorName: creator?.name || "Unknown",
          questionCount: questionCount.length,
          // تأكد من وجود reviewMode
          reviewMode: quiz.reviewMode ?? false,
        };
      })
    );
  },
});

export const getActiveQuiz = query({
  handler: async (ctx) => {
    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (!quiz) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
      .collect();

    return {
      ...quiz,
      imageUrl: quiz.image ? await ctx.storage.getUrl(quiz.image) : null,
      questionCount: questions.length,
      reviewMode: quiz.reviewMode ?? false,
    };
  },
});

export const startQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك ببدء المسابقة");
    }

    // Deactivate all other quizzes
    const allQuizzes = await ctx.db.query("quizzes").collect();
    for (const quiz of allQuizzes) {
      if (quiz.isActive) {
        await ctx.db.patch(quiz._id, { isActive: false });
      }
    }

    // Activate the selected quiz
    await ctx.db.patch(args.quizId, {
      isActive: true,
      startTime: Date.now(),
    });
  },
});

export const stopQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بإيقاف المسابقة");
    }

    await ctx.db.patch(args.quizId, {
      isActive: false,
      endTime: Date.now(),
    });
  },
});

export const deleteQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بحذف المسابقة");
    }

    // Delete all related questions and attempts
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    for (const question of questions) {
      await ctx.db.delete(question._id);
    }

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_quiz_score", (q) => q.eq("quizId", args.quizId))
      .collect();

    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }

    await ctx.db.delete(args.quizId);
  },
});

// الدوال الجديدة
export const toggleReviewMode = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const { quizId, userFingerprint } = args;

    // التحقق من صلاحيات المستخدم
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", userFingerprint)
      )
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بتغيير وضع المراجعة");
    }

    // جلب المسابقة الحالية
    const quiz = await ctx.db.get(quizId);
    if (!quiz) {
      throw new Error("المسابقة غير موجودة");
    }

    // تبديل وضع المراجعة (مع التعامل مع القيم undefined)
    const currentReviewMode = quiz.reviewMode ?? false;
    const newReviewMode = !currentReviewMode;
    
    await ctx.db.patch(quizId, {
      reviewMode: newReviewMode,
    });

    return newReviewMode;
  },
});

export const updateQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.id("_storage")),
    maxAttempts: v.number(),
    shuffleQuestions: v.boolean(),
    shuffleAnswers: v.boolean(),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", args.userFingerprint)
      )
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بتحديث المسابقة");
    }

    await ctx.db.patch(args.quizId, {
      title: args.title,
      description: args.description,
      image: args.image,
      maxAttempts: args.maxAttempts,
      shuffleQuestions: args.shuffleQuestions,
      shuffleAnswers: args.shuffleAnswers,
    });
  },
});

// دالة Migration لإصلاح البيانات القديمة
export const fixReviewModeForAllQuizzes = mutation({
  handler: async (ctx) => {
    const quizzes = await ctx.db.query("quizzes").collect();
    let fixedCount = 0;

    for (const quiz of quizzes) {
      // إذا reviewMode غير موجود أو undefined، نضيفه
      if (quiz.reviewMode === undefined || quiz.reviewMode === null) {
        await ctx.db.patch(quiz._id, {
          reviewMode: false
        });
        fixedCount++;
      }
    }

    return `تم إصلاح ${fixedCount} مسابقة`;
  },
});