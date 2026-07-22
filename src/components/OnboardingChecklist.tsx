import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layout,
  Settings,
  Image as ImageIcon,
  ShoppingBag,
  MessageSquare,
  Calendar,
  Globe,
  Send,
} from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

interface OnboardingItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  link: string;
  completed: boolean;
}

export const OnboardingChecklist: React.FC<{ businessId: string }> = ({
  businessId,
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(true);
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!businessId) return;
      
      try {
        setLoading(true);
        const [
          { data: business },
          { data: website },
          { data: products },
          { data: appointmentSettings },
          { count: leadCount }
        ] = await Promise.all([
          supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
          supabase.from("websites").select("*").eq("business_id", businessId).maybeSingle(),
          supabase.from("products").select("id").eq("business_id", businessId).limit(1),
          supabase.from("appointment_settings").select("*").eq("business_id", businessId).maybeSingle(),
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("business_id", businessId)
        ]);

  const onboardingItems: OnboardingItem[] = [
    {
      id: "step0",
      title: "Take a Feature Tour",
      description: "Quick walkthrough of your ecosystem's core functionalities.",
      icon: Send,
      link: "#tour",
      completed: !!localStorage.getItem("hasSeenTour"),
    },
    {
      id: "step1",
      title: "Complete Business Profile",
      description: "Define your industry, location, and core business offerings.",
      icon: Settings,
      link: "/dashboard/settings",
      completed: !!business?.industry && !!business?.business_nature,
    },
    {
      id: "step2",
      title: "Choose Website Template",
      description: "Select a high-converting layout optimized for your niche.",
      icon: Layout,
      link: "/dashboard/marketplace",
      completed: !!website?.theme && !!website?.pages && website.pages.length > 0,
    },
    {
      id: "step3",
      title: "Generate Website Copy",
      description: "Use Standard or Premium AI to write revenue-focused content.",
      icon: Sparkles,
      link: "/dashboard/website/regenerate",
      completed: !!website?.pages?.some(p => 
        p.sections?.some(s => s.type === 'hero' && (s.content?.title || s.content?.headline))
      ),
    },
    {
      id: "step4",
      title: "Activate Lead Capture",
      description: "Enable intelligent forms to capture and score your leads.",
      icon: MessageSquare,
      link: "/dashboard/website",
      completed: !!website?.pages?.some(p => 
        p.sections?.some(s => ['contact', 'lead_form', 'enquiry'].includes(s.type))
      ),
    },
    {
      id: "step5",
      title: "Connect Appointment Booking",
      description: "Sync your calendar so customers can book meetings directly.",
      icon: Calendar,
      link: "/dashboard/appointments",
      completed: !!appointmentSettings && Object.keys(appointmentSettings).length > 0 && !!appointmentSettings.working_hours,
    },
    {
      id: "step6",
      title: "Review SEO Content",
      description: "Optimize your metadata for maximum search engine visibility.",
      icon: Globe,
      link: "/dashboard/website",
      completed: !!website?.seo?.title || !!website?.pages?.some(p => !!p.seo?.title),
    },
    {
      id: "step7",
      title: "Publish Website",
      description: "Deploy your site to the web and start generating revenue.",
      icon: CheckCircle2,
      link: "/dashboard/website",
      completed: website?.status === "published" || website?.status === "active",
    },
  ];

        setItems(onboardingItems);
      } catch (err) {
        console.error("Error fetching onboarding progress:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();

    // Set up a robust real-time channel for automated progress tracking
    const channel = supabase
      .channel(`onboarding-tracker-${businessId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'businesses', 
          filter: `id=eq.${businessId}` 
        },
        () => {
          console.log("Onboarding: business changed, refreshing...");
          fetchProgress();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'websites', 
          filter: `business_id=eq.${businessId}` 
        },
        () => {
          console.log("Onboarding: website changed, refreshing...");
          fetchProgress();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'products', 
          filter: `business_id=eq.${businessId}` 
        },
        () => {
          console.log("Onboarding: products changed, refreshing...");
          fetchProgress();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointment_settings', 
          filter: `business_id=eq.${businessId}` 
        },
        () => {
          console.log("Onboarding: settings changed, refreshing...");
          fetchProgress();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'leads', 
          filter: `business_id=eq.${businessId}` 
        },
        () => {
          console.log("Onboarding: leads changed, refreshing...");
          fetchProgress();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Onboarding: Realtime tracking active for', businessId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const completedCount = items.filter((i) => i.completed).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  if (loading) return null;
  if (progressPercent === 100) return null; // Hide if fully completed

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/50 shadow-xl overflow-hidden mb-12"
    >
      <div
        className="p-8 cursor-pointer flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-950/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-6">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Onboarding Checklist
            </h2>
            <p className="text-slate-500 font-medium">
              Complete these steps to launch your revenue-ready system.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              {progressPercent}% Complete
            </div>
            <div className="w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="h-full bg-indigo-600"
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            {isExpanded ? (
              <ChevronUp className="h-6 w-6" />
            ) : (
              <ChevronDown className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 grid md:grid-cols-2 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.link === "#tour") {
                      window.dispatchEvent(new CustomEvent("startFeatureTour"));
                    } else {
                      navigate(item.link);
                    }
                  }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                    item.completed
                      ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-600"
                  }`}
                >
                  <div
                    className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                      item.completed
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 group-hover:bg-indigo-600 group-hover:text-white"
                    }`}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <item.icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-bold truncate ${
                        item.completed
                          ? "text-emerald-900 dark:text-emerald-100 line-through opacity-60"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate font-medium">
                      {item.description}
                    </p>
                  </div>
                  {!item.completed && (
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
