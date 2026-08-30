// UserManager.tsx - النسخة المصححة
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { 
  Trash2, 
  Shield, 
  ShieldOff, 
  User, 
  Search, 
  Crown,
  Users,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Sparkles,
  ArrowLeft,
  Star,
  RefreshCw,
  UserPlus,
  Filter,
  MoreVertical,
  Loader2,
  UserMinus,
  Ban
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  deviceFingerprint: string;
  createdAt: number;
}

interface UserManagerProps {
  user: User;
  onBack: () => void;
}

// ... (المكونات المساعدة تبقى كما هي - MobileStarfield و SearchWithDebounce)

export default function UserManager({ user, onBack }: UserManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "moderator" | "user">("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});

  // جلب بيانات المستخدمين
  const usersData = useQuery(api.users.getAllUsers);
  const users = usersData || [];

  useEffect(() => {
    if (usersData !== undefined) {
      setIsLoading(false);
    }
  }, [usersData]);

  const makeModerator = useMutation(api.users.makeUserModerator);
  const removeModerator = useMutation(api.users.removeModerator);
  const makeAdmin = useMutation(api.users.makeUserAdmin);
  const removeAdmin = useMutation(api.users.removeAdmin); // إضافة دالة إزالة المدير
  const deleteUserMutation = useMutation(api.users.deleteUser);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  // إحصائيات المستخدمين
  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.isAdmin).length,
    moderators: users.filter(u => u.isModerator && !u.isAdmin).length,
    regular: users.filter(u => !u.isAdmin && !u.isModerator).length,
  }), [users]);

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter((u: User) => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesRole = true;
      if (filterRole === "admin") matchesRole = u.isAdmin;
      else if (filterRole === "moderator") matchesRole = u.isModerator && !u.isAdmin;
      else if (filterRole === "user") matchesRole = !u.isAdmin && !u.isModerator;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  // إدارة حالة التحميل للأفعال
  const setActionLoading = useCallback((userId: string, loading: boolean) => {
    setLoadingActions(prev => ({ ...prev, [userId]: loading }));
  }, []);

  // دالة مساعدة للتعامل مع الأفعال
  const handleAction = useCallback(async (
    action: () => Promise<void>,
    userId: string,
    successMessage?: string
  ) => {
    setActionLoading(userId, true);
    try {
      await action();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setActionLoading(userId, false);
    }
  }, [setActionLoading]);

  const handleMakeModerator = useCallback(async (targetUser: User) => {
    await handleAction(
      () => makeModerator({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `✨ تم ترقية ${targetUser.name} إلى مشرف مساعد`
    );
  }, [makeModerator, user.deviceFingerprint, handleAction]);

  const handleRemoveModerator = useCallback(async (targetUser: User) => {
    await handleAction(
      () => removeModerator({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `⚡ تم إزالة صلاحية المشرف المساعد من ${targetUser.name}`
    );
  }, [removeModerator, user.deviceFingerprint, handleAction]);

  const handleMakeAdmin = useCallback(async (targetUser: User) => {
    await handleAction(
      () => makeAdmin({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `👑 تم ترقية ${targetUser.name} إلى مدير`
    );
  }, [makeAdmin, user.deviceFingerprint, handleAction]);

  // إضافة دالة إزالة المدير
  const handleRemoveAdmin = useCallback(async (targetUser: User) => {
    await handleAction(
      () => removeAdmin({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `🔻 تم إزالة صلاحية المدير من ${targetUser.name}`
    );
  }, [removeAdmin, user.deviceFingerprint, handleAction]);

  const handleDeleteUser = useCallback(async (targetUser: User) => {
    if (!confirm(`حذف المستخدم "${targetUser.name}"؟`)) return;
    if (targetUser._id === user._id) {
      toast.error("❌ لا يمكن حذف حسابك");
      return;
    }

    await handleAction(
      () => deleteUserMutation({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `✅ تم حذف ${targetUser.name}`
    );
  }, [deleteUserMutation, user.deviceFingerprint, handleAction, user._id]);

  const getTimeAgo = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days} يوم`;
    if (hours > 0) return `${hours} ساعة`;
    if (minutes > 0) return `${minutes} دقيقة`;
    return "الآن";
  }, []);

  const getRoleBadge = useCallback((userItem: User) => {
    if (userItem.isAdmin) {
      return { text: "مدير", color: "text-yellow-600 bg-yellow-100" };
    }
    if (userItem.isModerator) {
      return { text: "مشرف مساعد", color: "text-blue-600 bg-blue-100" };
    }
    return { text: "مستخدم عادي", color: "text-gray-600 bg-gray-100" };
  }, []);

  // التحقق مما إذا كان يمكن حذف المستخدم
  const canDeleteUser = useCallback((targetUser: User) => {
    // المدير يمكنه حذف أي مستخدم عدا نفسه
    return user.isAdmin && targetUser._id !== user._id;
  }, [user]);

  // التحقق مما إذا كان يمكن إزالة صلاحية المدير
  const canRemoveAdmin = useCallback((targetUser: User) => {
    // المدير يمكنه إزالة صلاحية المدير من أي مستخدم عدا نفسه
    return user.isAdmin && targetUser.isAdmin && targetUser._id !== user._id;
  }, [user]);

  // التحقق مما إذا كان يمكن إزالة صلاحية المشرف
  const canRemoveModerator = useCallback((targetUser: User) => {
    // المدير يمكنه إزالة صلاحية المشرف من أي مستخدم
    return user.isAdmin && targetUser.isModerator && !targetUser.isAdmin;
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 p-4">
        <div className="text-center z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-400 border-t-transparent mx-auto mb-4"></div>
          <div className="text-white text-lg font-bold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 relative overflow-hidden p-3">
      {/* الهيدر الثابت */}
      <div className="sticky top-0 z-20 mb-4">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-3 shadow-lg border border-white/30">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 bg-blue-100 rounded-xl text-blue-700 hover:bg-blue-200 transition-colors"
              aria-label="العودة للخلف"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-800">إدارة المستخدمين</h1>
              <p className="text-xs text-gray-600">{stats.total} مستخدم</p>
            </div>
            
            <button
              onClick={handleRefresh}
              className="p-2 bg-blue-100 rounded-xl text-blue-700 hover:bg-blue-200 transition-colors"
              aria-label="تحديث البيانات"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white/90 backdrop-blur-lg rounded-xl p-3 text-center border border-white/30">
          <div className="text-blue-600 font-bold text-lg">{stats.total}</div>
          <div className="text-gray-600 text-xs">المستخدمين</div>
        </div>
        <div className="bg-white/90 backdrop-blur-lg rounded-xl p-3 text-center border border-white/30">
          <div className="text-green-600 font-bold text-lg">{stats.admins}</div>
          <div className="text-gray-600 text-xs">المديرين</div>
        </div>
        <div className="bg-white/90 backdrop-blur-lg rounded-xl p-3 text-center border border-white/30">
          <div className="text-blue-600 font-bold text-lg">{stats.moderators}</div>
          <div className="text-gray-600 text-xs">المشرفين المساعدين</div>
        </div>
        <div className="bg-white/90 backdrop-blur-lg rounded-xl p-3 text-center border border-white/30">
          <div className="text-gray-600 font-bold text-lg">{stats.regular}</div>
          <div className="text-gray-600 text-xs">المستخدمين العاديين</div>
        </div>
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-3 mb-4 shadow-lg border border-white/30">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ابحث عن مستخدم..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-white/50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="بحث عن مستخدم"
          />
        </div>
        
        {/* أزرار الفلتر السريعة */}
        <div className="flex gap-1 mt-3 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { key: "all", label: "الكل", color: "bg-blue-500" },
            { key: "admin", label: "المديرين", color: "bg-yellow-500" },
            { key: "moderator", label: "المشرفين المساعدين", color: "bg-blue-400" },
            { key: "user", label: "المستخدمين", color: "bg-green-500" },
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setFilterRole(key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterRole === key 
                  ? `${color} text-white shadow-md` 
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              aria-pressed={filterRole === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* قائمة المستخدمين */}
      <div className="space-y-3" role="list" aria-label="قائمة المستخدمين">
        {filteredUsers.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl p-6 text-center border border-white/30">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <div className="text-gray-600 font-medium">لا يوجد مستخدمين</div>
            <div className="text-gray-500 text-sm mt-1">
              {searchTerm ? "جرب بحثاً مختلفاً" : "لا يوجد مستخدمين في النظام"}
            </div>
          </div>
        ) : (
          filteredUsers.map((userItem) => {
            const roleBadge = getRoleBadge(userItem);
            const isActionLoading = loadingActions[userItem._id];
            const canDelete = canDeleteUser(userItem);
            const canRemoveAdminRole = canRemoveAdmin(userItem);
            const canRemoveModeratorRole = canRemoveModerator(userItem);
            
            return (
              <div 
                key={userItem._id} 
                className="bg-white/95 backdrop-blur-lg rounded-2xl p-3 shadow-lg border border-white/30 transition-all duration-200 hover:shadow-xl"
                role="listitem"
              >
                
                {/* معلومات المستخدم الأساسية */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* الصورة */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden">
                        {userItem.avatarUrl ? (
                          <img
                            src={userItem.avatarUrl}
                            alt={`صورة ${userItem.name}`}
                            className="w-10 h-10 rounded-xl object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <User className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      
                      {/* أيقونة الصلاحية */}
                      {userItem.isAdmin ? (
                        <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : userItem.isModerator ? (
                        <Star className="absolute -top-1 -right-1 w-3 h-3 text-blue-500 fill-blue-500" />
                      ) : null}
                    </div>
                    
                    {/* المعلومات */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-1">
                        {userItem.name}
                        {userItem._id === user._id && (
                          <span className="text-blue-600 text-xs px-1.5 py-0.5 bg-blue-100 rounded-full">أنت</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                          {roleBadge.text}
                        </span>
                        <div className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {getTimeAgo(userItem.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* زر التفاصيل */}
                  <button
                    onClick={() => setExpandedUser(expandedUser === userItem._id ? null : userItem._id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    aria-label={expandedUser === userItem._id ? "إغلاق التفاصيل" : "عرض التفاصيل"}
                    aria-expanded={expandedUser === userItem._id}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* التفاصيل الموسعة */}
                {expandedUser === userItem._id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-3 animate-in fade-in duration-200">
                    {/* معلومات إضافية */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-1">معرف المستخدم:</span>
                        <div className="font-mono text-xs bg-gray-100 p-1 rounded break-all">
                          {userItem._id.slice(0, 8)}...
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-1">رقم الجهاز:</span>
                        <div className="font-mono text-xs bg-gray-100 p-1 rounded break-all">
                          {userItem.deviceFingerprint.slice(0, 8)}...
                        </div>
                      </div>
                    </div>

                    {/* أزرار التحكم */}
                    <div className="flex gap-2 flex-col">
                      
                      {/* إزالة صلاحية المدير */}
                      {canRemoveAdminRole && (
                        <button
                          onClick={() => handleRemoveAdmin(userItem)}
                          disabled={isActionLoading}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserMinus className="w-3 h-3" />
                          )}
                          إزالة صلاحية المدير
                        </button>
                      )}

                      {/* إزالة صلاحية المشرف المساعد */}
                      {canRemoveModeratorRole && (
                        <button
                          onClick={() => handleRemoveModerator(userItem)}
                          disabled={isActionLoading}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldOff className="w-3 h-3" />
                          )}
                          إزالة صلاحية المشرف
                        </button>
                      )}

                      {/* ترقية إلى مدير - للمستخدمين العاديين والمشرفين المساعدين */}
                      {!userItem.isAdmin && user.isAdmin && (
                        <button
                          onClick={() => handleMakeAdmin(userItem)}
                          disabled={isActionLoading}
                          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Crown className="w-3 h-3" />
                          )}
                          ترقية إلى مدير
                        </button>
                      )}

                      {/* ترقية إلى مشرف مساعد - للمستخدمين العاديين فقط */}
                      {!userItem.isModerator && !userItem.isAdmin && (user.isAdmin || user.isModerator) && (
                        <button
                          onClick={() => handleMakeModerator(userItem)}
                          disabled={isActionLoading}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Shield className="w-3 h-3" />
                          )}
                          ترقية إلى مشرف
                        </button>
                      )}
                      
                      {/* زر الحذف - المدير يستطيع حذف أي مستخدم عدا نفسه */}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteUser(userItem)}
                          disabled={isActionLoading}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          حذف المستخدم
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* المسافة في الأسفل */}
      <div className="h-20"></div>

      {/* تذييل */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4 pointer-events-none z-10">
        <div className="text-center text-white/60 text-xs">
          نظام مسابقات الكتاب المقدس
        </div>
      </div>
    </div>
  );
}