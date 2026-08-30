// convex/migrations.ts
import { mutation } from "./_generated/server";

export const addReviewModeToQuizzes = mutation({
  handler: async (ctx) => {
    // جلب جميع المسابقات القديمة
    const quizzes = await ctx.db.query("quizzes").collect();
    
    let updatedCount = 0;
    
    for (const quiz of quizzes) {
      // إذا المسابقة مافيهاش reviewMode، نضيفها
      if (quiz.reviewMode === undefined) {
        await ctx.db.patch(quiz._id, {
          reviewMode: false // القيمة الافتراضية
        });
        updatedCount++;
      }
    }
    
    return `تم تحديث ${updatedCount} مسابقة`;
  },
});