/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useFeatures } from "../hooks/useFeatures";
import {
  getIndustryModuleConfig,
  getIndustryModuleForBusiness,
  INDUSTRY_CONTENT_MODULES,
  IndustryModuleType,
} from "../constants/industryContentModules";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

type IndustryItem = {
  id?: string;
  business_id?: string;
  module_type: IndustryModuleType;
  title: string;
  slug?: string;
  status: string;
  category?: string;
  price_label?: string;
  location?: string;
  short_description?: string;
  description?: string;
  image_url?: string;
  gallery?: any[];
  attributes?: Record<string, any>;
  cta_label?: string;
  cta_type?: string;
  cta_target?: string;
  enquiry_message?: string;
  seo_title?: string;
  seo_description?: string;
  sort_order?: number;
  is_featured?: boolean;
  is_visible?: boolean;
  published_at?: string | null;
  created_at?: string;
};

const emptyItem = (moduleType: IndustryModuleType): IndustryItem => {
  const config = getIndustryModuleConfig(moduleType);
  return {
    module_type: moduleType,
    title: "",
    status: config.defaultStatus,
    category: "",
    price_label: "",
    location: "",
    short_description: "",
    description: "",
    image_url: "",
    gallery: [],
    attributes: {},
    cta_label: config.defaultCtaLabel,
    cta_type: "contact_form",
    cta_target: "#contact",
    enquiry_message: config.defaultEnquiryMessage,
    seo_title: "",
    seo_description: "",
    sort_order: 0,
    is_featured: false,
    is_visible: true,
    published_at: null,
  };
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export function IndustryContentManager() {
  const { profile } = useAuth();
  const { business } = useFeatures();
  const inferredModule = useMemo(
    () => getIndustryModuleForBusiness(`${business?.industry || ""} ${business?.businessNature || ""}`),
    [business?.industry, business?.businessNature],
  );
  const [moduleType, setModuleType] = useState<IndustryModuleType>(inferredModule);
  const [items, setItems] = useState<IndustryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<IndustryItem | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const config = getIndustryModuleConfig(moduleType);

  useEffect(() => {
    setModuleType(inferredModule);
  }, [inferredModule]);

  const fetchItems = async () => {
    if (!profile?.businessId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSchemaMissing(false);
    const { data, error } = await supabase
      .from("industry_items")
      .select("*")
      .eq("business_id", profile.businessId)
      .eq("module_type", moduleType)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Industry content fetch failed:", error);
      setItems([]);
      if (/industry_items|schema cache|does not exist/i.test(error.message || "")) {
        setSchemaMissing(true);
      } else {
        toast.error(error.message || "Unable to load industry content.");
      }
    } else {
      setItems((data || []) as IndustryItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [profile?.businessId, moduleType]);

  const filteredItems = items.filter((item) => {
    const haystack = [
      item.title,
      item.category,
      item.location,
      item.price_label,
      item.status,
      item.short_description,
    ].join(" ").toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  const openNewItem = () => {
    setActiveItem(emptyItem(moduleType));
    setEditorOpen(true);
  };

  const openExistingItem = (item: IndustryItem) => {
    setActiveItem({
      ...item,
      attributes: item.attributes || {},
      gallery: Array.isArray(item.gallery) ? item.gallery : [],
    });
    setEditorOpen(true);
  };

  const updateActiveItem = (patch: Partial<IndustryItem>) => {
    setActiveItem((current) => (current ? { ...current, ...patch } : current));
  };

  const updateAttribute = (key: string, value: string) => {
    setActiveItem((current) =>
      current
        ? {
            ...current,
            attributes: {
              ...(current.attributes || {}),
              [key]: value,
            },
          }
        : current,
    );
  };

  const saveItem = async () => {
    if (!profile?.businessId || !activeItem) return;
    if (!activeItem.title.trim()) {
      toast.error(`${config.singularLabel} title is required.`);
      return;
    }

    setSaving(true);
    const payload = {
      business_id: profile.businessId,
      module_type: moduleType,
      title: activeItem.title.trim(),
      slug: activeItem.slug || createSlug(activeItem.title),
      status: activeItem.status || config.defaultStatus,
      category: activeItem.category || null,
      price_label: activeItem.price_label || null,
      location: activeItem.location || null,
      short_description: activeItem.short_description || null,
      description: activeItem.description || null,
      image_url: activeItem.image_url || null,
      gallery: activeItem.gallery || [],
      attributes: activeItem.attributes || {},
      cta_label: activeItem.cta_label || config.defaultCtaLabel,
      cta_type: activeItem.cta_type || "contact_form",
      cta_target: activeItem.cta_target || "#contact",
      enquiry_message: activeItem.enquiry_message || config.defaultEnquiryMessage,
      seo_title: activeItem.seo_title || null,
      seo_description: activeItem.seo_description || null,
      sort_order: Number(activeItem.sort_order || 0),
      is_featured: !!activeItem.is_featured,
      is_visible: activeItem.is_visible !== false,
      published_at:
        activeItem.is_visible !== false && !["draft", "inactive", "archived"].includes(activeItem.status)
          ? activeItem.published_at || new Date().toISOString()
          : activeItem.published_at || null,
      created_by: profile.uid,
      updated_at: new Date().toISOString(),
    };

    const query = activeItem.id
      ? supabase.from("industry_items").update(payload).eq("id", activeItem.id)
      : supabase.from("industry_items").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      console.error("Industry content save failed:", error);
      toast.error(error.message || "Unable to save content.");
      return;
    }

    toast.success(`${config.singularLabel} saved.`);
    setEditorOpen(false);
    setActiveItem(null);
    fetchItems();
  };

  const deleteItem = async (item: IndustryItem) => {
    if (!item.id) return;
    const confirmed = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!confirmed) return;

    const { error } = await supabase.from("industry_items").delete().eq("id", item.id);
    if (error) {
      toast.error(error.message || "Unable to delete item.");
      return;
    }
    toast.success(`${config.singularLabel} deleted.`);
    fetchItems();
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
            Customer-managed content
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Listings & Content
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            Keep niche-specific website content updated without opening the visual editor.
            Real estate clients can manage properties here; other businesses can manage menus,
            packages, programmes, rooms, jobs, events, or portfolio projects.
          </p>
        </div>
        <Button onClick={openNewItem} className="h-12 rounded-2xl bg-indigo-600 px-5 font-bold">
          <Plus className="mr-2 h-4 w-4" />
          Add {config.singularLabel}
        </Button>
      </div>

      {schemaMissing && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-5">
            <p className="font-bold text-amber-900">Supabase migration needed</p>
            <p className="mt-1 text-sm text-amber-800">
              Apply <code>202606210001_industry_content_modules.sql</code> in your Supabase SQL editor,
              then refresh this page.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-3xl border-slate-200">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Active module
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{config.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{config.description}</p>
              </div>
              <Select value={moduleType} onValueChange={(value) => setModuleType(value as IndustryModuleType)}>
                <SelectTrigger className="h-12 w-full rounded-2xl md:w-72">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_CONTENT_MODULES.map((module) => (
                    <SelectItem key={module.type} value={module.type}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={`Search ${config.label.toLowerCase()}...`}
                className="h-12 rounded-2xl pl-11"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 bg-slate-950 text-white">
          <CardContent className="space-y-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-200">
                How it appears
              </p>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-200">
                Website sections that use listings, packages, menus, classes, rooms, jobs,
                events, or projects can pull from this module. Customers update here; the
                website stays structured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-xl font-black text-slate-950">No {config.label.toLowerCase()} yet</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
            Add the first {config.singularLabel.toLowerCase()} and it can be used by your
            website sections and enquiry flows.
          </p>
          <Button onClick={openNewItem} className="mt-6 rounded-2xl bg-indigo-600 px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add {config.singularLabel}
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden rounded-3xl border-slate-200 bg-white">
              <div className="relative aspect-[4/3] bg-slate-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <Briefcase className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <Badge className="bg-white text-slate-950 shadow-sm">{item.status}</Badge>
                  {item.is_featured && <Badge className="bg-indigo-600 text-white">Featured</Badge>}
                </div>
                <Badge className="absolute right-4 top-4 bg-white text-slate-700 shadow-sm">
                  {item.is_visible ? <Eye className="mr-1 h-3 w-3" /> : <EyeOff className="mr-1 h-3 w-3" />}
                  {item.is_visible ? "Visible" : "Hidden"}
                </Badge>
              </div>
              <CardContent className="space-y-5 p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black leading-tight text-slate-950">{item.title}</h3>
                    {item.price_label && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-800">
                        {item.price_label}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {[item.category, item.location].filter(Boolean).join(" • ") || config.singularLabel}
                  </p>
                </div>
                {item.short_description && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{item.short_description}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {config.fields.slice(0, 4).map((field) => {
                    const value = item.attributes?.[field.key];
                    if (!value) return null;
                    return (
                      <div key={field.key} className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {field.label}
                        </p>
                        <p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={() => openExistingItem(item)} className="flex-1 rounded-2xl">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => deleteItem(item)} className="rounded-2xl text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {activeItem?.id ? "Edit" : "Add"} {config.singularLabel}
            </DialogTitle>
          </DialogHeader>

          {activeItem && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={activeItem.title}
                    onChange={(event) => updateActiveItem({ title: event.target.value })}
                    placeholder={`${config.singularLabel} title`}
                    className="mt-2 h-12 rounded-2xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={activeItem.status} onValueChange={(status) => updateActiveItem({ status })}>
                      <SelectTrigger className="mt-2 h-12 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price / Rate Label</Label>
                    <Input
                      value={activeItem.price_label || ""}
                      onChange={(event) => updateActiveItem({ price_label: event.target.value })}
                      placeholder="RM800k / £49/mo / From RM99"
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Input
                      value={activeItem.category || ""}
                      onChange={(event) => updateActiveItem({ category: event.target.value })}
                      placeholder="Sale, Rent, Treatment, Class..."
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Input
                      value={activeItem.location || ""}
                      onChange={(event) => updateActiveItem({ location: event.target.value })}
                      placeholder="Kuala Lumpur, London..."
                      className="mt-2 h-12 rounded-2xl"
                    />
                  </div>
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={activeItem.image_url || ""}
                    onChange={(event) => updateActiveItem({ image_url: event.target.value })}
                    placeholder="https://..."
                    className="mt-2 h-12 rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Short Description</Label>
                  <Textarea
                    value={activeItem.short_description || ""}
                    onChange={(event) => updateActiveItem({ short_description: event.target.value })}
                    placeholder="Short summary shown on cards."
                    className="mt-2 min-h-24 rounded-2xl"
                  />
                </div>
                <div>
                  <Label>Full Description</Label>
                  <Textarea
                    value={activeItem.description || ""}
                    onChange={(event) => updateActiveItem({ description: event.target.value })}
                    placeholder="Full detail for preview/detail sections."
                    className="mt-2 min-h-32 rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    {config.singularLabel} fields
                  </p>
                  <div className="grid gap-3">
                    {config.fields.map((field) => (
                      <div key={field.key}>
                        <Label>{field.label}</Label>
                        {field.type === "select" ? (
                          <Select
                            value={String(activeItem.attributes?.[field.key] || "")}
                            onValueChange={(value) => updateAttribute(field.key, value)}
                          >
                            <SelectTrigger className="mt-2 h-12 rounded-2xl bg-white">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options || []).map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type === "number" ? "number" : "text"}
                            value={String(activeItem.attributes?.[field.key] || "")}
                            onChange={(event) => updateAttribute(field.key, event.target.value)}
                            placeholder={field.placeholder}
                            className="mt-2 h-12 rounded-2xl bg-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Enquiry CTA
                  </p>
                  <div className="grid gap-3">
                    <div>
                      <Label>Button Label</Label>
                      <Input
                        value={activeItem.cta_label || ""}
                        onChange={(event) => updateActiveItem({ cta_label: event.target.value })}
                        className="mt-2 h-12 rounded-2xl"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Action</Label>
                        <Select value={activeItem.cta_type || "contact_form"} onValueChange={(cta_type) => updateActiveItem({ cta_type })}>
                          <SelectTrigger className="mt-2 h-12 rounded-2xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="contact_form">Contact Form</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="booking_link">Booking Link</SelectItem>
                            <SelectItem value="external_url">External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Target</Label>
                        <Input
                          value={activeItem.cta_target || ""}
                          onChange={(event) => updateActiveItem({ cta_target: event.target.value })}
                          placeholder="#contact / https://..."
                          className="mt-2 h-12 rounded-2xl"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Default Message</Label>
                      <Textarea
                        value={activeItem.enquiry_message || ""}
                        onChange={(event) => updateActiveItem({ enquiry_message: event.target.value })}
                        className="mt-2 min-h-24 rounded-2xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    SEO
                  </p>
                  <div className="grid gap-3">
                    <Input
                      value={activeItem.seo_title || ""}
                      onChange={(event) => updateActiveItem({ seo_title: event.target.value })}
                      placeholder="SEO title"
                      className="h-12 rounded-2xl"
                    />
                    <Textarea
                      value={activeItem.seo_description || ""}
                      onChange={(event) => updateActiveItem({ seo_description: event.target.value })}
                      placeholder="Meta description"
                      className="min-h-20 rounded-2xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-3xl bg-slate-50 p-4">
                  <label className="flex items-center justify-between rounded-2xl bg-white p-3 text-sm font-bold">
                    Visible
                    <Switch
                      checked={activeItem.is_visible !== false}
                      onCheckedChange={(checked) => updateActiveItem({ is_visible: checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl bg-white p-3 text-sm font-bold">
                    Featured
                    <Switch
                      checked={!!activeItem.is_featured}
                      onCheckedChange={(checked) => updateActiveItem({ is_featured: checked })}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setEditorOpen(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={saveItem} disabled={saving} className="rounded-2xl bg-indigo-600">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Save {config.singularLabel}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IndustryContentManager;
