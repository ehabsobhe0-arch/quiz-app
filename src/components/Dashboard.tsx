// Dashboard.tsx - نسخة محسنة للشاشات الصغيرة
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Trophy, Settings, Users, Crown, Sparkles, RefreshCw, Book, Award, Eye, BookOpen, Clock, Target, Play, Star, Zap, User, Edit3, Camera, Save, X, CheckCircle, ChevronRight, Phone, Calendar, Mail, Shield, Upload, Image, MessageCircle, Send, Heart, Trash2, Flag, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  phone?: string;
  birthDate?: string;
  avatarUrl?: string | null;
  bio?: string;
  isAdmin: boolean;
  isModerator: boolean;
  deviceFingerprint: string;
  createdAt: number;
}

interface Quiz {
  _id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  questionCount: number;
  isActive: boolean;
  maxAttempts: number;
  duration?: number;
  participants?: number;
  totalParticipants?: number;
  reviewMode?: boolean;
}

interface Comment {
  _id: string;
  quizId: string;
  userId: string;
  text: string;
  likes: string[];
  createdAt: number;
  user?: {
    name: string;
    avatarUrl?: string;
    isAdmin: boolean;
    isModerator: boolean;
  };
}

interface DashboardProps {
  user: User;
  activeQuiz: Quiz | null;
  onStartQuiz: (quizId: string) => void;
  onViewLeaderboard: () => void;
  onOpenAdmin: () => void;
  onOpenReview: (quizId: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  totalParticipants?: number;
}

// تأثير الجسيمات الخفيف
const Particles = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    const particles = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1 + 0.2,
      speed: Math.random() * 0.6 + 0.1,
      brightness: Math.random() * 0.2 + 0.1
    }));

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 15, 35, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.y -= particle.speed;
        if (particle.y < 0) {
          particle.y = canvas.height;
          particle.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.brightness})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => setCanvasSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
});

// مكون التعليقات
const CommentsSection = ({ 
  quizId, 
  currentUser,
  onClose 
}: { 
  quizId: string;
  currentUser: User;
  onClose: () => void;
}) => {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const comments = useQuery(api.comments.getQuizComments, { quizId }) || [];
  const addComment = useMutation(api.comments.addComment);
  const likeComment = useMutation(api.comments.likeComment);
  const deleteComment = useMutation(api.comments.deleteComment);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment({
        quizId,
        text: newComment.trim(),
        userFingerprint: currentUser.deviceFingerprint,
      });
      setNewComment("");
      toast.success("تم إضافة التعليق بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إضافة التعليق");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      await likeComment({
        commentId,
        userFingerprint: currentUser.deviceFingerprint,
      });
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء التفاعل مع التعليق");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    
    try {
      await deleteComment({
        commentId,
        userFingerprint: currentUser.deviceFingerprint,
      });
      toast.success("تم حذف التعليق بنجاح");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حذف التعليق");
    }
  };

  const canDeleteComment = (comment: Comment) => {
    return currentUser.isAdmin || currentUser.isModerator || comment.userId === currentUser._id;
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return "الآن";
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* الهيدر */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 pt-safe-top">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-900">التعليقات</h1>
              <p className="text-gray-500 text-xs mt-0.5">شارك أفكارك مع الآخرين</p>
            </div>
            
            <div className="w-8"></div>
          </div>
        </div>
      </div>

      <div className="p-3 pb-24">
        {/* نموذج إضافة تعليق */}
        <form onSubmit={handleSubmitComment} className="mb-3">
          <div className="flex gap-2">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                {currentUser.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-3.5 h-3.5 text-white" />
                )}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="bg-gray-50 rounded-xl p-2 border border-gray-200">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="اكتب تعليقك هنا..."
                  className="w-full bg-transparent border-none outline-none text-sm resize-none min-h-[50px] text-gray-800 placeholder-gray-500 text-right"
                  maxLength={300}
                />
                
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-xs text-gray-500">
                    {newComment.length}/300
                  </span>
                  
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-blue-600 text-white p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors active:scale-95"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* قائمة التعليقات */}
        <div className="space-y-2">
          {comments.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">لا توجد تعليقات بعد</p>
              <p className="text-gray-400 text-xs mt-0.5">كن أول من يعلق</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment._id} className="bg-gray-50 rounded-xl p-2 border border-gray-200">
                <div className="flex gap-2">
                  {/* صورة المستخدم */}
                  <div className="flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden">
                      {comment.user?.avatarUrl ? (
                        <img 
                          src={comment.user.avatarUrl} 
                          alt={comment.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>

                  {/* محتوى التعليق */}
                  <div className="flex-1 min-w-0">
                    {/* معلومات المستخدم */}
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {comment.user?.name || "مستخدم مجهول"}
                      </span>
                      
                      {(comment.user?.isAdmin || comment.user?.isModerator) && (
                        <div className={`text-[10px] px-1 py-0.5 rounded-full flex-shrink-0 ${
                          comment.user.isAdmin 
                            ? "bg-yellow-100 text-yellow-800" 
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {comment.user.isAdmin ? "مدير" : "مشرف"}
                        </div>
                      )}
                      
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {getTimeAgo(comment.createdAt)}
                      </span>
                    </div>

                    {/* نص التعليق */}
                    <p className="text-gray-800 text-xs leading-relaxed mb-1.5 text-right">
                      {comment.text}
                    </p>

                    {/* التفاعلات */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLikeComment(comment._id)}
                        className={`flex items-center gap-1 text-[10px] transition-colors ${
                          comment.likes.includes(currentUser._id)
                            ? "text-red-600"
                            : "text-gray-500 hover:text-red-600"
                        }`}
                      >
                        <Heart 
                          className={`w-3 h-3 ${
                            comment.likes.includes(currentUser._id) 
                              ? "fill-current" 
                              : ""
                          }`} 
                        />
                        <span>{comment.likes.length}</span>
                      </button>

                      {/* قائمة الإجراءات */}
                      {canDeleteComment(comment) && (
                        <div className="relative">
                          <button className="text-gray-500 hover:text-gray-700 transition-colors">
                            <MoreVertical className="w-3 h-3" />
                          </button>
                          
                          <div className="absolute left-0 top-full mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[100px] z-10">
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className="w-full text-right px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3" />
                              حذف
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// مكون البروفايل الاحترافي
const ProfileSection = ({ user, onClose }: { user: User; onClose: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState(user.bio || "");
  const [isLoading, setIsLoading] = useState(false);

  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("يرجى اختيار ملف صورة فقط");
        return;
      }
      
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("تم اختيار الصورة بنجاح");
    }
  };

  const removeAvatar = () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatar(null);
    setAvatarPreview(null);
    toast.info("تم إزالة الصورة");
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    
    try {
      let avatarId = undefined;

      if (avatar) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": avatar.type },
          body: avatar,
        });

        if (result.ok) {
          const { storageId } = await result.json();
          avatarId = storageId;
        }
      }

      await updateUserProfile({
        userId: user._id,
        bio: bio.trim(),
        avatar: avatarId,
        userFingerprint: user.deviceFingerprint,
      });

      toast.success("تم تحديث الملف الشخصي بنجاح");
      setIsEditing(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء التحديث");
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return "الآن";
  };

  const formatBirthDate = (birthDate: string) => {
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
  };

  const calculateAge = (birthDate: string) => {
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
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "غير محدد";
    if (phone.length === 11) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
    }
    return phone;
  };

  const menuItems = [
    {
      icon: <User className="w-4 h-4" />,
      title: "المعلومات الشخصية",
      description: "عدل على بياناتك الأساسية",
      active: true
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: "الأمان والخصوصية",
      description: "إدارة أمان حسابك",
      active: false
    }
  ];

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      {/* الهيدر الثابت */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 pt-safe-top">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-gray-900">الملف الشخصي</h1>
              <p className="text-gray-500 text-xs mt-0.5">إدارة حسابك وإعداداتك</p>
            </div>
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-blue-600" />
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 pb-24">
        {/* بطاقة الصورة الشخصية */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <div className="flex flex-col items-center text-center">
            {/* الصورة الشخصية */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="معاينة الصورة"
                    className="w-full h-full object-cover"
                  />
                ) : user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-blue-600" />
                )}
              </div>
              
              {isEditing && (
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  <label className="bg-blue-600 text-white p-1 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors active:scale-95">
                    <Camera className="w-2.5 h-2.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {(avatarPreview || user.avatarUrl) && (
                    <button
                      onClick={removeAvatar}
                      className="bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-700 transition-colors active:scale-95"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* الاسم والرتبة */}
            <h2 className="text-base font-bold text-gray-900 mb-1">{user.name}</h2>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mb-2 ${
              user.isAdmin 
                ? "bg-yellow-100 text-yellow-800 border border-yellow-200" 
                : user.isModerator 
                ? "bg-blue-100 text-blue-800 border border-blue-200" 
                : "bg-gray-100 text-gray-800 border border-gray-200"
            }`}>
              {user.isAdmin ? "مدير النظام" : user.isModerator ? "مشرف" : "مستخدم"}
              <CheckCircle className="w-2.5 h-2.5" />
            </div>

            {/* البايو */}
            <div className="w-full">
              <label className="block text-xs font-medium text-gray-700 mb-1.5 text-right">
                نبذة عنك
              </label>
              {isEditing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عنك تظهر للآخرين..."
                  className="w-full px-2.5 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 resize-none text-right"
                  rows={2}
                  maxLength={150}
                />
              ) : (
                <div className="bg-gray-50 rounded-lg p-2.5 min-h-[50px] border border-gray-200">
                  <p className="text-gray-700 text-xs leading-relaxed text-right">
                    {bio || "لم تقم بإضافة نبذة عنك بعد..."}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-gray-500">{bio.length}/150 حرف</span>
                {!isEditing && bio && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 text-[10px] hover:text-blue-700"
                  >
                    تعديل
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* قائمة الإعدادات */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">الإعدادات</h3>
          </div>
          
          {menuItems.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 p-2.5 border-b border-gray-100 last:border-b-0 ${
                item.active ? "bg-blue-50" : "hover:bg-gray-50"
              } transition-colors active:scale-98`}
            >
              <div className={`p-1.5 rounded-lg ${
                item.active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              }`}>
                {item.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-xs">{item.title}</h4>
                <p className="text-gray-500 text-[10px]">{item.description}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
          ))}
        </div>

        {/* المعلومات الشخصية */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">المعلومات الشخصية</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
                  <Phone className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 text-xs truncate">رقم الهاتف</h4>
                  <p className="text-gray-500 text-[10px] truncate">{formatPhone(user.phone || "")}</p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">ثابت</span>
            </div>
            
            <div className="p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="p-1.5 bg-green-100 rounded-lg text-green-600 flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 text-xs truncate">العمر</h4>
                  <p className="text-gray-500 text-[10px] truncate">
                    {user.birthDate ? `${calculateAge(user.birthDate)} سنة` : "غير محدد"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">ثابت</span>
            </div>
            
            <div className="p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600 flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 text-xs truncate">تاريخ الميلاد</h4>
                  <p className="text-gray-500 text-[10px] truncate">
                    {user.birthDate ? formatBirthDate(user.birthDate) : "غير محدد"}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">ثابت</span>
            </div>
            
            <div className="p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 text-xs truncate">تاريخ التسجيل</h4>
                  <p className="text-gray-500 text-[10px] truncate">{getTimeAgo(user.createdAt)}</p>
                </div>
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">تلقائي</span>
            </div>
          </div>
        </div>

        {/* معلومات الحساب */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">معلومات الحساب</h3>
          </div>
          
          <div className="p-2.5">
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="text-gray-500 text-[10px] mb-0.5">معرف المستخدم</div>
                <div className="font-mono text-gray-900 text-[10px] truncate">{user._id.slice(-8)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="text-gray-500 text-[10px] mb-0.5">نوع الحساب</div>
                <div className="font-medium text-gray-900 text-[10px]">
                  {user.isAdmin ? "مدير" : user.isModerator ? "مشرف" : "عادي"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* زر الحفظ */}
        {isEditing && (
          <div className="fixed bottom-3 left-3 right-3 bg-white rounded-xl shadow-lg border border-gray-200 p-3 pb-safe-bottom">
            <button
              onClick={handleSaveProfile}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95 text-sm"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              حفظ التغييرات
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard({
  user,
  activeQuiz,
  onStartQuiz,
  onViewLeaderboard,
  onOpenAdmin,
  onOpenReview,
  onRefresh,
  isLoading = false,
  totalParticipants = 0,
}: DashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const leaderboardData = useQuery(api.attempts.getLeaderboard, 
    activeQuiz?._id ? { quizId: activeQuiz._id } : "skip"
  ) || [];

  const commentsCount = useQuery(api.comments.getQuizCommentsCount, 
    activeQuiz?._id ? { quizId: activeQuiz._id } : "skip"
  ) || 0;

  const participants = totalParticipants > 0 ? totalParticipants : 
    leaderboardData.length > 0 ? leaderboardData.length : 
    activeQuiz?.participants || activeQuiz?.totalParticipants || 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReviewModeEnabled = activeQuiz?.reviewMode ?? false;

  const stats = [
    {
      value: activeQuiz?.questionCount || 0,
      label: "أسئلة",
      icon: <Book className="w-3.5 h-3.5" />,
      color: "text-blue-400"
    },
    {
      value: activeQuiz?.maxAttempts || 0,
      label: "محاولات",
      icon: <Target className="w-3.5 h-3.5" />,
      color: "text-green-400"
    },
    {
      value: activeQuiz?.duration ? `${activeQuiz.duration}د` : "مفتوح",
      label: "مدة",
      icon: <Clock className="w-3.5 h-3.5" />,
      color: "text-purple-400"
    },
    {
      value: participants,
      label: "مشاركين",
      icon: <Users className="w-3.5 h-3.5" />,
      color: "text-yellow-400"
    },
  ];

  const handleOpenReview = () => {
    if (activeQuiz) onOpenReview(activeQuiz._id);
  };

  // إذا كان البروفايل مفتوح، نعرضه فقط
  if (showProfile) {
    return <ProfileSection user={user} onClose={() => setShowProfile(false)} />;
  }

  // إذا كانت التعليقات مفتوحة، نعرضها فقط
  if (showComments && activeQuiz) {
    return (
      <CommentsSection 
        quizId={activeQuiz._id}
        currentUser={user}
        onClose={() => setShowComments(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 relative overflow-hidden p-2 pt-safe-top pb-safe-bottom">
      <Particles />
      
      {/* تأثيرات التوهج */}
      <div className="fixed inset-0 pointer-events-none z-1">
        <div className="absolute top-16 left-8 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-16 right-8 w-32 h-32 bg-purple-500/10 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 max-w-sm mx-auto space-y-2">
        {/* الهيدر */}
        <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-2.5 border border-white/20 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {/* الصورة الشخصية - قابلة للضغط */}
              <button 
                onClick={() => setShowProfile(true)}
                className="relative focus:outline-none active:scale-95 transition-transform group"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 p-0.5">
                  <div className="w-full h-full rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
                {(user.isAdmin || user.isModerator) && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-slate-900 flex items-center justify-center">
                    <Crown className="w-1.5 h-1.5 text-slate-900" />
                  </div>
                )}
                {/* تأثير hover */}
                <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit3 className="w-2.5 h-2.5 text-white" />
                </div>
              </button>
              
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">{user.name}</h1>
                <p className="text-amber-300 text-[10px]">
                  {user.isAdmin ? "مدير" : user.isModerator ? "مشرف" : "مشارك"}
                </p>
              </div>
            </div>

            <div className="flex gap-1">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="p-1 text-amber-300 hover:text-white transition-colors bg-white/10 rounded-lg active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              
              {(user.isAdmin || user.isModerator) && (
                <button
                  onClick={onOpenAdmin}
                  className="p-1 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors active:scale-95"
                >
                  <Settings className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* بطاقة المسابقة */}
        {activeQuiz ? (
          <div className={`bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {/* البادجات */}
            <div className="absolute top-1.5 right-1.5 z-10 flex flex-col gap-0.5">
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-lg">
                <Zap className="w-2 h-2" />
                نشط
              </div>
              {isReviewModeEnabled && (
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 shadow-lg">
                  <Eye className="w-2 h-2" />
                  مراجعة
                </div>
              )}
            </div>

            {/* الصورة */}
            <div className="relative h-20 bg-gradient-to-br from-slate-800 to-slate-900">
              {activeQuiz.imageUrl ? (
                <img
                  src={activeQuiz.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Book className="w-5 h-5 text-amber-400 mx-auto mb-0.5" />
                    <span className="text-white text-[10px] font-bold">{activeQuiz.title}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-slate-900 to-transparent"></div>
            </div>
            
            {/* المحتوى */}
            <div className="p-2.5">
              <h2 className="text-white font-bold text-center text-sm mb-1.5">
                {activeQuiz.title}
              </h2>

              {/* الإحصائيات */}
              <div className="grid grid-cols-4 gap-0.5 mb-2">
                {stats.map((stat, index) => (
                  <div 
                    key={index}
                    className="bg-white/5 rounded-lg p-0.5 text-center transition-all duration-300 hover:bg-white/10"
                  >
                    <div className={`${stat.color} mb-0.5 flex justify-center`}>
                      {stat.icon}
                    </div>
                    <div className="text-white font-bold text-[10px]">{stat.value}</div>
                    <div className="text-white/60 text-[8px]">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* الأزرار */}
              <div className="space-y-1">
                <button
                  onClick={() => onStartQuiz(activeQuiz._id)}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-2 rounded-lg font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg text-xs"
                >
                  <Play className="w-3 h-3" />
                  ابدأ المسابقة
                </button>
                
                {isReviewModeEnabled && (
                  <button
                    onClick={handleOpenReview}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white py-2 rounded-lg font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg text-xs"
                  >
                    <BookOpen className="w-3 h-3" />
                    مراجعة الأسئلة
                  </button>
                )}
                
                <button
                  onClick={onViewLeaderboard}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-2 rounded-lg font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg text-xs"
                  >
                  <Trophy className="w-3 h-3" />
                  المتصدرين
                </button>

                {/* زر التعليقات الجديد */}
                <button
                  onClick={() => setShowComments(true)}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white py-2 rounded-lg font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 shadow-lg text-xs"
                >
                  <MessageCircle className="w-3 h-3" />
                  التعليقات ({commentsCount})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-3 text-center border border-white/20 transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <Award className="w-8 h-8 text-amber-400 mx-auto mb-1.5" />
            <h3 className="text-white font-bold text-sm mb-0.5">لا توجد مسابقة</h3>
            <p className="text-white/60 text-[10px]">انتظر بدء المسابقة القادمة</p>
          </div>
        )}

        {/* النصائح */}
        <div className={`bg-white/10 backdrop-blur-lg rounded-xl p-2.5 border border-white/20 transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <h3 className="text-white font-bold text-xs">نصائح سريعة</h3>
          </div>
          <div className="text-white/80 text-[10px] space-y-1">
            <div className="flex items-center gap-1">
              <Star className="w-2 h-2 text-amber-400" />
              <span>اقرأ الأسئلة بعناية</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-2 h-2 text-amber-400" />
              <span>استخدم كل المحاولات</span>
            </div>
            {isReviewModeEnabled && (
              <div className="flex items-center gap-1">
                <Star className="w-2 h-2 text-amber-400" />
                <span>استخدم وضع المراجعة</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="w-2 h-2 text-amber-400" />
              <span>انقر على صورتك لتعديل البروفايل</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-2 h-2 text-amber-400" />
              <span>شارك أفكارك في قسم التعليقات</span>
            </div>
          </div>
        </div>

        {/* الفوتر */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <div className="w-0.5 h-0.5 bg-amber-400 rounded-full"></div>
            <p className="text-amber-300 text-[10px] font-medium">كنيسة مارمينا</p>
            <div className="w-0.5 h-0.5 bg-amber-400 rounded-full"></div>
          </div>
          <p className="text-white/40 text-[8px]">"اَللهُ مَحَبَّةٌ" - يوحنا ٤:٨</p>
        </div>
      </div>

      {/* CSS للتعامل مع مساحة الآمن في الهواتف */}
      <style jsx global>{`
        .pt-safe-top {
          padding-top: env(safe-area-inset-top);
        }
        .pb-safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}