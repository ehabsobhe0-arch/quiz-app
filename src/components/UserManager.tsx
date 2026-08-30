// UserManager.tsx - النسخة المحسنة للشاشات الصغيرة
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  Trash2, 
  Shield, 
  ShieldOff, 
  User, 
  Search, 
  Crown,
  Users,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
  Filter,
  Loader2,
  UserMinus,
  BarChart3,
  Settings,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Copy
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  phone?: string;
  birthDate?: string;
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

export default function UserManager({ user, onBack }: UserManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "moderator" | "user">("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"stats" | "users">("users");

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
  const removeAdmin = useMutation(api.users.removeAdmin);
  const deleteUserMutation = useMutation(api.users.deleteUser);

  // إحصائيات المستخدمين
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.isAdmin).length;
    const moderators = users.filter(u => u.isModerator && !u.isAdmin).length;
    const regular = users.filter(u => !u.isAdmin && !u.isModerator).length;
    
    // إحصائيات إضافية
    const usersWithPhone = users.filter(u => u.phone).length;
    const usersWithBirthDate = users.filter(u => u.birthDate).length;
    
    return {
      total,
      admins,
      moderators,
      regular,
      usersWithPhone,
      usersWithBirthDate,
      adminPercentage: total > 0 ? Math.round((admins / total) * 100) : 0,
      moderatorPercentage: total > 0 ? Math.round((moderators / total) * 100) : 0,
      phonePercentage: total > 0 ? Math.round((usersWithPhone / total) * 100) : 0,
      birthDatePercentage: total > 0 ? Math.round((usersWithBirthDate / total) * 100) : 0,
    };
  }, [users]);

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter((u: User) => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (u.phone && u.phone.includes(searchTerm));
      
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
      setExpandedUser(null);
    }
  }, [setActionLoading]);

  const handleMakeModerator = useCallback(async (targetUser: User) => {
    await handleAction(
      () => makeModerator({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `تم ترقية ${targetUser.name} إلى مشرف`
    );
  }, [makeModerator, user.deviceFingerprint, handleAction]);

  const handleRemoveModerator = useCallback(async (targetUser: User) => {
    await handleAction(
      () => removeModerator({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `تم إزالة صلاحية المشرف من ${targetUser.name}`
    );
  }, [removeModerator, user.deviceFingerprint, handleAction]);

  const handleMakeAdmin = useCallback(async (targetUser: User) => {
    await handleAction(
      () => makeAdmin({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `تم ترقية ${targetUser.name} إلى مدير`
    );
  }, [makeAdmin, user.deviceFingerprint, handleAction]);

  const handleRemoveAdmin = useCallback(async (targetUser: User) => {
    await handleAction(
      () => removeAdmin({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `تم إزالة صلاحية المدير من ${targetUser.name}`
    );
  }, [removeAdmin, user.deviceFingerprint, handleAction]);

  const handleDeleteUser = useCallback(async (targetUser: User) => {
    if (!confirm(`حذف المستخدم "${targetUser.name}"؟`)) return;
    if (targetUser._id === user._id) {
      toast.error("لا يمكن حذف حسابك الشخصي");
      return;
    }

    await handleAction(
      () => deleteUserMutation({
        userId: targetUser._id,
        currentUserFingerprint: user.deviceFingerprint
      }),
      targetUser._id,
      `تم حذف المستخدم ${targetUser.name}`
    );
  }, [deleteUserMutation, user.deviceFingerprint, handleAction, user._id]);

  const getTimeAgo = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return "الآن";
  }, []);

  const formatBirthDate = useCallback((birthDate: string) => {
    try {
      const date = new Date(birthDate);
      return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "غير محدد";
    }
  }, []);

  const calculateAge = useCallback((birthDate: string) => {
    try {
      const today = new Date();
      const birth = new Date(birthDate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      
      return age;
    } catch {
      return null;
    }
  }, []);

  const formatPhone = useCallback((phone: string) => {
    if (!phone) return "غير محدد";
    // تنسيق رقم الهاتف المصري
    if (phone.length === 11) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
    }
    return phone;
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("تم النسخ");
    }).catch(() => {
      toast.error("فشل النسخ");
    });
  }, []);

  const getRoleBadge = useCallback((userItem: User) => {
    if (userItem.isAdmin) {
      return { 
        text: "مدير", 
        color: "bg-yellow-100 text-yellow-800",
        icon: <Crown className="w-3 h-3" />
      };
    }
    if (userItem.isModerator) {
      return { 
        text: "مشرف", 
        color: "bg-blue-100 text-blue-800",
        icon: <Shield className="w-3 h-3" />
      };
    }
    return { 
      text: "مستخدم", 
      color: "bg-gray-100 text-gray-800",
      icon: <User className="w-3 h-3" />
    };
  }, []);

  const canDeleteUser = useCallback((targetUser: User) => {
    return user.isAdmin && targetUser._id !== user._id;
  }, [user]);

  const canRemoveAdmin = useCallback((targetUser: User) => {
    return user.isAdmin && targetUser.isAdmin && targetUser._id !== user._id;
  }, [user]);

  const canRemoveModerator = useCallback((targetUser: User) => {
    return user.isAdmin && targetUser.isModerator && !targetUser.isAdmin;
  }, [user]);

  // التحقق من صلاحيات المستخدم - المشرف لا يمكنه إدارة المستخدمين
  const canManageUsers = user.isAdmin; // المشرف العادي لا يمكنه إدارة المستخدمين

  // شاشة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <div className="text-gray-700">جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مشرف فقط (وليس مدير) لا يمكنه إدارة المستخدمين
  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gray-50 p-3">
        {/* الهيدر */}
        <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm border">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 bg-gray-100 rounded-xl text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-800">إدارة المستخدمين</h1>
              <p className="text-gray-500 text-xs mt-1">غير مصرح بالوصول</p>
            </div>
            
            <div className="w-10"></div> {/* مساحة للتوازن */}
          </div>
        </div>

        {/* رسالة عدم التصريح */}
        <div className="bg-white rounded-2xl p-8 text-center border">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">غير مصرح بالوصول</h3>
          <p className="text-gray-600 mb-4">
            تحتاج صلاحيات مدير للوصول إلى إدارة المستخدمين
          </p>
          <button
            onClick={onBack}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {/* الهيدر */}
      <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="p-2 bg-gray-100 rounded-xl text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-lg font-bold text-gray-800">إدارة المستخدمين</h1>
            <p className="text-gray-500 text-xs mt-1">{stats.total} مستخدم</p>
          </div>
          
          <button
            onClick={() => setIsLoading(true)}
            className="p-2 bg-gray-100 rounded-xl text-gray-600"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* أزرار التبويب */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === "users" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-600"
            }`}
          >
            <Users className="w-4 h-4 inline ml-1" />
            المستخدمين
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === "stats" 
                ? "bg-white text-blue-600 shadow-sm" 
                : "text-gray-600"
            }`}
          >
            <BarChart3 className="w-4 h-4 inline ml-1" />
            الإحصائيات
          </button>
        </div>
      </div>

      {/* محتوى التبويب */}
      {activeTab === "stats" ? (
        <div className="space-y-3">
          {/* البطاقات الإحصائية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-gray-600 mt-1">إجمالي المستخدمين</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-yellow-600">{stats.admins}</div>
              <div className="text-xs text-gray-600 mt-1">المديرين</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-blue-600">{stats.moderators}</div>
              <div className="text-xs text-gray-600 mt-1">المشرفين</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-green-600">{stats.regular}</div>
              <div className="text-xs text-gray-600 mt-1">المستخدمين</div>
            </div>
          </div>

          {/* إحصائيات إضافية */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-purple-600">{stats.usersWithPhone}</div>
              <div className="text-xs text-gray-600 mt-1">مسجل برقم هاتف</div>
              <div className="text-xs text-gray-500 mt-1">({stats.phonePercentage}%)</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center border">
              <div className="text-2xl font-bold text-indigo-600">{stats.usersWithBirthDate}</div>
              <div className="text-xs text-gray-600 mt-1">مسجل بتاريخ ميلاد</div>
              <div className="text-xs text-gray-500 mt-1">({stats.birthDatePercentage}%)</div>
            </div>
          </div>

          {/* مخطط التوزيع البسيط */}
          <div className="bg-white rounded-xl p-4 border">
            <h3 className="font-bold text-gray-800 mb-3">توزيع المستخدمين</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">المديرين</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span className="font-bold">{stats.admins}</span>
                  <span className="text-xs text-gray-500">({stats.adminPercentage}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">المشرفين</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="font-bold">{stats.moderators}</span>
                  <span className="text-xs text-gray-500">({stats.moderatorPercentage}%)</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">المستخدمين</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="font-bold">{stats.regular}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round((stats.regular / stats.total) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* شريط البحث والتصفية */}
          <div className="bg-white rounded-xl p-3 border">
            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ابحث عن مستخدم أو رقم هاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* أزرار الفلتر */}
            <div className="flex gap-1 overflow-x-auto">
              {[
                { key: "all", label: "الكل" },
                { key: "admin", label: "المديرين" },
                { key: "moderator", label: "المشرفين" },
                { key: "user", label: "المستخدمين" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterRole(key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    filterRole === key 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة المستخدمين */}
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <div className="text-gray-700 font-medium mb-1">لا يوجد مستخدمين</div>
                <div className="text-gray-500 text-sm">
                  {searchTerm ? "لم يتم العثور على مستخدمين" : "لا يوجد مستخدمين مسجلين"}
                </div>
              </div>
            ) : (
              filteredUsers.map((userItem) => {
                const roleBadge = getRoleBadge(userItem);
                const isActionLoading = loadingActions[userItem._id];
                const canDelete = canDeleteUser(userItem);
                const canRemoveAdminRole = canRemoveAdmin(userItem);
                const canRemoveModeratorRole = canRemoveModerator(userItem);
                const isExpanded = expandedUser === userItem._id;
                const age = userItem.birthDate ? calculateAge(userItem.birthDate) : null;
                
                return (
                  <div 
                    key={userItem._id} 
                    className="bg-white rounded-xl p-3 border transition-all"
                  >
                    {/* معلومات المستخدم الأساسية */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* الصورة */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                            {userItem.avatarUrl ? (
                              <img
                                src={userItem.avatarUrl}
                                alt={userItem.name}
                                className="w-12 h-12 rounded-xl object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-blue-700" />
                            )}
                          </div>
                        </div>
                        
                        {/* المعلومات */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 text-sm truncate flex items-center gap-1">
                            {userItem.name}
                            {userItem._id === user._id && (
                              <span className="text-blue-600 text-xs bg-blue-100 px-1.5 py-0.5 rounded">أنت</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-lg ${roleBadge.color} font-medium flex items-center gap-1`}>
                              {roleBadge.icon}
                              {roleBadge.text}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {getTimeAgo(userItem.createdAt)}
                            </span>
                          </div>
                          
                          {/* معلومات سريعة */}
                          <div className="flex items-center gap-3 mt-1">
                            {userItem.phone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Phone className="w-3 h-3" />
                                {formatPhone(userItem.phone)}
                              </div>
                            )}
                            {age && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="w-3 h-3" />
                                {age} سنة
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* زر التفاصيل */}
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : userItem._id)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isExpanded ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* التفاصيل الموسعة */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                        {/* معلومات إضافية */}
                        <div className="text-xs text-gray-600 space-y-2">
                          <div className="flex justify-between items-center">
                            <span>معرف المستخدم:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs">{userItem._id.slice(-8)}</span>
                              <button 
                                onClick={() => copyToClipboard(userItem._id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span>رقم الهاتف:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {userItem.phone ? formatPhone(userItem.phone) : "غير محدد"}
                              </span>
                              {userItem.phone && (
                                <button 
                                  onClick={() => copyToClipboard(userItem.phone!)}
                                  className="p-1 hover:bg-gray-100 rounded"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span>تاريخ الميلاد:</span>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {userItem.birthDate ? formatBirthDate(userItem.birthDate) : "غير محدد"}
                              </span>
                              {userItem.birthDate && age && (
                                <span className="text-blue-600 text-xs bg-blue-100 px-1.5 py-0.5 rounded">
                                  {age} سنة
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between">
                            <span>البصمة:</span>
                            <span className="font-mono text-xs">{userItem.deviceFingerprint.slice(-8)}</span>
                          </div>
                        </div>

                        {/* أزرار التحكم */}
                        <div className="grid grid-cols-2 gap-2">
                          
                          {/* ترقية إلى مدير */}
                          {!userItem.isAdmin && (
                            <button
                              onClick={() => handleMakeAdmin(userItem)}
                              disabled={isActionLoading}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-2 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Crown className="w-3 h-3" />
                              )}
                              ترقية لمدير
                            </button>
                          )}

                          {/* ترقية إلى مشرف */}
                          {!userItem.isModerator && !userItem.isAdmin && (
                            <button
                              onClick={() => handleMakeModerator(userItem)}
                              disabled={isActionLoading}
                              className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-2 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Shield className="w-3 h-3" />
                              )}
                              ترقية لمشرف
                            </button>
                          )}

                          {/* إزالة صلاحية المدير */}
                          {canRemoveAdminRole && (
                            <button
                              onClick={() => handleRemoveAdmin(userItem)}
                              disabled={isActionLoading}
                              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-2 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1 col-span-2"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <UserMinus className="w-3 h-3" />
                              )}
                              إزالة صلاحية المدير
                            </button>
                          )}

                          {/* إزالة صلاحية المشرف */}
                          {canRemoveModeratorRole && (
                            <button
                              onClick={() => handleRemoveModerator(userItem)}
                              disabled={isActionLoading}
                              className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-2 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1 col-span-2"
                            >
                              {isActionLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ShieldOff className="w-3 h-3" />
                              )}
                              إزالة صلاحية المشرف
                            </button>
                          )}

                          {/* حذف المستخدم */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteUser(userItem)}
                              disabled={isActionLoading}
                              className="bg-red-500 hover:bg-red-600 text-white py-2 px-2 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1 col-span-2"
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
        </div>
      )}
    </div>
  );
}