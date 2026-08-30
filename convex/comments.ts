// convex/comments.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addComment = mutation({
  args: {
    quizId: v.id("quizzes"),
    text: v.string(),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    // التحقق من وجود المستخدم
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", args.userFingerprint)
      )
      .first();

    if (!user) {
      throw new Error("المستخدم غير موجود");
    }

    // التحقق من وجود المسابقة
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error("المسابقة غير موجودة");
    }

    // إضافة التعليق
    const commentId = await ctx.db.insert("comments", {
      quizId: args.quizId,
      userId: user._id,
      text: args.text,
      likes: [],
      createdAt: Date.now(),
    });

    return commentId;
  },
});

export const getQuizComments = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .order("desc")
      .collect();

    // جلب معلومات المستخدمين لكل تعليق
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: user ? {
            name: user.name,
            avatarUrl: user.avatar ? await ctx.storage.getUrl(user.avatar) : null,
            isAdmin: user.isAdmin,
            isModerator: user.isModerator,
          } : undefined,
        };
      })
    );

    return commentsWithUsers;
  },
});

export const getQuizCommentsCount = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    return comments.length;
  },
});

export const likeComment = mutation({
  args: {
    commentId: v.id("comments"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", args.userFingerprint)
      )
      .first();

    if (!user) {
      throw new Error("المستخدم غير موجود");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("التعليق غير موجود");
    }

    const hasLiked = comment.likes.includes(user._id);
    const newLikes = hasLiked
      ? comment.likes.filter(id => id !== user._id)
      : [...comment.likes, user._id];

    await ctx.db.patch(args.commentId, {
      likes: newLikes,
    });

    return { liked: !hasLiked };
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", args.userFingerprint)
      )
      .first();

    if (!user) {
      throw new Error("المستخدم غير موجود");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("التعليق غير موجود");
    }

    // التحقق من الصلاحيات (المستخدم نفسه أو مشرف أو مدير)
    const canDelete = user.isAdmin || user.isModerator || comment.userId === user._id;
    if (!canDelete) {
      throw new Error("غير مصرح لك بحذف هذا التعليق");
    }

    await ctx.db.delete(args.commentId);
  },
});