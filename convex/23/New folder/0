// convex/attempts.ts - النسخة المحدثة
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const startAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user) {
      throw new Error("المستخدم غير موجود");
    }

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz || !quiz.isActive) {
      throw new Error("المسابقة غير متاحة حالياً");
    }

    // Check existing attempts
    const existingAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_quiz", (q) => q.eq("userId", user._id).eq("quizId", args.quizId))
      .collect();

    if (existingAttempts.length >= quiz.maxAttempts) {
      throw new Error(`لقد استنفدت عدد المحاولات المسموحة (${quiz.maxAttempts})`);
    }

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const attemptId = await ctx.db.insert("attempts", {
      userId: user._id,
      quizId: args.quizId,
      score: 0,
      totalQuestions: questions.length,
      correctAnswers: 0,
      timeSpent: 0,
      completedAt: Date.now(),
      attemptNumber: existingAttempts.length + 1,
    });

    return attemptId;
  },
});

export const submitAnswer = mutation({
  args: {
    attemptId: v.id("attempts"),
    questionId: v.id("questions"),
    selectedAnswer: v.number(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("السؤال غير موجود");
    }

    const isCorrect = args.selectedAnswer === question.correctAnswer;
    
    // طريقة حساب النقاط الجديدة - نفس الواجهة الأمامية تماماً
    const timeRemaining = Math.max(0, 20 - Math.floor(args.timeSpent / 1000)); // 20 ثانية إجمالي
    let points = 0;
    
    if (isCorrect) {
      if (timeRemaining > 13) points = 10;    // من 20 إلى 14 ثانية
      else if (timeRemaining > 11) points = 9; // 13-12 ثانية
      else if (timeRemaining > 9) points = 8;  // 11-10 ثانية
      else if (timeRemaining > 7) points = 7;  // 9-8 ثانية
      else if (timeRemaining > 5) points = 6;  // 7-6 ثانية
      else points = 5;                         // 5 ثواني أو أقل
    }

    await ctx.db.insert("answers", {
      attemptId: args.attemptId,
      questionId: args.questionId,
      selectedAnswer: args.selectedAnswer,
      isCorrect,
      timeSpent: args.timeSpent,
      points,
    });

    // Update attempt score
    const attempt = await ctx.db.get(args.attemptId);
    if (attempt) {
      await ctx.db.patch(args.attemptId, {
        score: attempt.score + points,
        correctAnswers: isCorrect ? attempt.correctAnswers + 1 : attempt.correctAnswers,
        timeSpent: attempt.timeSpent + args.timeSpent,
      });
    }

    return { isCorrect, points };
  },
});

export const getLeaderboard = query({
  args: {
    quizId: v.id("quizzes"),
  },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_quiz_score", (q) => q.eq("quizId", args.quizId))
      .collect();

    // Get best attempt for each user
    const userBestAttempts = new Map();
    
    for (const attempt of attempts) {
      const existing = userBestAttempts.get(attempt.userId.toString());
      if (!existing || attempt.score > existing.score || 
          (attempt.score === existing.score && attempt.timeSpent < existing.timeSpent)) {
        userBestAttempts.set(attempt.userId.toString(), attempt);
      }
    }

    const leaderboard = await Promise.all(
      Array.from(userBestAttempts.values()).map(async (attempt) => {
        try {
          const user = await ctx.db.get(attempt.userId);
          
          // إذا لم يتم العثور على المستخدم، تخطى هذه المحاولة
          if (!user) {
            return null;
          }

          let userName = "Unknown";
          let userAvatar = null;

          // تحقق من وجود اسم المستخدم بشكل صحيح
          if (user && typeof user === 'object' && 'name' in user) {
            const nameValue = user.name;
            if (typeof nameValue === 'string' && nameValue.trim() !== '') {
              userName = nameValue;
            }
          }
          
          // تحقق من وجود صورة
          if (user && typeof user === 'object' && 'avatar' in user && user.avatar) {
            try {
              userAvatar = await ctx.storage.getUrl(user.avatar);
            } catch (error) {
              userAvatar = null;
            }
          }

          return {
            _id: attempt._id,
            userId: attempt.userId,
            quizId: attempt.quizId,
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            correctAnswers: attempt.correctAnswers,
            timeSpent: attempt.timeSpent,
            completedAt: attempt.completedAt,
            attemptNumber: attempt.attemptNumber,
            userName: userName,
            userAvatar: userAvatar,
          };
        } catch (error) {
          console.error("Error processing user data:", error);
          return null;
        }
      })
    );

    // تصفية المحاولات التي لم يتم العثور على مستخدميها
    const validLeaderboard = leaderboard.filter(entry => entry !== null);

    // Sort by score (desc) then by time (asc)
    validLeaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    });

    return validLeaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  },
});

export const getUserAttempts = query({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!user) return [];

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_quiz", (q) => q.eq("userId", user._id).eq("quizId", args.quizId))
      .collect();

    return attempts.sort((a, b) => b.completedAt - a.completedAt);
  },
});

export const getQuizAttempts = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
  },
});

export const resetUserAttempts = mutation({
  args: {
    quizId: v.id("quizzes"),
    userFingerprint: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
      throw new Error("ليست لديك صلاحية تجديد المحاولات");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.userFingerprint))
      .first();

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_quiz", (q) => 
        q.eq("userId", targetUser._id).eq("quizId", args.quizId)
      )
      .collect();

    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }

    return { success: true, deletedCount: attempts.length };
  },
});

export const resetAllAttempts = mutation({
  args: {
    quizId: v.id("quizzes"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
      throw new Error("ليست لديك صلاحية تجديد المحاولات");
    }

    const attempts = await ctx.db
      .query("attempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }

    return { success: true, deletedCount: attempts.length };
  },
});

export const updateQuizMaxAttempts = mutation({
  args: {
    quizId: v.id("quizzes"),
    newMaxAttempts: v.number(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
      throw new Error("ليست لديك صلاحية تعديل عدد المحاولات");
    }

    await ctx.db.patch(args.quizId, {
      maxAttempts: args.newMaxAttempts,
    });

    return { success: true, newMaxAttempts: args.newMaxAttempts };
  },
});

// وظائف إدارة المستخدمين - المدير يستطيع حذف أي مستخدم

export const deleteUser = mutation({
  args: {
    targetUserFingerprint: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("ليست لديك صلاحية حذف المستخدمين");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.targetUserFingerprint))
      .first();

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    // منع المستخدم من حذف نفسه
    if (targetUser._id === currentUser._id) {
      throw new Error("لا يمكنك حذف حسابك الخاص");
    }

    // حذف جميع محاولات المستخدم أولاً
    const userAttempts = await ctx.db
      .query("attempts")
      .withIndex("by_user_quiz", (q) => q.eq("userId", targetUser._id))
      .collect();

    for (const attempt of userAttempts) {
      // حذف جميع إجابات المحاولة
      const answers = await ctx.db
        .query("answers")
        .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
        .collect();
      
      for (const answer of answers) {
        await ctx.db.delete(answer._id);
      }
      
      await ctx.db.delete(attempt._id);
    }

    // حذف المستخدم
    await ctx.db.delete(targetUser._id);

    return { 
      success: true, 
      deletedUser: targetUser._id, 
      deletedAttempts: userAttempts.length,
      userName: targetUser.name || "مستخدم"
    };
  },
});

export const promoteToAdmin = mutation({
  args: {
    targetUserFingerprint: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("ليست لديك صلاحية ترقية المستخدمين");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.targetUserFingerprint))
      .first();

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    await ctx.db.patch(targetUser._id, {
      isAdmin: true,
      isModerator: true, // المدير يكون مشرف تلقائياً
    });

    return { 
      success: true, 
      promotedUser: targetUser._id,
      userName: targetUser.name || "مستخدم"
    };
  },
});

export const promoteToModerator = mutation({
  args: {
    targetUserFingerprint: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
      throw new Error("ليست لديك صلاحية ترقية المستخدمين");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.targetUserFingerprint))
      .first();

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    await ctx.db.patch(targetUser._id, {
      isModerator: true,
    });

    return { 
      success: true, 
      promotedUser: targetUser._id,
      userName: targetUser.name || "مستخدم"
    };
  },
});

export const demoteUser = mutation({
  args: {
    targetUserFingerprint: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("ليست لديك صلاحية إزالة صلاحيات المستخدمين");
    }

    const targetUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.targetUserFingerprint))
      .first();

    if (!targetUser) {
      throw new Error("المستخدم غير موجود");
    }

    // منع المستخدم من إزالة صلاحيات نفسه
    if (targetUser._id === currentUser._id) {
      throw new Error("لا يمكنك إزالة صلاحيات حسابك الخاص");
    }

    await ctx.db.patch(targetUser._id, {
      isAdmin: false,
      isModerator: false,
    });

    return { 
      success: true, 
      demotedUser: targetUser._id,
      userName: targetUser.name || "مستخدم"
    };
  },
});

export const getAllUsers = query({
  args: {
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || (!currentUser.isAdmin && !currentUser.isModerator)) {
      throw new Error("ليست لديك صلاحية عرض جميع المستخدمين");
    }

    const users = await ctx.db
      .query("users")
      .collect();

    return await Promise.all(
      users.map(async (user: any) => {
        let userAvatar = null;
        if (user.avatar) {
          userAvatar = await ctx.storage.getUrl(user.avatar);
        }

        // الحصول على إحصائيات المستخدم
        const userAttempts = await ctx.db
          .query("attempts")
          .withIndex("by_user_quiz", (q) => q.eq("userId", user._id))
          .collect();

        const totalQuizzes = new Set(userAttempts.map(attempt => attempt.quizId.toString())).size;
        const totalScore = userAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        const totalCorrect = userAttempts.reduce((sum, attempt) => sum + (attempt.correctAnswers || 0), 0);
        const totalQuestions = userAttempts.reduce((sum, attempt) => sum + (attempt.totalQuestions || 0), 0);

        return {
          _id: user._id,
          name: user.name || "مستخدم",
          deviceFingerprint: user.deviceFingerprint,
          email: user.email || "لا يوجد بريد",
          avatar: userAvatar,
          isAdmin: user.isAdmin || false,
          isModerator: user.isModerator || false,
          totalAttempts: userAttempts.length,
          totalQuizzes,
          totalScore,
          totalCorrect,
          totalQuestions,
          accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
          joinedAt: user._creationTime,
          lastLogin: user.lastLogin || user._creationTime,
        };
      })
    );
  },
});

// وظيفة لحذف جميع المستخدمين (للمدير فقط)
export const deleteAllUsers = mutation({
  args: {
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser || !currentUser.isAdmin) {
      throw new Error("ليست لديك صلاحية حذف جميع المستخدمين");
    }

    const allUsers = await ctx.db
      .query("users")
      .collect();

    let deletedCount = 0;
    let currentUserDeleted = false;

    for (const user of allUsers) {
      // تخطى المستخدم الحالي
      if (user._id === currentUser._id) {
        continue;
      }

      // حذف محاولات المستخدم
      const userAttempts = await ctx.db
        .query("attempts")
        .withIndex("by_user_quiz", (q) => q.eq("userId", user._id))
        .collect();

      for (const attempt of userAttempts) {
        // حذف إجابات المحاولة
        const answers = await ctx.db
          .query("answers")
          .withIndex("by_attempt", (q) => q.eq("attemptId", attempt._id))
          .collect();
        
        for (const answer of answers) {
          await ctx.db.delete(answer._id);
        }
        
        await ctx.db.delete(attempt._id);
      }

      // حذف المستخدم
      await ctx.db.delete(user._id);
      deletedCount++;
    }

    return { 
      success: true, 
      deletedCount,
      message: `تم حذف ${deletedCount} مستخدم بنجاح`
    };
  },
});