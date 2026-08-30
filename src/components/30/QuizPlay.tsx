// QuizPlay.tsx - الإصدار النهائي المحسّن للجوال
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Clock, 
  Trophy, 
  ArrowRight,
  Zap,
  Target,
  BookOpen
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

  // الاستعلامات
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questionsQuery = useQuery(api.questions.getQuizQuestions, 
    quiz ? { quizId: quiz._id, shuffle: quiz.shuffleQuestions } : "skip"
  );
  
  const questions = useMemo(() => questionsQuery || [], [questionsQuery]);

  const startAttempt = useMutation(api.attempts.startAttempt);
  const submitAnswer = useMutation(api.attempts.submitAnswer);

  // حساب النقاط بناء على الوقت
  const calculatePoints = useCallback((timeRemaining: number) => {
    if (timeRemaining > 13) return 10;    // من 20 إلى 14 ثانية
    else if (timeRemaining > 11) return 9; // 13-12 ثانية
    else if (timeRemaining > 9) return 8;  // 11-10 ثانية
    else if (timeRemaining > 7) return 7;  // 9-8 ثانية
    else if (timeRemaining > 5) return 6;  // 7-6 ثانية
    else return 5;                         // 5 ثواني أو أقل
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
          setShuffledOptions(quiz?.shuffleAnswers ? [...options].sort(() => Math.random() - 0.5) : options);
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
        setShuffledOptions(quiz?.shuffleAnswers ? [...options].sort(() => Math.random() - 0.5) : options);
        setTimeLeft(20);
        setShowOptions(false);
        setSelectedAnswer(null);
        setShowNextButton(false);
        setIsSubmitting(false);
      }
    }
  }, [currentQuestionIndex, questions, quiz]);

  // معالجة الإجابة
  const handleSubmitAnswer = useCallback(async (selectedOption: number) => {
    if (isSubmitting || !attemptId || !showOptions) return;
    
    setIsSubmitting(true);
    setSelectedAnswer(selectedOption);

    try {
      const timeSpent = 20000 - (timeLeft * 1000);
      const result = await submitAnswer({
        attemptId: attemptId,
        questionId: questions[currentQuestionIndex]._id,
        selectedAnswer: selectedOption,
        timeSpent: timeSpent,
      });

      const pointsEarned = calculatePoints(timeLeft);

      if (result.isCorrect) {
        setScore(prev => prev + pointsEarned);
      }

      setShowNextButton(true);
    } catch (error: any) {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestionIndex, isSubmitting, questions, timeLeft, submitAnswer, calculatePoints, showOptions]);

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
        
        // بعد 5 ثواني، عرض الإجابات
        if (newTime === 15 && !showOptions) {
          setShowOptions(true);
        }
        
        // عند انتهاء الوقت
        if (newTime <= 0) {
          setIsSubmitting(true);
          setShowNextButton(true);
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isSubmitting, attemptId, showOptions]);

  if (!quiz || !attemptId || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-sm">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentPoints = showOptions ? calculatePoints(timeLeft) : 0;
  const isReadingPhase = !showOptions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-3 pb-24">
      {/* الهيدر */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="text-center flex-1 mx-3">
            <h1 className="text-lg font-bold text-white truncate">{quiz.title}</h1>
            <p className="text-white/70 text-sm">سؤال {currentQuestionIndex + 1} من {questions.length}</p>
          </div>
          
          <div className="text-right">
            <div className="text-white font-bold text-lg flex items-center gap-1 justify-end">
              <Zap className="w-5 h-5 text-yellow-400" />
              {score}
            </div>
            <div className="text-white/70 text-xs">النقاط</div>
          </div>
        </div>

        {/* شريط التقدم والوقت */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2 ${
              isReadingPhase ? 'bg-blue-500/20 text-blue-200' :
              timeLeft <= 5 ? 'bg-red-500/20 text-red-200' : 
              timeLeft <= 13 ? 'bg-orange-500/20 text-orange-200' : 'bg-green-500/20 text-green-200'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{timeLeft} ثانية</span>
            </div>

            {showOptions && (
              <div className="text-white/70 text-sm flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-yellow-400">{currentPoints}</span>
                <span>نقطة</span>
              </div>
            )}
          </div>

          {/* شريط التقدم */}
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isReadingPhase ? 'bg-blue-400' :
                timeLeft > 13 ? 'bg-green-400' : 
                timeLeft > 5 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${(timeLeft / 20) * 100}%` }}
            />
          </div>

          {/* حالة القراءة */}
          {isReadingPhase && (
            <div className="text-center">
              <div className="bg-blue-500/20 text-blue-200 rounded-xl px-4 py-2 inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">اقرأ السؤال بعناية</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* السؤال */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20">
        <h2 className="text-lg font-bold text-white mb-4 text-center leading-relaxed">
          {currentQuestion.question}
        </h2>
        
        {currentQuestion.imageUrl && (
          <div className="w-full flex justify-center mb-4">
            <img 
              src={currentQuestion.imageUrl} 
              alt="Question" 
              className="max-w-full max-h-52 object-contain rounded-xl bg-white/5 p-2"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* الخيارات */}
        {showOptions && (
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isSubmitting && !selectedAnswer) {
                    handleSubmitAnswer(option.originalIndex);
                  }
                }}
                disabled={isSubmitting || selectedAnswer !== null}
                className={`w-full p-4 rounded-xl text-right transition-all duration-200 border-2 ${
                  selectedAnswer !== null
                    ? 'border-white/30 bg-white/5 text-white/50 cursor-not-allowed'
                    : 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/15 active:scale-95 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedAnswer !== null 
                      ? 'border-white/30' 
                      : 'border-white/40'
                  }`}>
                    {/* لا تظهر أي شيء داخل الدائرة */}
                  </div>
                  <span className="flex-1 text-base font-medium text-right leading-relaxed">
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* زر التالي */}
        {showNextButton && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleNextQuestion}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-3 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 active:scale-95 shadow-lg"
            >
              {currentQuestionIndex < questions.length - 1 ? 'السؤال التالي' : 'انهاء المسابقة'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 text-center border border-white/20">
          <div className="text-white font-bold text-lg">
            {currentQuestionIndex + 1}/{questions.length}
          </div>
          <div className="text-white/70 text-sm flex items-center justify-center gap-1">
            <Target className="w-4 h-4" />
            التقدم
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-3 text-center border border-white/20">
          <div className="text-white font-bold text-lg flex items-center justify-center gap-1">
            <Zap className="w-5 h-5 text-yellow-400" />
            {score}
          </div>
          <div className="text-white/70 text-sm">إجمالي النقاط</div>
        </div>
      </div>

      {/* تذييل */}
      <div className="text-center">
        <p className="text-white/50 text-sm">
          {isReadingPhase ? 'ستظهر الخيارات بعد انتهاء وقت القراءة' : 'اختر الإجابة الصحيحة'}
        </p>
      </div>
    </div>
  );
}