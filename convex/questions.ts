// questions.ts - الملف المعدل كامل
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addQuestion = mutation({
  args: {
    quizId: v.id("quizzes"),
    question: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("true_false")),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    image: v.optional(v.id("_storage")),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بإضافة أسئلة");
    }

    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const order = existingQuestions.length + 1;

   const questionId = await ctx.db.insert("questions", {
  quizId: args.quizId,
  question: args.question,
  type: args.type,
  options: args.options,
  correctAnswer: args.correctAnswer,
  image: args.image,
  order,
  createdAt: Date.now(),  // <
});
    return questionId;
  },
});

export const updateQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    question: v.string(),
    type: v.union(v.literal("multiple_choice"), v.literal("true_false")),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    image: v.optional(v.id("_storage")),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بتحديث الأسئلة");
    }

    // التحقق من وجود السؤال
    const existingQuestion = await ctx.db.get(args.questionId);
    if (!existingQuestion) {
      throw new Error("السؤال غير موجود");
    }

    // تحديث السؤال
    await ctx.db.patch(args.questionId, {
      question: args.question,
      type: args.type,
      options: args.options,
      correctAnswer: args.correctAnswer,
      image: args.image,
    });

    return args.questionId;
  },
});

export const getQuizQuestions = query({
  args: {
    quizId: v.id("quizzes"),
    shuffle: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    // Add image URLs
    questions = await Promise.all(
      questions.map(async (question) => ({
        ...question,
        imageUrl: question.image ? await ctx.storage.getUrl(question.image) : null,
      }))
    );

    // Shuffle questions if requested - استخدام خوارزمية Fisher-Yates للخلط
    if (args.shuffle) {
      const shuffledQuestions = [...questions];
      for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
      }
      questions = shuffledQuestions;
    } else {
      questions = questions.sort((a, b) => a.order - b.order);
    }

    return questions;
  },
});

export const deleteQuestion = mutation({
  args: {
    questionId: v.id("questions"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بحذف الأسئلة");
    }

    await ctx.db.delete(args.questionId);
  },
});

export const getQuestion = query({
  args: {
    questionId: v.id("questions"),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      return null;
    }

    const imageUrl = question.image ? await ctx.storage.getUrl(question.image) : null;

    return {
      ...question,
      imageUrl,
    };
  },
});

export const reorderQuestions = mutation({
  args: {
    quizId: v.id("quizzes"),
    questionOrders: v.array(v.object({
      questionId: v.id("questions"),
      order: v.number(),
    })),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user || (!user.isAdmin && !user.isModerator)) {
      throw new Error("غير مصرح لك بإعادة ترتيب الأسئلة");
    }

    // تحديث ترتيب جميع الأسئلة
    for (const item of args.questionOrders) {
      await ctx.db.patch(item.questionId, {
        order: item.order,
      });
    }

    return { success: true };
  },
});