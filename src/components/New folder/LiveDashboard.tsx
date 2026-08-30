// LiveDashboard.tsx - النسخة المحسنة
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ArrowLeft, Crown, Trophy, Medal, Award, Clock, UserCheck, BarChart3, RefreshCw, Target, Calendar, User, Sparkles, TrendingUp } from "lucide-react";

interface User {
  _id: string;
  name: string;
  avatarUrl?: string | null;
}

interface LiveDashboardProps {
  quizId: Id<"quizzes">;
  user: User;
  currentScore: number;
  onBack: () => void;
}

export default function LiveDashboard({ quizId, user, currentScore, onBack }: LiveDashboardProps) {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const leaderboard = useQuery(api.attempts.getLeaderboard, { quizId }) || [];
  const quiz = useQuery(api.quizzes.getQuizById, { quizId });

  // استخدام useMemo للبيانات المحسوبة
  const userRank = useMemo(() => 
    leaderboard.findIndex(entry => entry.userId === user._id) + 1, 
    [leaderboard, user._id]
  );

  const userEntry = useMemo(() => 
    leaderboard.find(entry => entry.userId === user._id),
    [leaderboard, user._id]
  );

  const topPlayers = useMemo(() => 
    leaderboard.slice(0, 5), 
    [leaderboard]
  );

  const getSurroundingPlayers = useCallback(() => {
    if (userRank <= 0) return [];
    
    const start = Math.max(0, userRank - 2);
    const end = Math.min(leaderboard.length, userRank + 1);
    
    return leaderboard.slice(start, end);
  }, [userRank, leaderboard]);

  const surroundingPlayers = useMemo(() => 
    getSurroundingPlayers(), 
    [getSurroundingPlayers]
  );

  // إحصائيات المستخدم
  const userStats = useMemo(() => {
    if (!userEntry) return null;
    
    const percentage = userEntry.totalQuestions > 0 
      ? Math.round((userEntry.correctAnswers / userEntry.totalQuestions) * 100) 
      : 0;
    
    const avgTimePerQuestion = userEntry.totalQuestions > 0 
      ? Math.round(userEntry.timeSpent / userEntry.totalQuestions / 1000) 
      : 0;

    return {
      percentage,
      avgTimePerQuestion,
      timeSpentSeconds: Math.round(userEntry.timeSpent / 1000),
      correctAnswers: userEntry.correctAnswers,
      totalQuestions: userEntry.totalQuestions
    };
  }, [userEntry]);

  // استخدام useCallback للدوال
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  const formatDate = useCallback((timestamp: any) => {
    if (!timestamp) return "غير محدد";
    return new Date(timestamp).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const formatRelativeTime = useCallback((timestamp: any) => {
    if (!timestamp) return "غير محدد";
    
    const now = new Date();
    const submitted = new Date(timestamp);
    const diffMs = now.getTime() - submitted.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    
    return formatDate(timestamp);
  }, [formatDate]);

  // تحديث البيانات يدويًا
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLastUpdated(Date.now());
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // تحديث البيانات كل 5 ثواني مع تنظيف
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(Date.now());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // الحصول على لون الرتبة
  const getRankColor = useCallback((rank: number) => {
    switch(rank) {
      case 1: return 'from-gold-500 to-gold-600';
      case 2: return 'from-silver-400 to-silver-500';
      case 3: return 'from-bronze-500 to-bronze-600';
      default: return 'from-navy-500 to-navy-600';
    }
  }, []);

  // الحصول على أيقونة الرتبة
  const getRankIcon = useCallback((rank: number) => {
    switch(rank) {
      case 1: return <Crown className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 2: return <Medal className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 3: return <Award className="w-3 h-3 sm:w-4 sm:h-4" />;
      default: return rank;
    }
  }, []);

  // الحصول على خلفية الرتبة
  const getRankBackground = useCallback((rank: number) => {
    switch(rank) {
      case 1: return 'bg-gold-50 border-gold-200';
      case 2: return 'bg-silver-50 border-silver-200';
      case 3: return 'bg-bronze-50 border-bronze-200';
      default: return 'bg-navy-50 border-navy-200';
    }
  }, []);

  return (
    <div 
      className="min-h-screen p-2 sm:p-3 bg-gradient-to-b from-blue-50 to-indigo-100"
      style={{ fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 sm:p-4 mb-3 border border-gold-300/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBack}
                className="p-1 sm:p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-700 hover:text-blue-900"
                aria-label="العودة إلى المسابقة"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  لوحة المتصدرين المباشرة
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    aria-label="تحديث البيانات"
                  >
                    <RefreshCw className={`w-3 h-3 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <p className="text-xs text-gray-600">
                    آخر تحديث: {formatTime(lastUpdated)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-md border border-yellow-400">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>

          {/* تاريخ انتهاء المسابقة */}
          {quiz && (
            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-gray-600">
                {quiz.endDate ? `تاريخ انتهاء المسابقة: ${formatDate(quiz.endDate)}` : 'مسابقة مستمرة'}
              </span>
            </div>
          )}
        </div>

        {/* User Current Status */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 sm:p-4 mb-3 border border-yellow-300/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center shadow-md border-2 border-yellow-400 overflow-hidden">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="w-full h-full rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                  )}
                </div>
                {userRank <= 3 && userRank > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-md border border-white">
                    {getRankIcon(userRank)}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-gray-800 truncate max-w-[120px] sm:max-w-[150px]">
                  {user.name}
                </h2>
                <p className="text-xs text-gray-600">رقمك في المسابقة</p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">
                {userRank > 0 ? userRank : '--'}
              </div>
              <div className="text-xs text-gray-600">الترتيب</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{currentScore}</div>
              <div className="text-xs text-gray-600">النقاط</div>
            </div>
          </div>

          {/* شريط التقدم */}
          {userStats && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>تقدمك في المسابقة</span>
                <span>{userStats.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${userStats.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top Players */}
        {topPlayers.length > 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 sm:p-4 md:p-6 mb-3 border border-yellow-300/30">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 text-center mb-4 flex items-center justify-center gap-1 sm:gap-2">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
              أفضل 5 متسابقين
            </h2>
            
            <div className="space-y-2">
              {topPlayers.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = player.userId === user._id;
                
                return (
                  <div 
                    key={player._id} 
                    className={`p-2 sm:p-3 rounded-xl flex items-center justify-between transition-all duration-200 hover:shadow-md ${
                      getRankBackground(rank)
                    } ${isCurrentUser ? 'ring-2 ring-yellow-400' : ''}`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md bg-gradient-to-r ${getRankColor(rank)}`}>
                        {getRankIcon(rank)}
                      </div>
                      
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                        {player.userAvatar ? (
                          <img 
                            src={player.userAvatar} 
                            alt={player.userName} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                          </div>
                        )}
                      </div>
                      
                      <div className="max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-800 truncate flex items-center gap-1">
                          {player.userName}
                          {isCurrentUser && (
                            <span className="bg-blue-600 text-white text-xs font-semibold px-1 py-0.5 rounded-lg">
                              أنت
                            </span>
                          )}
                        </h3>
                        {player.submittedAt && (
                          <p className="text-xs text-gray-500 mt-1 truncate" title={formatDate(player.submittedAt)}>
                            {formatRelativeTime(player.submittedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-bold text-gray-800">{player.score}</div>
                      <div className="text-xs text-gray-600">نقطة</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Surrounding Players */}
        {surroundingPlayers.length > 0 && userRank > 5 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 sm:p-4 mb-3 border border-yellow-300/30">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-1 sm:gap-2">
              <Target className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              المتسابقون حولك
            </h2>
            
            <div className="space-y-2">
              {surroundingPlayers.map((player) => {
                const rank = leaderboard.findIndex(entry => entry._id === player._id) + 1;
                const isCurrentUser = player.userId === user._id;
                
                return (
                  <div 
                    key={player._id} 
                    className={`p-2 sm:p-3 rounded-lg flex items-center justify-between transition-all duration-200 hover:bg-gray-50 ${
                      isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-r-4 border-yellow-500' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                        {rank}
                      </div>
                      
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-sm border border-gray-100">
                        {player.userAvatar ? (
                          <img 
                            src={player.userAvatar} 
                            alt={player.userName} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                          </div>
                        )}
                      </div>
                      
                      <div className="max-w-[80px] sm:max-w-[100px] md:max-w-[130px]">
                        <h3 className="font-medium text-xs text-gray-800 truncate">
                          {isCurrentUser ? (
                            <span className="text-blue-600 font-semibold">أنت</span>
                          ) : (
                            player.userName
                          )}
                        </h3>
                        {player.submittedAt && (
                          <p className="text-xs text-gray-500 mt-1 truncate" title={formatDate(player.submittedAt)}>
                            {formatRelativeTime(player.submittedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-800">{player.score}</div>
                      <div className="text-xs text-gray-600">نقطة</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Comparison */}
        {userStats && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-3 sm:p-4 border border-yellow-300/30">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-1 sm:gap-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              إحصائيات أدائك
            </h2>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-blue-50 rounded-xl p-2 sm:p-3 text-center border border-blue-200 transition-all duration-200 hover:shadow-md">
                <div className="text-base sm:text-lg font-bold text-gray-800">{userStats.correctAnswers}/{userStats.totalQuestions}</div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  الإجابات الصحيحة
                </div>
              </div>
              
              <div className="bg-green-50 rounded-xl p-2 sm:p-3 text-center border border-green-200 transition-all duration-200 hover:shadow-md">
                <div className="text-base sm:text-lg font-bold text-gray-800">
                  {userStats.percentage}%
                </div>
                <div className="text-xs text-gray-600">نسبة النجاح</div>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-2 sm:p-3 text-center border border-purple-200 transition-all duration-200 hover:shadow-md">
                <div className="text-base sm:text-lg font-bold text-gray-800">
                  {userStats.timeSpentSeconds}s
                </div>
                <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  الوقت المستغرق
                </div>
              </div>
              
              <div className="bg-orange-50 rounded-xl p-2 sm:p-3 text-center border border-orange-200 transition-all duration-200 hover:shadow-md">
                <div className="text-base sm:text-lg font-bold text-gray-800">
                  {userStats.avgTimePerQuestion}s
                </div>
                <div className="text-xs text-gray-600">متوسط الوقت/سؤال</div>
              </div>
            </div>

            {/* تاريخ تسليم المستخدم */}
            {userEntry?.submittedAt && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-center">
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                  <span className="text-xs sm:text-sm text-gray-700">
                    سلمت الإجابة {formatRelativeTime(userEntry.submittedAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {leaderboard.length === 0 && (
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6 text-center border border-yellow-300/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-200">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            </div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 mb-2">لا توجد نتائج بعد</h3>
            <p className="text-xs sm:text-sm text-gray-600">لم يشارك أحد في هذه المسابقة بعد</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center mt-4 mb-6">
          <p className="text-xs text-gray-500">
            يتم تحديث النتائج تلقائياً كل 5 ثواني
          </p>
        </div>
      </div>
    </div>
  );
}