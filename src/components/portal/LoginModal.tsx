import React from "react";
import { X, Lock, User, ArrowRight, Shield } from "lucide-react";

type LoginModalProps = {
  isOpen: boolean;
  loginData: { username: string; password: string };
  loginBusy: boolean;
  loginError: string;
  onClose: () => void;
  onChangeLogin: (data: { username: string; password: string }) => void;
  onSubmitLogin: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function LoginModal({
  isOpen,
  loginData,
  loginBusy,
  loginError,
  onClose,
  onChangeLogin,
  onSubmitLogin,
}: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Đăng Nhập Quản Trị
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống quản lý & điều hành tour nội bộ VietTour AI
          </p>
        </div>

        {loginError && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3 rounded-xl mb-4 font-medium">
            {loginError}
          </div>
        )}

        <form onSubmit={onSubmitLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên đăng nhập
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                autoComplete="username"
                value={loginData.username}
                onChange={(e) => onChangeLogin({ ...loginData, username: e.target.value })}
                placeholder="admin"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginData.password}
                onChange={(e) => onChangeLogin({ ...loginData, password: e.target.value })}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loginBusy}
            className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <span>{loginBusy ? "Đang đăng nhập..." : "Đăng nhập hệ thống"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Tài khoản quản trị viên và tư vấn viên được phân quyền bảo mật cấp cao.
          </p>
        </div>
      </div>
    </div>
  );
}
