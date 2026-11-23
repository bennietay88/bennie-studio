import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { Shield, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const { updatePassword, isSigningIn, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    await updatePassword(password);
    navigate("/login");
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
              <Shield className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#15191f]">
            New Password
          </h1>
          <p className="text-base leading-7 text-[#526071]">
            Please enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="reset-password" className="text-sm font-semibold text-[#25364b]">
              New Password
            </label>
            <Input
              id="reset-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] focus:bg-white"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-semibold text-[#25364b]">
              Confirm Password
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="h-12 rounded-lg border-[#dbe1ea] bg-[#f8faff] focus:bg-white"
            />
          </div>
          <Button
            type="submit"
            className="min-h-12 w-full rounded-lg bg-[#1741ed] font-bold text-white hover:bg-[#1035c2]"
            isLoading={isSigningIn}
          >
            Update Password
          </Button>
        </form>

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
