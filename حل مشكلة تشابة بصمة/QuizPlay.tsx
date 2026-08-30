import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface User {
  _id: string;
  name: string;
  deviceFingerprint: string;
}

interface QuizPlayProps {
  quizId: Id<"quizzes">;
  user: User;
  onComplete: () => void;
  onBack: () => void;
}

export default function QuizPlay({ quizId, user, onComplete, onBack }: QuizPlayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [attemptId, setAttemptId] = useState<Id<"attempts"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [userRank, setUserRank] = useState(0);
  const [previousRank, setPreviousRank] = useState(0);
  const [showRankAnimation, setShowRankAnimation] = useState(false);

  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questions = useQuery(api.questions.getQuizQuestions, 
    quiz ? { quizId: quiz._id, shuffle: quiz.shuffleQuestions } : "skip"
  ) || [];
  const userAttempts = useQuery(api.attempts.getUserAttempts, {
    quizId,
    userFingerprint: user.deviceFingerprint,
  }) || [];
  
  // جلب بيانات المتصدرين
  const leaderboard = useQuery(api.attempts.getLeaderboard, { quizId }) || [];

  const startAttempt = useMutation(api.attempts.startAttempt);
  const submitAnswer = useMutation(api.attempts.submitAnswer);

  // تحديث بيانات المتصدرين كل 3 ثوان
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(Date.now());
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // تحديث ترتيب المستخدم عند تغيير النقاط أو اللوحة
  useEffect(() => {
    if (leaderboard.length > 0) {
      const newRank = leaderboard.findIndex(entry => entry.userId === user._id) + 1;
      
      if (newRank > 0 && newRank !== userRank) {
        if (userRank > 0 && newRank < userRank) {
          // تحسن الترتيب - عرض رسالة نجاح
          setShowRankAnimation(true);
          setTimeout(() => setShowRankAnimation(false), 2000);
        }
        setPreviousRank(userRank);
        setUserRank(newRank);
      } else if (userRank === 0 && newRank > 0) {
        setUserRank(newRank);
      }
    }
  }, [leaderboard, score]);

  // البحث عن ترتيب المستخدم الحالي
  const top3Players = leaderboard.slice(0, 3);

  // Initialize attempt
  useEffect(() => {
    if (quiz && !attemptId) {
      startAttempt({
        quizId: quiz._id,
        userFingerprint: user.deviceFingerprint,
      }).then((id) => {
        setAttemptId(id);
      }).catch((error) => {
        toast.error(error.message);
        onBack();
      });
    }
  }, [quiz, attemptId]);

  // عد التنازلي عند بدء المسابقة
  useEffect(() => {
    if (attemptId && questions.length > 0 && countdown === null) {
      setCountdown(3);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev! - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownInterval);
    }
  }, [attemptId, questions.length]);

  // الانتقال التلقائي عند اختيار الإجابة
  useEffect(() => {
    if (selectedAnswer !== null && !isSubmitting) {
      const timer = setTimeout(() => {
        handleSubmitAnswer();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [selectedAnswer, isSubmitting]);

  // Timer - المؤقت الرئيسي
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (timeLeft > 0 && !isSubmitting && countdown === null) {
      timer = setTimeout(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            handleSubmitAnswer();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && !isSubmitting) {
      handleSubmitAnswer();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timeLeft, isSubmitting, countdown]);

  // Reset timer and shuffle options when question changes
  useEffect(() => {
    if (countdown === null) {
      setTimeLeft(10);
      setSelectedAnswer(null);
      setQuestionStartTime(Date.now());
      
      if (questions.length > 0 && currentQuestionIndex < questions.length) {
        const currentQuestion = questions[currentQuestionIndex];
        if (quiz?.shuffleAnswers) {
          const shuffled = [...currentQuestion.options].sort(() => Math.random() - 0.5);
          setShuffledOptions(shuffled);
        } else {
          setShuffledOptions(currentQuestion.options);
        }
      }
    }
  }, [currentQuestionIndex, questions, quiz, countdown]);

  // عرض عد التنازلي
  if (countdown !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-opacity-75 fixed inset-0 z-50">
        <div className="text-center">
          <div className="text-8xl font-bold text-white animate-pulse">
            {countdown}
          </div>
          <p className="text-xl text-white mt-4">استعد للمسابقة!</p>
        </div>
      </div>
    );
  }

  if (!quiz || !attemptId || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المسابقة...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Check if user has exceeded max attempts
  if (userAttempts.length >= quiz.maxAttempts) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">انتهت المحاولات</h2>
          <p className="text-gray-600 mb-6">
            لقد استنفدت عدد المحاولات المسموحة ({quiz.maxAttempts})
          </p>
          <button
            onClick={onBack}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const getOriginalIndex = (shuffledOption: string) => {
    return currentQuestion.options.indexOf(shuffledOption);
  };

  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const timeSpent = Date.now() - questionStartTime;
    const answer = selectedAnswer !== null ? selectedAnswer : -1;

    try {
      const result = await submitAnswer({
        attemptId,
        questionId: currentQuestion._id,
        selectedAnswer: answer,
        timeSpent,
      });

      if (result.isCorrect) {
        setCorrectAnswers(prev => prev + 1);
      }

      setScore(prev => prev + result.points);

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        // Quiz completed
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء إرسال الإجابة");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* رسالة تحسن الترتيب */}
      {showRankAnimation && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg shadow-lg flex items-center animate-bounce">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">تحسّن ترتيبك!</span>
          </div>
        </div>
      )}

      {/* الهيدر - للشاشات الصغيرة والكبيرة */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-center flex-1 mx-4">
              <h1 className="text-lg font-semibold text-gray-800 truncate">{quiz.title}</h1>
              <p className="text-xs text-gray-500">السؤال {currentQuestionIndex + 1} من {questions.length}</p>
            </div>
            
            <div className="text-right">
              <div className="text-xs text-gray-500">النقاط</div>
              <div className="text-lg font-bold text-indigo-600">{score}</div>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 container mx-auto p-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قسم الأسئلة - يأخذ 2/3 المساحة */}
          <div className="lg:col-span-2">
            {/* Timer and Progress */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full text-sm ${
                  timeLeft <= 3 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{timeLeft} ثانية</span>
                </div>
                
                <div className="text-sm text-gray-600">
                  {correctAnswers} إجابة صحيحة
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* السؤال */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 leading-tight">
                  {currentQuestion.question}
                </h2>
                
                {(currentQuestion as any).imageUrl && (
                  <div className="mb-4">
                    <img 
                      src={(currentQuestion as any).imageUrl} 
                      alt="Question" 
                      className="max-w-full h-auto max-h-52 mx-auto rounded-lg shadow"
                    />
                  </div>
                )}
              </div>
              
              {/* خيارات الإجابة */}
              <div className="grid grid-cols-1 gap-3">
                {shuffledOptions.map((option, index) => {
                  const originalIndex = getOriginalIndex(option);
                  const isSelected = selectedAnswer === originalIndex;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedAnswer(originalIndex)}
                      disabled={isSubmitting}
                      className={`p-4 rounded-xl border-2 transition-all text-right ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-md flex-1 text-right font-medium">{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* لوحة المتصدرين - للشاشات الكبيرة */}
          <div className="hidden lg:block">
            <LeaderboardSection 
              top3Players={top3Players} 
              user={user} 
              userRank={userRank} 
              previousRank={previousRank}
              score={score} 
              leaderboard={leaderboard} 
            />
          </div>
        </div>
      </div>

      {/* لوحة المتصدرين للجوال - في الأسفل */}
      <div className="lg:hidden bg-white border-t border-gray-200 shadow-inner">
        <div className="container mx-auto px-4 py-3">
          <MobileLeaderboard 
            top3Players={top3Players} 
            user={user} 
            userRank={userRank} 
            score={score} 
          />
        </div>
      </div>
    </div>
  );
}

// مكون المتصدرين للشاشات الكبيرة
function LeaderboardSection({ top3Players, user, userRank, previousRank, score, leaderboard }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">أفضل المتسابقين</h2>
        <div className="text-xs text-gray-500 flex items-center">
          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>تحديث حي</span>
        </div>
      </div>

      {top3Players.length > 0 ? (
        <div className="space-y-3">
          {top3Players.map((player: any, index: number) => {
            const isCurrentUser = player.userId === user._id;
            const rankIcons = ["🥇", "🥈", "🥉"];
            const rankColors = [
              "bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300",
              "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300",
              "bg-gradient-to-r from-amber-100 to-amber-200 border-amber-300"
            ];
            
            return (
              <div 
                key={player._id} 
                className={`p-3 rounded-lg border-2 transition-all ${rankColors[index]} ${
                  isCurrentUser ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className="text-xl">
                      {rankIcons[index]}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border shadow-sm">
                      {player.userAvatar ? (
                        <img 
                          src={player.userAvatar} 
                          alt={player.userName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-600 font-semibold text-sm">
                          {player.userName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="max-w-[120px]">
                      <h3 className="font-semibold text-sm text-gray-800 truncate">
                        {isCurrentUser ? 'أنت' : player.userName}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-800">
                      {player.score}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* عرض ترتيب المستخدم الحالي */}
          {userRank > 0 && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {userRank}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-indigo-800">ترتيبك</div>
                    <div className="text-xs text-indigo-600">
                      {userRank > 3 ? `متقدم على ${leaderboard.length - userRank} متسابق` : 'ممتاز!'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-indigo-800">{score}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <p className="text-sm">لا توجد نتائج بعد</p>
        </div>
      )}
    </div>
  );
}

// مكون المتصدرين للجوال
function MobileLeaderboard({ top3Players, user, userRank, score }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3 space-x-reverse">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
          {userRank > 0 ? userRank : '--'}
        </div>
        <div>
          <div className="text-xs text-gray-500">ترتيبك</div>
          <div className="text-sm font-semibold text-gray-800">{score} نقطة</div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 space-x-reverse">
        {top3Players.slice(0, 3).map((player: any, index: number) => (
          <div key={player._id} className="text-center">
            <div className="text-sm">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</div>
            <div className="text-xs font-semibold text-gray-700">{player.score}</div>
            <div className="text-xs text-gray-500 truncate max-w-[60px]">
              {player.userName === user.name ? 'أنت' : player.userName.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}