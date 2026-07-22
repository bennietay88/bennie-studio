import React from "react";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import {
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  Facebook,
  Instagram,
  Mail,
  Zap,
  FileText,
  Search,
  MessageCircle,
  HelpCircle,
  MapPin,
  MousePointerClick,
  Type,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "sonner";
import { generateMarketingContent, askAI } from "../lib/gemini";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import ReactMarkdown from "react-markdown";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function AIContentHub() {
  const { profile } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [business, setBusiness] = React.useState<any>(null);
  const [contentType, setContentType] = React.useState<
    "ad" | "email" | "social" | "blog" | "seo" | "faq" | "whatsapp" | "local" | "headline" | "service" | "cta"
  >("ad");
  const [results, setResults] = React.useState<any[]>([]);
  const [blogResults, setBlogResults] = React.useState<any[]>([]);
  const [customPrompt, setCustomPrompt] = React.useState("");

  const buildBusinessContext = () => ({
    id: business.id,
    name: business.name,
    industry: business.industry,
    description: customPrompt || business.description || "",
    location: business.location || "",
    targetCustomer: business.target_customer || "local customers",
    mainService: business.main_service || business.industry || "core service",
  });

  const normalizeAssistantResult = (response: any, fallbackTitle: string) => {
    if (Array.isArray(response)) {
      return response.map((item, index) => ({
        platform: item.platform || item.type || `${fallbackTitle} ${index + 1}`,
        headline: item.headline || item.title || item.question || fallbackTitle,
        primaryText: item.primaryText || item.body || item.description || item.answer || JSON.stringify(item, null, 2),
      }));
    }
    if (response && typeof response === "object") {
      if (response.variations && Array.isArray(response.variations)) {
        return normalizeAssistantResult(response.variations, fallbackTitle);
      }
      return [{
        platform: response.platform || response.type || fallbackTitle,
        headline: response.headline || response.title || response.seoTitle || response.question || fallbackTitle,
        primaryText:
          response.primaryText ||
          response.body ||
          response.description ||
          response.metaDescription ||
          response.answer ||
          JSON.stringify(response, null, 2),
      }];
    }
    return [{
      platform: fallbackTitle,
      headline: fallbackTitle,
      primaryText: String(response || ""),
    }];
  };

  React.useEffect(() => {
    if (profile?.businessId) {
      supabase
        .from("businesses")
        .select("*")
        .eq("id", profile.businessId)
        .single()
        .then(({ data }) => setBusiness(data));
    }
  }, [profile?.businessId]);

  const handleGenerate = async () => {
    if (!business) return;
    setLoading(true);
    try {
      if (contentType === "ad") {
        const res = await generateMarketingContent("ad_copy", {
          id: business.id,
          name: business.name,
          industry: business.industry,
          description: business.description || "",
          location: business.location || "",
        });
        setResults(res.variations || []);
        setBlogResults([]);
      } else if (contentType === "blog") {
        const prompt = `Write a high-converting, SEO-optimized blog post for "${business.name}" in the "${business.industry}" industry.
        Topic: ${customPrompt || "The benefits of professional " + business.industry + " services"}
        Structure: Title, Intro, 3 Key Points, Conclusion.
        Return as JSON with: title, excerpt, content (markdown).`;

        const aiResponse = await askAI("blog", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setBlogResults([aiResponse]);
        setResults([]);
      } else if (contentType === "seo") {
        const context = buildBusinessContext();
        const prompt = `Generate SEO metadata for a template-based managed website.
Business context: ${JSON.stringify(context)}
Rules:
- Do not invent local claims, testimonials, addresses, or guarantees.
- Keep the SEO title under 60 characters where possible.
- Keep the meta description around 150-160 characters.
Return JSON: [
  {"type":"SEO Title","title":"...","description":"Why this title works"},
  {"type":"Meta Description","title":"...","description":"..."},
  {"type":"Focus Keywords","title":"Keyword Set","description":"keyword 1, keyword 2, keyword 3"}
]`;
        const aiResponse = await askAI("seo", prompt, {
          businessId: business.id,
          featureKey: "seo_meta",
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "SEO Metadata"));
        setBlogResults([]);
      } else if (contentType === "faq") {
        const context = buildBusinessContext();
        const prompt = `Generate 6 useful customer FAQs for this business website.
Business context: ${JSON.stringify(context)}
Rules:
- Answer like a real small business website, not a technical software page.
- Do not invent awards, reviews, certifications, addresses, prices, or local proof.
- If proof is missing, use neutral wording.
Return JSON array: [{"question":"...","answer":"..."}]`;
        const aiResponse = await askAI("copy", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "FAQ"));
        setBlogResults([]);
      } else if (contentType === "whatsapp") {
        const context = buildBusinessContext();
        const prompt = `Create WhatsApp enquiry scripts for this business.
Business context: ${JSON.stringify(context)}
Return JSON array with 4 options:
- short website CTA message
- quote request starter
- booking request starter
- follow-up reply after enquiry
Use fields: platform, headline, primaryText.
Do not invent discounts, urgency, or fake availability.`;
        const aiResponse = await askAI("copy", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "WhatsApp Script"));
        setBlogResults([]);
      } else if (contentType === "local") {
        const context = buildBusinessContext();
        const prompt = `Write safe local SEO copy for a location/service page.
Business context: ${JSON.stringify(context)}
Requested focus: ${customPrompt || "primary city and main service"}
Rules:
- Do not create fake local experience, fake project examples, fake reviews, or fake addresses.
- If local proof is not provided, write neutral copy and suggest proof to add.
- Preserve template layout. Only produce content fields.
Return JSON array: [
  {"type":"Local Hero","headline":"...","primaryText":"..."},
  {"type":"Local Problem","headline":"...","primaryText":"..."},
  {"type":"Nearby Areas","headline":"...","primaryText":"..."},
  {"type":"Local CTA","headline":"...","primaryText":"..."}
]`;
        const aiResponse = await askAI("seo", prompt, {
          businessId: business.id,
          featureKey: "seo_meta",
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "Local SEO Copy"));
        setBlogResults([]);
      } else if (contentType === "headline") {
        const context = buildBusinessContext();
        const prompt = `Generate 8 homepage or section headline options for this business.
Business context: ${JSON.stringify(context)}
Rules:
- Clear, buyer-friendly, conversion-focused.
- Avoid fake claims and hype.
- Max 12 words each.
Return JSON array using fields: headline, primaryText.`;
        const aiResponse = await askAI("copy", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "Headline Options"));
        setBlogResults([]);
      } else if (contentType === "service") {
        const context = buildBusinessContext();
        const prompt = `Rewrite or generate service descriptions for this business website.
Business context: ${JSON.stringify(context)}
Requested service/detail: ${customPrompt || context.mainService}
Rules:
- Explain the service clearly.
- Focus on customer problems, benefits, and next step.
- Do not invent certifications, reviews, or results.
Return JSON array with 3 service description options using fields: headline, primaryText.`;
        const aiResponse = await askAI("copy", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "Service Description"));
        setBlogResults([]);
      } else if (contentType === "cta") {
        const context = buildBusinessContext();
        const prompt = `Generate CTA button and section copy options for this business website.
Business context: ${JSON.stringify(context)}
Rules:
- Include low-friction CTAs for contact, quote, booking, WhatsApp, and callback.
- No fake urgency.
Return JSON array using fields: headline, primaryText.`;
        const aiResponse = await askAI("copy", prompt, {
          businessId: business.id,
          isJson: true,
        });
        setResults(normalizeAssistantResult(aiResponse, "CTA Options"));
        setBlogResults([]);
      } else if (contentType === "email") {
        const res = await generateMarketingContent("email", {
          id: business.id,
          name: business.name,
          industry: business.industry,
          description: customPrompt || business.description || "",
          location: business.location || "",
        });
        setResults(res.variations || []);
        setBlogResults([]);
      } else if (contentType === "social") {
        const res = await generateMarketingContent("social", {
          id: business.id,
          name: business.name,
          industry: business.industry,
          description: customPrompt || business.description || "",
          location: business.location || "",
        });
        setResults(res.variations || []);
        setBlogResults([]);
      }
      toast.success("Content generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate content.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const websiteCopyTypes = [
    "seo",
    "faq",
    "whatsapp",
    "local",
    "headline",
    "service",
    "cta",
  ];
  const parameterLabels: Record<typeof contentType, { context: string; prompt: string; placeholder: string }> = {
    ad: {
      context: "Campaign Context",
      prompt: "Offer, Audience, Platform, or Promotion",
      placeholder:
        "Example: Facebook ad for dental whitening in Kuala Lumpur. Focus on appointment bookings and WhatsApp enquiries.",
    },
    email: {
      context: "Email Campaign Context",
      prompt: "Campaign Goal, Audience, Offer, or Follow-Up Angle",
      placeholder:
        "Example: 3-email follow-up sequence for new enquiries. Friendly tone, invite them to book a consultation.",
    },
    social: {
      context: "Social Post Context",
      prompt: "Platform, Topic, Offer, or Content Angle",
      placeholder:
        "Example: Instagram carousel for renovation services, showing trust, process, and quote CTA.",
    },
    blog: {
      context: "Blog Topic",
      prompt: "Custom Topic",
      placeholder: "Example: How to choose the right clinic for dental implants in Singapore.",
    },
    seo: {
      context: "SEO Page Context",
      prompt: "Service, Location, Focus Keyword, or Existing Copy",
      placeholder:
        "Example: SEO title and meta for website design in London, targeting local service businesses.",
    },
    faq: {
      context: "FAQ Context",
      prompt: "Customer Questions, Service, Location, or Objections",
      placeholder:
        "Example: FAQs for first-time dental patients asking about pricing, booking, and treatment process.",
    },
    whatsapp: {
      context: "WhatsApp Script Context",
      prompt: "Service, Enquiry Type, Follow-Up Goal, or Tone",
      placeholder:
        "Example: WhatsApp enquiry opener for customers requesting a renovation quote.",
    },
    local: {
      context: "Local SEO Context",
      prompt: "Service, City, Nearby Areas, Tone, or Local Proof",
      placeholder:
        "Example: Physiotherapy services in Petaling Jaya. Include nearby areas and neutral local copy.",
    },
    headline: {
      context: "Headline Context",
      prompt: "Main Service, Audience, Location, Benefit, or Tone",
      placeholder:
        "Example: Premium but friendly homepage headline for an aesthetic clinic in Singapore.",
    },
    service: {
      context: "Service Copy Context",
      prompt: "Service Details, Pain Points, Benefits, or Existing Copy",
      placeholder:
        "Example: Rewrite our teeth whitening service copy to sound clearer and more appointment-focused.",
    },
    cta: {
      context: "CTA Context",
      prompt: "Visitor Action, Offer, Contact Method, or Page Goal",
      placeholder:
        "Example: CTA options for booking a free consultation by WhatsApp or contact form.",
    },
  };
  const activeParameter = parameterLabels[contentType];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Helmet>
        <title>
          {business?.name
            ? `${business.name} | Content Studio`
            : "Content Studio"}
        </title>
        <meta
          name="description"
          content={`Generate high-conversion marketing materials for ${business?.name || "your business"} using enterprise-grade generation systems.`}
        />
      </Helmet>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-100 dark:shadow-none">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              Content Studio
            </h1>
            <p className="text-slate-500 font-medium italic">
              Generate high-conversion marketing materials instantly.
            </p>
          </div>
        </div>

        {business && (
          <div 
            className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm cursor-pointer hover:border-indigo-300 transition-all"
            onClick={() => window.location.href = "/dashboard/ai-usage"}
          >
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Neural Fuel</p>
              <div className="flex items-baseline gap-1">
                {(() => {
                  const total = Math.max(0, Number(business.ai_credits || 0));
                  const used = Math.max(0, Number(business.ai_credits_used || 0));
                  const remaining = Math.max(0, total - used);
                  return (
                    <>
                      <span className="text-lg font-black text-slate-900 dark:text-white">{remaining}</span>
                      <span className="text-[10px] font-bold text-slate-400">/ {total} CREDITS</span>
                      {used > total && (
                        <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700">
                          Over limit
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none h-full">
            <CardHeader className="p-8">
              <CardTitle className="text-xl font-bold">Parameters</CardTitle>
              <CardDescription>
                Configure the neural engine for your content needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-4 rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                    Configure Parameters
                  </Label>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                    Add the offer, service, location, tone, or existing copy the
                    AI should use. This changes based on the selected content
                    type.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {activeParameter.context}
                  </Label>
                  <div className="rounded-2xl border border-white bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {contentType === "blog"
                        ? customPrompt || "Strategic Content Pillar"
                        : websiteCopyTypes.includes(contentType)
                          ? business?.description ||
                            "Use the field below to add service, location, tone, or existing copy."
                          : business?.name || "Loading business context..."}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      {business?.industry || "Business profile"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {activeParameter.prompt}
                  </Label>
                  <Textarea
                    placeholder={activeParameter.placeholder}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="min-h-28 rounded-2xl border-white bg-white text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Content Type
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant={contentType === "headline" ? "default" : "outline"}
                    onClick={() => setContentType("headline")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <Type className="h-4 w-4" />
                    <span>Headlines</span>
                  </Button>
                  <Button
                    variant={contentType === "service" ? "default" : "outline"}
                    onClick={() => setContentType("service")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Service Copy</span>
                  </Button>
                  <Button
                    variant={contentType === "seo" ? "default" : "outline"}
                    onClick={() => setContentType("seo")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <Search className="h-4 w-4" />
                    <span>SEO Title & Meta</span>
                  </Button>
                  <Button
                    variant={contentType === "faq" ? "default" : "outline"}
                    onClick={() => setContentType("faq")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>FAQs</span>
                  </Button>
                  <Button
                    variant={contentType === "local" ? "default" : "outline"}
                    onClick={() => setContentType("local")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Local SEO Copy</span>
                  </Button>
                  <Button
                    variant={contentType === "whatsapp" ? "default" : "outline"}
                    onClick={() => setContentType("whatsapp")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>WhatsApp Scripts</span>
                  </Button>
                  <Button
                    variant={contentType === "cta" ? "default" : "outline"}
                    onClick={() => setContentType("cta")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <MousePointerClick className="h-4 w-4" />
                    <span>CTA Options</span>
                  </Button>
                  <Button
                    variant={contentType === "ad" ? "default" : "outline"}
                    onClick={() => setContentType("ad")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <Send className="h-4 w-4" />
                    <span>Ad Copy (FB/Google)</span>
                  </Button>
                  <Button
                    variant={contentType === "email" ? "default" : "outline"}
                    onClick={() => setContentType("email")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Campaign</span>
                  </Button>
                  <Button
                    variant={contentType === "social" ? "default" : "outline"}
                    onClick={() => setContentType("social")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>Social Media Posts</span>
                  </Button>
                  <Button
                    variant={contentType === "blog" ? "default" : "outline"}
                    onClick={() => setContentType("blog")}
                    className="justify-start gap-3 h-14 rounded-2xl border-slate-100 dark:border-slate-800"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Blog Post</span>
                  </Button>
                </div>
              </div>

            </CardContent>
            <CardFooter className="p-8 pt-0">
              <Button
                onClick={handleGenerate}
                disabled={loading || !business}
                className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none"
              >
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" /> Synthesize
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {results.length === 0 && blogResults.length === 0 && !loading ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
              <div className="h-20 w-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700 mb-6 shadow-sm">
                <Sparkles className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">
                Ready for Synthesis
              </h3>
              <p className="text-slate-500 max-w-sm mt-2 font-medium">
                Configure your parameters and click synthesize to generate
                high-conversion marketing content.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {loading ? (
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <Card
                      key={i}
                      className="animate-pulse rounded-[2.5rem] border-slate-100 dark:border-slate-800"
                    >
                      <div className="h-64 bg-slate-50/50 dark:bg-slate-900/50" />
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {blogResults.map((result, idx) => (
                    <motion.div
                      key={`blog-${idx}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                        <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle className="text-xl font-bold">
                                  {result.title}
                                </CardTitle>
                                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-orange-600">
                                  SEO Optimized Long-form Pillar
                                </CardDescription>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                copyToClipboard(
                                  `# ${result.title}\n\n${result.content}`,
                                )
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 italic">
                            {result.excerpt}
                          </div>
                          <div className="prose prose-slate dark:prose-invert max-w-none prose-sm prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase">
                            <ReactMarkdown>{result.content}</ReactMarkdown>
                          </div>
                        </CardContent>
                        <CardFooter className="p-8 border-t border-slate-50 dark:border-slate-800">
                          <Button className="w-full h-14 rounded-2xl bg-slate-950 text-white font-bold">
                            Publish to Blog CMS
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}

                  {results.map((result, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Card className="rounded-[2.5rem] border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
                        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 p-8 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                              {result.platform === "Facebook" ? (
                                <Facebook className="h-4 w-4" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold">
                                {result.platform} Variation {idx + 1}
                              </CardTitle>
                              <CardDescription className="text-[10px] uppercase font-black tracking-widest text-indigo-600">
                                Optimized for Conversion
                              </CardDescription>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-indigo-50 hover:text-indigo-600"
                            onClick={() =>
                              copyToClipboard(
                                `${result.headline}\n\n${result.primaryText}`,
                              )
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Headline
                            </Label>
                            <p className="text-lg font-black text-slate-950 dark:text-white leading-tight">
                              {result.headline}
                            </p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Primary Text / Body
                            </Label>
                            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium">
                              {result.primaryText}
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="p-8 pt-0 flex justify-end gap-3">
                          <Button
                            variant="outline"
                            className="rounded-xl border-slate-200 text-xs font-bold h-10 px-6"
                          >
                            Regenerate This
                          </Button>
                          <Button className="rounded-xl bg-slate-950 text-white hover:bg-slate-800 text-xs font-bold h-10 px-6">
                            Apply to Ads
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
