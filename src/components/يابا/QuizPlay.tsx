// QuizPlay.tsx - النسخة المحسنة للشاشات الصغيرة
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Clock, 
  Trophy, 
  Crown, 
  Medal, 
  Award, 
  X,
  Zap,
  Target,
  ChevronLeft,
  CheckSquare,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";

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

// مكون مبسط للقائدين
const SimpleLeaderboard = React.memo(({ top3Players, user, userRank, score, leaderboard }: any) => (
  <div className="bg-gray-800 bg-opacity-90 backdrop-blur-md rounded-lg shadow-lg p-2 border border-purple-500 border-opacity-20">
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xs font-bold text-white flex items-center gap-1">
        <Trophy className="w-3 h-3 text-yellow-400" />
        المتصدرين
      </h2>
    </div>

    <div className="space-y-1.5 mb-2">
      {top3Players.map((player: any, index: number) => {
        const isCurrentUser = player.userId === user._id;
        return (
          <div 
            key={player._id} 
            className={`p-1.5 rounded border ${
              isCurrentUser 
                ? 'border-purple-500 bg-purple-900 bg-opacity-40' 
                : index === 0 
                  ? 'border-yellow-400 bg-yellow-900 bg-opacity-30' 
                  : index === 1 
                    ? 'border-gray-400 bg-gray-800 bg-opacity-60' 
                    : 'border-amber-600 bg-amber-900 bg-opacity-30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="text-gray-200">
                  {index === 0 ? <Crown className="w-2.5 h-2.5 text-yellow-400" /> : 
                   index === 1 ? <Medal className="w-2.5 h-2.5 text-gray-300" /> : 
                   <Award className="w-2.5 h-2.5 text-amber-500" />}
                </div>
                <div className="max-w-[80px]">
                  <h3 className="font-semibold text-white truncate text-xs">
                    {player.userName || 'مستخدم مجهول'}
                  </h3>
                  {isCurrentUser && (
                    <span className="text-xs text-blue-300">(أنت)</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-yellow-400" />
                  {player.score}
                </div>
                {player.timeSpent && (
                  <div className="text-xs text-gray-400">
                    {(player.timeSpent / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {userRank > 0 && (
      <div className="bg-blue-900 bg-opacity-30 rounded p-1.5 border border-blue-500 border-opacity-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {userRank}
            </div>
            <span className="text-xs font-medium text-gray-300">ترتيبك</span>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-white flex items-center gap-1 justify-end">
              <Zap className="w-2.5 h-2.5 text-yellow-400" />
              {score}
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
));

export default function QuizPlay({ quizId, user, onComplete, onBack }: QuizPlayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [readingTimeLeft, setReadingTimeLeft] = useState(5);
  const [isReadingTime, setIsReadingTime] = useState(true);
  const [attemptId, setAttemptId] = useState<Id<"attempts"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<{text: string, originalIndex: number}[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Array<{questionId: string, selectedAnswer: number, timeSpent: number, points: number, isCorrect: boolean}>>([]);
  const [showResults, setShowResults] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timerActive, setTimerActive] = useState(true);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);

  // تحسين الاستعلامات
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questionsQuery = useQuery(api.questions.getQuizQuestions, 
    quiz ? { quizId: quiz._id, shuffle: quiz.shuffleQuestions } : "skip"
  );
  
  const questions = useMemo(() => questionsQuery || [], [questionsQuery]);
  
  // الحصول على الليدر بورد
  const leaderboardQuery = useQuery(api.attempts.getLeaderboard, { quizId });
  
  // ترتيب الليدر بورد
  const leaderboard = useMemo(() => {
    if (!leaderboardQuery) return [];
    return [...leaderboardQuery].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.timeSpent - b.timeSpent;
    });
  }, [leaderboardQuery]);

  const startAttempt = useMutation(api.attempts.startAttempt);
  const submitAnswer = useMutation(api.attempts.submitAnswer);
  const completeAttempt = useMutation(api.attempts.completeAttempt);

  // حساب الرتبة
  const { userRank, top3Players } = useMemo(() => {
    const userIndex = leaderboard.findIndex(entry => entry.userId === user._id);
    return {
      userRank: userIndex + 1,
      top3Players: leaderboard.slice(0, 3)
    };
  }, [leaderboard, user._id]);

  // حساب النقاط
  const calculatePoints = useCallback((timeRemaining: number) => {
    if (timeRemaining > 8) return 10;
    else if (timeRemaining > 6) return 8;
    else if (timeRemaining > 4) return 6;
    else if (timeRemaining > 2) return 4;
    else if (timeRemaining > 0) return 2;
    else return 0;
  }, []);

  // بدء المحاولة
  useEffect(() => {
    if (quiz && !attemptId && questions.length > 0) {
      startAttempt({
        quizId: quiz._id,
        userFingerprint: user.deviceFingerprint,
      }).then(attempt => {
        setAttemptId(attempt);
      }).catch(error => {
        toast.error(error.message);
        onBack();
      });
    }
  }, [quiz, attemptId, questions.length, user.deviceFingerprint, onBack]);

  // تهيئة السؤال الجديد
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        const options = currentQuestion.options.map((text, index) => ({ text, originalIndex: index }));
        setShuffledOptions(quiz?.shuffleAnswers ? [...options].sort(() => Math.random() - 0.5) : options);
        
        setIsReadingTime(true);
        setReadingTimeLeft(5);
        setTimeLeft(10);
        setHasAnswered(false);
        setTimerActive(true);
      }
    }
  }, [currentQuestionIndex, questions, quiz]);

  // وقت القراءة
  useEffect(() => {
    if (!isReadingTime || !attemptId || !timerActive) return;

    const timer = setTimeout(() => {
      setReadingTimeLeft(prev => {
        if (prev <= 1) {
          setIsReadingTime(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [readingTimeLeft, isReadingTime, attemptId, timerActive]);

  // المؤقت الرئيسي
  useEffect(() => {
    if (isReadingTime || timeLeft <= 0 || isSubmitting || !attemptId || !timerActive || hasAnswered) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeUp();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isReadingTime, isSubmitting, attemptId, timerActive, hasAnswered]);

  const handleTimeUp = useCallback(async () => {
    if (!attemptId || !questions[currentQuestionIndex] || hasAnswered) return;

    const currentQuestion = questions[currentQuestionIndex];
    const pointsEarned = 0;
    const timeSpent = 10000;
    
    setUserAnswers(prev => [...prev, {
      questionId: currentQuestion._id,
      selectedAnswer: -1,
      timeSpent: timeSpent,
      points: pointsEarned,
      isCorrect: false
    }]);

    setTotalTimeSpent(prev => prev + timeSpent);
    setHasAnswered(true);
    setTimerActive(false);
  }, [attemptId, currentQuestionIndex, questions, hasAnswered]);

  const handleSubmitAnswer = useCallback(async (selectedOption: number) => {
    if (isSubmitting || !attemptId || isReadingTime || hasAnswered) return;
    
    setIsSubmitting(true);
    setHasAnswered(true);
    setTimerActive(false);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      const timeSpent = 10000 - (timeLeft * 1000);
      const pointsEarned = calculatePoints(timeLeft);

      const result = await submitAnswer({
        attemptId: attemptId,
        questionId: currentQuestion._id,
        selectedAnswer: selectedOption,
        timeSpent: timeSpent,
      });

      setUserAnswers(prev => [...prev, {
        questionId: currentQuestion._id,
        selectedAnswer: selectedOption,
        timeSpent: timeSpent,
        points: result.isCorrect ? pointsEarned : 0,
        isCorrect: result.isCorrect
      }]);

      setTotalTimeSpent(prev => prev + timeSpent);

      if (result.isCorrect) {
        setScore(prev => prev + pointsEarned);
        setCorrectAnswers(prev => prev + 1);
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestionIndex, isSubmitting, questions, timeLeft, calculatePoints, isReadingTime, hasAnswered, submitAnswer]);

  const handleCompleteQuiz = useCallback(async () => {
    if (!attemptId) return;

    try {
      await completeAttempt({
        attemptId: attemptId,
        totalTimeSpent: totalTimeSpent,
      });
      
      setShowResults(true);
      
    } catch (error: any) {
      toast.error(error.message);
      onComplete();
    }
  }, [attemptId, onComplete, completeAttempt, totalTimeSpent]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleCompleteQuiz();
    }
  }, [currentQuestionIndex, questions.length, handleCompleteQuiz]);

  if (!quiz || !attemptId || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-blue-900 p-3">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          <p className="text-gray-200 text-xs">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentPoints = calculatePoints(timeLeft);
  const isMaxPoints = timeLeft > 8;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 p-1 pb-16">
      {/* الهيدر المحسن */}
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-2 mb-2 border border-purple-500 border-opacity-20">
        <div className="flex items-center justify-between mb-1">
          <button onClick={onBack} className="p-1 hover:bg-blue-900 rounded transition-colors active:scale-95">
            <ArrowLeft className="w-3.5 h-3.5 text-blue-300" />
          </button>
          
          <div className="text-center flex-1 mx-1">
            <h1 className="text-sm font-bold text-white truncate">{quiz.title}</h1>
            <p className="text-xs text-gray-300">سؤال {currentQuestionIndex + 1} من {questions.length}</p>
          </div>
          
          <button 
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="p-1 hover:bg-purple-900 rounded transition-colors relative active:scale-95"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            {userRank > 0 && userRank <= 3 && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">
                {userRank}
              </div>
            )}
          </button>
        </div>
        
        {/* شريط المعلومات */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <div className="text-xs text-gray-300">النقاط:</div>
            <div className="text-sm font-bold text-white flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-yellow-400" />
              {score}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="text-xs text-gray-300">الترتيب:</div>
            <div className="text-sm font-bold text-white">
              {userRank > 0 ? `#${userRank}` : '--'}
            </div>
          </div>
          
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
            isReadingTime ? 'bg-purple-900 text-purple-200' :
            !timerActive ? 'bg-gray-700 text-gray-300' :
            timeLeft <= 3 ? 'bg-red-900 text-red-200 animate-pulse' : 
            timeLeft <= 6 ? 'bg-orange-900 text-orange-200' : 'bg-green-900 text-green-200'
          }`}>
            <Clock className="w-2.5 h-2.5" />
            <span>{isReadingTime ? `${readingTimeLeft}s` : `${timeLeft}s`}</span>
            {!isReadingTime && !hasAnswered && (
              <button 
                onClick={() => setTimerActive(!timerActive)}
                className="ml-0.5 p-0.5 hover:bg-black hover:bg-opacity-20 rounded active:scale-95"
              >
                {timerActive ? <Pause className="w-1.5 h-1.5" /> : <Play className="w-1.5 h-1.5" />}
              </button>
            )}
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="w-full bg-gray-700 rounded-full h-1 mb-0.5">
          <div 
            className={`h-1 rounded-full transition-all duration-300 ${
              isReadingTime ? 'bg-purple-500' :
              !timerActive ? 'bg-gray-500' :
              timeLeft > 8 ? 'bg-green-500' : 
              timeLeft > 6 ? 'bg-green-400' :
              timeLeft > 4 ? 'bg-yellow-500' :
              timeLeft > 2 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${isReadingTime ? ((5 - readingTimeLeft) / 5) * 100 : (timeLeft / 10) * 100}%` }}
          ></div>
        </div>

        {/* حالة الوقت */}
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span>
            {isReadingTime ? (
              <span className="text-purple-300">⏳ وقت القراءة...</span>
            ) : hasAnswered ? (
              <span className="text-green-300">✓ تم الإجابة</span>
            ) : (
              <span>النقاط: <span className="font-bold text-yellow-400">{currentPoints}</span></span>
            )}
          </span>
          {isMaxPoints && !isReadingTime && !hasAnswered && <span className="text-green-400 text-xs">(أقصى نقاط)</span>}
        </div>
      </div>

      {/* السؤال */}
      <div className="bg-gray-800 bg-opacity-90 rounded-lg p-2 mb-2 border border-purple-500 border-opacity-20">
        {/* رسالة وقت القراءة */}
        {isReadingTime && (
          <div className="bg-purple-900 bg-opacity-40 rounded p-2 mb-2 text-center border border-purple-500">
            <div className="flex items-center justify-center gap-1 text-purple-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="font-bold text-sm">وقت القراءة</span>
              <span className="bg-purple-700 px-1.5 py-0.5 rounded-full text-xs">
                {readingTimeLeft} ثانية
              </span>
            </div>
            <p className="text-xs text-purple-300 mt-0.5">اقرأ السؤال جيداً قبل الإجابة</p>
          </div>
        )}

        <h2 className="text-sm font-bold text-white mb-2 text-center leading-relaxed line-clamp-4">
          {currentQuestion.question}
        </h2>
        
        {currentQuestion.imageUrl && (
          <div className="w-full flex justify-center mb-2">
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="max-w-full max-h-32 object-contain rounded bg-gray-700 p-0.5"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* الخيارات */}
        {!isReadingTime && (
          <div className="space-y-1.5 mb-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSubmitAnswer(option.originalIndex)}
                disabled={isSubmitting || hasAnswered}
                className={`w-full p-2 rounded border text-right transition-all duration-200 ${
                  hasAnswered 
                    ? 'border-gray-500 bg-gray-700 bg-opacity-50 text-gray-400 cursor-not-allowed'
                    : 'border-gray-600 bg-gray-700 bg-opacity-70 text-gray-100 hover:border-purple-400 active:scale-95 cursor-pointer'
                } ${isSubmitting ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-500 bg-gray-600 flex items-center justify-center flex-shrink-0"></div>
                  <span className="flex-1 text-xs font-medium text-right leading-tight">
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* زر التالي */}
        {hasAnswered && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <button
              onClick={handleNextQuestion}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold transition-colors flex items-center justify-center gap-1.5 text-sm active:scale-95"
            >
              {isLastQuestion ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  إنهاء المسابقة
                </>
              ) : (
                <>
                  التالي
                  <ChevronLeft className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* شريط التقدم المبسط */}
      <div className="bg-gray-800 bg-opacity-90 rounded p-2 text-center border border-purple-500 border-opacity-20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-300">التقدم</span>
          <span className="text-xs text-gray-300">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div 
            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* لوحة القائدين */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center p-2 z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-sm max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-2 border-b border-gray-700 rounded-t-lg">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold text-sm flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  المتصدرين
                </h3>
                <button onClick={() => setShowLeaderboard(false)} className="text-gray-400 hover:text-white p-0.5 active:scale-95">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2">
              <SimpleLeaderboard 
                top3Players={top3Players} 
                user={user} 
                userRank={userRank} 
                score={score} 
                leaderboard={leaderboard}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}