// QuizPlay.tsx - الإصدار المحسن مع ترتيب أنيق
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Clock, 
  Trophy,
  Zap,
  ArrowRight,
  Crown,
  Star,
  Target
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

  // استعلامات
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questions = useQuery(api.questions.getQuizQuestions, 
    quiz ? { quizId: quiz._id, shuffle: quiz.shuffleQuestions } : "skip"
  );
  const leaderboard = useQuery(api.attempts.getLeaderboard, { quizId });

  const startAttempt = useMutation(api.attempts.startAttempt);
  const submitAnswer = useMutation(api.attempts.submitAnswer);

  // حساب الترتيب
  const userRank = useMemo(() => {
    if (!leaderboard) return 0;
    return leaderboard.findIndex(entry => entry.userId === user._id) + 1;
  }, [leaderboard, user._id]);

  // نظام النقاط
  const calculatePoints = useCallback((timeRemaining: number) => {
    if (timeRemaining > 15) return 0;
    else if (timeRemaining > 13) return 10;
    else if (timeRemaining > 11) return 8;
    else if (timeRemaining > 9) return 6;
    else if (timeRemaining > 7) return 4;
    else if (timeRemaining > 5) return 2;
    else return 1;
  }, []);

  // بدء المحاولة
  useEffect(() => {
    if (quiz && !attemptId && questions && questions.length > 0) {
      startAttempt({
        quizId: quiz._id,
        userFingerprint: user.deviceFingerprint,
      }).then(attempt => {
        setAttemptId(attempt);
        
        const currentQuestion = questions[0];
        if (currentQuestion) {
          const options = currentQuestion.options.map((text, index) => ({ 
            text, 
            originalIndex: index 
          }));
          
          setShuffledOptions(
            quiz?.shuffleAnswers 
              ? [...options].sort(() => Math.random() - 0.5) 
              : options
          );
        }
      }).catch(() => {
        toast.error("فشل في بدء المسابقة");
        onBack();
      });
    }
  }, [quiz, attemptId, questions]);

  // تهيئة السؤال الجديد
  useEffect(() => {
    if (!questions || questions.length === 0 || currentQuestionIndex >= questions.length) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const options = currentQuestion.options.map((text, index) => ({ 
        text, 
        originalIndex: index 
      }));
      
      setShuffledOptions(
        quiz?.shuffleAnswers 
          ? [...options].sort(() => Math.random() - 0.5) 
          : options
      );
      
      setIsSubmitting(false);
      setShowOptions(false);
      setTimeLeft(20);
      setSelectedAnswer(null);
      setShowNextButton(false);
    }
  }, [currentQuestionIndex, questions, quiz]);

  // معالجة اختيار الإجابة
  const handleSelectAnswer = useCallback(async (selectedOption: number) => {
    if (isSubmitting || !attemptId || !showOptions || !questions) return;
    
    setIsSubmitting(true);
    setSelectedAnswer(selectedOption);

    try {
      const result = await submitAnswer({
        attemptId: attemptId,
        questionId: questions[currentQuestionIndex]._id,
        selectedAnswer: selectedOption,
        timeSpent: 20000 - (timeLeft * 1000),
      });

      const pointsEarned = calculatePoints(timeLeft);

      if (result.isCorrect) {
        setScore(prev => prev + pointsEarned);
      }

      setShowNextButton(true);

    } catch (err: any) {
      setIsSubmitting(false);
      setSelectedAnswer(null);
    }
  }, [attemptId, currentQuestionIndex, isSubmitting, questions, timeLeft, submitAnswer, calculatePoints, showOptions]);

  // الانتقال للسؤال التالي
  const handleNextQuestion = useCallback(() => {
    if (!questions) return;
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  }, [currentQuestionIndex, questions, onComplete]);

  // المؤقت
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitting || !attemptId || !questions) return;

    const timer = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsSubmitting(true);
          setShowNextButton(true);
          return 20;
        }
        
        const newTime = prev - 1;
        if (newTime === 15 && !showOptions) {
          setShowOptions(true);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitting, attemptId, currentQuestionIndex, questions, showOptions]);

  // شاشة التحميل
  if (!quiz || !attemptId || !questions || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-200">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isReadingPhase = timeLeft > 15;
  const canAnswer = showOptions && !isSubmitting && !showNextButton;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // تنسيق الترتيب
  const getRankDisplay = () => {
    if (userRank === 0) return null;
    
    if (userRank === 1) {
      return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-3 py-1 rounded-full">
          <Crown className="w-4 h-4" />
          <span className="font-bold">الأول</span>
        </div>
      );
    } else if (userRank === 2) {
      return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-gray-400 to-gray-600 text-white px-3 py-1 rounded-full">
          <Star className="w-4 h-4" />
          <span className="font-bold">الثاني</span>
        </div>
      );
    } else if (userRank === 3) {
      return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3 py-1 rounded-full">
          <Star className="w-4 h-4" />
          <span className="font-bold">الثالث</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full">
          <Target className="w-4 h-4" />
          <span className="font-bold">#{userRank}</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 pb-6">
      {/* الهيدر المحسن */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4 border border-gray-700">
        {/* الصف الأول: العنوان والترتيب */}
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={onBack}
            className="p-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-base font-bold text-white truncate">
              {quiz.title}
            </h1>
          </div>
          
          {/* الترتيب في مكان النقاط السابق */}
          {userRank > 0 && getRankDisplay()}
        </div>

        {/* الصف الثاني: النقاط والوقت والتقدم */}
        <div className="flex items-center justify-between gap-2">
          {/* النقاط */}
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg flex-1 justify-center">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-white font-bold text-sm">{score}</span>
            <span className="text-gray-400 text-xs">النقاط</span>
          </div>

          {/* الوقت */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 justify-center ${
            isReadingPhase ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="font-bold text-sm">{timeLeft}s</span>
          </div>

          {/* التقدم - بشكل أفضل */}
          <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg flex-1 justify-center">
            <span className="text-white font-bold text-sm">
              {currentQuestionIndex + 1}
            </span>
            <span className="text-gray-400 text-xs">من {questions.length}</span>
          </div>
        </div>

        {/* شريط التقدم الزمني */}
        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-3">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${
              isReadingPhase ? 'bg-blue-500' : 'bg-red-500'
            }`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* السؤال */}
      <div className="bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-700">
        <h2 className="text-xl font-bold text-white text-center mb-6 leading-relaxed">
          {currentQuestion.question}
        </h2>
        
        {currentQuestion.imageUrl && (
          <div className="w-full flex justify-center mb-6">
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="max-w-full max-h-56 object-contain rounded-xl bg-gray-700 p-3"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* مرحلة القراءة */}
        {isReadingPhase && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-xl text-center mb-4">
            <p className="font-medium">مرحلة القراءة</p>
            <p className="text-sm mt-1">الخيارات تظهر بعد {timeLeft - 15} ثانية</p>
          </div>
        )}
        
        {/* الخيارات */}
        {showOptions && (
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswer === option.originalIndex;
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              
              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(option.originalIndex)}
                  disabled={!canAnswer}
                  className={`w-full p-4 rounded-xl text-right transition-all duration-200 border-2 ${
                    !canAnswer 
                      ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed' 
                      : isSelected
                        ? 'bg-blue-500/20 border-blue-500 text-white scale-105'
                        : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500 active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-bold ${
                      isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {letter}
                    </div>
                    <span className="flex-1 text-right text-base leading-relaxed">
                      {option.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* زر الانتقال */}
        {showNextButton && (
          <div className="mt-6 animate-fade-in">
            <button
              onClick={handleNextQuestion}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
            >
              <span>{isLastQuestion ? 'إنهاء المسابقة' : 'السؤال التالي'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* شريط التقدم السفلي - مبسط */}
      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">تقدم المسابقة</span>
          <span className="text-white font-bold text-sm">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}