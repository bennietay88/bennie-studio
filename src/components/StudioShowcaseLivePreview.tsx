import { IndustryExperience } from "./IndustryExperience";
import { DemoIndustryPhoto } from "./DemoIndustryPhoto";
import { demoDesign, demoNavigation, readableInk } from "../lib/demoDesignProfiles";
import "../styles/demoDesigns.css";
import React from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CalendarDays, Check, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { STUDIO_SHOWCASES } from "./StudioCaseStudyDetail";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { useStudioShowcaseCms, mergeCmsValue } from "../lib/studioShowcaseCms";

export type DemoContent = {
  brand: string;
  tagline: string;
  headline: string;
  intro: string;
  cta: string;
  sectionTitle: string;
  services: Array<{ name: string; copy: string }>;
  steps: Array<{ title: string; copy: string }>;
  reassurance: string[];
};

export const DEMOS: Record<string, DemoContent> = {
  "dental-clinic": {
    brand: "Harbour Dental",
    tagline: "Thoughtful care. Clear next steps.",
    headline: "A healthier smile starts with feeling at ease.",
    intro: "Explore your options, meet the care team and find a comfortable next step for your dental health.",
    cta: "Request an appointment",
    sectionTitle: "Care for every stage of your smile",
    services: [
      { name: "Everyday dentistry", copy: "Routine check-ups and preventive care, explained clearly." },
      { name: "Smile restoration", copy: "A considered plan to help restore comfort and confidence." },
      { name: "Family dental care", copy: "A welcoming experience for children, teens and adults." },
    ],
    steps: [
      { title: "Tell us what you need", copy: "Share a little about the care you are looking for." },
      { title: "Talk it through", copy: "A member of the team can explain the next steps." },
      { title: "Choose a time", copy: "Arrange an appointment that works for you." },
    ],
    reassurance: ["Clear treatment information", "A calm, welcoming setting", "Easy-to-find contact details"],
  },
  "renovation-contractor": {
    brand: "Northline Renovation",
    tagline: "Considered work for better living.",
    headline: "Make more of the place you call home.",
    intro: "From the first conversation to the final details, plan a renovation around the way you want to live.",
    cta: "Start a project enquiry",
    sectionTitle: "Spaces shaped around real life",
    services: [
      { name: "Kitchen renovations", copy: "Create a more practical, welcoming heart of the home." },
      { name: "Whole-home updates", copy: "Bring rooms together with a clear, coordinated plan." },
      { name: "Extensions & additions", copy: "Make room for what comes next with thoughtful design." },
    ],
    steps: [
      { title: "Share your project", copy: "Tell us about the space, your goals and where you are based." },
      { title: "Explore the scope", copy: "Discuss the work, priorities and decisions involved." },
      { title: "Plan the next step", copy: "Get a clear path for moving the project forward." },
    ],
    reassurance: ["Clear project conversations", "A defined scope before work begins", "A considered process from start to finish"],
  },
  "professional-advisory": {
    brand: "Fieldstone Advisory",
    tagline: "Sound advice for important decisions.",
    headline: "Clarity for the decisions that shape your business.",
    intro: "Practical, considered guidance to help you understand your options and move forward with confidence.",
    cta: "Arrange an initial conversation",
    sectionTitle: "Advice built around your priorities",
    services: [
      { name: "Business strategy", copy: "Define priorities, evaluate options and build a practical path forward." },
      { name: "Operational improvement", copy: "Find opportunities to make day-to-day work clearer and more effective." },
      { name: "Change & planning", copy: "Bring structure to transitions, investment choices and new initiatives." },
    ],
    steps: [
      { title: "Understand the context", copy: "Start with your goals, constraints and current position." },
      { title: "Assess the options", copy: "Explore the choices and trade-offs that matter." },
      { title: "Agree a way forward", copy: "Leave with clear next steps and priorities." },
    ],
    reassurance: ["Confidential first conversation", "Advice tailored to your situation", "Clear scope and next steps"],
  },
  "tuition-centre": {
    brand: "Brightpath Learning",
    tagline: "Curiosity first. Progress at every pace.",
    headline: "Find the learning support that fits your child.",
    intro: "Explore programmes, teaching styles and class options before choosing a first conversation with our team.",
    cta: "Ask about a trial class",
    sectionTitle: "A programme for the next step",
    services: [
      { name: "Primary foundations", copy: "Build confidence in core skills through supportive practice." },
      { name: "Secondary subjects", copy: "Strengthen understanding with focused subject guidance." },
      { name: "Study skills", copy: "Develop habits that help learners approach new challenges." },
    ],
    steps: [
      { title: "Tell us about your learner", copy: "Share their age, level and what they would like help with." },
      { title: "Find a suitable programme", copy: "Talk through the available subjects and learning approach." },
      { title: "Plan a first visit", copy: "Arrange a trial class or a conversation with the centre." },
    ],
    reassurance: ["Small-group learning options", "Clear programme information", "A supportive first visit"],
  },
  "beauty-wellness": {
    brand: "Morrow Wellness",
    tagline: "A little space to feel like yourself.",
    headline: "Make time for the care that helps you reset.",
    intro: "Discover thoughtful treatments, a calm space and an easy way to plan your next visit.",
    cta: "Enquire about an appointment",
    sectionTitle: "Choose the care that feels right",
    services: [
      { name: "Facial treatments", copy: "A considered approach to skincare and a moment to unwind." },
      { name: "Massage & body care", copy: "Restorative treatments shaped around your comfort." },
      { name: "Wellness rituals", copy: "Thoughtful combinations for a slower, more restorative visit." },
    ],
    steps: [
      { title: "Explore the treatment menu", copy: "Compare options and choose what feels suited to you." },
      { title: "Ask a question", copy: "Talk with the team about comfort, timing or preparation." },
      { title: "Plan your visit", copy: "Enquire about an appointment and the next available times." },
    ],
    reassurance: ["A calm, welcoming space", "Clear treatment descriptions", "Help choosing the right option"],
  },
  "accounting-firm": {
    brand: "Clearline Accounting",
    tagline: "Good records. Clearer decisions.",
    headline: "Make sense of the numbers behind your business.",
    intro: "Get organised with practical accounting support and a clearer view of the decisions ahead.",
    cta: "Book an introductory call",
    sectionTitle: "Support through every business stage",
    services: [
      { name: "Bookkeeping", copy: "Keep day-to-day records organised and easier to understand." },
      { name: "Tax & compliance", copy: "Get support preparing the information needed for key deadlines." },
      { name: "Business reporting", copy: "Turn financial information into useful, timely insight." },
    ],
    steps: [
      { title: "Describe your business", copy: "Share what you do and the support you are looking for." },
      { title: "Review your needs", copy: "Discuss your current setup, questions and upcoming deadlines." },
      { title: "Set a clear scope", copy: "Agree the right services and a practical starting point." },
    ],
    reassurance: ["Plain-language explanations", "A clear view of service scope", "Support matched to your business"],
  },
};


export type NichePageContent = {
  home: {
    focusTitle: string;
    focusCopy: string;
    features: Array<{ title: string; copy: string }>;
    questions: Array<{ question: string; answer: string }>;
  };
  services: {
    title: string;
    copy: string;
    details: Array<{ title: string; copy: string }>;
    questions: Array<{ question: string; answer: string }>;
  };
  about: {
    title: string;
    copy: string;
    values: Array<{ title: string; copy: string }>;
    questions: Array<{ question: string; answer: string }>;
  };
  contact: {
    title: string;
    copy: string;
    prepareTitle: string;
    prepare: Array<{ title: string; copy: string }>;
    questions: Array<{ question: string; answer: string }>;
  };
};

export const NICHE_PAGE_CONTENT: Record<string, NichePageContent> = {
  "dental-clinic": {
    home: {
      focusTitle: "Dental care, made easier to understand",
      focusCopy: "Patients can explore treatment information, understand what to expect and find a clear route to speak with the clinic.",
      features: [
        { title: "Explore treatment options", copy: "Understand the purpose of common treatments and what a first discussion can cover." },
        { title: "Know who will care for you", copy: "Meet the practitioners and learn about their areas of care before an appointment." },
        { title: "Plan your visit", copy: "Find the practical details that help you prepare for a clinic visit." },
      ],
      questions: [
        { question: "What should I expect at a first visit?", answer: "A first appointment is a chance to discuss your concerns, review your options and agree on suitable next steps with the care team." },
        { question: "Can I ask about a treatment before booking?", answer: "Yes. Share the treatment you are considering and the clinic can explain what information is helpful for an initial conversation." },
        { question: "How do I prepare for an appointment?", answer: "Bring any relevant medical or dental information you already have and note the questions you would like to discuss." },
      ],
    },
    services: {
      title: "Care for routine visits and more involved needs",
      copy: "A useful treatment page helps patients compare options and understand when to discuss care with a practitioner.",
      details: [
        { title: "Preventive visits", copy: "Plan routine check-ups, hygiene care and conversations about keeping teeth and gums healthy." },
        { title: "Restorative treatment", copy: "Review options for damaged or missing teeth and understand the consultation process." },
        { title: "Family dentistry", copy: "Find practical guidance for children, teenagers and adults at different stages of dental care." },
      ],
      questions: [
        { question: "Do I need to know which treatment I need?", answer: "No. Describe what is bothering you and the care team can help identify a suitable assessment." },
        { question: "Can treatment options be explained before I decide?", answer: "A practitioner can explain the options, considerations and next steps after understanding your needs." },
      ],
    },
    about: {
      title: "Care starts with listening",
      copy: "A calm dental experience begins with understanding the patient's concerns, explaining choices in plain language and making room for questions.",
      values: [
        { title: "Clear explanations", copy: "Make treatment information easier to follow before a patient makes a decision." },
        { title: "Respect for comfort", copy: "Understand concerns and discuss practical ways to make visits feel more manageable." },
        { title: "Care across life stages", copy: "Help individuals and families find information suited to their needs." },
      ],
      questions: [
        { question: "Can I discuss anxiety about dental treatment?", answer: "Yes. Mention any concerns when arranging a conversation so the team can talk through suitable support." },
        { question: "Can family members attend together?", answer: "Ask the clinic about appointment arrangements that suit your family and the care needed." },
      ],
    },
    contact: {
      title: "Talk with the clinic about your dental care",
      copy: "Share what you would like help with and the team can guide you to an appropriate appointment or conversation.",
      prepareTitle: "Helpful details to include",
      prepare: [
        { title: "What you need help with", copy: "Describe the treatment or concern you would like to discuss." },
        { title: "Your preferred timing", copy: "Include days or times that are convenient for an appointment." },
        { title: "Any questions", copy: "Note what you would like the care team to explain before your visit." },
      ],
      questions: [
        { question: "Is an enquiry an appointment confirmation?", answer: "No. The clinic will confirm availability and appointment details separately." },
        { question: "What if I have urgent dental pain?", answer: "Contact a local dental provider directly and follow their guidance for urgent care." },
      ],
    },
  },
  "renovation-contractor": {
    home: {
      focusTitle: "Plan a renovation with fewer unknowns",
      focusCopy: "Understand the work, the decisions involved and what to prepare before requesting a project conversation.",
      features: [
        { title: "Define the scope", copy: "Describe the rooms, changes and priorities that matter most to your household." },
        { title: "See how the work unfolds", copy: "Review the steps from an initial site discussion through planning and construction." },
        { title: "Prepare for a quote", copy: "Share useful context so the contractor can understand your project before a visit." },
      ],
      questions: [
        { question: "What information helps with an initial quote?", answer: "A short description of the work, project location, preferred timing and any photos or plans you can share." },
        { question: "Can I discuss a project before finalising the design?", answer: "Yes. An early conversation can help clarify scope, priorities and decisions to make before detailed planning." },
        { question: "Do renovation projects need a site visit?", answer: "Many projects benefit from a site discussion. The contractor can explain what is needed after reviewing the initial brief." },
      ],
    },
    services: {
      title: "Renovation work shaped around the home",
      copy: "Explore the type of work, the decisions each project involves and how to move from an idea to a clear scope.",
      details: [
        { title: "Kitchen renovations", copy: "Plan cabinetry, storage, surfaces, lighting and the way the kitchen connects to daily life." },
        { title: "Extensions and additions", copy: "Explore how added space could support changing needs and what planning steps may be involved." },
        { title: "Whole-home updates", copy: "Coordinate improvements across rooms with a considered sequence and consistent finish." },
      ],
      questions: [
        { question: "Can work be completed in stages?", answer: "Staging depends on the project scope, access and dependencies. Discuss priorities during the initial planning conversation." },
        { question: "Should I set a budget before enquiring?", answer: "A working budget helps align the scope with the investment available. It can be refined as requirements become clearer." },
      ],
    },
    about: {
      title: "Good renovation work begins before construction",
      copy: "Understanding how a household uses its space helps set priorities and make design and material decisions with the whole project in mind.",
      values: [
        { title: "Practical planning", copy: "Connect design decisions to how each room needs to function." },
        { title: "Clear scope", copy: "Agree the work, responsibilities and important decisions before construction begins." },
        { title: "Consistent communication", copy: "Keep the project team and homeowner aligned as work progresses." },
      ],
      questions: [
        { question: "Can I supply my own plans?", answer: "Share the plans you have and discuss how they fit the project scope and any required approvals." },
        { question: "When should I request a renovation quote?", answer: "Start when you can describe the main goals, location and approximate timing, even if some details are still open." },
      ],
    },
    contact: {
      title: "Tell us about the space you want to improve",
      copy: "A useful first brief gives the contractor enough context to understand the project and suggest a sensible next step.",
      prepareTitle: "A strong project enquiry covers",
      prepare: [
        { title: "The property and location", copy: "Share the project address or service area and the type of property." },
        { title: "The work you have in mind", copy: "List the rooms, changes and priorities you want to explore." },
        { title: "Timing and budget", copy: "Include your target timeframe and a working budget if you have one." },
      ],
      questions: [
        { question: "Can I send photos or plans?", answer: "Include available photos, sketches or plans when the enquiry channel supports attachments." },
        { question: "What happens after I enquire?", answer: "The contractor can review the brief, ask follow-up questions and advise whether a site visit is the right next step." },
      ],
    },
  },
  "professional-advisory": {
    home: {
      focusTitle: "Advice that starts with the decision",
      focusCopy: "Clarify the challenge, compare practical options and turn a complex question into a focused conversation.",
      features: [
        { title: "Frame the challenge", copy: "Bring the business context, constraints and decision you need to make." },
        { title: "Compare options", copy: "Understand trade-offs and dependencies before committing to a direction." },
        { title: "Move into action", copy: "Translate priorities into an achievable sequence of next steps." },
      ],
      questions: [
        { question: "What should I bring to an introductory conversation?", answer: "Share the decision you are facing, relevant background and what a useful outcome would look like." },
        { question: "Can an advisory engagement be scoped around one issue?", answer: "Yes. Define the question, desired output and time constraints before agreeing the scope." },
        { question: "Will advice include implementation?", answer: "Implementation support depends on the agreed scope and can be discussed during the initial conversation." },
      ],
    },
    services: {
      title: "Focused support for business decisions",
      copy: "Choose a starting point based on the question the business needs to answer and the kind of support required.",
      details: [
        { title: "Business strategy", copy: "Set priorities, assess market or operational choices and shape a practical plan." },
        { title: "Operational improvement", copy: "Map workflows, identify friction and define changes that fit the organisation." },
        { title: "Change and planning", copy: "Structure transitions, investment decisions and new initiatives with clear ownership." },
      ],
      questions: [
        { question: "How is an advisory project scoped?", answer: "Scope usually defines the business question, information needed, people involved, deliverables and timing." },
        { question: "Can internal teams be involved?", answer: "Yes. The right participants depend on the decision, the available expertise and the agreed working approach." },
      ],
    },
    about: {
      title: "Independent thinking, grounded in your context",
      copy: "Good advice considers the organisation's goals, constraints, people and resources before recommending a path forward.",
      values: [
        { title: "Context before recommendations", copy: "Understand the business situation and decision criteria before proposing changes." },
        { title: "Visible trade-offs", copy: "Make the risks, dependencies and benefits of each option easier to compare." },
        { title: "Actionable outputs", copy: "Give teams a clear record of priorities, decisions and responsibilities." },
      ],
      questions: [
        { question: "Is an initial discussion confidential?", answer: "Confidentiality arrangements should be agreed before sensitive information is shared." },
        { question: "Can recommendations be presented to stakeholders?", answer: "Agree the format and audience for findings as part of the project scope." },
      ],
    },
    contact: {
      title: "Start with the decision you need to make",
      copy: "Describe the business context and the question you are trying to resolve. The first conversation can establish whether the scope is a fit.",
      prepareTitle: "Context that helps us prepare",
      prepare: [
        { title: "The decision or challenge", copy: "Summarise the question, the timing and why it matters now." },
        { title: "Your current position", copy: "Share relevant constraints, work already completed and people involved." },
        { title: "A useful outcome", copy: "Describe what clarity or progress would make the engagement worthwhile." },
      ],
      questions: [
        { question: "Do I need a detailed brief?", answer: "No. A short summary is enough to begin a conversation about fit and scope." },
        { question: "Can you work with an existing internal team?", answer: "Yes. Describe the team's role and where additional outside perspective may help." },
      ],
    },
  },
  "tuition-centre": {
    home: {
      focusTitle: "Find learning support that fits the learner",
      focusCopy: "Compare subjects, levels and class formats to find a suitable conversation about a learner's next step.",
      features: [
        { title: "Choose a subject and level", copy: "Find the programme that matches the learner's current needs and school stage." },
        { title: "Understand the teaching format", copy: "Review class size, lesson structure and the support available during a session." },
        { title: "Plan a first visit", copy: "Ask about schedules, a centre visit or an introductory class before enrolling." },
      ],
      questions: [
        { question: "How do I choose the right programme?", answer: "Share the learner's age, school level, subject and the areas where they would like support." },
        { question: "Can parents ask questions before enrolment?", answer: "Yes. A conversation can cover the learning approach, schedule, class format and next steps." },
        { question: "Are trial classes available?", answer: "Ask the centre which programmes offer an introductory or trial class and how to arrange one." },
      ],
    },
    services: {
      title: "Programmes organised around learning stages",
      copy: "Clear programme details help families compare the level, subject and format before choosing a class.",
      details: [
        { title: "Primary foundations", copy: "Build familiarity with core ideas through guided practice and age-appropriate explanations." },
        { title: "Secondary subjects", copy: "Work through subject concepts, questions and revision needs at the learner's current level." },
        { title: "Study skills", copy: "Develop routines for planning, revising and approaching unfamiliar questions." },
      ],
      questions: [
        { question: "Can a learner join during the school year?", answer: "Placement depends on class capacity and the current programme. Ask the centre about the available start dates." },
        { question: "How are learners grouped?", answer: "Ask how the centre groups learners by level, subject and current learning needs." },
      ],
    },
    about: {
      title: "A supportive place to keep learning",
      copy: "A good learning environment meets students where they are, explains ideas patiently and helps families understand the learning plan.",
      values: [
        { title: "Encouraging teaching", copy: "Create a setting where learners can ask questions and practise without fear of getting something wrong." },
        { title: "Clear learning goals", copy: "Make the focus of a programme and lesson easier for students and parents to understand." },
        { title: "Family communication", copy: "Keep parents informed about class arrangements, learning priorities and practical next steps." },
      ],
      questions: [
        { question: "Can parents speak with a teacher?", answer: "Ask the centre how families can discuss a learner's needs and receive updates." },
        { question: "What should a learner bring to a first class?", answer: "The centre can advise which books, recent work or school materials will help the teacher understand current learning needs." },
      ],
    },
    contact: {
      title: "Tell us what the learner would like help with",
      copy: "Share the learner's level, subject and goals so the centre can suggest a suitable programme or first conversation.",
      prepareTitle: "Details that help with placement",
      prepare: [
        { title: "Age and school level", copy: "Include the learner's year or grade and the curriculum they follow." },
        { title: "Subjects and goals", copy: "Mention the subjects and topics they want to work on." },
        { title: "Preferred schedule", copy: "Share suitable days and any upcoming exam dates or deadlines." },
      ],
      questions: [
        { question: "Can I ask about class availability?", answer: "Yes. Include the preferred subject, level and schedule so the centre can check suitable options." },
        { question: "Does an enquiry reserve a place?", answer: "No. The centre will confirm programme availability and any enrolment steps separately." },
      ],
    },
  },
  "beauty-wellness": {
    home: {
      focusTitle: "Choose a treatment with confidence",
      focusCopy: "Understand what each visit involves, what to consider beforehand and how to find a treatment suited to your preferences.",
      features: [
        { title: "Browse the treatment menu", copy: "Compare the focus, duration and format of the available services." },
        { title: "Know before you book", copy: "Review preparation guidance and raise any suitability questions with the practitioner." },
        { title: "Plan a calm visit", copy: "Find the practical information needed to arrange a treatment and prepare for arrival." },
      ],
      questions: [
        { question: "How do I choose a treatment?", answer: "Start with the result or experience you are looking for and ask the practitioner which options may be suitable." },
        { question: "Should I mention sensitivities before booking?", answer: "Yes. Share relevant sensitivities or concerns in advance so the practitioner can discuss suitability." },
        { question: "What should I know before my appointment?", answer: "Preparation depends on the treatment. Review the guidance provided when you book and ask if anything is unclear." },
      ],
    },
    services: {
      title: "Treatments for a considered reset",
      copy: "Explore the treatment focus and visit details before choosing a service or asking the practitioner for guidance.",
      details: [
        { title: "Facial treatments", copy: "Compare options by treatment focus, session length and the skincare questions you want to discuss." },
        { title: "Massage and body care", copy: "Find a treatment style and pressure preference that can be discussed before your visit." },
        { title: "Wellness rituals", copy: "Explore combinations of services and allow time for a more relaxed appointment." },
      ],
      questions: [
        { question: "Can a treatment be adapted to my preferences?", answer: "Discuss comfort, pressure, products or other preferences with the practitioner before the session begins." },
        { question: "Can I book more than one service?", answer: "Ask about suitable combinations, appointment length and any preparation needed between services." },
      ],
    },
    about: {
      title: "Make room for care that feels personal",
      copy: "A thoughtful wellness visit gives people space to explain their preferences and understand what a treatment involves.",
      values: [
        { title: "Comfort first", copy: "Make it easy to discuss preferences, boundaries and comfort before treatment begins." },
        { title: "Clear treatment guidance", copy: "Explain the session, preparation and aftercare in straightforward language." },
        { title: "Time to reset", copy: "Design the visit around a welcoming environment and a considered pace." },
      ],
      questions: [
        { question: "Can I ask about products used during treatment?", answer: "Yes. Ask the practitioner about products and raise any ingredient sensitivities before your appointment." },
        { question: "What if I am unsure which service to choose?", answer: "Describe your goals and preferences and the practitioner can explain the available options." },
      ],
    },
    contact: {
      title: "Plan a visit that suits you",
      copy: "Tell us which treatments you are considering and any preferences the practitioner should know before confirming a time.",
      prepareTitle: "Before you get in touch",
      prepare: [
        { title: "Treatment interests", copy: "Name the services you are considering or the experience you are looking for." },
        { title: "Timing and duration", copy: "Share suitable dates and how much time you have for the visit." },
        { title: "Preferences or sensitivities", copy: "Mention relevant product sensitivities, comfort needs or questions." },
      ],
      questions: [
        { question: "Can I change or cancel an appointment?", answer: "Check the studio's booking terms for notice periods and rescheduling options." },
        { question: "Can I ask for a recommendation?", answer: "Yes. Share your preferences and the practitioner can explain which services may suit your visit." },
      ],
    },
  },
  "accounting-firm": {
    home: {
      focusTitle: "Practical accounting for clearer decisions",
      focusCopy: "Understand the support available for records, deadlines and business reporting before arranging a conversation.",
      features: [
        { title: "Keep records organised", copy: "Review the information needed to keep bookkeeping current and easier to maintain." },
        { title: "Stay clear on deadlines", copy: "Understand the documents and preparation steps involved in tax and compliance work." },
        { title: "Use financial information", copy: "Explore reporting that helps owners understand the position of the business." },
      ],
      questions: [
        { question: "When should I speak with an accountant?", answer: "Get in touch when you need help with records, a tax deadline, reporting or a business decision involving finances." },
        { question: "What should I prepare for a first call?", answer: "Bring a short description of the business, the support needed and any relevant deadlines." },
        { question: "Can I change accountants during a financial year?", answer: "A change may be possible. Discuss timing, records transfer and any upcoming obligations before making arrangements." },
      ],
    },
    services: {
      title: "Accounting support across the business year",
      copy: "Find help for the records, reporting and compliance tasks that keep a business organised.",
      details: [
        { title: "Bookkeeping", copy: "Organise sales, expenses, receipts and reconciliations into a reliable record-keeping routine." },
        { title: "Tax and compliance", copy: "Prepare the information required for filings and understand the responsibilities and deadlines involved." },
        { title: "Business reporting", copy: "Review income, costs and cash position to support planning and day-to-day decisions." },
      ],
      questions: [
        { question: "Can bookkeeping be brought up to date?", answer: "Yes. Discuss the period to catch up, the records available and any deadlines that affect the work." },
        { question: "Which records should I keep?", answer: "Requirements depend on the business and jurisdiction. An accountant can explain the records relevant to your situation." },
      ],
    },
    about: {
      title: "Clear numbers make better conversations",
      copy: "Good accounting support helps business owners understand their records, obligations and the questions behind their financial decisions.",
      values: [
        { title: "Plain-language explanations", copy: "Make financial information and compliance requirements easier to understand." },
        { title: "Reliable processes", copy: "Use clear routines for collecting, reviewing and keeping business records." },
        { title: "Useful reporting", copy: "Connect financial reports to the operational questions owners need to answer." },
      ],
      questions: [
        { question: "Can you work with my existing accounting software?", answer: "Share the systems you use so compatibility and data access can be discussed before work begins." },
        { question: "Do you support sole traders and companies?", answer: "Describe your business structure and the services you need so the firm can confirm fit." },
      ],
    },
    contact: {
      title: "Tell us what is happening with your accounts",
      copy: "Share the type of business, the support you need and any upcoming dates so the team can direct your enquiry.",
      prepareTitle: "Useful information for an initial review",
      prepare: [
        { title: "Business structure", copy: "Say whether you operate as a sole trader, partnership or company." },
        { title: "The support required", copy: "Mention bookkeeping, tax preparation, reporting or another accounting need." },
        { title: "Relevant deadlines", copy: "Include filing dates, reporting periods or decisions with a time constraint." },
      ],
      questions: [
        { question: "Should I send financial records in an enquiry?", answer: "Do not include sensitive documents in a general enquiry. The firm can provide a suitable secure way to share records." },
        { question: "Can I ask about a specific deadline?", answer: "Yes. Include the date and type of filing or report so the team can understand the timing." },
      ],
    },
  },
};

function DemoArtwork({ slug, content, theme }: { slug: string; content: DemoContent; theme?: { headingOnDark?: string; bodyOnDark?: string } }) {
  return <DemoIndustryPhoto key={slug} slug={slug}><LegacyDemoArtwork slug={slug} content={content} theme={theme}/></DemoIndustryPhoto>;
}
function LegacyDemoArtwork({ slug, content, theme }: { slug: string; content: DemoContent; theme?: { headingOnDark?: string; bodyOnDark?: string } }) {
  const service = (index: number) => content.services[index] || { name: "", copy: "" };
  const headingStyle = { color: theme?.headingOnDark || "#ffffff" };
  const mutedStyle = { color: theme?.bodyOnDark || "rgba(255,255,255,.72)" };
  if (slug === "dental-clinic") {
    return <div className="rounded-[2rem] bg-[#d9eee9] p-5 sm:p-8"><div className="rounded-2xl bg-white p-6 shadow-xl shadow-emerald-950/10 sm:p-8"><div className="flex items-center justify-between border-b border-slate-100 pb-5"><span className="text-sm font-bold text-slate-800">{content.brand}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{content.tagline}</span></div><div className="grid gap-5 py-7 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-800">{content.sectionTitle}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{content.headline}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{content.intro}</p></div><div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><ShieldCheck size={34}/></div></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f4f8f6] p-4"><CalendarDays className="text-emerald-800" size={18}/><p className="mt-3 text-sm font-semibold text-slate-800">{service(0).name}</p><p className="mt-1 text-xs text-slate-500">{service(0).copy}</p></div><div className="rounded-xl bg-[#f4f8f6] p-4"><MapPin className="text-emerald-800" size={18}/><p className="mt-3 text-sm font-semibold text-slate-800">{service(1).name}</p><p className="mt-1 text-xs text-slate-500">{service(1).copy}</p></div></div></div></div>;
  }
  if (slug === "renovation-contractor") {
    return <div className="rounded-[2rem] bg-[#e8dfd3] p-5 sm:p-8"><div className="grid grid-cols-2 gap-3"><div className="col-span-2 flex min-h-52 flex-col justify-end rounded-2xl bg-gradient-to-br from-[#4f4639] via-[#a18c70] to-[#d5c5ac] p-6 text-white"><span className="text-xs font-bold uppercase tracking-[.18em] text-white/70">{content.tagline}</span><h2 className="mt-3 max-w-sm text-3xl font-semibold tracking-tight" style={headingStyle}>{content.headline}</h2></div><div className="rounded-2xl bg-[#faf8f4] p-4"><span className="text-xs font-semibold uppercase tracking-wide text-[#76644d]">01 / Plan</span><p className="mt-3 font-semibold text-slate-900">{service(0).name}</p></div><div className="rounded-2xl bg-[#faf8f4] p-4"><span className="text-xs font-semibold uppercase tracking-wide text-[#76644d]">02 / Build</span><p className="mt-3 font-semibold text-slate-900">{service(1).name}</p></div></div></div>;
  }
  if (slug === "professional-advisory") {
    return <div className="rounded-[2rem] bg-[#e8e9e5] p-5 sm:p-8"><div className="rounded-2xl bg-[#172a32] p-7 text-white sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c8d6ca]">{content.tagline}</p><h2 className="mt-5 max-w-md font-serif text-4xl leading-tight" style={headingStyle}>{content.headline}</h2><div className="mt-8 border-t border-white/20 pt-5"><p className="max-w-sm text-sm leading-6" style={mutedStyle}>{content.intro}</p></div></div><div className="mt-3 grid grid-cols-3 gap-3">{content.steps.slice(0,3).map((item,i)=><div key={item.title} className="rounded-xl bg-white p-4"><span className="text-xs text-slate-400">0{i+1}</span><p className="mt-2 text-sm font-semibold text-slate-800">{item.title}</p></div>)}</div></div>;
  }
  if (slug === "tuition-centre") {
    return <div className="rounded-[2rem] bg-[#fff0d8] p-5 sm:p-8"><div className="rounded-2xl bg-white p-6 shadow-xl shadow-amber-950/10 sm:p-8"><div className="flex items-center justify-between"><span className="text-sm font-bold text-slate-900">{content.brand}</span><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{content.tagline}</span></div><h2 className="mt-8 max-w-md text-3xl font-semibold tracking-tight text-slate-900">{content.headline}</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{content.intro}</p><div className="mt-7 space-y-3">{content.services.slice(0,3).map((item,i)=><div key={item.name} className="flex items-center gap-4 rounded-xl bg-[#fff9ef] p-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-950">0{i+1}</span><span className="text-sm font-semibold text-slate-800">{item.name}</span><ArrowRight className="ml-auto text-amber-800" size={16}/></div>)}</div></div></div>;
  }
  if (slug === "beauty-wellness") {
    return <div className="rounded-[2rem] bg-[#efe3e1] p-5 sm:p-8"><div className="grid min-h-[25rem] grid-cols-[.82fr_1.18fr] overflow-hidden rounded-2xl bg-[#422f36]"><div className="flex flex-col justify-between p-5 text-white sm:p-8"><span className="text-xs font-bold uppercase tracking-[.18em] text-white/65">{content.brand}</span><div><p className="text-xs uppercase tracking-[.16em] text-[#e7c7bd]">{content.tagline}</p><h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl" style={headingStyle}>{content.headline}</h2></div><span className="text-xs" style={mutedStyle}>{content.intro}</span></div><div className="flex flex-col justify-center bg-gradient-to-br from-[#c99487] via-[#dfbbae] to-[#f2dfd1] p-5 sm:p-8"><div className="rounded-xl bg-white/85 p-5 shadow-xl backdrop-blur"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#795159]">{content.sectionTitle}</p><div className="mt-4 space-y-3">{content.services.slice(0,3).map(item=><div className="flex items-center justify-between border-b border-[#eadbd7] pb-3 text-sm font-medium text-[#3e3035]" key={item.name}><span>{item.name}</span><ArrowRight size={15}/></div>)}</div></div></div></div></div>;
  }
  return <div className="rounded-[2rem] bg-[#dce5ef] p-5 sm:p-8"><div className="rounded-2xl bg-[#142b45] p-6 text-white sm:p-8"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{content.tagline}</span><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{content.brand}</span></div><h2 className="mt-7 text-3xl font-semibold" style={headingStyle}>{content.headline}</h2><div className="mt-7 grid grid-cols-3 gap-3">{content.services.slice(0,3).map((item,i)=><div className="rounded-xl bg-white/10 p-4" key={item.name}><Check size={16} className="text-[#a9d5c6]"/><p className="mt-4 text-sm font-medium" style={headingStyle}>{item.name}</p></div>)}</div><div className="mt-5 h-20 rounded-xl bg-gradient-to-r from-[#193c5d] via-[#24677b] to-[#7cbaa0] p-4"><div className="flex h-full items-end gap-2">{[34,52,40,76,60,88,68,96,72,84].map((h,i)=><span key={i} className="flex-1 rounded-t bg-white/80" style={{height:h+"%"}} />)}</div></div></div></div>;
}

export default function StudioShowcaseLivePreview() {
  const { slug, page } = useParams();
  const cms = useStudioShowcaseCms();
  const baseStudy = STUDIO_SHOWCASES.find((item) => item.slug === slug);
  const config = slug ? cms[slug] : undefined;
  const study = baseStudy ? mergeCmsValue(baseStudy, config?.study) : undefined;
  const content = study ? mergeCmsValue(DEMOS[study.slug], config?.preview?.content) : undefined;
  const niche = study ? mergeCmsValue(NICHE_PAGE_CONTENT[study.slug], config?.preview?.pages) : undefined;
  const pages = ["home", "services", "about", "contact"] as const;
  const currentPage = pages.includes((page || "home") as typeof pages[number]) ? ((page || "home") as typeof pages[number]) : "home";

  if (!study || !content || !niche) {
    return <main className="brand-public min-h-screen bg-[#f8f8f5]"><PublicSiteHeader/><div className="brand-shell py-24"><h1>Page not found.</h1><Link to="/case-studies">Browse case studies <ArrowRight className="ml-2 inline" size={16}/></Link></div><PublicSiteFooter/></main>;
  }

  const previewPath = "/case-studies/showcase/" + study.slug + "/preview";
  const detailPath = "/case-studies/showcase/" + study.slug;
  const theme = config?.theme?.accent || study.colour;
  const design=demoDesign(study.slug);
  const accentInk=readableInk(theme,"#ffffff");
  const pageHref = (target: typeof pages[number]) => target === "home" ? previewPath : previewPath + "/" + target;
  const pageTitles: Record<typeof pages[number], string> = {
    home: content.brand,
    services: "Services",
    about: "About",
    contact: "Contact",
  };

  return <div className="bt-demo-design bt-demo-legacy min-h-screen bg-white text-slate-900" data-demo-layout={design.layout} data-demo-type={design.type} data-demo-services={design.services} style={{"--demo-bg":"#ffffff","--demo-ink":"#172033","--demo-accent":theme,"--demo-accent-ink":accentInk} as React.CSSProperties}>
    <Helmet>
      <title>{pageTitles[currentPage]} | {content.brand}</title>
      <meta name="description" content={currentPage === "home" ? content.intro : content.brand + " — " + pageTitles[currentPage] + ". " + content.intro}/>
      <link rel="canonical" href={"https://app.bennietay.com" + pageHref(currentPage)}/>
      <meta name="robots" content="noindex, follow"/>
    </Helmet>

    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
        <Link to={previewPath} className="max-w-[13rem]"><span className="block text-lg font-bold tracking-tight" style={{color:theme}}>{content.brand}</span><span className="mt-0.5 block text-[11px] text-slate-500">{content.tagline}</span></Link>
        <nav aria-label="Website navigation" className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600 sm:gap-5">
          {pages.map((item) => <Link key={item} aria-current={currentPage === item ? "page" : undefined} className={"rounded-full px-3 py-2 capitalize transition hover:bg-slate-100 " + (currentPage === item ? "font-semibold text-slate-950" : "")} to={pageHref(item)}>{demoNavigation(study.slug,item)}</Link>)}
        </nav>
        <Link to={pageHref("contact")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white sm:px-5" style={{backgroundColor:theme,color:accentInk}}>{content.cta}<ArrowRight size={15}/></Link>
      </div>
    </header>

    {currentPage === "home" ? <main>
      <section className="bt-demo-hero mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:px-12 lg:py-24">
        <div className="bt-demo-copy"><p className="text-xs font-bold uppercase tracking-[.18em]" style={{color:readableInk("#ffffff",theme)}}>{content.tagline}</p><h1 className="mt-5 max-w-[13ch] text-5xl font-semibold leading-[1.02] tracking-[-.055em] text-slate-950 sm:text-6xl lg:text-7xl">{content.headline}</h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{content.intro}</p><div className="mt-8 flex flex-wrap items-center gap-3"><Link to={pageHref("contact")} className="inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white" style={{backgroundColor:theme,color:accentInk}}>{content.cta}<ArrowRight size={16}/></Link><Link to={pageHref("services")} className="inline-flex min-h-12 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-700">Explore services</Link></div><div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{content.reassurance.map((item)=><span className="inline-flex items-center gap-1.5" key={item}><Check size={13} style={{color:theme}}/>{item}</span>)}</div></div>
        <div className="bt-demo-media"><DemoArtwork slug={study.slug} content={content} theme={config?.theme}/></div>
      </section>
      <IndustryExperience key={study.slug} slug={study.slug} services={content.services.map(s=>({title:s.name,detail:s.copy}))} contact={pageHref("contact")} servicePath={pageHref("services")}/>
      <section className="border-y border-slate-200 bg-[#f7f8fa]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><div className="grid gap-6 md:grid-cols-[1fr_.7fr] md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>How we can help</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{content.sectionTitle}</h2></div><p className="max-w-lg leading-7 text-slate-600">{niche.home.focusCopy}</p></div><div className="bt-demo-service-grid mt-10 grid gap-4 md:grid-cols-3">{content.services.map((service,index)=><article key={service.name} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-6 text-xl font-semibold tracking-tight text-slate-900">{service.name}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{service.copy}</p></article>)}</div><Link to={pageHref("services")} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold" style={{color:theme}}>View all services <ArrowRight size={15}/></Link></div></section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>A closer look</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{niche.home.focusTitle}</h2><p className="mt-5 leading-7 text-slate-600">{niche.home.focusCopy}</p></div><div className="grid gap-4 sm:grid-cols-3">{niche.home.features.map((item,index)=><article key={item.title} className="rounded-2xl border border-slate-200 p-6"><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{item.copy}</p></article>)}</div></div></section>
      <section className="border-y border-slate-200 bg-[#f7f8fa]"><div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Common questions</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">What people often want to know</h2><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200 bg-white px-6">{niche.home.questions.map((item)=><details key={item.question} className="group py-5"><summary className="cursor-pointer list-none font-semibold text-slate-900">{item.question}<span className="float-right text-xl" style={{color:theme}}>+</span></summary><p className="mt-3 pr-8 text-sm leading-7 text-slate-600">{item.answer}</p></details>)}</div></div></section>
      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Ready to take the next step?</p><h2 className="mt-2 text-2xl font-semibold text-slate-950">{content.cta}</h2></div><Link to={pageHref("contact")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white" style={{backgroundColor:theme,color:accentInk}}>Contact the team <ArrowRight size={16}/></Link></section>
    </main> : null}

    {currentPage === "services" ? <main>
      <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 lg:px-12"><DemoIndustryPhoto slug={study.slug} compact/></div>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Services</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">{niche.services.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{niche.services.copy}</p><div className="mt-12 grid gap-5 md:grid-cols-3">{content.services.map((service,index)=><article key={service.name} className="rounded-2xl border border-slate-200 bg-white p-7"><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{service.name}</h2><p className="mt-4 leading-7 text-slate-600">{service.copy}</p><Link to={pageHref("contact")} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold" style={{color:theme}}>Ask about this service <ArrowRight size={15}/></Link></article>)}</div></section>
      <section className="border-y border-slate-200 bg-[#f7f8fa]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>What each service includes</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{niche.services.title}</h2><p className="mt-4 leading-7 text-slate-600">{niche.services.copy}</p></div><div className="mt-10 grid gap-4 lg:grid-cols-3">{niche.services.details.map((item,index)=><article key={item.title} className="border-t-2 bg-white p-6 sm:p-7" style={{borderColor:theme}}><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-5 text-xl font-semibold text-slate-900">{item.title}</h3><p className="mt-3 leading-7 text-slate-600">{item.copy}</p></article>)}</div></div></section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_.8fr] lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Choosing a starting point</p><h2 className="mt-3 text-3xl font-semibold text-slate-950">{content.sectionTitle}</h2><p className="mt-4 max-w-xl leading-7 text-slate-600">{niche.services.copy}</p><Link to={pageHref("contact")} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold" style={{color:theme}}>Talk through your needs <ArrowRight size={15}/></Link></div><div className="divide-y divide-slate-200 border-y border-slate-200">{niche.services.questions.map((item,index)=><article key={item.question} className="py-5"><h3 className="font-semibold text-slate-900"><span className="mr-3 font-serif italic" style={{color:theme}}>0{index+1}</span>{item.question}</h3><p className="mt-2 pl-9 text-sm leading-7 text-slate-600">{item.answer}</p></article>)}</div></section>
    </main> : null}

    {currentPage === "about" ? <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>About our approach</p><h1 className="mt-4 max-w-lg text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">{niche.about.title}</h1><p className="mt-6 leading-8 text-slate-600">{niche.about.copy}</p><Link to={pageHref("contact")} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white" style={{backgroundColor:theme,color:accentInk}}>Start a conversation <ArrowRight size={16}/></Link></div><div className="divide-y divide-slate-200 border-y border-slate-200">{content.steps.map((step,index)=><article className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr]" key={step.title}><span className="font-serif text-3xl italic" style={{color:theme}}>0{index+1}</span><div><h2 className="text-xl font-semibold text-slate-900">{step.title}</h2><p className="mt-2 leading-7 text-slate-600">{step.copy}</p></div></article>)}</div></section>
      <section className="bg-[#f7f8fa]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>What guides the work</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{niche.about.title}</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">{niche.about.copy}</p><div className="mt-10 grid gap-4 md:grid-cols-3">{niche.about.values.map((item,index)=><article className="rounded-2xl bg-white p-6 sm:p-7" key={item.title}><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p></article>)}</div></div></section>
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Good to know</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">A few more details</h2><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{niche.about.questions.map((item)=><details key={item.question} className="py-5"><summary className="cursor-pointer list-none font-semibold text-slate-900">{item.question}<span className="float-right text-xl" style={{color:theme}}>+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.answer}</p></details>)}</div></section>
    </main> : null}

    {currentPage === "contact" ? <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_.8fr] lg:items-center lg:px-12"><div><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Contact</p><h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">{niche.contact.title}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{niche.contact.copy}</p><Link to={"/generate-preview?industry="+study.industry} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white" style={{backgroundColor:theme,color:accentInk}}>Get a preview for my business <ArrowRight size={16}/></Link><p className="mt-4 text-sm text-slate-500">Share your goals and the best way to reach you to begin.</p></div><div className="rounded-3xl bg-[#f7f8fa] p-8 sm:p-10"><h2 className="text-xl font-semibold text-slate-900">What happens next?</h2><div className="mt-6 space-y-5">{content.steps.map((step,index)=><div className="flex gap-4" key={step.title}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{backgroundColor:theme,color:accentInk}}>0{index+1}</span><div><h3 className="font-semibold text-slate-900">{step.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{step.copy}</p></div></div>)}</div></div></section>
      <section className="border-y border-slate-200 bg-[#f7f8fa]"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12"><p className="text-xs font-bold uppercase tracking-[.16em]" style={{color:theme}}>Before you contact us</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{niche.contact.prepareTitle}</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{niche.contact.prepare.map((item,index)=><article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-xs font-bold" style={{color:theme}}>0{index+1}</span><h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{item.copy}</p></article>)}</div></div></section>
      <section className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20"><h2 className="text-3xl font-semibold tracking-tight text-slate-950">Questions before you get in touch?</h2><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{niche.contact.questions.map((item)=><details key={item.question} className="py-5"><summary className="cursor-pointer list-none font-semibold text-slate-900">{item.question}<span className="float-right text-xl" style={{color:theme}}>+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{item.answer}</p></details>)}</div></section>
    </main> : null}

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><span>{content.brand}</span><div className="flex flex-wrap gap-5"><Link to={detailPath} className="font-semibold text-slate-700 hover:text-slate-950">Case study details</Link><Link to="/case-studies" className="font-semibold text-slate-700 hover:text-slate-950">All case studies</Link></div></div></footer>
  </div>;
}
