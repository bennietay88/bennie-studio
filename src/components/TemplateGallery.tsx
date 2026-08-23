import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Search,
  Layout,
  Eye,
  CheckCircle2,
  Star,
  Zap,
  Globe,
  Loader2,
  X,
  Activity,
  Target,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { generateId, cn } from "../lib/utils";
import { toast } from "sonner";
import { WebsiteRenderer } from "./WebsiteRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { getPlanPageLimit } from "../constants/pageBlueprints";
import { normalizePlans } from "../constants/plans";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";

const getSafeTemplateConfig = (template: any) => {
  const config = template?.config && typeof template.config === "object" ? template.config : {};
  const pages = Array.isArray(config.pages) && config.pages.length > 0
    ? config.pages
    : [
        {
          title: "Home",
          slug: "",
          sections: [
            {
              type: "hero",
              title: template?.name || "Professional Website",
              content: template?.description || "A professional website structure ready for your business content.",
              isVisible: true,
            },
          ],
        },
      ];

  return {
    theme: config.theme || {
      primaryColor: "#4f46e5",
      secondaryColor: "#1e293b",
      fontFamily: "Inter",
      style: "modern",
    },
    pages,
    seo: config.seo || {
      title: `${template?.name || "Website Template"} | My Business`,
      description: template?.description || "Professional business website template.",
      keywords: [template?.category || "business"],
    },
  };
};

const CATEGORIES = [
  "All",
  "Local Services",
  "Professional Services",
  "Property & Real Estate",
  "Wellness & Lifestyle",
  "Food & Retail",
  "SaaS / Digital"
];

export function TemplateGallery() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [activeIndustry, setActiveIndustry] = useState<string>("All");
  const [activeGoal, setActiveGoal] = useState<string>("All");
  const [activeLevel, setActiveLevel] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []).filter((t: any) => t.is_visible !== false));
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = async (template: any) => {
    if (!user || !profile?.businessId) {
      toast.error("Please complete your business setup first");
      navigate("/dashboard/website");
      return;
    }

    setApplying(template.id);
    try {
      const [{ data: businessData }, { data: planData }] = await Promise.all([
        supabase.from("businesses").select("plan").eq("id", profile.businessId).maybeSingle(),
        supabase.from("settings").select("content").eq("id", "plans").maybeSingle(),
      ]);
      const configuredPlans = normalizePlans(planData?.content?.pricing);
      const currentPlan = configuredPlans.find((plan) => plan.id === businessData?.plan);
      const maxPages = getPlanPageLimit(businessData?.plan, currentPlan?.maxPages);
      const config = getSafeTemplateConfig(template);

      // Map pages and sections to have new IDs
      const formattedPages = config.pages.slice(0, maxPages).map((page: any) => ({
        ...page,
        id: generateId(),
        sections: (page.sections || []).map((section: any) => ({
          ...section,
          id: generateId(),
          isVisible: true,
        })),
      }));

      const websiteData = {
        business_id: profile.businessId,
        theme: config.theme || {
          primaryColor: "#4f46e5",
          secondaryColor: "#1e293b",
          fontFamily: "Inter",
          style: "modern",
        },
        pages: formattedPages,
        seo: config.seo || {
          title: `${template.name} | My Business`,
          description: template.description,
          keywords: [template.category],
        },
        status: "draft",
        updated_at: new Date().toISOString(),
      };

      // Check if website already exists for this business
      const { data: existingWebsite } = await supabase
        .from("websites")
        .select("id")
        .eq("business_id", profile.businessId)
        .maybeSingle();

      if (existingWebsite) {
        const { error: updateError } = await supabase
          .from("websites")
          .update(websiteData)
          .eq("id", existingWebsite.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("websites").insert([
          {
            ...websiteData,
            id: generateId(),
            created_at: new Date().toISOString(),
          },
        ]);

        if (insertError) throw insertError;
      }

      toast.success(`Template "${template.name}" applied successfully!`);
      if (config.pages.length > maxPages) {
        toast.info(`Your current plan allows ${maxPages} page${maxPages === 1 ? "" : "s"}. Extra template pages were kept out of the draft.`);
      }
      navigate("/dashboard/website");
    } catch (error: any) {
      console.error("Error applying template:", error);
      toast.error("Failed to apply template: " + error.message);
    } finally {
      setApplying(null);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.premium_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === "All" || t.category === activeCategory;
    const matchesIndustry = activeIndustry === "All" || t.industry === activeIndustry;
    const matchesGoal = activeGoal === "All" || t.business_goal === activeGoal;
    const matchesLevel = activeLevel === "All" || t.premium_level === activeLevel;

    return matchesSearch && matchesCategory && matchesIndustry && matchesGoal && matchesLevel;
  });

  const INDUSTRIES = ["All", ...new Set(templates.map((t) => t.industry).filter(Boolean))];
  const GOALS = ["All", ...new Set(templates.map((t) => t.business_goal).filter(Boolean))];
  const LEVELS = ["All", "Launch", "Business", "Growth OS", "Agency Grade"];
  const getTemplatePageCount = (template: any) => getSafeTemplateConfig(template).pages.length;
  const getRecommendedPlan = (template: any) => {
    const pageCount = getTemplatePageCount(template);
    if (pageCount <= 1) return "Starter";
    if (pageCount <= 5) return "Business";
    return "Growth";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
              Premium Blueprint Library
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              High-conversion agency-grade website structures for every industry.
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
            <Input
              placeholder="Search blueprints..."
              className="pl-9 rounded-2xl border-slate-200 focus:ring-2 focus:ring-indigo-100 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                    : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center p-2 bg-slate-50/50 rounded-3xl border border-slate-100">
            <div className="flex items-center gap-2 px-3 border-r border-slate-200">
              <Layout className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Advanced:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={activeIndustry} onValueChange={setActiveIndustry}>
                <SelectTrigger className="w-32 h-8 rounded-full bg-white text-[10px] font-bold border-none shadow-sm">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
  
              <Select value={activeGoal} onValueChange={setActiveGoal}>
                <SelectTrigger className="w-32 h-8 rounded-full bg-white text-[10px] font-bold border-none shadow-sm">
                  <SelectValue placeholder="Goal" />
                </SelectTrigger>
                <SelectContent>
                  {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
  
              <Select value={activeLevel} onValueChange={setActiveLevel}>
                <SelectTrigger className="w-32 h-8 rounded-full bg-white text-[10px] font-bold border-none shadow-sm">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
  
              {(activeIndustry !== "All" || activeGoal !== "All" || activeLevel !== "All" || activeCategory !== "All") && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setActiveCategory("All");
                    setActiveIndustry("All");
                    setActiveGoal("All");
                    setActiveLevel("All");
                  }}
                  className="h-8 rounded-full text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
          <Layout className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            No templates found
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Try adjusting your search or check back later for new designs.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredTemplates.map((t) => (
            <motion.div
              key={t.id}
              whileHover={{ y: -8 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm group relative flex flex-col min-w-0"
            >
              <div className="aspect-[16/9] relative overflow-hidden">
                <TemplatePreviewThumbnail templateId={t.id} templateName={t.name} />
                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6 gap-4">
                  <Button
                    variant="secondary"
                    className="w-40 rounded-2xl bg-white text-indigo-950 font-black uppercase tracking-widest text-[10px] shadow-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/preview/template/${t.id}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </Button>
                  <Button
                    className="w-40 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl border-none hover:bg-purple-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUseTemplate(t);
                    }}
                    isLoading={applying === t.id}
                  >
                    <Zap className="h-4 w-4 mr-2" /> Apply Blueprint
                  </Button>
                </div>

                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                    {t.premium_level || "Standard"}
                  </Badge>
                </div>
                
                {t.is_premium && (
                  <div className="absolute top-4 right-4 bg-amber-400 text-amber-950 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-current" /> ELITE
                  </div>
                )}
              </div>
              
              <div className="p-6 sm:p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">
                      {t.industry || t.category} Blueprint
                    </p>
                    <Badge variant="secondary" className="bg-slate-100 text-[9px] font-black uppercase px-2 py-0 h-5">
                      {t.premium_level || "Standard"}
                    </Badge>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight line-clamp-2 italic uppercase mb-2">
                    {t.premium_name || t.name}
                  </h3>
                  <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                </div>

                  <div className="space-y-4 mb-8">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Plan</p>
                      <p className="mt-1 text-[10px] font-black text-slate-800">{getRecommendedPlan(t)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Local SEO</p>
                      <p className="mt-1 text-[10px] font-black text-slate-800">{t.local_seo_ready === false ? "Basic" : "Ready"}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Use-Case</p>
                    <p className="text-sm font-bold text-slate-700 line-clamp-3 leading-relaxed">{t.best_for || "General business lead generation and brand awareness."}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Primary Goal</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-indigo-500" /> {t.business_goal || "Conversions"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Includes</p>
                      <p className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-indigo-500" /> {t.cta_type || "Booking"} System
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <a
                    href={`/preview/template/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest group/preview"
                  >
                    Preview <Eye className="h-4 w-4 transition-transform group-hover/preview:scale-110" />
                  </a>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-[0.1em] group/btn shadow-lg shadow-purple-100"
                    onClick={() => handleUseTemplate(t)}
                    isLoading={applying === t.id}
                  >
                    Apply Blueprint <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {/* Preview Dialog */}
      <Dialog
        open={!!previewTemplate}
        onOpenChange={() => setPreviewTemplate(null)}
      >
        <DialogContent className="sm:max-w-[80vw] max-w-[95vw] w-full sm:w-[80vw] h-[90vh] p-0 flex flex-col rounded-3xl border-none shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Sidebar with Blueprint Intel */}
            <div className="w-full lg:w-80 border-r bg-white p-8 overflow-y-auto space-y-8">
              <div>
                <Badge className="bg-indigo-600 text-white border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                  {previewTemplate?.premium_level || "Agency Grade"}
                </Badge>
                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 mb-2">
                  {previewTemplate?.premium_name || previewTemplate?.name}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                  Blueprint Strategy Breakdown
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3 flex items-center gap-2">
                    <Globe className="w-3 h-3" /> Industry Fit
                  </h4>
                  <p className="text-sm font-bold text-slate-700">{previewTemplate?.industry || previewTemplate?.category}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-3 flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Business Goal
                  </h4>
                  <p className="text-sm font-bold text-slate-700">{previewTemplate?.business_goal || "Lead Generation"}</p>
                </div>

                <div className="pt-6 border-t">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Conversion Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {["Sticky CTA", "Social Proof", "Fast Load"].map(f => (
                      <Badge key={f} variant="outline" className="text-[8px] font-bold uppercase tracking-tight py-1">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-auto">
                <Button
                  onClick={() => handleUseTemplate(previewTemplate)}
                  isLoading={applying === previewTemplate?.id}
                  className="w-full h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-100 text-[10px] font-black uppercase tracking-widest"
                >
                  <Zap className="h-4 w-4 mr-2" /> Apply This Blueprint
                </Button>
              </div>
            </div>

            {/* Live Preview Area */}
            <div className="flex-1 bg-slate-100 relative">
               <iframe 
                src={`/preview/template/${previewTemplate?.id}`}
                className="w-full h-full border-none"
                title="Template Preview"
                scrolling="yes"
               />
               <div className="absolute top-6 right-6">
                 <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/90 backdrop-blur rounded-xl border-none shadow-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white"
                    onClick={() => window.open(`/preview/template/${previewTemplate?.id}`, '_blank')}
                 >
                   <ExternalLink className="h-3 w-3 mr-2" /> Open in New Tab
                 </Button>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
