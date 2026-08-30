// QuizPlay.tsx - الإصدار المحسن للشاشات الصغيرة مع خلط أسئلة محسن
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Clock, 
  ArrowRight,
  Zap,
  BookOpen,
  Crown,
  Sparkles
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

// دالة محسنة لخلط الأسئلة باستخدام Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function QuizPlay({ quizId, user, onComplete, onBack }: QuizPlayProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [attemptId, setAttemptId] = useState<Id<"attempts"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<{text: string, originalIndex: number}[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showNextButton, setShowNextButton] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);

  // الاستعلامات
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questionsQuery = useQuery(api.questions.getQuizQuestions, 
    quiz ? { quizId: quiz._id, shuffle: false } : "skip" // لا نخلط هنا بل نخلط يدوياً
  );
  
  // خلط الأسئلة مرة واحدة عند التحميل
  const questions = useMemo(() => {
    if (!questionsQuery) return [];
    
    if (quiz?.shuffleQuestions) {
      // استخدام نسخة محلية للأسئلة المخلوطة مع تجنب التكرار
      if (shuffledQuestions.length === 0) {
        const newShuffled = shuffleArray(questionsQuery);
        setShuffledQuestions(newShuffled);
        return newShuffled;
      }
      return shuffledQuestions;
    }
    
    return questionsQuery;
  }, [questionsQuery, quiz?.shuffleQuestions, shuffledQuestions]);

  const leaderboardQuery = useQuery(api.attempts.getLeaderboard, { quizId });
  const leaderboard = useMemo(() => leaderboardQuery || [], [leaderboardQuery]);

  const startAttempt = useMutation(api.attempts.startAttempt);
  const submitAnswer = useMutation(api.attempts.submitAnswer);

  // حساب الرتبة الحالية
  const userRank = useMemo(() => 
    leaderboard.findIndex(entry => entry.userId === user._id) + 1, 
    [leaderboard, user._id]
  );

  // حساب النقاط بناء على الوقت
  const calculatePoints = useCallback((timeRemaining: number, isTimeExpired: boolean = false) => {
    if (isTimeExpired) return 5; // 5 نقاط بعد انتهاء الوقت
    if (timeRemaining > 13) return 10;
    else if (timeRemaining > 11) return 9;
    else if (timeRemaining > 9) return 8;
    else if (timeRemaining > 7) return 7;
    else if (timeRemaining > 5) return 6;
    else return 5;
  }, []);

  // بدء المحاولة
  useEffect(() => {
    if (quiz && !attemptId && questions.length > 0) {
      startAttempt({
        quizId: quiz._id,
        userFingerprint: user.deviceFingerprint,
      }).then(attempt => {
        setAttemptId(attempt);
        const currentQuestion = questions[0];
        if (currentQuestion) {
          const options = currentQuestion.options.map((text, index) => ({ text, originalIndex: index }));
          setShuffledOptions(quiz?.shuffleAnswers ? shuffleArray(options) : options);
        }
      }).catch(error => {
        toast.error(error.message);
        onBack();
      });
    }
  }, [quiz, attemptId, questions.length]);

  // تهيئة السؤال الجديد
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion) {
        const options = currentQuestion.options.map((text, index) => ({ text, originalIndex: index }));
        setShuffledOptions(quiz?.shuffleAnswers ? shuffleArray(options) : options);
        setTimeLeft(20);
        setShowOptions(false);
        setSelectedAnswer(null);
        setShowNextButton(false);
        setIsSubmitting(false);
        setTimeExpired(false);
      }
    }
  }, [currentQuestionIndex, questions, quiz]);

  // معالجة الإجابة
  const handleSubmitAnswer = useCallback(async (selectedOption: number) => {
    if (isSubmitting || !attemptId || !showOptions) return;
    
    setIsSubmitting(true);
    setSelectedAnswer(selectedOption);

    try {
      const timeSpent = timeExpired ? 20000 : (20000 - (timeLeft * 1000));
      const result = await submitAnswer({
        attemptId: attemptId,
        questionId: questions[currentQuestionIndex]._id,
        selectedAnswer: selectedOption,
        timeSpent: timeSpent,
      });

      const pointsEarned = calculatePoints(timeLeft, timeExpired);

      if (result.isCorrect) {
        setScore(prev => prev + pointsEarned);
      }

      setShowNextButton(true);
    } catch (error: any) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestionIndex, isSubmitting, questions, timeLeft, submitAnswer, calculatePoints, showOptions, timeExpired]);

  // الانتقال للسؤال التالي
  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentQuestionIndex, questions.length, onComplete]);

  // المؤقت الرئيسي
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitting || !attemptId) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        if (newTime === 15 && !showOptions) {
          setShowOptions(true);
        }
        
        if (newTime <= 0) {
          setTimeExpired(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitting, attemptId, showOptions]);

  if (!quiz || !attemptId || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-3"></div>
          <p className="text-white text-sm">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentPoints = showOptions ? calculatePoints(timeLeft, timeExpired) : 0;
  const isReadingPhase = !showOptions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-cyan-900 p-2 sm:p-3">
      {/* الهيدر المبهر - محسن للشاشات الصغيرة */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 mb-2 sm:mb-3 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={onBack}
            className="p-1.5 sm:p-2 bg-white/20 rounded-xl sm:rounded-2xl hover:bg-white/30 transition-all active:scale-95"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </button>
          
          <div className="text-center flex-1 mx-2">
            <h1 className="text-sm sm:text-base font-bold text-white truncate px-2">{quiz.title}</h1>
            <p className="text-white/70 text-xs">سؤال {currentQuestionIndex + 1} من {questions.length}</p>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="text-right">
              <div className="text-white font-bold text-xs sm:text-sm flex items-center gap-1">
                <Zap className="w-3 h-3 text-yellow-400" />
                {score}
              </div>
              <div className="text-white/70 text-xs hidden sm:block">النقاط</div>
            </div>
          </div>
        </div>

        {/* الوقت والرتبة في سطر واحد */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${
              isReadingPhase ? 'bg-cyan-500/30' :
              timeExpired ? 'bg-gray-500/30' :
              timeLeft > 13 ? 'bg-green-500/30' : 
              timeLeft > 5 ? 'bg-yellow-500/30' : 'bg-red-500/30'
            }`}>
              <Clock className={`w-3 h-3 ${
                isReadingPhase ? 'text-cyan-300' :
                timeExpired ? 'text-gray-300' :
                timeLeft > 13 ? 'text-green-300' : 
                timeLeft > 5 ? 'text-yellow-300' : 'text-red-300'
              }`} />
            </div>
            <div>
              <div className={`text-xs sm:text-sm font-bold ${
                timeExpired ? 'text-gray-300' : 'text-white'
              }`}>
                {timeExpired ? 'انتهى الوقت' : `${timeLeft}ث`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-white text-xs sm:text-sm font-bold">#{userRank}</div>
            </div>
            <div className="p-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
              {userRank === 1 ? (
                <Crown className="w-3 h-3 text-white" />
              ) : (
                <Sparkles className="w-3 h-3 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* شريط الوقت */}
        <div className="mt-2">
          <div className="w-full bg-white/20 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                isReadingPhase ? 'bg-cyan-400' :
                timeExpired ? 'bg-gray-400' :
                timeLeft > 13 ? 'bg-green-400' : 
                timeLeft > 5 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: timeExpired ? '100%' : `${(timeLeft / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* السؤال - محسن للشاشات الصغيرة */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3 sm:p-4 mb-2 sm:mb-3 border border-white/20 shadow-2xl">
        <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 text-center leading-relaxed break-words">
          {currentQuestion.question}
        </h2>
        
        {currentQuestion.imageUrl && (
          <div className="w-full flex justify-center mb-3 sm:mb-4">
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="max-w-full max-h-24 sm:max-h-32 object-contain rounded-xl sm:rounded-2xl bg-white/5 p-2 border border-white/10"
              loading="lazy"
            />
          </div>
        )}

        {/* حالة القراءة */}
        {isReadingPhase && (
          <div className="text-center py-3 sm:py-4">
            <div className="bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-100 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 inline-flex items-center gap-2 border border-cyan-400/30">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">اقرأ السؤال بعناية</span>
            </div>
          </div>
        )}
        
        {/* الخيارات - محسنة للشاشات الصغيرة */}
        {showOptions && (
          <div className="space-y-2">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isSubmitting && !selectedAnswer) {
                    handleSubmitAnswer(option.originalIndex);
                  }
                }}
                disabled={isSubmitting || selectedAnswer !== null}
                className={`w-full p-2 sm:p-3 rounded-xl sm:rounded-2xl text-right transition-all duration-200 border ${
                  selectedAnswer !== null
                    ? 'border-white/20 bg-white/5 text-white/50 cursor-not-allowed'
                    : 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/30 active:scale-95 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border flex items-center justify-center ${
                    selectedAnswer !== null ? 'border-white/30' : 'border-white/40'
                  }`} />
                  <span className="flex-1 text-xs sm:text-sm text-right leading-relaxed break-words">
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* النقاط المتاحة */}
        {showOptions && !selectedAnswer && (
          <div className="mt-2 sm:mt-3 text-center">
            <div className={`rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 inline-flex items-center gap-1 border ${
              timeExpired 
                ? 'bg-gray-500/30 text-gray-200 border-gray-400/30' 
                : 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-100 border-yellow-400/30'
            }`}>
              <Zap className="w-3 h-3" />
              <span className="text-xs">
                {timeExpired ? '5 نقاط فقط' : `نقاط: ${currentPoints}`}
              </span>
            </div>
          </div>
        )}

        {/* زر التالي */}
        {showNextButton && (
          <div className="mt-3 sm:mt-4 flex justify-center">
            <button
              onClick={handleNextQuestion}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 active:scale-95 shadow-lg"
            >
              {currentQuestionIndex < questions.length - 1 ? 'التالي' : 'إنهاء'}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* البطاقة السفلية - محسنة للشاشات الصغيرة */}
      <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2 sm:p-3 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-white font-bold text-base sm:text-lg">{currentQuestionIndex + 1}</div>
            <div className="text-white/70 text-xs">الحالي</div>
          </div>
          
          <div className="text-center flex-1 border-x border-white/20">
            <div className="text-white font-bold text-base sm:text-lg">{questions.length}</div>
            <div className="text-white/70 text-xs">الإجمالي</div>
          </div>
          
          <div className="text-center flex-1">
            <div className="text-white font-bold text-base sm:text-lg">
              {Math.round(((currentQuestionIndex) / questions.length) * 100)}%
            </div>
            <div className="text-white/70 text-xs">مكتمل</div>
          </div>
        </div>
      </div>
    </div>
  );
}