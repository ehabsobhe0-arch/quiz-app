// src/components/ReviewPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { 
  ArrowLeft, 
  BookOpen, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  Home,
  Award,
  Lightbulb,
  Target
} from "lucide-react";

interface ReviewPageProps {
  user: any;
  quizId: Id<"quizzes">;
  onBack: () => void;
}

export default function ReviewPage({ user, quizId, onBack }: ReviewPageProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // جلب بيانات المسابقة والأسئلة من Convex
  const quiz = useQuery(api.quizzes.getActiveQuiz);
  const questions = useQuery(api.questions.getQuizQuestions, 
    quizId ? { quizId } : "skip"
  ) || [];

  // التحقق من تفعيل وضع المراجعة
  useEffect(() => {
    if (quiz && !quiz.reviewMode) {
      alert("وضع المراجعة غير مفعل لهذه المسابقة");
      onBack();
    }
  }, [quiz, onBack]);

  const currentQuestion = questions[currentQuestionIndex];

  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // تحميل
  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">جاري تحميل بيانات المسابقة...</p>
        </div>
      </div>
    );
  }

  // التحقق من وضع المراجعة
  if (!quiz.reviewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center text-white max-w-sm">
          <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">وضع المراجعة غير مفعل</h2>
          <p className="text-white/70 mb-6">يجب تفعيل وضع المراجعة من قبل المشرف</p>
          <button 
            onClick={onBack}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // لا توجد أسئلة
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center p-4">
        <div className="text-center text-white max-w-sm">
          <BookOpen className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">لا توجد أسئلة</h2>
          <p className="text-white/70 mb-6">لم يتم إضافة أسئلة لهذه المسابقة بعد</p>
          <button 
            onClick={onBack}
            className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
          >
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 text-white safe-area">
      {/* الهيدر المحسّن للهواتف */}
      <div className="bg-blue-600/20 backdrop-blur-lg border-b border-blue-500/30 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onBack}
              className="p-2 hover:bg-blue-500/20 rounded-xl transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">وضع المراجعة</h1>
              <p className="text-blue-200 text-sm truncate">{quiz.title}</p>
            </div>
          </div>
          
          <div className="bg-blue-500/30 px-3 py-1.5 rounded-full text-sm whitespace-nowrap">
            {currentQuestionIndex + 1}/{questions.length}
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>بداية المراجعة</span>
            <span>نهاية المراجعة</span>
          </div>
          <div className="w-full bg-blue-900/30 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* محتوى المراجعة - محسّن للهواتف */}
      <div className="p-4 pb-24">
        {currentQuestion && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            {/* مؤشر السؤال */}
            <div className="flex items-center justify-between mb-4 p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">السؤال الحالي</span>
              </div>
              <div className="text-sm text-white/70">
                {currentQuestionIndex + 1} من {questions.length}
              </div>
            </div>

            {/* نص السؤال */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <h2 className="text-base font-semibold">السؤال:</h2>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-lg leading-relaxed text-white/90">
                  {currentQuestion.question}
                </p>
              </div>
            </div>

            {/* صورة السؤال إذا موجودة */}
            {currentQuestion.imageUrl && (
              <div className="mb-4 flex justify-center">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="صورة السؤال"
                  className="max-w-full max-h-48 rounded-xl border border-white/10 shadow-lg"
                  loading="lazy"
                />
              </div>
            )}

            {/* الخيارات */}
            <div className="space-y-2">
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                الخيارات:
              </h3>
              
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                    index === currentQuestion.correctAnswer
                      ? 'bg-green-500/20 border-green-400 shadow-lg shadow-green-500/20'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      index === currentQuestion.correctAnswer
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-white/10 text-white/70'
                    }`}>
                      {String.fromCharCode(1632 + index + 1)}
                    </div>
                    <span className={`text-base flex-1 ${
                      index === currentQuestion.correctAnswer ? 'text-green-100 font-medium' : 'text-white/80'
                    }`}>
                      {option}
                    </span>
                    
                    {index === currentQuestion.correctAnswer && (
                      <div className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1 flex-shrink-0 mr-auto">
                        <CheckCircle className="w-3 h-3" />
                        صحيح
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ملاحظات إضافية */}
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-xl">
              <div className="flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-200">
                  في وضع المراجعة، يمكنك استعراض جميع الأسئلة والإجابات الصحيحة
                </p>
              </div>
            </div>
          </div>
        )}

        {/* شبكة التنقل السريع بين الأسئلة */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-white/70 mb-2 text-center">الانتقال السريع</h3>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToQuestion(index)}
                className={`aspect-square rounded-lg text-sm font-medium transition-all duration-200 ${
                  index === currentQuestionIndex
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* أزرار التنقل الثابتة في الأسفل - محسّنة للهواتف */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 p-4 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <button
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
              currentQuestionIndex > 0
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                : 'bg-gray-600 cursor-not-allowed opacity-50 text-white/50'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
            <span className="hidden xs:inline">السابق</span>
          </button>

          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold bg-gray-600 hover:bg-gray-700 text-white transition-all duration-200 active:scale-95"
          >
            <Home className="w-5 h-5" />
            <span className="hidden xs:inline">رئيسية</span>
          </button>

          <button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`flex items-center justify-center gap-2 flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
              currentQuestionIndex < questions.length - 1
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                : 'bg-gray-600 cursor-not-allowed opacity-50 text-white/50'
            }`}
          >
            <span className="hidden xs:inline">التالي</span>
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* مؤشر التقدم المصغر */}
        <div className="mt-2 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs text-white/60 mb-1">
            <span>التقدم</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-green-400 to-blue-400 h-1 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* CSS للتعامل مع مساحة الآمن في الهواتف */}
      <style jsx>{`
        .safe-area {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        .safe-area-bottom {
          padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        }
        
        @media (max-width: 360px) {
          .grid-cols-5 {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        
        @media (min-width: 475px) {
          .xs\\:inline {
            display: inline !important;
          }
        }
      `}</style>
    </div>
  );
}