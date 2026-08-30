// Leaderboard.tsx - نسخة احترافية مع أنيميشنات حية
import React, { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Crown, Medal, Trophy, ArrowLeft, Award, Clock, UserCheck, Sparkles, User, Target, Zap, CheckCircle, Star, Flame, Calendar, TrendingUp, TrendingDown } from "lucide-react";

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

// تأثير النجوم المتحركة
const AnimatedStars = React.memo(() => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 1}s`,
          }}
        />
      ))}
      {/* تأثيرات متحركة إضافية */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-1/3 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}}></div>
    </div>
  );
});

// مكون اللاعب مع أنيميشنات التغيير
const AnimatedPlayerItem = React.memo(({ 
  player, 
  rank,
  previousRank,
  isCurrentUser,
  delay,
  isNew = false
}: { 
  player: any;
  rank: number;
  previousRank?: number;
  isCurrentUser: boolean;
  delay: number;
  isNew?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRankChanging, setIsRankChanging] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (previousRank && previousRank !== rank) {
      setIsRankChanging(true);
      const timer = setTimeout(() => setIsRankChanging(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [previousRank, rank]);

  const accuracy = Math.round((player.correctAnswers / player.totalQuestions) * 100);
  
  const formatTime = (timeSpent: number) => {
    const seconds = Math.round(timeSpent / 1000);
    return seconds < 60 ? `${seconds}ث` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg";
      case 2: return "bg-gradient-to-r from-gray-400 to-gray-500 shadow-md";
      case 3: return "bg-gradient-to-r from-orange-400 to-orange-500 shadow-md";
      default: return "bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4" />;
      case 2: return <Medal className="w-4 h-4" />;
      case 3: return <Award className="w-4 h-4" />;
      default: return <span className="text-xs font-bold">#{rank}</span>;
    }
  };

  const getRankChange = () => {
    if (!previousRank || previousRank === rank) return null;
    const change = previousRank - rank;
    return change > 0 ? { type: 'up', value: change } : { type: 'down', value: Math.abs(change) };
  };

  const rankChange = getRankChange();

  return (
    <div
      ref={itemRef}
      className={`
        transition-all duration-500 transform
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}
        ${isRankChanging ? 'scale-105' : 'scale-100'}
        ${isNew ? 'animate-pulse' : ''}
      `}
      style={{
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className={`
        relative p-4 rounded-2xl border-2 transition-all duration-300
        ${isCurrentUser ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-300 shadow-lg' : 'bg-white border-gray-200'}
        ${rank <= 3 ? 'shadow-md' : 'shadow-sm'}
        ${isRankChanging ? 'ring-2 ring-yellow-400' : ''}
        hover:shadow-lg hover:scale-102
      `}>
        {/* مؤشر تغيير الترتيب */}
        {rankChange && (
          <div className={`
            absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center
            ${rankChange.type === 'up' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
            }
            shadow-lg animate-bounce
          `}>
            {rankChange.type === 'up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        )}

        {/* شارة جديدة */}
        {isNew && (
          <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-lg animate-pulse">
            جديد
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* الرتبة واللاعب */}
          <div className="flex items-center gap-3 flex-1">
            {/* دائرة الرتبة مع أنيميشن */}
            <div className={`
              relative w-10 h-10 rounded-full ${getRankColor(rank)} 
              flex items-center justify-center text-white
              transition-all duration-500
              ${isRankChanging ? 'scale-110 rotate-360' : 'scale-100 rotate-0'}
            `}>
              {getRankIcon(rank)}
              
              {/* تأثير وميض للرتبة */}
              {isRankChanging && (
                <div className="absolute inset-0 rounded-full bg-white animate-ping opacity-20"></div>
              )}
            </div>
            
            {/* معلومات اللاعب */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* الصورة */}
              <div className={`
                relative w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center 
                overflow-hidden border-2 transition-all duration-300
                ${isCurrentUser ? 'border-blue-400 shadow-md' : 'border-gray-300'}
                ${isRankChanging ? 'scale-110' : 'scale-100'}
              `}>
                {player.userAvatar ? (
                  <img 
                    src={player.userAvatar} 
                    alt={player.userName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-gray-600" />
                )}
                
                {/* تأثير حول الصورة */}
                {isCurrentUser && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-pulse"></div>
                )}
              </div>
              
              {/* المعلومات */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-800 text-base truncate">
                    {player.userName}
                  </span>
                  {isCurrentUser && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 animate-pulse">
                      أنت
                    </span>
                  )}
                </div>
                
                {/* الإحصائيات */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm font-bold text-green-600">
                    <Target className="w-4 h-4" />
                    <span>{player.score}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{accuracy}%</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-purple-600">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(player.timeSpent)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* مؤشر التغيير */}
          {rankChange && (
            <div className={`
              flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-lg
              ${rankChange.type === 'up' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
              }
              animate-pulse
            `}>
              {rankChange.type === 'up' ? '↑' : '↓'}
              <span>{rankChange.value}</span>
            </div>
          )}
        </div>
        
        {/* شريط التقدم للأوائل */}
        {rank <= 3 && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2">
              {rank === 1 && <Flame className="w-5 h-5 text-orange-500 animate-bounce" />}
              <span className={`
                font-bold text-lg
                ${rank === 1 ? 'text-orange-600' : 
                  rank === 2 ? 'text-gray-600' : 
                  'text-orange-500'
                }
              `}>
                {rank === 1 ? '🏆 المتصدر' : 
                 rank === 2 ? '🥈 المركز الثاني' : 
                 '🥉 المركز الثالث'}
              </span>
              {rank === 1 && <Flame className="w-5 h-5 text-orange-500 animate-bounce" />}
            </div>
          </div>
        )}

        {/* تأثير خلفي متحرك */}
        <div className={`
          absolute inset-0 rounded-2xl -z-10 opacity-20
          ${isRankChanging ? 'bg-yellow-400 animate-pulse' : ''}
          ${isCurrentUser ? 'bg-blue-400' : ''}
        `}></div>
      </div>
    </div>
  );
});

// مكون العد التنازلي للتحديث
const RefreshIndicator = React.memo(({ lastUpdate }: { lastUpdate: number }) => {
  const [timeAgo, setTimeAgo] = useState("الآن");

  useEffect(() => {
    const updateTime = () => {
      const diff = Date.now() - lastUpdate;
      const seconds = Math.floor(diff / 1000);
      
      if (seconds < 5) setTimeAgo("الآن");
      else if (seconds < 60) setTimeAgo(`قبل ${seconds} ثانية`);
      else setTimeAgo(`قبل ${Math.floor(seconds / 60)} دقيقة`);
    };

    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
      <span className="text-sm font-medium">محدث {timeAgo}</span>
    </div>
  );
});

export default function Leaderboard({ quizId, user, onBack }: LeaderboardProps) {
  const leaderboardData = useQuery(api.attempts.getLeaderboard, { quizId }) || [];
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isUpdating, setIsUpdating] = useState(false);

  // تتبع التغييرات في الترتيب
  useEffect(() => {
    if (leaderboardData.length > 0) {
      const newRanks = new Map();
      leaderboardData.forEach((player, index) => {
        newRanks.set(player._id, index + 1);
      });

      // التحقق من وجود تغييرات
      let hasChanges = false;
      newRanks.forEach((newRank, playerId) => {
        const oldRank = previousRanks.get(playerId);
        if (oldRank && oldRank !== newRank) {
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setIsUpdating(true);
        setLastUpdate(Date.now());
        
        const timer = setTimeout(() => {
          setIsUpdating(false);
          setPreviousRanks(newRanks);
        }, 1000);

        return () => clearTimeout(timer);
      } else {
        setPreviousRanks(newRanks);
      }
    }
  }, [leaderboardData, previousRanks]);

  // ترتيب اللاعبين
  const sortedLeaderboard = useMemo(() => {
    return [...leaderboardData].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    });
  }, [leaderboardData]);

  const userRank = useMemo(() => 
    sortedLeaderboard.findIndex(entry => entry.userId === user._id) + 1, 
    [sortedLeaderboard, user._id]
  );

  const userEntry = useMemo(() => 
    sortedLeaderboard.find(entry => entry.userId === user._id),
    [sortedLeaderboard, user._id]
  );

  if (!leaderboardData || leaderboardData.length === 0) {
    return (
      <div className="min-h-screen p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative">
        <AnimatedStars />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="bg-white/95 rounded-3xl p-8 text-center border border-white/30 shadow-2xl">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">جاري تحميل النتائج</h3>
            <p className="text-gray-600">استعد لمشاهدة المنافسة!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <AnimatedStars />
      
      <div className="relative z-10 max-w-md mx-auto">
        {/* الهيدر مع مؤشر التحديث */}
        <div className="bg-white/95 rounded-3xl p-4 mb-4 border border-white/30 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="p-3 bg-blue-100 rounded-2xl text-blue-700 hover:bg-blue-200 transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500 animate-pulse" />
                <span>لوحة المتصدرين</span>
                <Trophy className="w-6 h-6 text-yellow-500 animate-pulse" />
              </h1>
              <p className="text-sm text-gray-600 mt-1">{quiz?.title}</p>
            </div>
          </div>

          {/* مؤشر التحديث */}
          <div className="flex items-center justify-between mb-4">
            <RefreshIndicator lastUpdate={lastUpdate} />
            
            {isUpdating && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">جاري التحديث...</span>
              </div>
            )}
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-center text-white shadow-lg">
              <div className="text-2xl font-bold">{sortedLeaderboard.length}</div>
              <div className="text-sm opacity-90">المشاركين</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-center text-white shadow-lg">
              <div className="text-2xl font-bold">{userRank}</div>
              <div className="text-sm opacity-90">ترتيبك</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-center text-white shadow-lg">
              <div className="text-2xl font-bold">{userEntry?.score || 0}</div>
              <div className="text-sm opacity-90">نقاطك</div>
            </div>
          </div>
        </div>

        {/* قائمة المتصدرين */}
        <div className="space-y-3">
          {sortedLeaderboard.map((player, index) => (
            <AnimatedPlayerItem
              key={player._id}
              player={player}
              rank={index + 1}
              previousRank={previousRanks.get(player._id)}
              isCurrentUser={player.userId === user._id}
              delay={index * 150}
              isNew={!previousRanks.has(player._id)}
            />
          ))}
        </div>

        {/* الفوتر */}
        <div className="text-center pt-8 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <div className="text-white/90 text-lg font-bold">كنيسة مارمينا والبابا كيرلس</div>
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
          </div>
          <div className="text-white/70 text-sm">"اَللهُ مَحَبَّةٌ" - يوحنا ٤:٨</div>
        </div>
      </div>
    </div>
  );
}