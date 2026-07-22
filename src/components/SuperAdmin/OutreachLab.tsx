import React, { useState, useEffect } from "react";
import { MessageSquare, Mail, Zap, Target, Send, Users, ChevronRight, Loader2, Sparkles, Copy, Trash2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";

export function OutreachLab() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [selectedProspectId, setSelectedProspectId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [outreachMessage, setOutreachMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (error) {
      console.error("Error fetching prospects:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateOutreach = async () => {
    if (!selectedProspectId) {
      toast.error("Please select a prospect first.");
      return;
    }

    const prospect = prospects.find(p => p.id === selectedProspectId);
    if (!prospect) return;

    try {
      setGenerating(true);
      // In a real app, this would call Gemini API with the audit report
      setOutreachMessage("");
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      const scoreLine = typeof prospect.audit_score === "number"
        ? `The deterministic website audit scored ${prospect.audit_score}/100 and identified specific areas to improve.`
        : "I noticed several areas where the website journey could be clearer, but I have not assigned an audit score yet.";
      const message = `Hi ${prospect.name} team,

I reviewed your website (${prospect.domain}). ${scoreLine}

I've prepared a practical improvement summary covering the evidence found in the audit.

Would you be open to a 10-minute strategy call on Tuesday or Wednesday? I'd love to walk you through exactly how to patch these leaks.

Best regards,
SuperAdmin Outreach Team`;

      setOutreachMessage(message);
      toast.success("Outreach copy generated!");
    } catch (error) {
      toast.error("Failed to generate outreach");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outreachMessage);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
            Outreach <span className="text-indigo-600">Lab</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High-velocity conversion sequences powered by audit data.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl border-slate-200 h-11">Templates</Button>
          <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-[10px]">
            New Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white border-none min-h-[400px] flex flex-col">
          <CardHeader className="p-8 pb-4">
             <CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-400">Personalization Engine</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-0 flex flex-col flex-1">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tight mb-2 leading-none">Script <span className="text-indigo-400">Generator</span></h2>
                <p className="text-slate-300 font-bold text-xs leading-relaxed">
                  Select a prospect to generate a data-backed outreach sequence.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Target Prospect</label>
                  <Select value={selectedProspectId} onValueChange={setSelectedProspectId}>
                    <SelectTrigger className="rounded-xl bg-white/5 border-white/10 text-white h-12">
                      <SelectValue placeholder="Select prospect..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {prospects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.domain})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={generateOutreach}
                  disabled={generating || !selectedProspectId}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generate Personalization
                </Button>
              </div>
            </div>
            
            <div className="mt-auto pt-8 flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <Zap className="h-6 w-6 text-indigo-400" />
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Success Velocity</p>
                <p className="text-lg font-black italic">+24% ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black italic uppercase italic tracking-tight">Sequence Output</CardTitle>
                <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Review and refine the generated outreach before sending.</CardDescription>
              </div>
              {outreachMessage && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => toast.info("Opening associated Neural Audit for context...")} 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl h-8 px-4 font-black uppercase tracking-widest text-[10px] border-indigo-100 text-indigo-600"
                  >
                    <Shield className="h-4 w-4 mr-2" /> View Audit
                  </Button>
                  <Button onClick={copyToClipboard} variant="outline" size="sm" className="rounded-xl h-8 px-4 font-black uppercase tracking-widest text-[10px]">
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
              )}
          </CardHeader>
          <CardContent className="p-8 flex-1">
             {outreachMessage ? (
                <div className="bg-slate-50 rounded-[1.5rem] p-6 border border-slate-100 min-h-[250px] whitespace-pre-wrap text-sm font-medium text-slate-700 leading-relaxed">
                  {outreachMessage}
                </div>
             ) : (
                <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                  <Mail className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold text-sm">No outreach generated yet.</p>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-2">Select a prospect and hit generate.</p>
                </div>
             )}
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between">
             <div className="flex gap-2">
                <Badge variant="outline" className="rounded-full bg-white text-slate-400 border-slate-200">Email sequence</Badge>
                <Badge variant="outline" className="rounded-full bg-white text-slate-400 border-slate-200">LinkedIn Step 1</Badge>
             </div>
             <Button 
                disabled={!outreachMessage}
                className="rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] h-10 px-8"
              >
               Send Now
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
