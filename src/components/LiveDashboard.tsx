// LiveDashboard.tsx - النسخة المحسنة مع الأنيميشنات الحية
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  ArrowLeft, Crown, Trophy, Medal, Award, Clock, 
  UserCheck, BarChart3, RefreshCw, Target, Calendar, 
  User, Sparkles, TrendingUp, TrendingDown, Zap,
  Flame, Star, Users, Award as AwardIcon
} from "lucide-react";

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

// مكون الأنيميشن للعناصر
const AnimatedItem = ({ 
  children, 
  delay = 0, 
  className = "" 
}: { 
  children: React.ReactNode; 
  delay?: number; 
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`
      transition-all duration-500 transform
      ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      ${className}
    `}>
      {children}
    </div>
  );
};

// مكون تغيير الترتيب مع الأنيميشن
const RankChangeIndicator = React.memo(({ 
  oldRank, 
  newRank 
}: { 
  oldRank: number; 
  newRank: number;
}) => {
  const change = oldRank - newRank;
  
  if (change === 0) return null;

  return (
    <div className={`
      absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center
      text-white text-xs font-bold shadow-lg animate-bounce
      ${change > 0 ? 'bg-green-500' : 'bg-red-500'}
    `}>
      {change > 0 ? '↑' : '↓'}
      <span className="text-[10px]">{Math.abs(change)}</span>
    </div>
  );
});

// تأثير النجوم في الخلفية
const AnimatedBackground = React.memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 1}s`,
          }}
        />
      ))}
    </div>
  );
});

export default function LiveDashboard({ quizId, user, currentScore, onBack }: LiveDashboardProps) {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());
  const [isUpdating, setIsUpdating] = useState(false);
  
  const leaderboard = useQuery(api.attempts.getLeaderboard, { quizId }) || [];
  const quiz = useQuery(api.quizzes.getQuizById, { quizId });

  // تتبع تغييرات الترتيب
  useEffect(() => {
    if (leaderboard.length > 0) {
      const newRanks = new Map();
      leaderboard.forEach((player, index) => {
        newRanks.set(player._id, index + 1);
      });

      // التحقق من التغييرات
      let hasChanges = false;
      newRanks.forEach((newRank, playerId) => {
        const oldRank = previousRanks.get(playerId);
        if (oldRank && oldRank !== newRank) {
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setIsUpdating(true);
        setLastUpdated(Date.now());
        
        const timer = setTimeout(() => {
          setIsUpdating(false);
          setPreviousRanks(newRanks);
        }, 1500);

        return () => clearTimeout(timer);
      } else {
        setPreviousRanks(newRanks);
      }
    }
  }, [leaderboard, previousRanks]);

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
    leaderboard.slice(0, 3), 
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

  const formatRelativeTime = useCallback((timestamp: any) => {
    if (!timestamp) return "الآن";
    
    const now = new Date();
    const submitted = new Date(timestamp);
    const diffMs = now.getTime() - submitted.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 1) return "الآن";
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    
    return `منذ ${Math.floor(diffHours / 24)} يوم`;
  }, []);

  // تحديث البيانات يدويًا
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setLastUpdated(Date.now());
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // تحديث البيانات كل 3 ثواني
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(Date.now());
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // الحصول على لون الرتبة
  const getRankColor = useCallback((rank: number) => {
    switch(rank) {
      case 1: return 'from-yellow-400 to-amber-500 shadow-lg';
      case 2: return 'from-gray-400 to-gray-500 shadow-md';
      case 3: return 'from-orange-400 to-orange-500 shadow-md';
      default: return 'from-blue-500 to-blue-600 shadow-sm';
    }
  }, []);

  // الحصول على أيقونة الرتبة
  const getRankIcon = useCallback((rank: number) => {
    switch(rank) {
      case 1: return <Crown className="w-4 h-4" />;
      case 2: return <Medal className="w-4 h-4" />;
      case 3: return <Award className="w-4 h-4" />;
      default: return <span className="text-xs font-bold">#{rank}</span>;
    }
  }, []);

  // الحصول على خلفية الرتبة
  const getRankBackground = useCallback((rank: number) => {
    switch(rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200';
      default: return 'bg-white border-gray-200';
    }
  }, []);

  return (
    <div className="min-h-screen p-3 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 max-w-md mx-auto">
        {/* Header */}
        <AnimatedItem delay={100}>
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-white/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onBack}
                className="p-2 bg-blue-100 rounded-xl text-blue-700 hover:bg-blue-200 transition-all duration-300 hover:scale-110"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="text-center flex-1">
                <h1 className="text-lg font-bold text-gray-800 flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                  <span>لوحة النتائج المباشرة</span>
                  <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
                </h1>
                <p className="text-sm text-gray-600 mt-1">{quiz?.title}</p>
              </div>

              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 bg-green-100 rounded-xl text-green-700 hover:bg-green-200 transition-all duration-300 hover:scale-110"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* مؤشر التحديث */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <span className="text-sm font-medium">محدث {formatTime(lastUpdated)}</span>
              </div>
              
              {isUpdating && (
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">جاري التحديث...</span>
                </div>
              )}
            </div>
          </div>
        </AnimatedItem>

        {/* User Current Status */}
        <AnimatedItem delay={200}>
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-white/30 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg border-2 border-yellow-400 overflow-hidden">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  {userRank <= 3 && userRank > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border border-white">
                      {getRankIcon(userRank)}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-gray-800 text-sm">{user.name}</h2>
                  <p className="text-xs text-gray-600">رقمك في المسابقة</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{userRank > 0 ? userRank : '--'}</div>
                <div className="text-xs text-gray-600">الترتيب</div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-800">{currentScore}</div>
                <div className="text-xs text-gray-600">النقاط</div>
              </div>
            </div>

            {/* شريط التقدم */}
            {userStats && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                  <span>تقدمك في المسابقة</span>
                  <span>{userStats.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${userStats.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </AnimatedItem>

        {/* Top 3 Players */}
        {topPlayers.length > 0 && (
          <AnimatedItem delay={300}>
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-white/30 shadow-2xl">
              <h2 className="text-base font-bold text-gray-800 text-center mb-4 flex items-center justify-center gap-2">
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                <span>أفضل 3 متسابقين</span>
                <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
              </h2>
              
              <div className="space-y-3">
                {topPlayers.map((player, index) => {
                  const rank = index + 1;
                  const isCurrentUser = player.userId === user._id;
                  const previousRank = previousRanks.get(player._id);
                  
                  return (
                    <div 
                      key={player._id} 
                      className={`
                        relative p-3 rounded-xl border-2 transition-all duration-500
                        ${getRankBackground(rank)}
                        ${isCurrentUser ? 'ring-2 ring-blue-400 scale-105' : ''}
                        hover:shadow-lg hover:scale-102
                      `}
                    >
                      {/* مؤشر تغيير الترتيب */}
                      {previousRank && previousRank !== rank && (
                        <RankChangeIndicator oldRank={previousRank} newRank={rank} />
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRankColor(rank)} flex items-center justify-center text-white shadow-lg`}>
                            {getRankIcon(rank)}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-sm border border-gray-300">
                              {player.userAvatar ? (
                                <img 
                                  src={player.userAvatar} 
                                  alt={player.userName} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-5 h-5 text-gray-600" />
                              )}
                            </div>
                            
                            <div>
                              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                                {player.userName}
                                {isCurrentUser && (
                                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    أنت
                                  </span>
                                )}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Target className="w-3 h-3 text-green-500" />
                                  <span>{player.score}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock className="w-3 h-3 text-purple-500" />
                                  <span>{Math.round(player.timeSpent / 1000)}s</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedItem>
        )}

        {/* Surrounding Players */}
        {surroundingPlayers.length > 0 && userRank > 3 && (
          <AnimatedItem delay={400}>
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 mb-3 border border-white/30 shadow-2xl">
              <h2 className="text-base font-bold text-gray-800 text-center mb-3 flex items-center justify-center gap-2">
                <Target className="w-4 h-4 text-yellow-600" />
                <span>المتسابقون حولك</span>
              </h2>
              
              <div className="space-y-2">
                {surroundingPlayers.map((player) => {
                  const rank = leaderboard.findIndex(entry => entry._id === player._id) + 1;
                  const isCurrentUser = player.userId === user._id;
                  const previousRank = previousRanks.get(player._id);
                  
                  return (
                    <div 
                      key={player._id} 
                      className={`
                        relative p-3 rounded-lg flex items-center justify-between 
                        transition-all duration-300 hover:shadow-md
                        ${isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-r-4 border-yellow-500 scale-105' : 'bg-gray-50'}
                      `}
                    >
                      {/* مؤشر تغيير الترتيب */}
                      {previousRank && previousRank !== rank && (
                        <RankChangeIndicator oldRank={previousRank} newRank={rank} />
                      )}

                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                          {rank}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-sm border border-gray-300">
                            {player.userAvatar ? (
                              <img 
                                src={player.userAvatar} 
                                alt={player.userName} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-gray-800 text-sm">
                              {isCurrentUser ? (
                                <span className="text-blue-600 font-semibold">أنت</span>
                              ) : (
                                player.userName
                              )}
                            </h3>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-800">{player.score}</div>
                        <div className="text-xs text-gray-600">نقطة</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedItem>
        )}

        {/* User Statistics */}
        {userStats && (
          <AnimatedItem delay={500}>
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 border border-white/30 shadow-2xl">
              <h2 className="text-base font-bold text-gray-800 text-center mb-4 flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4 text-yellow-600" />
                <span>إحصائيات أدائك</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200 transition-all duration-200 hover:shadow-md">
                  <div className="text-lg font-bold text-gray-800">{userStats.correctAnswers}/{userStats.totalQuestions}</div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    الإجابات الصحيحة
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200 transition-all duration-200 hover:shadow-md">
                  <div className="text-lg font-bold text-gray-800">{userStats.percentage}%</div>
                  <div className="text-xs text-gray-600">نسبة النجاح</div>
                </div>
                
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200 transition-all duration-200 hover:shadow-md">
                  <div className="text-lg font-bold text-gray-800">{userStats.timeSpentSeconds}s</div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    الوقت المستغرق
                  </div>
                </div>
                
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200 transition-all duration-200 hover:shadow-md">
                  <div className="text-lg font-bold text-gray-800">{userStats.avgTimePerQuestion}s</div>
                  <div className="text-xs text-gray-600">متوسط الوقت/سؤال</div>
                </div>
              </div>
            </div>
          </AnimatedItem>
        )}

        {/* Footer */}
        <AnimatedItem delay={600}>
          <div className="text-center pt-6 pb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-white/90 text-sm">كنيسة مارمينا والبابا كيرلس</span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <div className="text-white/70 text-xs">"اَللهُ مَحَبَّةٌ" - يوحنا ٤:٨</div>
            <div className="text-white/50 text-xs mt-2">يتم تحديث النتائج تلقائياً</div>
          </div>
        </AnimatedItem>
      </div>
    </div>
  );
}