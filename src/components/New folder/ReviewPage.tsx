// src/components/ReviewPage.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ArrowLeft, BookOpen, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";

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

  // تحميل
  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>جاري تحميل بيانات المسابقة...</p>
        </div>
      </div>
    );
  }

  // التحقق من وضع المراجعة
  if (!quiz.reviewMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p>وضع المراجعة غير مفعل لهذه المسابقة</p>
          <button onClick={onBack} className="mt-4 bg-blue-600 px-4 py-2 rounded-lg">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  // لا توجد أسئلة
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl mb-4">لا توجد أسئلة في هذه المسابقة</p>
          <button onClick={onBack} className="bg-blue-600 px-4 py-2 rounded-lg">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      {/* الهيدر */}
      <div className="bg-blue-600/20 backdrop-blur-md border-b border-blue-500/20 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">وضع المراجعة</h1>
              <p className="text-blue-200 text-sm">{quiz.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 px-3 py-1 rounded-full text-sm">
              السؤال {currentQuestionIndex + 1} من {questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* محتوى المراجعة */}
      <div className="max-w-4xl mx-auto p-4">
        {currentQuestion && (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-6 border border-blue-500/20">
            {/* نص السؤال */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold">السؤال:</h2>
              </div>
              <p className="text-xl text-white/90 bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                {currentQuestion.question}
              </p>
            </div>

            {/* صورة السؤال إذا موجودة */}
            {currentQuestion.imageUrl && (
              <div className="mb-6 flex justify-center">
                <img 
                  src={currentQuestion.imageUrl} 
                  alt="صورة السؤال"
                  className="max-w-full max-h-64 rounded-lg border border-gray-600"
                />
              </div>
            )}

            {/* الخيارات */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                الخيارات:
              </h3>
              
              {currentQuestion.options.map((option, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    index === currentQuestion.correctAnswer
                      ? 'bg-green-500/20 border-green-400 text-green-100'
                      : 'bg-gray-700/50 border-gray-600 text-white/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === currentQuestion.correctAnswer
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-white/70'
                    }`}>
                      {String.fromCharCode(1632 + index + 1)}
                    </div>
                    <span className="text-lg">{option}</span>
                    
                    {index === currentQuestion.correctAnswer && (
                      <div className="mr-auto bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        الإجابة الصحيحة
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* أزرار التنقل */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-600">
              <button
                onClick={goToPrevQuestion}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  currentQuestionIndex > 0
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
                السابق
              </button>

              <div className="text-center">
                <div className="text-sm text-white/70 mb-1">التقدم</div>
                <div className="w-48 bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <button
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  currentQuestionIndex < questions.length - 1
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                التالي
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}