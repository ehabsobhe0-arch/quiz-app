// Leaderboard.tsx - النسخة المحسنة للشاشات الصغيرة
import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Crown, Medal, Trophy, ArrowLeft, Award, Clock, UserCheck, Sparkles, User, Target, CheckCircle, Star } from "lucide-react";

interface User {
  _id: string;
  name: string;
  avatarUrl?: string | null;
}

interface LeaderboardProps {
  quizId: Id<"quizzes">;
  user: User;
  onBack: () => void;
}

// نظام النجوم المحسن للشاشات الصغيرة
const MobileStarfield = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // عدد أقل من النجوم للأداء
    const stars = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1 + 0.3,
      speed: Math.random() * 0.1 + 0.03,
      brightness: Math.random() * 0.3 + 0.2,
    }));

    const animate = () => {
      ctx.fillStyle = '#0a1428';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
});

// دالة تنظيف الأسماء
const cleanUserName = (name: any): string => {
  if (!name) return "مستخدم";
  const nameStr = String(name).trim();
  if (nameStr.length === 0) return "مستخدم";
  if (nameStr.toLowerCase() === "unknown") return "مستخدم";
  let cleaned = nameStr.replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s\.\-_]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned || "مستخدم";
};

export default function Leaderboard({ quizId, user, onBack }: LeaderboardProps) {
  const leaderboardData = useQuery(api.attempts.getLeaderboard, { quizId }) || [];
  const quiz = useQuery(api.quizzes.getActiveQuiz);

  // تنظيف بيانات الليدر بورد
  const cleanedLeaderboard = useMemo(() => {
    return leaderboardData.map(entry => ({
      ...entry,
      userName: cleanUserName(entry.userName || "مستخدم"),
      userAvatar: entry.userAvatar || null
    }));
  }, [leaderboardData]);

  // ترتيب البيانات
  const sortedLeaderboard = useMemo(() => {
    return [...cleanedLeaderboard].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    });
  }, [cleanedLeaderboard]);

  // البيانات المحسوبة
  const topThree = useMemo(() => sortedLeaderboard.slice(0, 3), [sortedLeaderboard]);
  const remainingPlayers = useMemo(() => sortedLeaderboard.slice(3), [sortedLeaderboard]);
  const userRank = useMemo(() => 
    sortedLeaderboard.findIndex(entry => entry.userId === user._id) + 1, 
    [sortedLeaderboard, user._id]
  );
  const userEntry = useMemo(() => 
    sortedLeaderboard.find(entry => entry.userId === user._id),
    [sortedLeaderboard, user._id]
  );

  // دوال مساعدة
  const getRankColor = useCallback((rank: number) => {
    switch (rank) {
      case 1: return "from-yellow-400 to-amber-500 shadow-lg";
      case 2: return "from-gray-400 to-gray-500 shadow-md";
      case 3: return "from-orange-400 to-orange-500 shadow-sm";
      default: return "from-blue-500 to-blue-600";
    }
  }, []);

  const getRankIcon = useCallback((rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-3 h-3 text-white" />;
      case 2: return <Medal className="w-3 h-3 text-white" />;
      case 3: return <Award className="w-3 h-3 text-white" />;
      default: return <span className="text-white font-bold text-xs">#{rank}</span>;
    }
  }, []);

  const getAccuracy = useCallback((correct: number, total: number) => {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }, []);

  const formatTime = useCallback((timeSpent: number) => {
    const seconds = Math.round(timeSpent / 1000);
    if (seconds < 60) return `${seconds} ث`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="min-h-screen p-2 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <MobileStarfield />
      
      <div className="relative z-10 max-w-sm mx-auto">
        {/* الهيدر */}
        <div className="bg-white/95 backdrop-blur-lg rounded-xl p-3 mb-3 border border-white/20 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={onBack}
                className="p-1.5 bg-blue-100 rounded-lg text-blue-700 hover:bg-blue-200 transition-colors active:scale-95"
                aria-label="العودة"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-gray-800 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="truncate">المتصدرون</span>
                </h1>
                <p className="text-xs text-gray-600 truncate">{quiz?.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs text-gray-600">ترتيبك</div>
                <div className="text-base font-bold text-blue-700">
                  {userRank > 0 ? `#${userRank}` : '-'}
                </div>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-md">
                <Trophy className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* إحصائيات المستخدم */}
        {userEntry && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3 mb-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-2 border-white/20">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="max-w-[120px]">
                  <div className="text-white text-sm font-bold">{user.name}</div>
                  <div className="text-blue-100 text-xs">أداؤك في المسابقة</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-white">{userEntry.score}</div>
                <div className="text-blue-100 text-xs">نقطة</div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-base font-bold text-white">{userEntry.correctAnswers}</div>
                <div className="text-blue-100 text-xs">إجابات صحيحة</div>
              </div>
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-base font-bold text-white">
                  {getAccuracy(userEntry.correctAnswers, userEntry.totalQuestions)}%
                </div>
                <div className="text-blue-100 text-xs">نسبة الدقة</div>
              </div>
              <div className="bg-white/20 rounded-lg p-2 backdrop-blur-sm">
                <div className="text-base font-bold text-white">
                  {formatTime(userEntry.timeSpent)}
                </div>
                <div className="text-blue-100 text-xs">الوقت</div>
              </div>
            </div>
          </div>
        )}

        {/* الأوائل الثلاثة */}
        {topThree.length > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-xl p-3 mb-3 border border-white/20 shadow-lg">
            <h2 className="text-sm font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-2">
              <Target className="w-4 h-4 text-yellow-500" />
              <span>أفضل 3 لاعبين</span>
              <Star className="w-4 h-4 text-yellow-500" />
            </h2>
            
            <div className="space-y-3">
              {topThree.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.userId === user._id;
                const accuracy = getAccuracy(player.correctAnswers, player.totalQuestions);
                
                return (
                  <div 
                    key={player._id}
                    className={`p-3 rounded-lg border-2 ${
                      rank === 1 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-md' :
                      rank === 2 ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm' :
                      'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* الرتبة */}
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center shadow-md`}>
                          {getRankIcon(rank)}
                        </div>
                        
                        {/* الصورة والاسم */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                            {player.userAvatar ? (
                              <img src={player.userAvatar} alt={player.userName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="font-semibold text-gray-800 text-sm truncate">
                                {player.userName}
                              </span>
                              {isCurrentUser && (
                                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">أنت</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {accuracy}%
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-500" />
                                {formatTime(player.timeSpent)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* النقاط */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-800">{player.score}</div>
                        <div className="text-xs text-gray-600">نقطة</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* القائمة الكاملة */}
        <div className="bg-white/95 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden shadow-lg">
          <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>جميع اللاعبين</span>
              </h3>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                {sortedLeaderboard.length}
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
            {remainingPlayers.map((entry, index) => {
              const rank = index + 4;
              const isCurrentUser = entry.userId === user._id;
              const accuracy = getAccuracy(entry.correctAnswers, entry.totalQuestions);
              
              return (
                <div 
                  key={entry._id}
                  className={`p-3 transition-colors ${
                    isCurrentUser ? 'bg-blue-50 border-r-4 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {/* رقم الترتيب */}
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                        {rank}
                      </div>
                      
                      {/* صورة المستخدم */}
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                        {entry.userAvatar ? (
                          <img src={entry.userAvatar} alt={entry.userName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      
                      {/* المعلومات */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="font-semibold text-gray-800 text-sm truncate">
                            {entry.userName}
                          </span>
                          {isCurrentUser && (
                            <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">أنت</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {accuracy}%
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {formatTime(entry.timeSpent)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* النقاط */}
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-800">{entry.score}</div>
                      <div className="text-xs text-gray-600">نقطة</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {sortedLeaderboard.length === 0 && (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">لا توجد نتائج بعد</h3>
              <p className="text-xs text-gray-600">كن أول من يشارك في المسابقة!</p>
            </div>
          )}
        </div>

        {/* الفوتر */}
        <div className="text-center pt-4 pb-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white/90 text-sm">مسابقات دينية</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-white/60 text-xs">
            "اَللهُ مَحَبَّةٌ" - يوحنا ٤:٨
          </div>
        </div>
      </div>
    </div>
  );
}