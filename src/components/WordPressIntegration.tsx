import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Copy,
  ChevronRight,
  Terminal,
  Activity,
  History,
  Layout,
  Plus,
  Zap,
  Download,
  Shield,
  Users
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useFeatures } from "../hooks/useFeatures";
import { supabase } from "../lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "../lib/utils";

export default function WordPressIntegration() {
  const { business } = useAuth();
  const { platformSettings, isFeatureEnabled, isFeatureVisible } = useFeatures();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [stats, setStats] = useState({ leads: 0, pages: 0, events: 0 });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (business?.id) {
      fetchIntegrations();
    }
  }, [business?.id]);

  const fetchStats = async (integrationId: string) => {
    if (!business?.id) return;
    try {
      const [leadsRes, pagesRes, eventsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("integration_id", integrationId),
        supabase
          .from("generated_pages")
          .select("id", { count: "exact", head: true })
          .eq("integration_id", integrationId),
        supabase
          .from("tracking_events")
          .select("id", { count: "exact", head: true })
          .eq("integration_id", integrationId)
      ]);

      setStats({
        leads: leadsRes.count || 0,
        pages: pagesRes.count || 0,
        events: eventsRes.count || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    if (selectedIntegration?.id) {
      fetchStats(selectedIntegration.id);
    }
  }, [selectedIntegration?.id]);

  const fetchIntegrations = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wordpress_integrations")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
      if (data && data.length > 0 && !selectedIntegration) {
        setSelectedIntegration(data[0]);
      }
    } catch (err: any) {
      toast.error("Failed to load integrations: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const createIntegration = async () => {
    if (!business?.id) {
      toast.error("Business information is missing. Please complete onboarding first.");
      return;
    }
    if (!newSiteUrl) {
      toast.error("Please enter your WordPress site URL");
      return;
    }

    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;

      if (!token) {
        throw new Error("You must be logged in to create an integration");
      }

      const response = await fetch("/api/integrations/wordpress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: business.id,
          siteUrl: newSiteUrl
        })
      });

      // HEALER: If standard fetch fails due to auth, we fallback to supabase client if possible or show error
      if (!response.ok) {
        throw new Error("Failed to create integration via API");
      }

      const data = await response.json();
      
      // Since it's a one-time key, we MUST show it to the user now
      setIntegrations([data, ...integrations]);
      setSelectedIntegration(data);
      setShowInviteModal(false);
      setNewSiteUrl("");
      
      // Auto-open instruction modal or success state with key
      toast.success("Integration profile created!");
      
      // Important: The API returns rawApiKey. We should display it now.
      setNewIntegrationKey(data.rawApiKey);
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const regenerateKey = async () => {
    if (!selectedIntegration) return;
    if (!confirm("Are you sure you want to regenerate the API key? The old key will immediately stop working.")) {
      return;
    }

    setIsRegenerating(true);
    try {
      const sessionResponse = await supabase.auth.getSession();
      const token = sessionResponse.data.session?.access_token;
      
      if (!token) throw new Error("Auth session missing");

      const response = await fetch(`/api/integrations/wordpress/${selectedIntegration.id}/regenerate-key`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to regenerate key");

      const data = await response.json();
      
      // Update the local list
      const updated = integrations.map(int => int.id === selectedIntegration.id ? data : int);
      setIntegrations(updated);
      setSelectedIntegration(data);
      setNewIntegrationKey(data.rawApiKey); // Use the new clear-text key to show the modal
      
      toast.success("API Key regenerated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate key");
    } finally {
      setIsRegenerating(false);
    }
  };

  const testConnectivity = async () => {
    if (!selectedIntegration) return;
    setIsTesting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch("/api/integrations/wordpress/test-remote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ integrationId: selectedIntegration.id })
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Connection to WordPress site successful!");
        fetchIntegrations(); // Refresh status
      } else {
        toast.error("Connection failed: " + (data.error || "Remote plugin unreachable"));
      }
    } catch (err: any) {
      toast.error("Error testing connection: " + err.message);
    } finally {
      setIsTesting(false);
    }
  };

  const [newIntegrationKey, setNewIntegrationKey] = useState<string | null>(null);

  const fetchLogs = async (integrationId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("sync_logs")
        .select("*")
        .eq("integration_id", integrationId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error("Failed to load logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (selectedIntegration && activeTab === "logs") {
      fetchLogs(selectedIntegration.id);
    }
  }, [selectedIntegration, activeTab]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading && integrations.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Global, plan, and tenant visibility checks. Superadmin controls tenant visibility
  // from the business edit modal; hidden/admin-only businesses should not see setup.
  if (
    !isFeatureEnabled("wordpress_sync") ||
    !isFeatureVisible("wordpress_sync") ||
    platformSettings?.marketingFeatures?.wordpressIntegration === "disabled"
  ) {
    return (
      <Card className="p-12 text-center max-w-2xl mx-auto rounded-[2.5rem] border-dashed border-2 border-slate-100">
        <div className="mx-auto h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
           <Zap className="h-10 w-10 text-slate-300" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-4">WordPress Setup <span className="text-purple-600">Disabled</span></h2>
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
           WordPress setup is currently managed by the platform administrator or disabled for this account. Contact support if this customer needs a WordPress connection.
        </p>
        <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => window.history.back()}>
           Go Back
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WordPress Integration</h1>
          <p className="text-muted-foreground">
            Connect your WordPress websites to centralize leads and content delivery.
          </p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Site
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="rounded-full bg-primary/10 p-6 mb-4">
            <Globe className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl mb-2">Connect Your First WordPress Site</CardTitle>
          <CardDescription className="max-w-md mx-auto mb-8">
            Install the GrowthOS Connector plugin on your WordPress site to sync leads, track events, and push generated pages directly to your CMS.
          </CardDescription>
          
          <div className="w-full max-w-sm space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="empty-site-url">Site URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="empty-site-url"
                  placeholder="https://mywebsite.com" 
                  value={newSiteUrl} 
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={createIntegration}>
              Generate Integration Key
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Site List */}
          <Card className="lg:col-span-1 h-fit">
            <CardHeader className="p-4">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Your Integrations
              </CardTitle>
            </CardHeader>
            <div className="p-2 space-y-1">
              {integrations.map((integration) => (
                <button
                  key={integration.id}
                  onClick={() => setSelectedIntegration(integration)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm",
                    selectedIntegration?.id === integration.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{integration.site_url.replace(/(^\w+:|^)\/\//, "")}</span>
                  {integration.status === "connected" && (
                    <div className="h-2 w-2 rounded-full bg-green-400 ml-auto" title="Connected" />
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedIntegration ? (
              <>
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <Globe className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">
                            {selectedIntegration.site_url}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={selectedIntegration.status === "connected" ? "default" : "secondary"}>
                              {selectedIntegration.status.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Created {formatDate(selectedIntegration.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => fetchIntegrations()}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <Tabs value={activeTab} onValueChange={setActiveTab} className="p-0">
                    <div className="px-6 border-b bg-muted/30">
                      <TabsList className="bg-transparent h-12 w-full justify-start gap-6 border-none">
                        <TabsTrigger 
                          value="overview" 
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2"
                        >
                          Overview
                        </TabsTrigger>
                        <TabsTrigger 
                          value="setup" 
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2"
                        >
                          Setup
                        </TabsTrigger>
                        <TabsTrigger 
                          value="logs" 
                          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2"
                        >
                          Activity Logs
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="overview" className="p-6 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-muted/30 border-none shadow-none">
                          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mb-2" />
                            <div className="text-2xl font-bold">Connected</div>
                            <div className="text-xs text-muted-foreground">Status</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/30 border-none shadow-none">
                          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <History className="h-5 w-5 text-blue-500 mb-2" />
                            <div className="text-2xl font-bold">
                              {selectedIntegration.last_connected_at ? "Active" : "Never"}
                            </div>
                            <div className="text-xs text-muted-foreground">Last Heartbeat</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/30 border-none shadow-none">
                          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Users className="h-5 w-5 text-purple-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.leads}</div>
                            <div className="text-xs text-muted-foreground">Total Leads</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/30 border-none shadow-none">
                          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Layout className="h-5 w-5 text-orange-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.pages}</div>
                            <div className="text-xs text-muted-foreground">Pages Pushed</div>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/30 border-none shadow-none">
                          <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <Zap className="h-5 w-5 text-green-500 mb-2" />
                            <div className="text-2xl font-bold">{stats.events}</div>
                            <div className="text-xs text-muted-foreground">Click Events</div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Platform Summary</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-medium">Site URL</TableCell>
                                <TableCell className="text-right">
                                  <a href={selectedIntegration.site_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-end text-primary hover:underline gap-1">
                                    {selectedIntegration.site_url} <ExternalLink className="h-3 w-3" />
                                  </a>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Client ID</TableCell>
                                <TableCell className="text-right font-mono text-xs">
                                  <button onClick={() => copyToClipboard(selectedIntegration.business_id, "Client ID")} className="flex items-center justify-end gap-2 ml-auto hover:text-primary transition-colors">
                                    {selectedIntegration.business_id} <Copy className="h-3 w-3" />
                                  </button>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Last Sync</TableCell>
                                <TableCell className="text-right">
                                  {selectedIntegration.last_connected_at ? formatDate(selectedIntegration.last_connected_at) : "No sync yet"}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-medium">Actions</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-lg text-xs"
                                    onClick={testConnectivity}
                                    disabled={isTesting}
                                  >
                                    {isTesting ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Activity className="h-3 w-3 mr-1" />}
                                    Test Connectivity
                                  </Button>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="setup" className="p-6 space-y-6">
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex gap-4">
                        <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-800 dark:text-yellow-400">Installation Required</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-500/80 mt-1">
                            Download and install the **GrowthOS WAAS Connector** plugin on your WordPress site to enable this integration.
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              toast.info(
                                "The WordPress plugin package has not been uploaded yet. Use the credentials below with your connector build.",
                              )
                            }
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
                          >
                            <Download className="h-4 w-4 mr-2" /> Download Plugin
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Connection Credentials</h3>
                        <p className="text-sm text-muted-foreground">
                          Use these values in the GrowthOS settings panel within your WordPress admin dashboard.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Client ID</Label>
                            <div className="flex gap-2">
                              <Input readOnly value={selectedIntegration.business_id} className="font-mono bg-muted" />
                              <Button variant="outline" onClick={() => copyToClipboard(selectedIntegration.business_id, "Client ID")}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>API Key</Label>
                            <div className="flex gap-2">
                              <Input readOnly value={selectedIntegration.api_key_preview} className="font-mono bg-muted" />
                              <Button variant="outline" disabled>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground flex gap-1 items-center">
                              <Shield className="h-3 w-3" /> For security, API keys are only shown once during creation or regeneration.
                            </p>
                            <Button 
                              variant="link" 
                              className="h-auto p-0 text-xs text-destructive hover:text-red-600"
                              onClick={regenerateKey}
                              disabled={isRegenerating}
                            >
                              {isRegenerating ? (
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3 mr-1" />
                              )}
                              Regenerate API Key
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>WAAS Endpoint</Label>
                            <div className="flex gap-2">
                              <Input readOnly value={window.location.origin} className="font-mono bg-muted" />
                              <Button variant="outline" onClick={() => copyToClipboard(window.location.origin, "WAAS Endpoint")}>
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="logs" className="p-0">
                      {loadingLogs ? (
                        <div className="p-12 flex justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground">
                          No recent activity recorded for this integration.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Time</TableHead>
                              <TableHead>Event</TableHead>
                              <TableHead>Direction</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {logs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="text-xs font-mono">
                                  {new Date(log.created_at).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium capitalize">{log.event_type.replace("_", " ")}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[200px]">{log.message}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {log.direction.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-[10px] uppercase">
                                    {log.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" onClick={() => console.log(log.payload)}>
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                </Card>
              </>
            ) : (
              <Card className="flex flex-col items-center justify-center p-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground mb-4" />
                <CardTitle>Select an integration</CardTitle>
                <CardDescription>Select a WordPress site from the sidebar to view its status and settings.</CardDescription>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* New Site Dialog */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect New WordPress Site</DialogTitle>
            <DialogDescription>
              Enter the URL of your WordPress site. We will generate a secure API key for you to use in the connector plugin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="site-url"
                  placeholder="https://mywebsite.com" 
                  value={newSiteUrl} 
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ensure the URL includes protocol (http/https).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button onClick={createIntegration}>Generate Integration Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Display Dialog (One-time) */}
      <Dialog open={!!newIntegrationKey} onOpenChange={(open) => !open && setNewIntegrationKey(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-3 rounded-full w-fit mb-2">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center text-xl">API Key Generated Successfully!</DialogTitle>
            <DialogDescription className="text-center font-bold text-destructive">
              CRITICAL: Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-muted rounded-lg p-6 font-mono text-sm break-all relative group">
              <div className="text-xs uppercase text-muted-foreground mb-4 border-b pb-2 flex justify-between">
                <span>Secret API Key</span>
                <Badge variant="outline" className="bg-background">One-time View</Badge>
              </div>
              <div className="text-lg tracking-wider text-center py-2">
                {newIntegrationKey}
              </div>
              <Button 
                className="absolute right-2 top-2 h-8 w-8" 
                size="icon" 
                variant="ghost"
                onClick={() => copyToClipboard(newIntegrationKey!, "API Key")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Next Steps:</h4>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Install the <strong>GrowthOS WAAS Connector</strong> plugin on WordPress.</li>
                <li>Go to <strong>Settings &rsaquo; GrowthOS</strong> in your WP admin.</li>
                <li>Paste your <strong>Client ID</strong> and this <strong>API Key</strong>.</li>
                <li>Click <strong>Test Connection</strong> to finalize setup.</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={() => setNewIntegrationKey(null)}>
              I Have Saved This Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
