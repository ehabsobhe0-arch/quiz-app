// convex/clearData.ts
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const clearAllUsers = mutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let deletedCount = 0;
    
    for (const user of users) {
      await ctx.db.delete(user._id);
      deletedCount++;
    }
    
    return { success: true, deleted: deletedCount };
  },
});

export const makeMeAdmin = mutation({
  args: {
    fingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => 
        q.eq("deviceFingerprint", args.fingerprint)
      )
      .first();
    
    if (!user) {
      throw new Error("المستخدم غير موجود");
    }

    await ctx.db.patch(user._id, {
      isAdmin: true,
      isModerator: true,
      canAssignModerators: true,
    });

    return { 
      success: true, 
      user: user.name,
      message: `تم ترقية ${user.name} إلى مدير`
    };
  },
});

export const clearAllData = mutation({
  handler: async (ctx) => {
    // مسح جميع الجداول
    const tables = ["users", "quizzes", "questions", "attempts", "answers", "comments"];
    const results: Record<string, number> = {};
    
    for (const table of tables) {
      // استخدم طريقة مختلفة لجلب البيانات
      const items = await ctx.db.query(table as any).collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      results[table] = items.length;
    }
    
    return { 
      success: true, 
      results,
      message: "تم مسح جميع البيانات بنجاح"
    };
  },
});