import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const registerUser = mutation({
  args: {
    name: v.string(),
    deviceFingerprint: v.string(),
    ipAddress: v.string(),
    avatar: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists with same device fingerprint or IP
    const existingByFingerprint = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint))
      .first();

    if (existingByFingerprint) {
      throw new Error("جهاز مسجل مسبقاً. يُسمح بحساب واحد فقط لكل جهاز");
    }

    const existingByIp = await ctx.db
      .query("users")
      .withIndex("by_ip", (q) => q.eq("ipAddress", args.ipAddress))
      .first();

    if (existingByIp) {
      throw new Error("تم التسجيل مسبقاً من هذا الموقع. يُسمح بحساب واحد فقط لكل موقع");
    }

    // Check if name already exists
    const existingByName = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingByName) {
      throw new Error("هذا الاسم مستخدم بالفعل. يرجى اختيار اسم آخر");
    }

    // Check if this is the first user (will be admin)
    const userCount = await ctx.db.query("users").collect();
    const isFirstUser = userCount.length === 0;

    const userId = await ctx.db.insert("users", {
      name: args.name,
      avatar: args.avatar,
      deviceFingerprint: args.deviceFingerprint,
      ipAddress: args.ipAddress,
      isAdmin: isFirstUser,
      isModerator: false,
      createdAt: Date.now(),
    });

    return userId;
  },
});

export const getCurrentUser = query({
  args: {
    deviceFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.deviceFingerprint))
      .first();

    if (!user) {
      return null;
    }

    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }

    return {
      ...user,
      avatarUrl,
    };
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getAllUsers = query({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    
    return Promise.all(
      users.map(async (user) => ({
        ...user,
        avatarUrl: user.avatar ? await ctx.storage.getUrl(user.avatar) : null,
      }))
    );
  },
});

export const makeUserModerator = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser?.isAdmin) {
      throw new Error("غير مصرح لك بهذا الإجراء");
    }

    await ctx.db.patch(args.userId, {
      isModerator: true,
    });
  },
});

export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    currentUserFingerprint: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_device_fingerprint", (q) => q.eq("deviceFingerprint", args.currentUserFingerprint))
      .first();

    if (!currentUser?.isAdmin) {
      throw new Error("غير مصرح لك بهذا الإجراء");
    }

    await ctx.db.delete(args.userId);
  },
});
