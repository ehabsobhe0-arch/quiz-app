// convex/users.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// دالة مساعدة للحصول على مستخدم مع القيم الافتراضية للحقول المفقودة
const getUserWithDefaults = (user: any) => {
  return {
    ...user,
    isActive: user.isActive ?? true,
    lastLogin: user.lastLogin ?? user.createdAt,
    canAssignModerators: user.canAssignModerators ?? false,
    userAgent: user.userAgent ?? "unknown",
    phone: user.phone ?? null,
    birthDate: user.birthDate ?? null,
    bio: user.bio ?? "",
  };
};

// دالة للتحقق إذا كان المستخدم هو المدير الأساسي (أول مستخدم)
const isFirstAdmin = async (ctx: any, userId: any) => {
  const allUsers = await ctx.db.query("users").collect();
  const sortedUsers = allUsers.sort((a: any, b: any) => a.createdAt - b.createdAt);
  return sortedUsers.length > 0 && sortedUsers[0]._id === userId;
};

export const registerUser = mutation({
  args: {
    name: v.string(),
    deviceFingerprint: v.string(),
    ipAddress: v.string(),
    userAgent: v.optional(v.string()),
    avatar: v.optional(v.id("_storage")),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log("بدء تسجيل مستخدم جديد:", args.name, "ببصمة:", args.deviceFingerprint);
      
      const allUsersWithSameFingerprint = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .collect();

      const activeUserWithSameFingerprint = allUsersWithSameFingerprint.find((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        return userWithDefaults.isActive;
      });

      if (activeUserWithSameFingerprint) {
        console.log("تم رفض التسجيل: يوجد مستخدم نشط بنفس البصمة:", activeUserWithSameFingerprint._id);
        throw new Error("هذا الجهاز مسجل بالفعل بنشاط في النظام. لا يمكن إنشاء حساب جديد.");
      }

      const inactiveUserWithSameFingerprint = allUsersWithSameFingerprint.find((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        return !userWithDefaults.isActive;
      });

      if (inactiveUserWithSameFingerprint) {
        console.log("إعادة تفعيل مستخدم معطل موجود:", inactiveUserWithSameFingerprint._id);
        
        const existingActiveUserWithSameName = await ctx.db
          .query("users")
          .withIndex("by_name", (q) => q.eq("name", args.name))
          .first();

        if (existingActiveUserWithSameName) {
          const existingUserWithDefaults = getUserWithDefaults(existingActiveUserWithSameName);
          if (existingUserWithDefaults.isActive && existingActiveUserWithSameName._id !== inactiveUserWithSameFingerprint._id) {
            throw new Error("هذا الاسم مستخدم بالفعل من قبل مستخدم نشط. يرجى اختيار اسم آخر.");
          }
        }

        await ctx.db.patch(inactiveUserWithSameFingerprint._id, {
          name: args.name,
          avatar: args.avatar,
          ipAddress: args.ipAddress,
          userAgent: args.userAgent,
          phone: args.phone,
          birthDate: args.birthDate,
          bio: args.bio,
          isActive: true,
          lastLogin: Date.now(),
        });

        console.log("تم إعادة تفعيل المستخدم بنجاح:", inactiveUserWithSameFingerprint._id);
        return inactiveUserWithSameFingerprint._id;
      }

      const existingActiveUserWithSameName = await ctx.db
        .query("users")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();

      if (existingActiveUserWithSameName) {
        const userWithDefaults = getUserWithDefaults(existingActiveUserWithSameName);
        if (userWithDefaults.isActive) {
          throw new Error("هذا الاسم مستخدم بالفعل من قبل مستخدم نشط. يرجى اختيار اسم آخر");
        }
      }

      const allUsers = await ctx.db.query("users").collect();
      const activeUsers = allUsers.filter((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        return userWithDefaults.isActive;
      });
      
      const isFirstUser = activeUsers.length === 0;

      console.log("إنشاء مستخدم جديد، أول مستخدم:", isFirstUser);

      const userData = {
        name: args.name,
        avatar: args.avatar,
        bio: args.bio,
        deviceFingerprint: args.deviceFingerprint,
        ipAddress: args.ipAddress,
        userAgent: args.userAgent || "unknown",
        phone: args.phone,
        birthDate: args.birthDate,
        isAdmin: isFirstUser,
        isModerator: isFirstUser,
        canAssignModerators: isFirstUser,
        isActive: true,
        lastLogin: Date.now(),
        createdAt: Date.now(),
      };

      const userId = await ctx.db.insert("users", userData);

      console.log("تم إنشاء المستخدم بنجاح:", userId);
      return userId;

    } catch (error) {
      console.error("خطأ في تسجيل المستخدم:", error);
      throw error;
    }
  },
});

export const checkFingerprintAvailability = query({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const usersWithSameFingerprint = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .collect();

      const activeUser = usersWithSameFingerprint.find((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        return userWithDefaults.isActive;
      });

      return {
        available: !activeUser,
        existingUser: activeUser ? {
          id: activeUser._id,
          name: activeUser.name,
          isActive: true
        } : null
      };
    } catch (error) {
      console.error("خطأ في التحقق من البصمة:", error);
      return { available: false, existingUser: null };
    }
  },
});

export const getCurrentUser = query({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      if (!user) {
        return null;
      }

      const userWithDefaults = getUserWithDefaults(user);

      if (!userWithDefaults.isActive) {
        return null;
      }

      let avatarUrl = null;
      if (user.avatar) {
        avatarUrl = await ctx.storage.getUrl(user.avatar);
      }

      return {
        ...userWithDefaults,
        avatarUrl,
        isFirstAdmin: await isFirstAdmin(ctx, user._id),
      };
    } catch (error) {
      console.error("خطأ في جلب بيانات المستخدم:", error);
      return null;
    }
  },
});

export const checkUserExists = query({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      if (!user) {
        return { exists: false };
      }

      const userWithDefaults = getUserWithDefaults(user);
      
      return {
        exists: true,
        isActive: userWithDefaults.isActive,
        userId: user._id,
        name: user.name
      };
    } catch (error) {
      console.error("خطأ في التحقق من وجود المستخدم:", error);
      return { exists: false };
    }
  },
});

export const findUserByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();
      
      if (!user) {
        return null;
      }

      const userWithDefaults = getUserWithDefaults(user);
      
      let avatarUrl = null;
      if (user.avatar) {
        avatarUrl = await ctx.storage.getUrl(user.avatar);
      }
      
      return {
        ...userWithDefaults,
        avatarUrl,
        isFirstAdmin: await isFirstAdmin(ctx, user._id),
      };
    } catch (error) {
      console.error("خطأ في البحث عن المستخدم بالاسم:", error);
      return null;
    }
  },
});

export const updateLastLogin = mutation({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          lastLogin: Date.now(),
        });
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error("خطأ في تحديث آخر تسجيل دخول:", error);
      return { success: false };
    }
  },
});

export const logoutUser = mutation({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      if (user) {
        await ctx.db.patch(user._id, {
          isActive: false,
          lastLogin: Date.now(),
        });
      }

      return { success: true };
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
      return { success: true };
    }
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query("users").collect();
      
      return Promise.all(
        users.map(async (user: any) => {
          const userWithDefaults = getUserWithDefaults(user);
          let avatarUrl = null;
          if (user.avatar) {
            avatarUrl = await ctx.storage.getUrl(user.avatar);
          }
          
          return {
            ...userWithDefaults,
            avatarUrl,
            isFirstAdmin: await isFirstAdmin(ctx, user._id),
          };
        })
      );
    } catch (error) {
      console.error("خطأ في جلب جميع المستخدمين:", error);
      return [];
    }
  },
});

export const getActiveUsers = query({
  handler: async (ctx) => {
    try {
      const allUsers = await ctx.db.query("users").collect();
      
      const activeUsers = allUsers.filter((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        return userWithDefaults.isActive;
      });
      
      return Promise.all(
        activeUsers.map(async (user: any) => {
          const userWithDefaults = getUserWithDefaults(user);
          let avatarUrl = null;
          if (user.avatar) {
            avatarUrl = await ctx.storage.getUrl(user.avatar);
          }
          
          return {
            ...userWithDefaults,
            avatarUrl,
            isFirstAdmin: await isFirstAdmin(ctx, user._id),
          };
        })
      );
    } catch (error) {
      console.error("خطأ في جلب المستخدمين النشطين:", error);
      return [];
    }
  },
});

export const makeUserModerator = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin && !currentUser?.isModerator) {
        throw new Error("غير مصرح لك بترقية المستخدمين إلى مشرفين");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن تعديل صلاحية المدير الأساسي للنظام");
      }

      await ctx.db.patch(args.userId, {
        isModerator: true,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في ترقية المستخدم إلى مشرف:", error);
      throw error;
    }
  },
});

export const removeModerator = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin && !currentUser?.isModerator) {
        throw new Error("غير مصرح لك بإزالة صلاحية المشرف");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن إزالة صلاحية المدير الأساسي للنظام");
      }

      await ctx.db.patch(args.userId, {
        isModerator: false,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في إزالة صلاحية المشرف:", error);
      throw error;
    }
  },
});

export const makeUserAdmin = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser) {
        throw new Error("المستخدم غير موجود");
      }

      const currentIsFirstAdmin = await isFirstAdmin(ctx, currentUser._id);
      if (!currentIsFirstAdmin) {
        throw new Error("فقط المدير الأساسي للنظام يستطيع ترقية المستخدمين إلى مدراء");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن تعديل صلاحية المدير الأساسي للنظام");
      }

      await ctx.db.patch(args.userId, {
        isAdmin: true,
        isModerator: true,
        canAssignModerators: true,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في ترقية المستخدم إلى مدير:", error);
      throw error;
    }
  },
});

export const removeAdmin = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser) {
        throw new Error("المستخدم غير موجود");
      }

      const currentIsFirstAdmin = await isFirstAdmin(ctx, currentUser._id);
      if (!currentIsFirstAdmin) {
        throw new Error("فقط المدير الأساسي للنظام يستطيع إزالة صلاحية المدير");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن إزالة صلاحية المدير الأساسي للنظام");
      }

      await ctx.db.patch(args.userId, {
        isAdmin: false,
        canAssignModerators: false,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في إزالة صلاحية المدير:", error);
      throw error;
    }
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin) {
        throw new Error("غير مصرح لك بحذف المستخدمين");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن حذف المدير الأساسي للنظام");
      }

      if (targetUser._id === currentUser._id) {
        throw new Error("لا يمكن حذف حسابك الخاص");
      }

      await ctx.db.delete(args.userId);
      return { success: true };
    } catch (error) {
      console.error("خطأ في حذف المستخدم:", error);
      throw error;
    }
  },
});

export const updateUserName = mutation({
  args: {
    userId: v.id("users"),
    newName: v.string(),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin && currentUser?._id !== args.userId) {
        throw new Error("غير مصرح لك بتعديل اسم المستخدم");
      }

      const existingByName = await ctx.db
        .query("users")
        .withIndex("by_name", (q) => q.eq("name", args.newName))
        .first();

      if (existingByName && existingByName._id !== args.userId) {
        throw new Error("هذا الاسم مستخدم بالفعل");
      }

      await ctx.db.patch(args.userId, {
        name: args.newName,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في تحديث اسم المستخدم:", error);
      throw error;
    }
  },
});

export const updateUserAvatar = mutation({
  args: {
    userId: v.id("users"),
    avatar: v.id("_storage"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin && currentUser?._id !== args.userId) {
        throw new Error("غير مصرح لك بتعديل صورة المستخدم");
      }

      await ctx.db.patch(args.userId, {
        avatar: args.avatar,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في تحديث صورة المستخدم:", error);
      throw error;
    }
  },
});

export const getUserStats = query({
  handler: async (ctx) => {
    try {
      const users = await ctx.db.query("users").collect();
      
      const usersWithDefaults = users.map((user: any) => getUserWithDefaults(user));
      
      const totalUsers = usersWithDefaults.length;
      const activeUsers = usersWithDefaults.filter((u: any) => u.isActive).length;
      const adminUsers = usersWithDefaults.filter((u: any) => u.isAdmin).length;
      const moderatorUsers = usersWithDefaults.filter((u: any) => u.isModerator && !u.isAdmin).length;
      const regularUsers = usersWithDefaults.filter((u: any) => !u.isAdmin && !u.isModerator).length;
      
      const usersWithPhone = usersWithDefaults.filter((u: any) => u.phone).length;
      const usersWithBirthDate = usersWithDefaults.filter((u: any) => u.birthDate).length;
      const usersWithBio = usersWithDefaults.filter((u: any) => u.bio && u.bio.trim() !== "").length;
      
      const latestUser = usersWithDefaults.reduce((latest: any, user: any) => 
        user.createdAt > latest.createdAt ? user : latest, usersWithDefaults[0] || { createdAt: 0 }
      );

      const sortedUsers = users.sort((a: any, b: any) => a.createdAt - b.createdAt);
      const firstAdmin = sortedUsers.length > 0 ? sortedUsers[0] : null;

      return {
        totalUsers,
        activeUsers,
        adminUsers,
        moderatorUsers,
        regularUsers,
        usersWithPhone,
        usersWithBirthDate,
        usersWithBio,
        latestRegistration: latestUser.createdAt,
        firstAdmin: firstAdmin ? {
          name: firstAdmin.name,
          createdAt: firstAdmin.createdAt,
        } : null,
      };
    } catch (error) {
      console.error("خطأ في جلب إحصائيات المستخدمين:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        adminUsers: 0,
        moderatorUsers: 0,
        regularUsers: 0,
        usersWithPhone: 0,
        usersWithBirthDate: 0,
        usersWithBio: 0,
        latestRegistration: 0,
        firstAdmin: null,
      };
    }
  },
});

export const reactivateUser = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin) {
        throw new Error("غير مصرح لك بإعادة تفعيل المستخدمين");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      await ctx.db.patch(args.userId, {
        isActive: true,
        lastLogin: Date.now(),
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في إعادة تفعيل المستخدم:", error);
      throw error;
    }
  },
});

export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin) {
        throw new Error("غير مصرح لك بتعطيل المستخدمين");
      }

      const targetUser = await ctx.db.get(args.userId);
      if (!targetUser) {
        throw new Error("المستخدم غير موجود");
      }

      const targetIsFirstAdmin = await isFirstAdmin(ctx, args.userId);
      if (targetIsFirstAdmin) {
        throw new Error("لا يمكن تعطيل المدير الأساسي للنظام");
      }

      if (targetUser._id === currentUser._id) {
        throw new Error("لا يمكن تعطيل حسابك الخاص");
      }

      await ctx.db.patch(args.userId, {
        isActive: false,
      });

      return { success: true };
    } catch (error) {
      console.error("خطأ في تعطيل المستخدم:", error);
      throw error;
    }
  },
});

export const getUserPermissions = query({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.deviceFingerprint)
        )
        .first();

      if (!user) {
        return null;
      }

      const userWithDefaults = getUserWithDefaults(user);
      const isFirstAdminUser = await isFirstAdmin(ctx, user._id);

      return {
        isAdmin: userWithDefaults.isAdmin,
        isModerator: userWithDefaults.isModerator,
        canAssignModerators: userWithDefaults.canAssignModerators,
        isFirstAdmin: isFirstAdminUser,
        canCreateQuiz: userWithDefaults.isAdmin || userWithDefaults.isModerator,
        canManageUsers: userWithDefaults.isAdmin,
        canManageQuizzes: userWithDefaults.isAdmin || userWithDefaults.isModerator,
        canViewReports: userWithDefaults.isAdmin || userWithDefaults.isModerator,
        canMakeAdmin: isFirstAdminUser,
        canModifyFirstAdmin: false,
      };
    } catch (error) {
      console.error("خطأ في جلب صلاحيات المستخدم:", error);
      return null;
    }
  },
});

export const fixDatabaseIssues = mutation({
  args: {
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin) {
        throw new Error("غير مصرح لك بتنظيف قاعدة البيانات");
      }

      const allUsers = await ctx.db.query("users").collect();
      let fixedCount = 0;

      for (const user of allUsers) {
        const updates: Record<string, any> = {};
        
        if ((user as any).isActive === undefined) updates.isActive = true;
        if ((user as any).lastLogin === undefined) updates.lastLogin = (user as any).createdAt;
        if ((user as any).isModerator === undefined) updates.isModerator = false;
        if ((user as any).canAssignModerators === undefined) updates.canAssignModerators = false;
        if ((user as any).userAgent === undefined) updates.userAgent = "unknown";
        if ((user as any).phone === undefined) updates.phone = null;
        if ((user as any).birthDate === undefined) updates.birthDate = null;
        if ((user as any).bio === undefined) updates.bio = "";

        if (Object.keys(updates).length > 0) {
          await ctx.db.patch(user._id, updates);
          fixedCount++;
        }
      }

      return { success: true, fixedCount, totalUsers: allUsers.length };
    } catch (error) {
      console.error("خطأ في تنظيف قاعدة البيانات:", error);
      throw error;
    }
  },
});

export const getFirstAdminInfo = query({
  handler: async (ctx) => {
    try {
      const allUsers = await ctx.db.query("users").collect();
      const sortedUsers = allUsers.sort((a: any, b: any) => a.createdAt - b.createdAt);
      
      if (sortedUsers.length === 0) {
        return null;
      }

      const firstAdmin = sortedUsers[0];
      const userWithDefaults = getUserWithDefaults(firstAdmin);
      
      let avatarUrl = null;
      if (firstAdmin.avatar) {
        avatarUrl = await ctx.storage.getUrl(firstAdmin.avatar);
      }

      return {
        ...userWithDefaults,
        avatarUrl,
        isFirstAdmin: true,
      };
    } catch (error) {
      console.error("خطأ في جلب معلومات المدير الأساسي:", error);
      return null;
    }
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    avatar: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    userFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.userFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin && currentUser?._id !== args.userId) {
        throw new Error("غير مصرح لك بتعديل بيانات المستخدم");
      }

      const updates: Record<string, any> = {};
      if (args.phone !== undefined) updates.phone = args.phone;
      if (args.birthDate !== undefined) updates.birthDate = args.birthDate;
      if (args.avatar !== undefined) updates.avatar = args.avatar;
      if (args.bio !== undefined) updates.bio = args.bio;

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(args.userId, updates);
      }

      return { success: true };
    } catch (error) {
      console.error("خطأ في تحديث بيانات المستخدم:", error);
      throw error;
    }
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const allUsers = await ctx.db.query("users").collect();
      
      const filteredUsers = allUsers.filter((user: any) => {
        const userWithDefaults = getUserWithDefaults(user);
        const searchTerm = args.query.toLowerCase();
        
        return (
          userWithDefaults.name.toLowerCase().includes(searchTerm) ||
          (userWithDefaults.phone && userWithDefaults.phone.includes(searchTerm)) ||
          (userWithDefaults.bio && userWithDefaults.bio.toLowerCase().includes(searchTerm))
        );
      });

      return Promise.all(
        filteredUsers.map(async (user: any) => {
          const userWithDefaults = getUserWithDefaults(user);
          let avatarUrl = null;
          if (user.avatar) {
            avatarUrl = await ctx.storage.getUrl(user.avatar);
          }
          
          return {
            ...userWithDefaults,
            avatarUrl,
            isFirstAdmin: await isFirstAdmin(ctx, user._id),
          };
        })
      );
    } catch (error) {
      console.error("خطأ في البحث عن المستخدمين:", error);
      return [];
    }
  },
});

export const bulkUpdateUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
    updates: v.object({
      isActive: v.optional(v.boolean()),
      isModerator: v.optional(v.boolean()),
    }),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_device_fingerprint", (q) => 
          q.eq("deviceFingerprint", args.currentUserFingerprint)
        )
        .first();

      if (!currentUser?.isAdmin) {
        throw new Error("غير مصرح لك بالتحديث الجماعي للمستخدمين");
      }

      for (const userId of args.userIds) {
        const targetUser = await ctx.db.get(userId);
        if (!targetUser) continue;

        const targetIsFirstAdmin = await isFirstAdmin(ctx, userId);
        if (targetIsFirstAdmin) continue;

        await ctx.db.patch(userId, args.updates);
      }

      return { success: true, updatedCount: args.userIds.length };
    } catch (error) {
      console.error("خطأ في التحديث الجماعي للمستخدمين:", error);
      throw error;
    }
  },
});