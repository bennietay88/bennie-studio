/** Independent, illustrative website demo content. No client results or live business claims. */
export type InteractiveDemoStyle = "clinical" | "editorial" | "utility" | "industrial" | "nature" | "corporate" | "architecture" | "automotive" | "fitness" | "photography" | "playful" | "celebration";
export type InteractiveDemoSpec = {
  slug: string;
  brand: string;
  eyebrow: string;
  headline: string;
  intro: string;
  primaryAction: string;
  style: InteractiveDemoStyle;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
  services: Array<{ title: string; detail: string }>;
  process: Array<{ title: string; detail: string }>;
  faqs: Array<{ question: string; answer: string }>;
  contactPrompt: string;
  highlight: string;
};
export const INTERACTIVE_DEMOS: Record<string, InteractiveDemoSpec> = {
  "physiotherapy-clinic": {
    slug: "physiotherapy-clinic", brand: "Motion House Physio", eyebrow: "Movement • recovery • confidence",
    headline: "Move towards better days.", intro: "Physiotherapy explained with care. Explore the support available, understand your options and plan a first conversation.",
    primaryAction: "Explore an appointment", style: "clinical", background: "#f0f5f0", foreground: "#193b32", accent: "#246e62", muted: "#dceae2",
    services: [{title:"Pain & mobility",detail:"Explore practical assessments for movement, joint or muscle concerns."},{title:"Sports recovery",detail:"Understand return-to-activity planning and rehabilitation options."},{title:"Post-operative support",detail:"Discuss an appropriate recovery plan with a qualified professional."}],
    process: [{title:"Tell us your goals",detail:"Describe the movement or activity you want to regain."},{title:"Understand the options",detail:"Discuss assessment and treatment pathways."},{title:"Plan the next step",detail:"Enquire about an appropriate first appointment."}],
    faqs:[{question:"Do I need to know which treatment to book?",answer:"No. Describe your concern and discuss a suitable first assessment."},{question:"Is this a clinical provider?",answer:"No. This is an illustrative website experience, not a real clinic or a way to obtain medical care."}],
    contactPrompt:"What would you like to get back to doing?", highlight:"Find a clearer path to movement."
  },
  "real-estate-agency": {
    slug:"real-estate-agency",brand:"Atelier Grove",eyebrow:"Thoughtfully considered homes",
    headline:"Find a place that feels like yours.",intro:"A quieter way to explore property, understand neighbourhoods and take the next step towards a viewing.",
    primaryAction:"Plan a viewing",style:"editorial",background:"#f4f0e9",foreground:"#322f28",accent:"#68523c",muted:"#e6dacb",
    services:[{title:"Curated properties",detail:"Browse spaces organised around lifestyle and location."},{title:"Neighbourhood guidance",detail:"Understand the everyday context around a place."},{title:"Viewing consultation",detail:"Discuss what matters before arranging your next step."}],
    process:[{title:"Define your priorities",detail:"Think about budget, location and how you want to live."},{title:"Explore the options",detail:"Compare the spaces and considerations most relevant to you."},{title:"Start a conversation",detail:"Share a viewing enquiry for a suitable shortlist."}],
    faqs:[{question:"Are the properties listed here for sale?",answer:"No. All properties and details within this concept are illustrative."},{question:"Can I schedule a real viewing?",answer:"This demo does not arrange property viewings. You can request a website preview for your own business."}],
    contactPrompt:"What would your ideal home need to offer?",highlight:"A more considered way to discover home."
  },
  "cleaning-service": {
    slug:"cleaning-service",brand:"Neat & Co.",eyebrow:"A fresh start for your space",
    headline:"A cleaner space. A simpler day.",intro:"Compare cleaning options, choose the service that fits and see how a clear quote journey could work.",
    primaryAction:"Build a cleaning enquiry",style:"utility",background:"#eff9f7",foreground:"#123d42",accent:"#087f75",muted:"#c9ebe5",
    services:[{title:"Home refresh",detail:"Regular or one-off care for kitchens, living areas and bedrooms."},{title:"Deep cleaning",detail:"A more detailed clean for spaces needing extra attention."},{title:"Office care",detail:"Practical cleaning arrangements for workplaces and shared areas."}],
    process:[{title:"Select your space",detail:"Identify the type of property and main areas involved."},{title:"Choose the scope",detail:"Compare options and any priorities for the visit."},{title:"Request a quote",detail:"Describe the job so a provider could prepare an estimate."}],
    faqs:[{question:"Can I see a price before enquiring?",answer:"An actual quote depends on location, area and scope. This demo illustrates the information a real service might request."},{question:"Does the form book a cleaner?",answer:"No. It is a non-submitting demonstration."}],
    contactPrompt:"What kind of space needs a refresh?",highlight:"Choose a service in seconds."
  },
  "hvac-specialist": {
    slug:"hvac-specialist",brand:"Airwell Mechanical",eyebrow:"Heating • cooling • ventilation",
    headline:"Technical support without the guesswork.",intro:"An efficient route from service need to a clear enquiry, with straightforward equipment and coverage information.",
    primaryAction:"Describe a service need",style:"industrial",background:"#eef1f3",foreground:"#1d2c35",accent:"#235e83",muted:"#dbe5ea",
    services:[{title:"Air conditioning service",detail:"Routine upkeep and checks for reliable cooling."},{title:"System installation",detail:"Discuss sizing, space constraints and suitable equipment."},{title:"Fault assessment",detail:"Describe symptoms and prepare relevant equipment information."}],
    process:[{title:"Identify the issue",detail:"Note the system type, location and symptoms."},{title:"Share useful details",detail:"Describe the job and any access requirements."},{title:"Arrange next steps",detail:"Explore how a technician could follow up."}],
    faqs:[{question:"Can I request urgent repair through this site?",answer:"No. This is an interactive concept only. Contact a real local HVAC provider for service."},{question:"What details are useful in a service request?",answer:"System type, issue, location and safe access information."}],
    contactPrompt:"What equipment or space needs attention?",highlight:"From issue to next step, clearly."
  },
  "landscape-design": {
    slug:"landscape-design",brand:"Verdant Outdoor Studio",eyebrow:"Landscapes shaped for living",
    headline:"Let the outdoors become part of home.",intro:"Discover planting, outdoor spaces and design conversations arranged around how you want to use your garden.",
    primaryAction:"Plan a garden conversation",style:"nature",background:"#edf0e6",foreground:"#2c402f",accent:"#567451",muted:"#d7e1ca",
    services:[{title:"Garden design",detail:"Thoughtful garden layouts that work for everyday life."},{title:"Outdoor living",detail:"Create areas for gathering, relaxing and unwinding."},{title:"Planting plans",detail:"Explore texture, seasonality and long-term care considerations."}],
    process:[{title:"Share your space",detail:"Start with the setting, size and aspirations."},{title:"Explore a direction",detail:"Discuss uses, materials and planting character."},{title:"Develop the brief",detail:"Identify a sensible scope for the project."}],
    faqs:[{question:"Do I need a detailed plan to enquire?",answer:"A rough sketch, measurements or a few photos can help start the conversation."},{question:"Are the garden projects shown completed commissions?",answer:"No. This is a studio-generated design demonstration."}],
    contactPrompt:"What would you love to do outdoors?",highlight:"More life outside."
  },
  "business-consulting": {
    slug:"business-consulting",brand:"Northpoint Strategy",eyebrow:"Decisions made with clarity",
    headline:"A sharper perspective on what comes next.",intro:"Structure business questions, clarify options and start useful conversations without unnecessary complexity.",
    primaryAction:"Define your challenge",style:"corporate",background:"#f1f3f5",foreground:"#16273c",accent:"#234d70",muted:"#dde5ec",
    services:[{title:"Strategy & positioning",detail:"Clarify priorities and opportunities in a changing market."},{title:"Operations review",detail:"Identify process friction and improvement opportunities."},{title:"Growth planning",detail:"Explore practical initiatives and dependencies before committing."}],
    process:[{title:"Frame the decision",detail:"Identify the challenge and constraints."},{title:"Evaluate the options",detail:"Consider evidence, trade-offs and priorities."},{title:"Agree an approach",detail:"Map a manageable sequence of next steps."}],
    faqs:[{question:"Is there a minimum project size?",answer:"The scope of an actual consultancy engagement would depend on the question and deliverables."},{question:"Are these verified consultancy engagements?",answer:"No. This is a hypothetical website presentation."}],
    contactPrompt:"Which business decision are you considering?",highlight:"Clarity turns insight into direction."
  },
  "interior-design": {
    slug:"interior-design",brand:"Linea Atelier",eyebrow:"Interiors with intention",
    headline:"Rooms to live in. Spaces to remember.",intro:"An editorial approach to interior design, where materiality, space and the design process take the lead.",
    primaryAction:"Discuss a space",style:"architecture",background:"#eeeae4",foreground:"#292b29",accent:"#675e51",muted:"#ded7cc",
    services:[{title:"Residential interiors",detail:"Spaces shaped around daily rituals and personal taste."},{title:"Space planning",detail:"Layouts that balance circulation, purpose and proportion."},{title:"Material direction",detail:"Considered choices of texture, finish and colour."}],
    process:[{title:"Listen",detail:"Understand the people and the place."},{title:"Define",detail:"Explore spatial direction and design priorities."},{title:"Refine",detail:"Develop the brief towards a cohesive plan."}],
    faqs:[{question:"Can I start with a single room?",answer:"Yes. A project brief can focus on one space, subject to the eventual service scope."},{question:"Are these photographs from real client projects?",answer:"No. All visuals shown are illustrative concept material."}],
    contactPrompt:"What space would you like to reimagine?",highlight:"A study in proportion and texture."
  },
  "auto-detailing": {
    slug:"auto-detailing",brand:"Apex Finish",eyebrow:"Automotive care • detailing",
    headline:"Every detail deserves attention.",intro:"An expressive automotive site with service packages, a clear process and straightforward booking enquiries.",
    primaryAction:"Choose a detailing service",style:"automotive",background:"#151a1c",foreground:"#f8f5ee",accent:"#c3a476",muted:"#2c3436",
    services:[{title:"Exterior refinement",detail:"Explore paint and surface care for a clean finish."},{title:"Interior detail",detail:"Careful attention to cabin surfaces and presentation."},{title:"Protection packages",detail:"Review maintenance and protective service options."}],
    process:[{title:"Select the finish",detail:"Choose a service based on the condition of the vehicle."},{title:"Discuss the details",detail:"Share vehicle type and any areas needing care."},{title:"Plan the visit",detail:"Explore how an appointment request could work."}],
    faqs:[{question:"Do these services come with a guarantee?",answer:"This demo makes no real provider or performance claims."},{question:"Will choosing a service book an appointment?",answer:"No. The enquiry flow is a non-submitting website demonstration."}],
    contactPrompt:"What kind of finish are you after?",highlight:"Built to stand out."
  },
  "fitness-coaching": {
    slug:"fitness-coaching",brand:"Form & Motion",eyebrow:"Training at your own pace",
    headline:"Start strong. Stay curious.",intro:"Explore training formats, meet the approach and find a simple starting point for your next session.",
    primaryAction:"Explore a trial",style:"fitness",background:"#f4f5ec",foreground:"#26352b",accent:"#457443",muted:"#dfe7cf",
    services:[{title:"One-to-one coaching",detail:"Focused sessions shaped around individual goals."},{title:"Small-group training",detail:"Structured movement in a motivating group setting."},{title:"Foundations programme",detail:"Learn form, progression and sustainable habits."}],
    process:[{title:"Choose a goal",detail:"Describe what you want to improve."},{title:"Find a format",detail:"Compare training settings and levels."},{title:"Take a first step",detail:"Enquire about an introductory session."}],
    faqs:[{question:"Do I need training experience?",answer:"A real studio can explain suitable sessions for different starting points."},{question:"Can I book a trial here?",answer:"This website is a design demonstration and does not accept bookings."}],
    contactPrompt:"What would you like to work towards?",highlight:"Progress begins with showing up."
  },
  "photography-studio": {
    slug:"photography-studio",brand:"Stillframe Studio",eyebrow:"Portrait • story • feeling",
    headline:"The moments between the moments.",intro:"A visual-first experience for exploring a photographer's style, session types and booking approach.",
    primaryAction:"Explore a session",style:"photography",background:"#f2efeb",foreground:"#352c29",accent:"#865e4f",muted:"#e5d8d0",
    services:[{title:"Personal portraits",detail:"Considered portraits with room for personality."},{title:"Brand stories",detail:"Visual direction for people and small businesses."},{title:"Milestone sessions",detail:"A thoughtful approach to moments worth remembering."}],
    process:[{title:"Share your idea",detail:"Describe the mood, occasion or purpose."},{title:"Shape the session",detail:"Discuss setting, time and visual direction."},{title:"Prepare the details",detail:"Outline what a session brief might include."}],
    faqs:[{question:"Can I see a complete portfolio?",answer:"This concept uses illustrative visual material, not commissioned client photography."},{question:"Can I reserve a date?",answer:"No. The enquiry is a demonstration only."}],
    contactPrompt:"What story would you like to capture?",highlight:"A visual language with room to breathe."
  },
  "pet-wellness": {
    slug:"pet-wellness",brand:"Goodkind Pet Care",eyebrow:"A little more care, every day",
    headline:"Good days for good companions.",intro:"Friendly services, clear care guidance and an easy-to-understand enquiry journey for pet owners.",
    primaryAction:"Explore pet care",style:"playful",background:"#fff4e8",foreground:"#4c3930",accent:"#9a5b3d",muted:"#f2d9c5",
    services:[{title:"Grooming & care",detail:"Routine services that support everyday comfort."},{title:"Wellness enquiries",detail:"Discuss general care needs with a suitable real provider."},{title:"First-visit guidance",detail:"Find helpful steps for planning a visit."}],
    process:[{title:"Tell us about your companion",detail:"Share their size and the care you are interested in."},{title:"Explore services",detail:"Compare the options and any preparation guidance."},{title:"Plan a conversation",detail:"See how a real provider might handle enquiries."}],
    faqs:[{question:"Is this a veterinary clinic?",answer:"No. This is a fictional business and website demonstration, not a source of veterinary advice."},{question:"Can I schedule grooming here?",answer:"The demo does not take real bookings."}],
    contactPrompt:"Tell us about your companion.",highlight:"Thoughtful care for every little personality."
  },
  "event-planning": {
    slug:"event-planning",brand:"Gathered Moments",eyebrow:"Considered celebrations",
    headline:"Make space for what matters most.",intro:"A thoughtful approach to celebrations, from the first moodboard to the details that bring people together.",
    primaryAction:"Start an event brief",style:"celebration",background:"#f8f0ef",foreground:"#553d43",accent:"#976975",muted:"#eddbdf",
    services:[{title:"Wedding planning",detail:"A considered approach to a memorable day."},{title:"Private celebrations",detail:"Thoughtful gatherings shaped around people and place."},{title:"Styling & coordination",detail:"Explore design, vendors and on-the-day practicalities."}],
    process:[{title:"Share the occasion",detail:"Describe the people, date and atmosphere."},{title:"Create a direction",detail:"Discuss priorities, styling and the overall experience."},{title:"Plan the details",detail:"Outline the steps towards a cohesive event."}],
    faqs:[{question:"Can I reserve an event date here?",answer:"No. This is a non-submitting website concept."},{question:"Are the events shown completed client projects?",answer:"No. This studio showcase does not represent commissioned customer work."}],
    contactPrompt:"What would make your celebration feel personal?",highlight:"The moments make the memory."
  }
};
export const EXPANDED_DEMO_SLUGS = Object.keys(INTERACTIVE_DEMOS);
export const hasExpandedDemo = (slug: string | undefined | null): boolean =>
  Boolean(slug && Object.prototype.hasOwnProperty.call(INTERACTIVE_DEMOS, slug));
export const portfolioDemoSlug = (slug: string, legacySlug: string): string =>
  hasExpandedDemo(slug) ? slug : legacySlug;
