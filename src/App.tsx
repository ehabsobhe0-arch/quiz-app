// App.tsx
import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { Toaster } from "sonner";
import Registration from "./components/Registration";
import Dashboard from "./components/Dashboard";
import AdminPanel from "./components/AdminPanel";
import QuizPlay from "./components/QuizPlay";
import Leaderboard from "./components/Leaderboard";
import ReviewPage from "./components/ReviewPage";

// إنشاء بصمة جهاز فريدة
async function generateDeviceFingerprint(): Promise<string> {
  const storedFingerprint = localStorage.getItem('deviceFingerprint');
  if (storedFingerprint) {
    return storedFingerprint;
  }

  try {
    const deviceFactors = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints || 0,
    };

    const deviceString = JSON.stringify(deviceFactors);
    let hash = 0;
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    
    const fingerprint = `dev_${Math.abs(hash).toString(36)}_${timestamp.toString(36)}_${randomSuffix}`;

    localStorage.setItem('deviceFingerprint', fingerprint);
    
    return fingerprint;

  } catch (error) {
    const fallbackFingerprint = 'dev_' + 
      Math.random().toString(36).substring(2, 15) + 
      Date.now().toString(36) + 
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    
    localStorage.setItem('deviceFingerprint', fallbackFingerprint);
    return fallbackFingerprint;
  }
}

// الحصول على IP المستخدم مع عدة بدائل
async function getUserIP(): Promise<string> {
  const fallbackIP = `ip_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
  
  try {
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://jsonip.com'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service, { timeout: 5000 });
        if (response.ok) {
          const data = await response.json();
          return data.ip || data.ipAddress || fallbackIP;
        }
      } catch (e) {
        continue;
      }
    }
    
    return fallbackIP;
  } catch {
    return fallbackIP;
  }
}

// تنظيف أي بصمات متضاربة
function cleanupFingerprints() {
  const currentFingerprint = localStorage.getItem('deviceFingerprint');
  const allKeys = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('device') || key.includes('fingerprint'))) {
      allKeys.push(key);
    }
  }

  allKeys.forEach(key => {
    if (key !== 'deviceFingerprint') {
      localStorage.removeItem(key);
    }
  });
}

export default function App() {
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [userIP, setUserIP] = useState<string>("");
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'quiz' | 'leaderboard' | 'review'>('dashboard');
  const [activeQuizId, setActiveQuizId] = useState<Id<"quizzes"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = useQuery(api.users.getCurrentUser, 
    deviceFingerprint ? { deviceFingerprint } : "skip"
  );

  const activeQuiz = useQuery(api.quizzes.getActiveQuiz);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        cleanupFingerprints();
        
        const fingerprint = await generateDeviceFingerprint();
        setDeviceFingerprint(fingerprint);
        
        const ip = await getUserIP();
        setUserIP(ip);
        
        console.log('بصمة الجهاز:', fingerprint);
        console.log('IP المستخدم:', ip);
        
      } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        const emergencyFingerprint = 'emergency_' + Date.now() + '_' + Math.random();
        localStorage.setItem('deviceFingerprint', emergencyFingerprint);
        setDeviceFingerprint(emergencyFingerprint);
        setUserIP('emergency_ip_' + Date.now());
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // دالة فتح وضع المراجعة
  const handleOpenReview = (quizId: string) => {
    console.log("App: Opening review for quiz:", quizId);
    setActiveQuizId(quizId as Id<"quizzes">);
    setCurrentView('review');
  };

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري إعداد التطبيق...</p>
        </div>
      </div>
    );
  }

  // عرض تحميل المستخدم
  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات المستخدم...</p>
        </div>
      </div>
    );
  }

  // عرض التسجيل إذا لم يكن هناك مستخدم
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Registration 
          deviceFingerprint={deviceFingerprint} 
          ipAddress={userIP} 
        />
        <Toaster position="top-center" />
      </div>
    );
  }

  // عرض الواجهة المناسبة
  const renderCurrentView = () => {
    console.log("Current view:", currentView, "Active quiz ID:", activeQuizId);
    
    switch (currentView) {
      case 'admin':
        return <AdminPanel user={currentUser} onBack={() => setCurrentView('dashboard')} />;
      case 'quiz':
        return activeQuizId ? (
          <QuizPlay 
            quizId={activeQuizId} 
            user={currentUser} 
            onComplete={() => setCurrentView('leaderboard')}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : null;
      case 'leaderboard':
        return activeQuiz ? (
          <Leaderboard 
            quizId={activeQuiz._id} 
            user={currentUser}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : null;
      case 'review':
        return activeQuizId ? (
          <ReviewPage 
            quizId={activeQuizId} 
            user={currentUser}
            onBack={() => setCurrentView('dashboard')}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p>خطأ: لم يتم تحديد مسابقة للمراجعة</p>
              <button onClick={() => setCurrentView('dashboard')} className="mt-4 bg-blue-600 px-4 py-2 rounded-lg text-white">
                العودة للرئيسية
              </button>
            </div>
          </div>
        );
      default:
        return (
          <Dashboard 
            user={currentUser}
            activeQuiz={activeQuiz || null}
            onStartQuiz={(quizId: string) => {
              setActiveQuizId(quizId as Id<"quizzes">);
              setCurrentView('quiz');
            }}
            onViewLeaderboard={() => setCurrentView('leaderboard')}
            onOpenAdmin={() => setCurrentView('admin')}
            onOpenReview={handleOpenReview}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {renderCurrentView()}
      <Toaster position="top-center" />
    </div>
  );
}