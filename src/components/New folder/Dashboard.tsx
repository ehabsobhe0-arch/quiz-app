// Dashboard.tsx - النسخة المحسنة مع زر وضع المراجعة
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Trophy, Settings, Users, Crown, Gamepad2, Sparkles, RefreshCw, Cross, Book, Award, Eye, BookOpen } from "lucide-react";

interface User {
  _id: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isModerator: boolean;
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

interface DashboardProps {
  user: User;
  activeQuiz: Quiz | null;
  onStartQuiz: (quizId: string) => void;
  onViewLeaderboard: () => void;
  onOpenAdmin: () => void;
  onOpenReview: (quizId: string) => void; // تأكد إن الدالة بتاخد string
  onRefresh?: () => void;
  isLoading?: boolean;
}

// نظام النجوم المحسن للأداء
const OptimizedStarfield = React.memo(() => {
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

    const starCount = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 10000), 25);
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1 + 0.5,
      brightness: Math.random() * 0.4 + 0.2
    }));

    ctx.fillStyle = 'rgba(10, 15, 45, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fill();
    });

    const handleResize = () => {
      setCanvasSize();
      ctx.fillStyle = 'rgba(10, 15, 45, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      stars.forEach(star => {
        star.x = Math.random() * canvas.width;
        star.y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fill();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
});

// تأثيرات خفيفة للأداء
const LightEffects = React.memo(() => (
  <div className="fixed inset-0 pointer-events-none z-1 overflow-hidden">
    <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-yellow-400/3 rounded-full blur-3xl"></div>
    <div className="absolute bottom-1/3 right-1/4 w-36 h-36 bg-blue-400/3 rounded-full blur-3xl"></div>
  </div>
));

// مكون تحميل بسيط
const SimpleLoader = React.memo(() => (
  <div className="flex flex-col items-center justify-center py-6">
    <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2"></div>
    <p className="text-yellow-300 text-xs">جاري التحميل...</p>
  </div>
));

// مكون البطاقة الإحصائية
const StatCard = React.memo(({ 
  value, 
  label, 
  icon, 
  isLoading = false 
}: { 
  value: string | number;
  label: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) => (
  <div className="bg-gray-800/95 backdrop-blur-md rounded-xl p-2 text-center border border-yellow-500/20 min-h-[70px] flex flex-col justify-center transition-transform active:scale-95">
    <div className="flex justify-center text-base mb-1">
      {icon}
    </div>
    <div className="text-sm font-bold text-white mb-1 min-h-[20px] flex items-center justify-center">
      {isLoading ? <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div> : value}
    </div>
    <div className="text-yellow-200 text-xs font-medium">{label}</div>
  </div>
));

// مكون الصورة المحسن للشاشات الصغيرة
const MobileOptimizedImage = React.memo(({ 
  imageUrl, 
  title
}: { 
  imageUrl?: string | null;
  title: string;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!imageUrl || imageError) {
    return (
      <div className="relative h-40 bg-gradient-to-br from-yellow-600/20 to-purple-600/20 rounded-t-2xl flex items-center justify-center">
        <div className="text-center px-3">
          <Book className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <span className="text-white text-base font-bold block leading-tight">{title}</span>
          <p className="text-yellow-200 text-xs mt-1">مسابقة دينية</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 rounded-t-2xl overflow-hidden bg-gray-800">
      <img
        src={imageUrl}
        alt={title}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
      
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent"></div>
    </div>
  );
});

export default function Dashboard({
  user,
  activeQuiz,
  onStartQuiz,
  onViewLeaderboard,
  onOpenAdmin,
  onOpenReview,
  onRefresh,
  isLoading = false,
}: DashboardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    await onRefresh();
  }, [onRefresh]);

  // التحقق من تفعيل وضع المراجعة
  const isReviewModeEnabled = activeQuiz?.reviewMode ?? false;

  // إحصائيات محسوبة مسبقاً
  const stats = useMemo(() => [
    {
      value: activeQuiz?.questionCount || 0,
      label: "الأسئلة",
      icon: "📖",
      isLoading
    },
    {
      value: activeQuiz?.maxAttempts || 0,
      label: "المحاولات",
      icon: "🔄",
      isLoading
    },
    {
      value: activeQuiz?.duration ? `${activeQuiz.duration} د` : "مفتوح",
      label: "المدة",
      icon: "⏰",
      isLoading
    },
    {
      value: activeQuiz?.participants ?? activeQuiz?.totalParticipants ?? 0,
      label: "المشاركين",
      icon: "👥",
      isLoading
    },
  ], [activeQuiz, isLoading]);

  // دالة فتح وضع المراجعة
  const handleOpenReview = () => {
    if (!activeQuiz) return;
    console.log("Opening review for quiz:", activeQuiz._id); // ديبقنج
    onOpenReview(activeQuiz._id); // مرر الـ ID مباشرة
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 relative overflow-hidden">
      <OptimizedStarfield />
      <LightEffects />

      <div className="relative z-10 min-h-screen p-2">
        <div className="max-w-sm mx-auto space-y-3">
          {/* الهيدر */}
          <div className={`bg-gray-800/95 backdrop-blur-md rounded-2xl p-3 border border-yellow-500/20 transition-all duration-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                          loading="eager"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  {(user.isAdmin || user.isModerator) && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <Crown className="w-2 h-2 text-gray-900" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-bold text-white truncate">
                    {isLoading ? "جاري التحميل..." : `أهلاً، ${user.name}`}
                  </h1>
                  <p className="text-yellow-200 text-xs truncate">
                    {user.isAdmin ? "مدير النظام" : user.isModerator ? "مشرف" : "مشارك"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {onRefresh && (
                  <button
                    onClick={handleRefresh}
                    className="p-1.5 text-yellow-300 hover:text-white transition-colors active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                
                {(user.isAdmin || user.isModerator) && (
                  <button
                    onClick={onOpenAdmin}
                    className="bg-yellow-600 text-white p-1.5 rounded-lg hover:bg-yellow-700 transition-colors active:scale-95"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* بطاقة المسابقة */}
          {activeQuiz ? (
            <div className={`bg-gray-800/95 backdrop-blur-md rounded-2xl border border-yellow-500/20 overflow-hidden transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="absolute top-2 right-2 z-20">
                <div className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                  <Sparkles className="w-3 h-3" />
                  نشطة
                </div>
              </div>

              {/* بادج وضع المراجعة إذا كان مفعل */}
              {isReviewModeEnabled && (
                <div className="absolute top-2 left-2 z-20">
                  <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Eye className="w-3 h-3" />
                    مراجعة
                  </div>
                </div>
              )}

              <MobileOptimizedImage 
                imageUrl={activeQuiz.imageUrl} 
                title={activeQuiz.title}
              />
              
              <div className="p-3">
                <h2 className="text-lg font-bold text-white text-center mb-2 leading-tight px-2">
                  {activeQuiz.title}
                </h2>
                
                <div className="flex flex-wrap gap-1 justify-center mb-2">
                  <span className="bg-green-600/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-500/20">
                    متاحة الآن
                  </span>
                  <span className="bg-blue-600/20 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-500/20">
                    {activeQuiz.questionCount} سؤال
                  </span>
                  <span className="bg-amber-600/20 text-amber-300 text-xs px-2 py-1 rounded-full border border-amber-500/20">
                    {activeQuiz.maxAttempts} محاولة
                  </span>
                  {isReviewModeEnabled && (
                    <span className="bg-purple-600/20 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-500/20">
                      مراجعة متاحة
                    </span>
                  )}
                </div>

                {activeQuiz.description && (
                  <p className="text-gray-200 text-xs text-center mb-3 leading-relaxed px-2 line-clamp-2">
                    {activeQuiz.description}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {/* زر ابدأ المسابقة */}
                  <button
                    onClick={() => onStartQuiz(activeQuiz._id)}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    ابدأ المسابقة
                  </button>
                  
                  {/* زر وضع المراجعة - يظهر فقط إذا كان مفعل */}
                  {isReviewModeEnabled && (
                    <button
                      onClick={handleOpenReview}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                    >
                      <BookOpen className="w-4 h-4" />
                      مراجعة الأسئلة
                    </button>
                  )}
                  
                  {/* زر المتصدرين */}
                  <button
                    onClick={onViewLeaderboard}
                    disabled={isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Trophy className="w-4 h-4" />
                    المتصدرين
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={`bg-gray-800/95 backdrop-blur-md rounded-2xl p-4 text-center border border-yellow-500/20 transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              {isLoading ? (
                <SimpleLoader />
              ) : (
                <>
                  <Award className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
                  <h3 className="text-base font-bold text-white mb-1">لا توجد مسابقة حالياً</h3>
                  <p className="text-gray-300 text-xs mb-3">
                    انتظر بدء المسابقة القادمة
                  </p>
                  {onRefresh && (
                    <button 
                      onClick={handleRefresh}
                      className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-700 transition-colors flex items-center gap-1 mx-auto active:scale-95"
                    >
                      <RefreshCw className="w-3 h-3" />
                      تحديث
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* الإحصائيات */}
          <div className={`grid grid-cols-2 gap-2 transition-all duration-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                value={stat.value}
                label={stat.label}
                icon={stat.icon}
                isLoading={stat.isLoading}
              />
            ))}
          </div>

          {/* رسالة المشاركين */}
          {(activeQuiz?.participants > 0 || activeQuiz?.totalParticipants > 0) && (
            <div className={`bg-purple-600/10 backdrop-blur-md rounded-xl p-3 border border-purple-500/20 transition-all duration-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-bold text-sm">إجمالي المشاركين</h3>
              </div>
              <div className="text-xs text-purple-200">
                <p>
                  <span className="font-bold text-white">
                    {activeQuiz.participants || activeQuiz.totalParticipants}
                  </span> شخص دخلوا المسابقة
                </p>
              </div>
            </div>
          )}

          {/* نصائح */}
          <div className={`bg-gray-800/95 backdrop-blur-md rounded-xl p-3 border border-yellow-500/20 transition-all duration-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <h3 className="text-white font-bold text-sm">نصائح للفوز</h3>
            </div>
            <div className="space-y-1 text-xs text-gray-200">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                <span>اقرأ الأسئلة بعناية</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                <span>استخدم كل المحاولات</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></div>
                <span>تابع المتصدرين</span>
              </div>
              {isReviewModeEnabled && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></div>
                  <span>استخدم وضع المراجعة للتحضير</span>
                </div>
              )}
            </div>
          </div>

          {/* الفوتر */}
          <div className="text-center py-3 border-t border-gray-600/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Cross className="w-3 h-3 text-yellow-400" />
              <p className="text-yellow-300 text-xs font-medium">
                كنيسة مارمينا والبابا كيرلس
              </p>
            </div>
            <p className="text-gray-400 text-xs">
              © 2025 مسابقات دينية
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}