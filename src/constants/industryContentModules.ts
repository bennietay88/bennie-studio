/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IndustryModuleType =
  | "real_estate_listing"
  | "restaurant_menu_item"
  | "service_package"
  | "class_program"
  | "vehicle_listing"
  | "room_listing"
  | "job_opening"
  | "event_listing"
  | "portfolio_project";

export type IndustryFieldType = "text" | "number" | "select";

export interface IndustryFieldConfig {
  key: string;
  label: string;
  type: IndustryFieldType;
  placeholder?: string;
  options?: string[];
}

export interface IndustryContentModuleConfig {
  type: IndustryModuleType;
  label: string;
  singularLabel: string;
  description: string;
  bestFor: string;
  defaultCtaLabel: string;
  defaultStatus: string;
  statusOptions: string[];
  fields: IndustryFieldConfig[];
  defaultEnquiryMessage: string;
}

export const INDUSTRY_CONTENT_MODULES: IndustryContentModuleConfig[] = [
  {
    type: "real_estate_listing",
    label: "Property Listings",
    singularLabel: "Property",
    description: "Manage properties, availability, pricing, viewing CTAs, and listing enquiries.",
    bestFor: "Real estate agents, property agencies, negotiators, and rental businesses.",
    defaultCtaLabel: "Ask About This Property",
    defaultStatus: "available",
    statusOptions: ["available", "reserved", "sold", "rented", "inactive", "draft"],
    fields: [
      { key: "propertyType", label: "Property Type", type: "select", options: ["Condo", "Terrace", "Semi-D", "Bungalow", "Apartment", "Commercial", "Land"] },
      { key: "bedrooms", label: "Bedrooms", type: "number", placeholder: "3" },
      { key: "bathrooms", label: "Bathrooms", type: "number", placeholder: "2" },
      { key: "size", label: "Built-up / Size", type: "text", placeholder: "1,200 sqft" },
      { key: "tenure", label: "Tenure", type: "text", placeholder: "Freehold" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this property. Can you share more details and viewing availability?",
  },
  {
    type: "restaurant_menu_item",
    label: "Menu Items",
    singularLabel: "Menu Item",
    description: "Keep menu highlights, prices, availability, and ordering CTAs updated.",
    bestFor: "Restaurants, cafes, bakeries, bars, and food delivery businesses.",
    defaultCtaLabel: "Order or Reserve",
    defaultStatus: "available",
    statusOptions: ["available", "limited", "sold_out", "inactive", "draft"],
    fields: [
      { key: "dietary", label: "Dietary Notes", type: "text", placeholder: "Halal, vegetarian, spicy" },
      { key: "portion", label: "Portion", type: "text", placeholder: "Serves 2" },
      { key: "prepTime", label: "Prep Time", type: "text", placeholder: "15 minutes" },
    ],
    defaultEnquiryMessage: "Hi, I found this menu item on your website. Can I order or reserve it?",
  },
  {
    type: "service_package",
    label: "Service Packages",
    singularLabel: "Service Package",
    description: "Publish service packages, scope, pricing ranges, and quote CTAs.",
    bestFor: "Clinics, salons, contractors, consultants, agencies, cleaning, and local services.",
    defaultCtaLabel: "Request This Package",
    defaultStatus: "available",
    statusOptions: ["available", "featured", "inactive", "draft"],
    fields: [
      { key: "duration", label: "Duration", type: "text", placeholder: "60 minutes / 2 weeks / one-off" },
      { key: "included", label: "Included", type: "text", placeholder: "Consultation, setup, follow-up" },
      { key: "idealFor", label: "Ideal For", type: "text", placeholder: "Small business owners" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this package. Can you share the next step?",
  },
  {
    type: "class_program",
    label: "Classes / Programmes",
    singularLabel: "Class",
    description: "Manage programmes, levels, schedules, trial classes, and enrolment enquiries.",
    bestFor: "Tuition centres, fitness studios, coaches, workshops, and education providers.",
    defaultCtaLabel: "Ask About This Class",
    defaultStatus: "available",
    statusOptions: ["available", "full", "new_intake", "inactive", "draft"],
    fields: [
      { key: "level", label: "Level", type: "text", placeholder: "Beginner / Primary 6 / Advanced" },
      { key: "schedule", label: "Schedule", type: "text", placeholder: "Saturday 10am" },
      { key: "capacity", label: "Capacity", type: "number", placeholder: "12" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this class or programme. Can I get more details?",
  },
  {
    type: "vehicle_listing",
    label: "Vehicle Listings",
    singularLabel: "Vehicle",
    description: "Manage car inventory, specs, pricing, and viewing enquiries.",
    bestFor: "Car dealers, workshops, rental businesses, and automotive marketplaces.",
    defaultCtaLabel: "Ask About This Vehicle",
    defaultStatus: "available",
    statusOptions: ["available", "reserved", "sold", "inactive", "draft"],
    fields: [
      { key: "year", label: "Year", type: "number", placeholder: "2023" },
      { key: "mileage", label: "Mileage", type: "text", placeholder: "35,000 km" },
      { key: "transmission", label: "Transmission", type: "select", options: ["Automatic", "Manual"] },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this vehicle. Can you share more details?",
  },
  {
    type: "room_listing",
    label: "Rooms / Stays",
    singularLabel: "Room",
    description: "Manage rooms, availability notes, rates, amenities, and booking CTAs.",
    bestFor: "Hotels, homestays, retreats, event venues, and hospitality businesses.",
    defaultCtaLabel: "Check Availability",
    defaultStatus: "available",
    statusOptions: ["available", "limited", "unavailable", "inactive", "draft"],
    fields: [
      { key: "capacity", label: "Capacity", type: "number", placeholder: "2" },
      { key: "amenities", label: "Amenities", type: "text", placeholder: "WiFi, breakfast, parking" },
      { key: "bedType", label: "Bed Type", type: "text", placeholder: "King bed" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this room or stay. Can you check availability?",
  },
  {
    type: "job_opening",
    label: "Job Openings",
    singularLabel: "Job",
    description: "Manage job posts, requirements, salary ranges, and application CTAs.",
    bestFor: "Recruitment agencies, HR consultants, agencies, and growing businesses.",
    defaultCtaLabel: "Apply or Enquire",
    defaultStatus: "available",
    statusOptions: ["available", "urgent", "closed", "inactive", "draft"],
    fields: [
      { key: "employmentType", label: "Employment Type", type: "select", options: ["Full-time", "Part-time", "Contract", "Internship", "Remote"] },
      { key: "experience", label: "Experience", type: "text", placeholder: "2+ years" },
      { key: "salary", label: "Salary Range", type: "text", placeholder: "RM4,000-RM6,000" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this job opening. Can you share how to apply?",
  },
  {
    type: "event_listing",
    label: "Events",
    singularLabel: "Event",
    description: "Manage events, dates, seats, registration CTAs, and enquiry messages.",
    bestFor: "Coaches, webinar hosts, training centres, venues, and community organisers.",
    defaultCtaLabel: "Register Interest",
    defaultStatus: "available",
    statusOptions: ["available", "limited", "closed", "inactive", "draft"],
    fields: [
      { key: "eventDate", label: "Event Date", type: "text", placeholder: "25 July 2026" },
      { key: "venue", label: "Venue", type: "text", placeholder: "Online / Kuala Lumpur" },
      { key: "seats", label: "Seats", type: "number", placeholder: "50" },
    ],
    defaultEnquiryMessage: "Hi, I’m interested in this event. Can I get registration details?",
  },
  {
    type: "portfolio_project",
    label: "Portfolio Projects",
    singularLabel: "Project",
    description: "Manage project examples, results, categories, photos, and enquiry CTAs.",
    bestFor: "Interior designers, contractors, creatives, agencies, architects, and consultants.",
    defaultCtaLabel: "Discuss Similar Project",
    defaultStatus: "published",
    statusOptions: ["published", "featured", "archived", "draft"],
    fields: [
      { key: "projectType", label: "Project Type", type: "text", placeholder: "Condo renovation" },
      { key: "result", label: "Result / Outcome", type: "text", placeholder: "Completed in 6 weeks" },
      { key: "scope", label: "Scope", type: "text", placeholder: "Design, build, styling" },
    ],
    defaultEnquiryMessage: "Hi, I saw this project and would like to discuss something similar.",
  },
];

export const getIndustryModuleForBusiness = (industry = ""): IndustryModuleType => {
  const value = industry.toLowerCase();
  if (/real estate|property|realtor|agent/.test(value)) return "real_estate_listing";
  if (/restaurant|cafe|food|bakery|bar|dining/.test(value)) return "restaurant_menu_item";
  if (/tuition|education|school|academy|fitness|coach|training|class/.test(value)) return "class_program";
  if (/car|auto|vehicle|motor/.test(value)) return "vehicle_listing";
  if (/hotel|homestay|venue|hospitality|room/.test(value)) return "room_listing";
  if (/recruit|hr|staffing|job/.test(value)) return "job_opening";
  if (/event|webinar|workshop|seminar/.test(value)) return "event_listing";
  if (/interior|renovation|contractor|portfolio|creative|design|architect/.test(value)) return "portfolio_project";
  return "service_package";
};

export const getIndustryModuleConfig = (type: IndustryModuleType) =>
  INDUSTRY_CONTENT_MODULES.find((module) => module.type === type) || INDUSTRY_CONTENT_MODULES[0];
