// Registration.tsx - النسخة المحسنة للشاشات الصغيرة
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Upload, User, LogIn, Loader, Camera, Sparkles, Cross } from "lucide-react";

interface RegistrationProps {
  deviceFingerprint: string;
  ipAddress: string;
}

// نظام النجوم المحسن
const OptimizedStarfield = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // عدد أقل من النجوم
    const stars = Array.from({ length: 20 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1 + 0.5,
      brightness: Math.random() * 0.4 + 0.2
    }));

    // رسم النجوم مرة واحدة
    ctx.fillStyle = '#0a1428';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fill();
    });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />;
});

export default function Registration({ deviceFingerprint, ipAddress }: RegistrationProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<{name?: string}>({});

  const registerUser = useMutation(api.users.registerUser);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  
  const existingUser = useQuery(api.users.findUserByName, 
    name.trim() ? { name: name.trim() } : "skip"
  );

  // تنظيف avatarPreview
  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // التحقق من الصحة
  useEffect(() => {
    const errors: {name?: string} = {};
    
    if (name.trim() && name.trim().length < 2) {
      errors.name = "الاسم يجب أن يكون على الأقل حرفين";
    }
    
    if (existingUser && name.trim()) {
      errors.name = "هذا الاسم مستخدم بالفعل";
    }

    setFormErrors(errors);
  }, [name, existingUser]);

  const validateForm = useCallback(() => {
    if (!name.trim()) {
      toast.error("يرجى إدخال الاسم");
      return false;
    }

    if (name.trim().length < 2) {
      toast.error("الاسم يجب أن يكون على الأقل حرفين");
      return false;
    }

    if (existingUser) {
      toast.error("هذا الاسم مستخدم بالفعل. يرجى اختيار اسم آخر");
      return false;
    }

    return true;
  }, [name, existingUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      let avatarId = undefined;

      if (avatar) {
        try {
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": avatar.type },
            body: avatar,
          });

          if (result.ok) {
            const { storageId } = await result.json();
            avatarId = storageId;
          }
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("حدث خطأ أثناء رفع الصورة");
        }
      }

      await registerUser({
        name: name.trim(),
        deviceFingerprint,
      
        avatar: avatarId,
      });

      toast.success("✨ تم التسجيل بنجاح!");
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    
    if (file) {
      if (file.size > 500 * 1024) {
        toast.error("حجم الصورة يجب أن يكون أقل من 500KB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("يرجى اختيار ملف صورة فقط");
        return;
      }
      
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatar(null);
      setAvatarPreview(null);
    }
  }, [avatarPreview]);

  const removeAvatar = useCallback(() => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatar(null);
    setAvatarPreview(null);
  }, [avatarPreview]);

  return (
    <div className="min-h-screen flex items-center justify-center p-2 relative overflow-hidden"
         style={{ fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}>
      
      <OptimizedStarfield />
      
      <div className="relative w-full max-w-xs mx-auto z-10 px-2">
        {/* البطاقة الرئيسية */}
        <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-lg p-4 border border-white/20 transform transition-all duration-300 active:scale-95">
          
          {/* مؤشر جودة الاسم */}
          {name.trim().length > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>جودة الاسم:</span>
                <span>{name.trim().length}/50</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    name.trim().length >= 2 ? 'bg-green-500' : 'bg-red-400'
                  }`}
                  style={{ width: `${Math.min((name.trim().length / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
          
          {/* الهيدر */}
          <div className="flex flex-col items-center text-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-0.5 shadow-md">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <img
                    src="/images/logo.png"
                    alt="شعار مسابقات اجتماع إتبعنى"
                    className="w-full h-full rounded-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
              
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-sm border border-white/20">
                <Cross className="w-2 h-2 text-white" />
              </div>
            </div>
            
            <h1 className="mt-2 text-lg font-bold text-gray-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
              مسابقات اجتماع إتبعنى
              <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            </h1>
            <p className="text-gray-600 text-xs mt-0.5">سجّل اسمك للمشاركة في المسابقة</p>
          </div>

          {/* الفورم */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* حقل الاسم */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                <User className="w-3.5 h-3.5" />
                الاسم الكامل *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-2.5 py-2 rounded-lg border transition-all duration-200 text-xs ${
                  formErrors.name 
                    ? "border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200" 
                    : "border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                }`}
                placeholder="أدخل اسمك الثلاثي"
                required
                minLength={2}
                maxLength={50}
                disabled={isLoading}
                aria-invalid={!!formErrors.name}
                aria-describedby={formErrors.name ? "name-error" : undefined}
              />
              {formErrors.name && (
                <p id="name-error" className="text-red-500 text-xs mt-0.5 flex items-center gap-0.5">
                  ⚠️ {formErrors.name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">يجب أن يكون الاسم بين 2 إلى 50 حرف</p>
            </div>

            {/* حقل الصورة */}
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">
                <Camera className="w-3.5 h-3.5" />
                الصورة الشخصية (اختياري)
              </label>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                  <Upload className="w-3.5 h-3.5" />
                  اختر صورة
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isLoading}
                    aria-label="اختر صورة شخصية"
                  />
                </label>

                <div className="flex-1 min-w-0">
                  {avatarPreview ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full border border-blue-200 overflow-hidden shadow-sm">
                          <img 
                            src={avatarPreview} 
                            alt="معاينة الصورة الشخصية"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={removeAvatar}
                          disabled={isLoading}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors active:scale-95"
                          aria-label="إزالة الصورة"
                        >
                          ×
                        </button>
                      </div>
                      <span className="text-xs text-gray-600 truncate flex-1">{avatar?.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">لم يتم اختيار صورة</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">الحجم الأقصى: 500KB</p>
            </div>

            {/* زر التسجيل */}
            <button
              type="submit"
              disabled={isLoading || !!formErrors.name}
              className="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md text-xs active:scale-95"
              aria-label={isLoading ? "جاري التسجيل" : "تسجيل الدخول"}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-1.5" aria-live="polite">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التسجيل...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </div>
              )}
            </button>
          </form>

          {/* الفوتر */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              يُسمح بحساب واحد فقط لكل جهاز
            </p>
          </div>
        </div>

        {/* اسم الكنيسة */}
        <div className="mt-3 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-sm text-white/90 rounded-full border border-white/20 text-xs">
            <Cross className="w-2.5 h-2.5 text-white" />
            <span>كنيسة مارمينا والبابا كيرلس</span>
            <Cross className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* الآية */}
        <div className="mt-2 text-center">
          <div className="text-white/80 text-xs backdrop-blur-sm bg-black/20 rounded px-2 py-1 inline-block">
            "اَللهُ مَحَبَّةٌ" - يوحنا ٤:٨
          </div>
        </div>
      </div>
    </div>
  );
}