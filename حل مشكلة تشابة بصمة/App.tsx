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

// Generate unique device fingerprint
function generateDeviceFingerprint() {
  // Check if fingerprint already exists in localStorage
  const storedFingerprint = localStorage.getItem('deviceFingerprint');
  
  if (storedFingerprint) {
    return storedFingerprint;
  }
  
  // Create a new unique fingerprint
  const newFingerprint = 'device_' + 
    Math.random().toString(36).substring(2, 15) + 
    Date.now().toString(36) + 
    Math.random().toString(36).substring(2, 15);
  
  // Store it in localStorage
  localStorage.setItem('deviceFingerprint', newFingerprint);
  
  return newFingerprint;
}

// Get user IP
async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

export default function App() {
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
  const [userIP, setUserIP] = useState<string>("");
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin' | 'quiz' | 'leaderboard'>('dashboard');
  const [activeQuizId, setActiveQuizId] = useState<Id<"quizzes"> | null>(null);

  const currentUser = useQuery(api.users.getCurrentUser, 
    deviceFingerprint ? { deviceFingerprint } : "skip"
  );

  const activeQuiz = useQuery(api.quizzes.getActiveQuiz);

  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);
    
    getUserIP().then(setUserIP);
  }, []);

  if (!deviceFingerprint || !userIP) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (currentUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

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

  const renderCurrentView = () => {
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
      default:
        return (
          <Dashboard 
            user={currentUser}
            activeQuiz={activeQuiz || null}
            onStartQuiz={(quizId: Id<"quizzes">) => {
              setActiveQuizId(quizId);
              setCurrentView('quiz');
            }}
            onViewLeaderboard={() => setCurrentView('leaderboard')}
            onOpenAdmin={() => setCurrentView('admin')}
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