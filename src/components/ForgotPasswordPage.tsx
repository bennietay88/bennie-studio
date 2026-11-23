import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Lock, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function ForgotPasswordPage() {
  const { resetPassword, isSigningIn, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword(email);
    setSent(true);
  };

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] flex items-center justify-center px-5 py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full rounded-2xl border border-[#dbe1ea] bg-white p-6 space-y-8 sm:p-10"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-xl bg-[#1741ed] flex items-center justify-center">
              <Lock className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#15191f]">
            Reset Password
          </h1>
          <p className="text-base leading-7 text-[#526071]">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-6">
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-900">
              If an account exists for {email}, you will receive a password
              reset link shortly.
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="min-h-12 w-full rounded-lg bg-[#1741ed] font-bold text-white hover:bg-[#1035c2]"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-semibold text-[#25364b]">
                Email Address
              </label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] focus:bg-white"
              />
            </div>
            <Button
              type="submit"
              className="min-h-12 w-full rounded-lg bg-[#1741ed] font-bold text-white hover:bg-[#1035c2]"
              isLoading={isSigningIn}
            >
              Send Reset Link
            </Button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full text-sm font-semibold text-[#1741c9] hover:text-[#1035c2] transition-colors"
            >
              Back to Login
            </button>
          </form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800"
            >
              <span className="text-left">{error}</span>
              <button
                onClick={clearError}
                className="shrink-0 p-1 hover:bg-red-100 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
