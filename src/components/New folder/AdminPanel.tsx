// AdminPanel.tsx - النسخة المحسنة للشاشات الصغيرة
import React, { useState } from "react";
import QuizManager from "./QuizManager";
import UserManager from "./UserManager";
import { Users, ListTodo, ArrowLeft } from "lucide-react";

interface User {
  _id: string;
  name: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  deviceFingerprint: string;
}

interface AdminPanelProps {
  user: User;
  onBack: () => void;
}

export default function AdminPanel({ user, onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"quizzes" | "users">("quizzes");

  const tabs = [
    { id: "quizzes", name: "المسابقات", icon: <ListTodo size={16} /> },
    { id: "users", name: "المستخدمين", icon: <Users size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-2 font-[Cairo]">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-1 hover:bg-gray-100 rounded transition flex items-center gap-1 group active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600 group-hover:text-indigo-600 transition-colors" />
              <span className="hidden xs:block text-xs font-medium text-gray-600 group-hover:text-indigo-600">
                رجوع
              </span>
            </button>

            <div>
              <h1 className="text-sm font-bold text-gray-900">
                لوحة الإدارة
              </h1>
              <p className="text-xs text-gray-500">
                إدارة المسابقات والمستخدمين
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <span className="hidden xs:block text-xs font-medium text-gray-700">
              {user.name}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex px-1 gap-2 min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-2 flex items-center gap-1 font-medium text-xs border-b-2 transition-colors whitespace-nowrap active:scale-95 ${
                    activeTab === tab.id
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xs">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-2">
            {activeTab === "quizzes" && <QuizManager user={user} />}
            {activeTab === "users" && <UserManager user={user} onBack={onBack} />}
          </div>
        </div>
      </div>
    </div>
  );
}