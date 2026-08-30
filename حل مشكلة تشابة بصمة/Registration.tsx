// Registration.tsx
import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface RegistrationProps {
  deviceFingerprint: string;
  ipAddress: string;
}

export default function Registration({ deviceFingerprint, ipAddress }: RegistrationProps) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const registerUser = useMutation(api.users.registerUser);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("يرجى إدخال الاسم");
      return;
    }

    setIsLoading(true);
    try {
      let avatarId = undefined;

      if (avatar) {
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
      }

      await registerUser({
        name: name.trim(),
        deviceFingerprint,
        ipAddress,
        avatar: avatarId,
      });

      toast.success("تم التسجيل بنجاح!");
      
      // إعادة تحميل الصفحة لتطبيق التغييرات
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء التسجيل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatar(file);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        backgroundImage: "url('/images/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(6, 30, 63, 0.45)" }}
      />

      <div className="relative w-full max-w-sm mx-auto z-10">
        <div className="bg-white/85 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-white/30">
          <div className="flex flex-col items-center">
            <div className="rounded-full p-1 bg-gradient-to-r from-sky-400 via-indigo-500 to-purple-600 shadow-xl">
              <div className="bg-white rounded-full p-1">
                <div className="w-24 h-24 rounded-full overflow-hidden transform hover:scale-105 transition">
                  <img
                    src="/images/logo.png"
                    alt="شعار الاجتماع"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <h1 className="mt-4 text-xl font-extrabold text-slate-900">مسابقات الكنيسة</h1>
            <p className="text-xs text-slate-700 mt-1">مرحباً بك! سجّل اسمك للمشاركة</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">الاسم *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                placeholder="أدخل اسمك"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-2">الصورة الشخصية (اختيارية)</label>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="avatar"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-sky-500 hover:bg-sky-600 text-white text-sm cursor-pointer select-none shadow"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  اختر صورة
                </label>
                <input id="avatar" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

                <div className="flex-1 text-xs text-slate-600">
                  {avatar ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200">
                        <img src={URL.createObjectURL(avatar)} alt="preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="truncate">{avatar.name}</div>
                    </div>
                  ) : (
                    <div className="text-slate-500">لم يتم اختيار صورة</div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 rounded-lg py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold shadow hover:from-sky-600 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  جاري التسجيل...
                </>
              ) : (
                "تسجيل"
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-700">يُسمح بحساب واحد فقط لكل جهاز</p>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-block px-4 py-2 rounded-full bg-white/10 text-white/80 text-xs backdrop-blur-sm">نظام المسابقات المسيحية</div>
        </div>
      </div>
    </div>
  );
}