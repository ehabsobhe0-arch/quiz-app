// QuizManager.tsx - النسخة النهائية مع شاشة البروجكتور المدمجة كاملة الشاشة
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { 
  Plus, 
  Play, 
  Square, 
  Trash2, 
  Edit, 
  ArrowLeft, 
  X, 
  CheckSquare, 
  Image, 
  BookOpen,
  RotateCcw,
  Users,
  BarChart3,
  RefreshCw,
  Settings,
  Loader2,
  Eye,
  Download,
  Save,
  Projector,
  Trophy,
  Award,
  Star,
  Crown,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Home,
  Maximize2,
  Minimize2,
  Monitor
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  deviceFingerprint: string;
  isAdmin: boolean;
  isModerator: boolean;
}

interface QuizManagerProps {
  user: User;
}

export default function QuizManager({ user }: QuizManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Id<"quizzes"> | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showResetAttempts, setShowResetAttempts] = useState(false);
  const [showQuizSettings, setShowQuizSettings] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<string>("");
  const [newMaxAttempts, setNewMaxAttempts] = useState(3);
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>({});
  const [editingQuestion, setEditingQuestion] = useState<Id<"questions"> | null>(null);
  const [editingQuiz, setEditingQuiz] = useState(false);

  // حالة شاشة البروجكتور
  const [showProjector, setShowProjector] = useState(false);
  const [currentView, setCurrentView] = useState<"leaderboard" | "question">("leaderboard");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const quizzes = useQuery(api.quizzes.getAllQuizzes) || [];
  const questions = useQuery(api.questions.getQuizQuestions, 
    selectedQuiz ? { quizId: selectedQuiz } : "skip"
  ) || [];
  const quizAttempts = useQuery(api.attempts.getQuizAttempts, 
    selectedQuiz ? { quizId: selectedQuiz } : "skip"
  ) || [];
  const allUsers = useQuery(api.users.getAllUsers) || [];

  const createQuiz = useMutation(api.quizzes.createQuiz);
  const updateQuiz = useMutation(api.quizzes.updateQuiz);
  const startQuiz = useMutation(api.quizzes.startQuiz);
  const stopQuiz = useMutation(api.quizzes.stopQuiz);
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz);
  const addQuestion = useMutation(api.questions.addQuestion);
  const updateQuestion = useMutation(api.questions.updateQuestion);
  const deleteQuestion = useMutation(api.questions.deleteQuestion);
  const resetUserAttempts = useMutation(api.attempts.resetUserAttempts);
  const resetAllAttempts = useMutation(api.attempts.resetAllAttempts);
  const updateQuizMaxAttempts = useMutation(api.attempts.updateQuizMaxAttempts);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleAnswers: true,
    image: null as File | null,
  });

  const [questionData, setQuestionData] = useState({
    question: "",
    type: "multiple_choice" as "multiple_choice" | "true_false",
    options: ["", "", "", ""],
    correctAnswer: 0,
    image: null as File | null,
  });

  // دالة للشاشة الكاملة
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
      }).catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        toast.error("تعذر تفعيل وضع الشاشة الكاملة");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
      });
    }
  }, []);

  // الاستماع لتغييرات وضع الشاشة الكاملة
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // تنظيف الذاكرة عند فك التركيب
  useEffect(() => {
    return () => {
      if (questionData.image) {
        URL.revokeObjectURL(URL.createObjectURL(questionData.image));
      }
    };
  }, [questionData.image]);

  // إحصائيات محسوبة
  const uniqueUsers = useMemo(() => 
    Array.from(new Set(quizAttempts.map(attempt => attempt.userId))), 
    [quizAttempts]
  );

  const quizStats = useMemo(() => ({
    totalQuestions: questions.length,
    totalAttempts: quizAttempts.length,
    uniqueParticipants: uniqueUsers.length,
    maxAttempts: selectedQuiz ? quizzes.find(q => q._id === selectedQuiz)?.maxAttempts || 3 : 3
  }), [questions.length, quizAttempts.length, uniqueUsers.length, selectedQuiz, quizzes]);

  // حساب المتصدرين لشاشة البروجكتور
  const leaderboard = useMemo(() => {
    const userScores: Record<string, { score: number; attempts: number; bestScore: number }> = {};

    quizAttempts.forEach(attempt => {
      if (!userScores[attempt.userId]) {
        userScores[attempt.userId] = { score: 0, attempts: 0, bestScore: 0 };
      }
      
      userScores[attempt.userId].score += attempt.score;
      userScores[attempt.userId].attempts += 1;
      userScores[attempt.userId].bestScore = Math.max(
        userScores[attempt.userId].bestScore, 
        attempt.score
      );
    });

    return Object.entries(userScores)
      .map(([userId, scores]) => {
        const user = allUsers.find(u => u._id === userId);
        return {
          userId,
          name: user?.name || "مستخدم مجهول",
          totalScore: scores.score,
          attempts: scores.attempts,
          bestScore: scores.bestScore,
          averageScore: scores.score / scores.attempts
        };
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);
  }, [quizAttempts, allUsers]);

  // إدارة حالة التحميل
  const setActionLoading = useCallback((actionId: string, loading: boolean) => {
    setLoadingActions(prev => ({ ...prev, [actionId]: loading }));
  }, []);

  // دالة مساعدة للتعامل مع الأفعال
  const handleAction = useCallback(async (
    action: () => Promise<void>,
    actionId: string,
    successMessage?: string
  ) => {
    setActionLoading(actionId, true);
    try {
      await action();
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ");
    } finally {
      setActionLoading(actionId, false);
    }
  }, [setActionLoading]);

  // تهيئة بيانات التعديل عند اختيار مسابقة
  useEffect(() => {
    if (selectedQuiz && editingQuiz) {
      const quiz = quizzes.find(q => q._id === selectedQuiz);
      if (quiz) {
        setFormData({
          title: quiz.title,
          description: quiz.description || "",
          maxAttempts: quiz.maxAttempts,
          shuffleQuestions: quiz.shuffleQuestions,
          shuffleAnswers: quiz.shuffleAnswers,
          image: null,
        });
      }
    }
  }, [selectedQuiz, editingQuiz, quizzes]);

  // تهيئة بيانات تعديل السؤال
  const startEditingQuestion = useCallback((questionId: Id<"questions">) => {
    const question = questions.find(q => q._id === questionId);
    if (question) {
      setEditingQuestion(questionId);
      setQuestionData({
        question: question.question,
        type: question.type,
        options: [...question.options],
        correctAnswer: question.correctAnswer,
        image: null,
      });
      setShowQuestionForm(true);
    }
  }, [questions]);

  // إلغاء التعديل
  const cancelEditing = useCallback(() => {
    setEditingQuestion(null);
    setEditingQuiz(false);
    setQuestionData({
      question: "",
      type: "multiple_choice",
      options: ["", "", "", ""],
      correctAnswer: 0,
      image: null,
    });
    setShowQuestionForm(false);
  }, []);

  // دوال شاشة البروجكتور
  const toggleProjectorView = useCallback(() => {
    setCurrentView(prev => prev === "leaderboard" ? "question" : "leaderboard");
  }, []);

  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPrevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowAnswer(false);
    }
  }, [currentQuestionIndex]);

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
  }, []);

  const openProjector = useCallback(() => {
    setShowProjector(true);
    setCurrentView("leaderboard");
    setCurrentQuestionIndex(0);
    setShowAnswer(false);
    
    // محاولة فتح الشاشة كاملة تلقائياً
    setTimeout(() => {
      if (!document.fullscreenElement) {
        toggleFullScreen();
      }
    }, 500);
    
    toast.success("✨ تم فتح شاشة البروجكتور في وضع العرض");
  }, [toggleFullScreen]);

  const closeProjector = useCallback(() => {
    // الخروج من الشاشة الكاملة إذا كانت مفعلة
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setShowProjector(false);
    setIsFullScreen(false);
  }, []);

  // دالة تجديد محاولات المستخدم
  const handleResetUserAttempts = useCallback(async () => {
    if (!selectedQuiz || !selectedUserForReset) {
      toast.error("يرجى اختيار المستخدم");
      return;
    }

    await handleAction(
      () => resetUserAttempts({
        quizId: selectedQuiz,
        userFingerprint: selectedUserForReset,
        currentUserFingerprint: user.deviceFingerprint,
      }),
      "resetUserAttempts",
      "تم تجديد محاولات المستخدم بنجاح"
    );
    
    setShowResetAttempts(false);
    setSelectedUserForReset("");
  }, [selectedQuiz, selectedUserForReset, resetUserAttempts, user.deviceFingerprint, handleAction]);

  // دالة تجديد محاولات جميع المستخدمين
  const handleResetAllAttempts = useCallback(async () => {
    if (!selectedQuiz) return;

    if (!confirm("هل أنت متأكد من تجديد محاولات جميع المستخدمين؟ سيتمكن الجميع من المشاركة من جديد.")) {
      return;
    }

    await handleAction(
      () => resetAllAttempts({
        quizId: selectedQuiz,
        currentUserFingerprint: user.deviceFingerprint,
      }),
      "resetAllAttempts",
      "تم تجديد محاولات جميع المستخدمين بنجاح"
    );
    
    setShowResetAttempts(false);
  }, [selectedQuiz, resetAllAttempts, user.deviceFingerprint, handleAction]);

  // دالة تغيير عدد المحاولات المسموحة
  const handleUpdateMaxAttempts = useCallback(async () => {
    if (!selectedQuiz || newMaxAttempts < 1) {
      toast.error("يرجى إدخال عدد محاولات صحيح");
      return;
    }

    await handleAction(
      () => updateQuizMaxAttempts({
        quizId: selectedQuiz,
        newMaxAttempts: newMaxAttempts,
        currentUserFingerprint: user.deviceFingerprint,
      }),
      "updateMaxAttempts",
      `تم تغيير عدد المحاولات المسموحة إلى ${newMaxAttempts}`
    );
    
    setShowQuizSettings(false);
  }, [selectedQuiz, newMaxAttempts, updateQuizMaxAttempts, user.deviceFingerprint, handleAction]);

  const handleCreateQuiz = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("يرجى إدخال عنوان المسابقة");
      return;
    }

    await handleAction(async () => {
      let imageId = undefined;
      if (formData.image) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": formData.image!.type },
          body: formData.image,
        });
        
        if (result.ok) {
          const { storageId } = await result.json();
          imageId = storageId;
        }
      }

      await createQuiz({
        title: formData.title,
        description: formData.description || undefined,
        image: imageId,
        maxAttempts: formData.maxAttempts,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleAnswers: formData.shuffleAnswers,
        creatorFingerprint: user.deviceFingerprint,
      });

      setShowCreateForm(false);
      setFormData({
        title: "",
        description: "",
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleAnswers: true,
        image: null,
      });
    }, "createQuiz", "تم إنشاء المسابقة بنجاح");
  }, [formData, createQuiz, generateUploadUrl, user.deviceFingerprint, handleAction]);

  const handleUpdateQuiz = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz || !formData.title.trim()) {
      toast.error("يرجى إدخال عنوان المسابقة");
      return;
    }

    await handleAction(async () => {
      let imageId = undefined;
      if (formData.image) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": formData.image!.type },
          body: formData.image,
        });
        
        if (result.ok) {
          const { storageId } = await result.json();
          imageId = storageId;
        }
      }

      await updateQuiz({
        quizId: selectedQuiz,
        title: formData.title,
        description: formData.description || undefined,
        image: imageId,
        maxAttempts: formData.maxAttempts,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleAnswers: formData.shuffleAnswers,
        userFingerprint: user.deviceFingerprint,
      });

      setEditingQuiz(false);
      setFormData({
        title: "",
        description: "",
        maxAttempts: 3,
        shuffleQuestions: true,
        shuffleAnswers: true,
        image: null,
      });
    }, "updateQuiz", "تم تحديث المسابقة بنجاح");
  }, [formData, selectedQuiz, updateQuiz, generateUploadUrl, user.deviceFingerprint, handleAction]);

  const handleAddQuestion = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionData.question.trim()) {
      toast.error("يرجى إدخال نص السؤال");
      return;
    }

    if (questionData.type === "multiple_choice") {
      const validOptions = questionData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        toast.error("يجب إدخال خيارين على الأقل");
        return;
      }
    }

    await handleAction(async () => {
      let imageId = undefined;
      if (questionData.image) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uuploadUrl, {
          method: "POST",
          headers: { "Content-Type": questionData.image!.type },
          body: questionData.image,
        });
        
        if (result.ok) {
          const { storageId } = await result.json();
          imageId = storageId;
        }
      }

      const options = questionData.type === "true_false" 
        ? ["صحيح", "خطأ"]
        : questionData.options.filter(opt => opt.trim());

      if (editingQuestion) {
        await updateQuestion({
          questionId: editingQuestion,
          question: questionData.question,
          type: questionData.type,
          options,
          correctAnswer: questionData.correctAnswer,
          image: imageId,
          userFingerprint: user.deviceFingerprint,
        });
      } else {
        await addQuestion({
          quizId: selectedQuiz!,
          question: questionData.question,
          type: questionData.type,
          options,
          correctAnswer: questionData.correctAnswer,
          image: imageId,
          userFingerprint: user.deviceFingerprint,
        });
      }

      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionData({
        question: "",
        type: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: 0,
        image: null,
      });
    }, editingQuestion ? "updateQuestion" : "addQuestion", 
       editingQuestion ? "تم تحديث السؤال بنجاح" : "تم إضافة السؤال بنجاح");
  }, [questionData, selectedQuiz, editingQuestion, addQuestion, updateQuestion, generateUploadUrl, user.deviceFingerprint, handleAction]);

  const handleStartQuiz = useCallback(async (quizId: Id<"quizzes">) => {
    await handleAction(
      () => startQuiz({ quizId, userFingerprint: user.deviceFingerprint }),
      `startQuiz_${quizId}`,
      "تم بدء المسابقة"
    );
  }, [startQuiz, user.deviceFingerprint, handleAction]);

  const handleStopQuiz = useCallback(async (quizId: Id<"quizzes">) => {
    await handleAction(
      () => stopQuiz({ quizId, userFingerprint: user.deviceFingerprint }),
      `stopQuiz_${quizId}`,
      "تم إيقاف المسابقة"
    );
  }, [stopQuiz, user.deviceFingerprint, handleAction]);

  const handleDeleteQuiz = useCallback(async (quizId: Id<"quizzes">) => {
    if (!confirm("هل أنت متأكد من حذف هذه المسابقة؟ سيتم حذف جميع الأسئلة والنتائج المرتبطة بها.")) {
      return;
    }

    await handleAction(
      () => deleteQuiz({ quizId, userFingerprint: user.deviceFingerprint }),
      `deleteQuiz_${quizId}`,
      "تم حذف المسابقة"
    );
    
    if (selectedQuiz === quizId) {
      setSelectedQuiz(null);
    }
  }, [selectedQuiz, deleteQuiz, user.deviceFingerprint, handleAction]);

  const handleDeleteQuestion = useCallback(async (questionId: Id<"questions">) => {
    if (!confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
      return;
    }

    await handleAction(
      () => deleteQuestion({ questionId, userFingerprint: user.deviceFingerprint }),
      `deleteQuestion_${questionId}`,
      "تم حذف السؤال"
    );
  }, [deleteQuestion, user.deviceFingerprint, handleAction]);

  // دالة تصدير النتائج
  const exportResults = useCallback(() => {
    if (!selectedQuiz) return;
    
    const quiz = quizzes.find(q => q._id === selectedQuiz);
    const csvContent = [
      ["اسم المستخدم", "النتيجة", "عدد الأسئلة الصحيحة", "إجمالي الأسئلة", "النسبة المئوية", "وقت الإكمال"],
      ...quizAttempts.map(attempt => {
        const user = allUsers.find(u => u._id === attempt.userId);
        const percentage = (attempt.score / attempt.totalQuestions) * 100;
        return [
          user?.name || "مستخدم مجهول",
          attempt.score.toString(),
          attempt.score.toString(),
          attempt.totalQuestions.toString(),
          `${percentage.toFixed(1)}%`,
          new Date(attempt._creationTime).toLocaleString('ar-EG')
        ];
      })
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نتائج_${quiz?.title}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [selectedQuiz, quizzes, quizAttempts, allUsers]);

  // مكونات شاشة البروجكتور
  const ProjectorLeaderboard = () => {
    const getRankIcon = (index: number) => {
      switch (index) {
        case 0: return <Crown className="w-8 h-8 text-yellow-400" />;
        case 1: return <Award className="w-7 h-7 text-gray-300" />;
        case 2: return <Award className="w-6 h-6 text-amber-600" />;
        default: return <Star className="w-5 h-5 text-blue-400" />;
      }
    };

    const getRankColor = (index: number) => {
      switch (index) {
        case 0: return "from-yellow-400 to-yellow-600";
        case 1: return "from-gray-300 to-gray-500";
        case 2: return "from-amber-600 to-amber-800";
        default: return "from-blue-400 to-blue-600";
      }
    };

    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <h2 className="text-4xl font-bold">لوحة المتصدرين</h2>
            <Trophy className="w-12 h-12 text-yellow-400" />
          </div>
          <p className="text-xl text-white/80">{quizzes.find(q => q._id === selectedQuiz)?.title}</p>
          <div className="flex justify-center gap-6 mt-4 text-white/70">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>إجمالي المشاركين: {leaderboard.length}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {leaderboard.map((player, index) => (
            <div
              key={player.userId}
              className={`
                relative overflow-hidden rounded-2xl p-6 transform transition-all duration-300 hover:scale-105
                bg-gradient-to-r ${getRankColor(index)} shadow-2xl border-2
                ${index === 0 ? 'border-yellow-400' : 
                  index === 1 ? 'border-gray-300' : 
                  index === 2 ? 'border-amber-600' : 'border-blue-400'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    {getRankIcon(index)}
                    <div className="text-3xl font-bold w-8 text-center">{index + 1}</div>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-1">{player.name}</h3>
                    <div className="flex gap-4 text-sm opacity-90">
                      <span>المحاولات: {player.attempts}</span>
                      <span>أفضل نتيجة: {player.bestScore}</span>
                      <span>المعدل: {player.averageScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold mb-1">{player.totalScore}</div>
                  <div className="text-sm opacity-90">النقاط الإجمالية</div>
                </div>
              </div>
              {index < 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
                  <div 
                    className="h-full bg-white/60 transition-all duration-1000"
                    style={{ 
                      width: `${(player.totalScore / (leaderboard[0]?.totalScore || 1)) * 100}%` 
                    }}
                  />
                </div>
              )}
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="text-center py-16">
              <Trophy className="w-24 h-24 text-white/30 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white/50">لا توجد نتائج بعد</h3>
              <p className="text-white/40 mt-2">ابدأ المسابقة وشاهد المتصدرين يظهرون هنا!</p>
            </div>
          )}
        </div>

        {/* إحصائيات سريعة */}
        {leaderboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-bold text-yellow-400">{leaderboard[0]?.totalScore || 0}</div>
              <div className="text-white/70">أعلى نتيجة</div>
              <div className="text-sm text-white/50 mt-1">بواسطة {leaderboard[0]?.name}</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-bold text-green-400">{leaderboard.length}</div>
              <div className="text-white/70">عدد المشاركين</div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-center border border-white/20">
              <div className="text-3xl font-bold text-blue-400">
                {leaderboard.reduce((sum, player) => sum + player.attempts, 0)}
              </div>
              <div className="text-white/70">إجمالي المحاولات</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ProjectorQuestionView = () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (!currentQuestion) {
      return (
        <div className="max-w-4xl mx-auto text-center p-6">
          <div className="text-4xl font-bold mb-4">لا توجد أسئلة</div>
          <p className="text-xl text-white/70">يرجى إضافة أسئلة إلى المسابقة</p>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="bg-white/20 px-6 py-2 rounded-full text-lg font-semibold">
              السؤال {currentQuestionIndex + 1} من {questions.length}
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20">
          <h2 className="text-3xl font-bold text-center mb-6 leading-relaxed">
            {currentQuestion.question}
          </h2>

          {currentQuestion.imageUrl && (
            <div className="flex justify-center mb-6">
              <img 
                src={currentQuestion.imageUrl} 
                alt="صورة السؤال"
                className="max-w-full max-h-96 rounded-lg shadow-2xl"
              />
            </div>
          )}

          <div className="grid gap-4 mt-6">
            {currentQuestion.options.map((option: string, index: number) => {
              const isCorrect = index === currentQuestion.correctAnswer;
              const showCorrect = showAnswer && isCorrect;
              
              return (
                <div
                  key={index}
                  className={`
                    p-4 rounded-xl text-xl font-semibold transition-all duration-300
                    ${showCorrect 
                      ? 'bg-green-500/80 border-2 border-green-400 transform scale-105' 
                      : 'bg-white/20 border-2 border-white/30 hover:bg-white/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold
                      ${showCorrect 
                        ? 'bg-green-400 text-white' 
                        : 'bg-white/30 text-white'
                      }
                    `}>
                      {String.fromCharCode(1632 + index + 1)}
                    </div>
                    <span>{option}</span>
                    
                    {showCorrect && (
                      <div className="mr-auto bg-green-400 text-white px-3 py-1 rounded-full text-sm">
                        الإجابة الصحيحة
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
            className={`
              px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2
              ${currentQuestionIndex > 0 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-600 cursor-not-allowed opacity-50'
              }
            `}
          >
            <ChevronRight className="w-5 h-5" />
            السابق
          </button>

          {!showAnswer ? (
            <button
              onClick={revealAnswer}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-all"
            >
              كشف الإجابة
            </button>
          ) : (
            <div className="bg-green-500 px-6 py-3 rounded-lg font-semibold">
              ✓ تم كشف الإجابة
            </div>
          )}

          <button
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
            className={`
              px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2
              ${currentQuestionIndex < questions.length - 1 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-600 cursor-not-allowed opacity-50'
              }
            `}
          >
            التالي
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* مؤشر التقدم */}
        <div className="mt-8">
          <div className="bg-white/20 rounded-full h-3">
            <div 
              className="bg-green-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-white/70 mt-2">
            <span>بداية المسابقة</span>
            <span>نهاية المسابقة</span>
          </div>
        </div>
      </div>
    );
  };

  // شاشة البروجكتور الرئيسية
  if (showProjector && selectedQuiz) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white ${
        isFullScreen ? 'fixed inset-0 z-50' : ''
      }`}>
        <div className="bg-black/30 backdrop-blur-lg border-b border-white/20 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={closeProjector}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="العودة"
              >
                <Home className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{quizzes.find(q => q._id === selectedQuiz)?.title}</h1>
                <p className="text-white/70">شاشة البروجكتور التفاعلية</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
              >
                {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleFullScreen}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={isFullScreen ? "تصغير الشاشة" : "تكبير الشاشة"}
              >
                {isFullScreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleProjectorView}
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Monitor className="w-5 h-5" />
                {currentView === "leaderboard" ? "عرض السؤال" : "عرض المتصدرين"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {currentView === "leaderboard" ? <ProjectorLeaderboard /> : <ProjectorQuestionView />}
        </div>
      </div>
    );
  }

  // واجهة إدارة المسابقات العادية
  if (selectedQuiz) {
    const quiz = quizzes.find(q => q._id === selectedQuiz);
    const isActionLoading = (actionId: string) => loadingActions[actionId];
    
    return (
      <div 
        className="min-h-screen p-3 bg-gradient-to-br from-blue-50 to-blue-100"
        style={{ fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedQuiz(null);
                    setEditingQuiz(false);
                  }}
                  className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-700 hover:text-blue-900"
                  aria-label="العودة إلى قائمة المسابقات"
                >
                  <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-800">
                    {editingQuiz ? "تعديل المسابقة" : "إدارة المسابقة"}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">{quiz?.title}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!editingQuiz && (
                  <>
                    <button
                      onClick={openProjector}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <Projector className="w-3 h-3 sm:w-4 sm:h-4" />
                      شاشة البروجكتور
                    </button>

                    <button
                      onClick={() => setShowResults(true)}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      النتائج
                    </button>
                    <button
                      onClick={() => setShowQuizSettings(true)}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                      الإعدادات
                    </button>
                    <button
                      onClick={() => setShowResetAttempts(true)}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                      تجديد المحاولات
                    </button>
                    <button
                      onClick={() => setEditingQuiz(true)}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                      تعديل المسابقة
                    </button>
                    <button
                      onClick={() => setShowQuestionForm(true)}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      إضافة سؤال
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* إحصائيات سريعة */}
            {!editingQuiz && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-200">
                  <div className="text-lg font-bold text-blue-700">{quizStats.totalQuestions}</div>
                  <div className="text-xs text-blue-600">عدد الأسئلة</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                  <div className="text-lg font-bold text-green-700">{quizStats.totalAttempts}</div>
                  <div className="text-xs text-green-600">المحاولات الكلية</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-200">
                  <div className="text-lg font-bold text-purple-700">{quizStats.uniqueParticipants}</div>
                  <div className="text-xs text-purple-600">عدد المشاركين</div>
                </div>
                <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-200">
                  <div className="text-lg font-bold text-orange-700">{quizStats.maxAttempts}</div>
                  <div className="text-xs text-orange-600">المحاولات المسموحة</div>
                </div>
              </div>
            )}
          </div>

          {/* نموذج تعديل المسابقة */}
          {editingQuiz && (
            <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 border border-blue-200">
              <form onSubmit={handleUpdateQuiz} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عنوان المسابقة *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">عدد المحاولات المسموحة</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.maxAttempts}
                      onChange={(e) => setFormData({...formData, maxAttempts: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">وصف المسابقة</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">صورة المسابقة</label>
                  <div className="flex items-center gap-3">
                    {quiz?.imageUrl && (
                      <img 
                        src={quiz.imageUrl} 
                        alt="صورة المسابقة الحالية" 
                        className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                      />
                    )}
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg cursor-pointer transition-all duration-200">
                      <Image className="w-4 h-4" />
                      تغيير الصورة
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                        className="hidden"
                      />
                    </label>
                    <span className="text-sm text-gray-600">
                      {formData.image ? formData.image.name : "لم يتم اختيار صورة جديدة"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shuffleQuestions}
                      onChange={(e) => setFormData({...formData, shuffleQuestions: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    خلط ترتيب الأسئلة
                  </label>
                  
                  <label className="flex items-center text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shuffleAnswers}
                      onChange={(e) => setFormData({...formData, shuffleAnswers: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    خلط ترتيب الإجابات
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isActionLoading("updateQuiz")}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isActionLoading("updateQuiz") ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingQuiz(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions List */}
          {!editingQuiz && (
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={question._id} className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-lg">
                          السؤال {index + 1}
                        </span>
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded-lg">
                          {question.type === "multiple_choice" ? "اختيار متعدد" : "صح/خطأ"}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-gray-800 mb-2 text-base sm:text-lg">{question.question}</h3>
                      
                      {(question as any).imageUrl && (
                        <div className="w-full flex justify-center mb-3">
                          <img 
                            src={(question as any).imageUrl} 
                            alt="صورة السؤال" 
                            className="max-w-full max-h-48 object-contain rounded-lg bg-gray-100 p-1 border border-gray-300"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      <div className="space-y-1 sm:space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className={`p-2 sm:p-3 rounded-lg ${
                            optIndex === question.correctAnswer 
                              ? 'bg-green-100 text-green-800 border border-green-300 font-semibold' 
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}>
                            <div className="flex items-center gap-1 sm:gap-2">
                              {optIndex === question.correctAnswer && <CheckSquare className="w-3 h-3 sm:w-4 sm:h-4" />}
                              <span className="text-sm">{option}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-2">
                      <button
                        onClick={() => startEditingQuestion(question._id)}
                        disabled={isActionLoading(`updateQuestion_${question._id}`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="تعديل السؤال"
                      >
                        {isActionLoading(`updateQuestion_${question._id}`) ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question._id)}
                        disabled={isActionLoading(`deleteQuestion_${question._id}`)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="حذف السؤال"
                      >
                        {isActionLoading(`deleteQuestion_${question._id}`) ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {questions.length === 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-gray-200">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
                    <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">لا توجد أسئلة بعد</h3>
                  <p className="text-sm text-gray-600">ابدأ بإضافة أول سؤال!</p>
                </div>
              )}
            </div>
          )}

          {/* عرض النتائج Modal */}
          {showResults && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">نتائج المسابقة</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportResults}
                      className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-all duration-200"
                    >
                      <Download className="w-3 h-3" />
                      تصدير
                    </button>
                    <button
                      onClick={() => setShowResults(false)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {quizAttempts.map((attempt, index) => {
                    const user = allUsers.find(u => u._id === attempt.userId);
                    const percentage = (attempt.score / attempt.totalQuestions) * 100;
                    
                    return (
                      <div key={attempt._id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800">{user?.name || "مستخدم مجهول"}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(attempt._creationTime).toLocaleString('ar-EG')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">
                              {attempt.score}/{attempt.totalQuestions}
                            </div>
                            <div className="text-xs text-gray-500">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {quizAttempts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>لا توجد نتائج بعد</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* إعدادات المسابقة Modal */}
          {showQuizSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">إعدادات المسابقة</h3>
                  <button
                    onClick={() => {
                      setShowQuizSettings(false);
                      setNewMaxAttempts(quiz?.maxAttempts || 3);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      عدد المحاولات المسموحة
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newMaxAttempts}
                      onChange={(e) => setNewMaxAttempts(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">الحد الأدنى: 1 محاولة - الحد الأقصى: 10 محاولات</p>
                  </div>

                  <button
                    onClick={handleUpdateMaxAttempts}
                    disabled={isActionLoading("updateMaxAttempts")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isActionLoading("updateMaxAttempts") ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    حفظ التغييرات
                  </button>

                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <p>• تغيير عدد المحاولات سيؤثر على جميع المستخدمين</p>
                    <p>• يمكن للمستخدمين المشاركة بعدد المحاولات الجديد</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* تجديد المحاولات Modal */}
          {showResetAttempts && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">تجديد محاولات المستخدمين</h3>
                  <button
                    onClick={() => {
                      setShowResetAttempts(false);
                      setSelectedUserForReset("");
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      اختر المستخدم
                    </label>
                    <select
                      value={selectedUserForReset}
                      onChange={(e) => setSelectedUserForReset(e.target.value)}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    >
                      <option value="">اختر المستخدم</option>
                      {allUsers.map((user) => (
                        <option key={user._id} value={user.deviceFingerprint}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleResetUserAttempts}
                      disabled={!selectedUserForReset || isActionLoading("resetUserAttempts")}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isActionLoading("resetUserAttempts") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      تجديد محاولات المستخدم
                    </button>
                    <button
                      onClick={handleResetAllAttempts}
                      disabled={isActionLoading("resetAllAttempts")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isActionLoading("resetAllAttempts") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      تجديد الكل
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <p>• تجديد المستخدم: يسمح لمستخدم محدد بالمشاركة من جديد</p>
                    <p>• تجديد الكل: يسمح لجميع المستخدمين بالمشاركة من جديد</p>
                    <p>• يمكن تغيير عدد المحاولات من إعدادات المسابقة</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Question Form */}
          {showQuestionForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
              <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">
                    {editingQuestion ? "تعديل السؤال" : "إضافة سؤال جديد"}
                  </h3>
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddQuestion} className="space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">نص السؤال *</label>
                    <textarea
                      value={questionData.question}
                      onChange={(e) => setQuestionData({...questionData, question: e.target.value})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                      rows={3}
                      required
                      placeholder="أدخل نص السؤال..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">نوع السؤال</label>
                    <select
                      value={questionData.type}
                      onChange={(e) => setQuestionData({...questionData, type: e.target.value as any})}
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    >
                      <option value="multiple_choice">اختيار من متعدد</option>
                      <option value="true_false">صح/خطأ</option>
                    </select>
                  </div>

                  {questionData.type === "multiple_choice" && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الخيارات</label>
                      <div className="space-y-2">
                        {questionData.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={questionData.correctAnswer === index}
                              onChange={() => setQuestionData({...questionData, correctAnswer: index})}
                              className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...questionData.options];
                                newOptions[index] = e.target.value;
                                setQuestionData({...questionData, options: newOptions});
                              }}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                              placeholder={`الخيار ${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {questionData.type === "true_false" && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الإجابة الصحيحة</label>
                      <div className="flex gap-3">
                        <label className="flex items-center text-xs sm:text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={questionData.correctAnswer === 0}
                            onChange={() => setQuestionData({...questionData, correctAnswer: 0})}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-1 sm:mr-2"
                          />
                          صحيح
                        </label>
                        <label className="flex items-center text-xs sm:text-sm cursor-pointer">
                          <input
                            type="radio"
                            name="correctAnswer"
                            checked={questionData.correctAnswer === 1}
                            onChange={() => setQuestionData({...questionData, correctAnswer: 1})}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 focus:ring-blue-500 border-gray-300 mr-1 sm:mr-2"
                          />
                          خطأ
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">صورة السؤال (اختيارية)</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg cursor-pointer transition-all duration-200 shadow-sm">
                        <Image className="w-3 h-3" />
                        اختر صورة
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setQuestionData({...questionData, image: e.target.files?.[0] || null})}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-gray-600 truncate flex-1">
                        {questionData.image ? questionData.image.name : "لم يتم اختيار صورة"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <button
                      type="submit"
                      disabled={isActionLoading(editingQuestion ? "updateQuestion" : "addQuestion")}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isActionLoading(editingQuestion ? "updateQuestion" : "addQuestion") ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      {editingQuestion ? "تحديث السؤال" : "إضافة السؤال"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // واجهة قائمة المسابقات الرئيسية
  return (
    <div 
      className="min-h-screen p-3 bg-gradient-to-br from-blue-50 to-blue-100"
      style={{ fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 border border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-800">إدارة المسابقات</h1>
              <p className="text-xs sm:text-sm text-gray-600">إنشاء وإدارة مسابقاتك</p>
            </div>
            
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 shadow-md self-start"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              إنشاء مسابقة جديدة
            </button>
          </div>
        </div>

        {/* Quizzes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {quizzes.map((quiz) => {
            const isStarting = loadingActions[`startQuiz_${quiz._id}`];
            const isStopping = loadingActions[`stopQuiz_${quiz._id}`];
            const isDeleting = loadingActions[`deleteQuiz_${quiz._id}`];
            
            return (
              <div key={quiz._id} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-xl">
                {quiz.imageUrl && (
                  <div className="w-full h-28 sm:h-40 flex justify-center bg-gray-100">
                    <img 
                      src={quiz.imageUrl} 
                      alt={quiz.title} 
                      className="w-full h-full object-contain p-2"
                      loading="lazy" 
                    />
                  </div>
                )}
                <div className="p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">{quiz.title}</h3>
                    {quiz.isActive && (
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-lg">
                        نشطة
                      </span>
                    )}
                  </div>
                  
                  {quiz.description && (
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{quiz.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <span>{quiz.questionCount} سؤال</span>
                      <span>• {quiz.maxAttempts} محاولات</span>
                    </div>
                    <div className="truncate max-w-[100px]">{quiz.creatorName}</div>
                  </div>
                  
                  <div className="flex gap-1 sm:gap-2">
                    <button
                      onClick={() => setSelectedQuiz(quiz._id)}
                      className="flex-1 bg-blue-100 text-blue-700 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-blue-200 transition-all duration-200 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      إدارة
                    </button>
                    
                    {/* زر البروجكتور في الكارد */}
                    <button
                      onClick={() => {
                        setSelectedQuiz(quiz._id);
                        openProjector();
                      }}
                      className="bg-purple-100 text-purple-700 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-purple-200 transition-all duration-200 flex items-center justify-center gap-1"
                      title="فتح شاشة البروجكتور"
                    >
                      <Projector className="w-3 h-3" />
                    </button>
                    
                    {quiz.isActive ? (
                      <button
                        onClick={() => handleStopQuiz(quiz._id)}
                        disabled={isStopping}
                        className="bg-red-100 text-red-700 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="إيقاف المسابقة"
                      >
                        {isStopping ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Square className="w-3 h-3" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartQuiz(quiz._id)}
                        disabled={isStarting}
                        className="bg-green-100 text-green-700 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-green-200 transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="بدء المسابقة"
                      >
                        {isStarting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      disabled={isDeleting}
                      className="bg-red-100 text-red-700 py-1.5 px-2 rounded-lg text-xs font-semibold hover:bg-red-200 transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="حذف المسابقة"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {quizzes.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-gray-200">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-200">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">لا توجد مسابقات</h3>
            <p className="text-sm text-gray-600">ابدأ بإنشاء أول مسابقة!</p>
          </div>
        )}

        {/* Create Quiz Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-800">إنشاء مسابقة جديدة</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">عنوان المسابقة *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    placeholder="أدخل عنوان المسابقة"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">الوصف</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    rows={2}
                    placeholder="أدخل وصفاً للمسابقة..."
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">عدد المحاولات المسموحة</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxAttempts}
                    onChange={(e) => setFormData({...formData, maxAttempts: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">صورة المسابقة (اختيارية)</label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg cursor-pointer transition-all duration-200 shadow-sm">
                      <Image className="w-3 h-3" />
                      اختر صورة
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFormData({...formData, image: e.target.files?.[0] || null})}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-600 truncate flex-1">
                      {formData.image ? formData.image.name : "لم يتم اختيار صورة"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-xs sm:text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shuffleQuestions}
                      onChange={(e) => setFormData({...formData, shuffleQuestions: e.target.checked})}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    خلط ترتيب الأسئلة
                  </label>
                  
                  <label className="flex items-center text-xs sm:text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.shuffleAnswers}
                      onChange={(e) => setFormData({...formData, shuffleAnswers: e.target.checked})}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    خلط ترتيب الإجابات
                  </label>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={loadingActions["createQuiz"]}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 shadow-md text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingActions["createQuiz"] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    إنشاء المسابقة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-200 text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}