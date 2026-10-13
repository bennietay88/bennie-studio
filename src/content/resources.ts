export type ResourceArticle = {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  image: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
};

export const RESOURCE_ARTICLES: ResourceArticle[] = [
  {
    slug: "plan-a-website-that-gets-results",
    category: "Website strategy",
    title: "How to plan a website that actually gets results",
    excerpt: "A practical step-by-step approach to planning structure, messaging and launch.",
    readTime: "10 min read",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1100&q=82",
    intro: "A useful website plan starts with the decision you need a visitor to make. Before choosing sections, colours or technology, make the offer understandable, prove why it matters and give the right person a clear next step.",
    sections: [
      { heading: "Start with the buying decision", body: "Write down who the website is for, what they are trying to solve and what would make them comfortable taking the next step. This becomes the filter for every page and removes sections that exist only because another website has them." },
      { heading: "Build the page system around proof", body: "A strong structure usually moves from promise to explanation, evidence and action. Services, case studies, process details and FAQs should answer the questions that stop a good-fit visitor from enquiring." },
      { heading: "Make launch measurable", body: "Choose one primary enquiry path and a small set of supporting actions before launch. Then review form completion, calls, bookings and useful search visits instead of judging the website by traffic alone." },
    ],
  },
  {
    slug: "website-elements-that-build-trust",
    category: "Conversion",
    title: "7 website elements that build trust",
    excerpt: "The practical signals that make a service business easier to believe and contact.",
    readTime: "8 min read",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1100&q=82",
    intro: "Trust is not one testimonial block near the bottom of a page. It is the result of small signals working together: clear expertise, specific proof, visible process and a next step that feels safe.",
    sections: [
      { heading: "Clarity before persuasion", body: "Say what you do, who it is for and what changes for the customer in the first screen. A visitor should not need to decode a clever headline before they can decide whether the business is relevant." },
      { heading: "Specific proof beats broad claims", body: "Use named services, real examples, useful outcomes and verifiable credentials where they exist. If a claim cannot be supported, replace it with an observable fact about the work or process." },
      { heading: "Reduce the risk of contact", body: "Explain what happens after a form, call or booking. Response expectations, process steps and a human introduction can make the enquiry feel like a conversation rather than a commitment." },
    ],
  },
  {
    slug: "website-copy-that-converts",
    category: "Copy & messaging",
    title: "How to write website copy that converts",
    excerpt: "A simple framework for clearer, more useful service-business messaging.",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1100&q=82",
    intro: "Conversion-focused copy is not louder copy. It is copy that answers the next question in a visitor’s mind with enough detail to make the next action feel sensible.",
    sections: [
      { heading: "Use the customer’s language", body: "Start with the phrases customers use when they describe the problem, desired outcome and buying concern. Keep the business language where it helps precision, but do not make visitors translate internal jargon." },
      { heading: "Give every section a job", body: "A section should clarify the offer, build confidence, handle an objection or move the visitor toward action. If it does none of these, it probably belongs in notes rather than on the page." },
      { heading: "Write the action around intent", body: "Not every visitor is ready to book a call. Offer a useful progression: see relevant work, understand the process, request a preview or speak to someone. The important thing is that the next action is obvious." },
    ],
  },
  {
    slug: "measure-website-success",
    category: "Analytics",
    title: "How to measure website success",
    excerpt: "Focus on the metrics that connect website activity with enquiries and sales.",
    readTime: "9 min read",
    image: "/template-assets/concept-professional-v2.jpg",
    intro: "A website report full of visits can still hide a weak buying journey. Measurement should connect what people do on the site with the commercial action the business actually needs.",
    sections: [
      { heading: "Define the primary conversion", body: "Pick the action that represents a useful opportunity: a qualified enquiry, booking, quote request or call. Keep softer signals such as guide downloads and email subscriptions as supporting evidence." },
      { heading: "Read the path, not one number", body: "Compare landing pages, engagement, action starts and completed submissions. A high-traffic page with no meaningful next step needs a different response from a low-traffic page that consistently creates good enquiries." },
      { heading: "Review quality as well as volume", body: "Ask whether the enquiries fit the service, market and capacity. A clearer offer can reduce poor-fit leads while improving the conversations that matter." },
    ],
  },
  {
    slug: "mobile-first-website-design",
    category: "Design & UX",
    title: "Mobile-first design: what it means",
    excerpt: "How to make a site easier to use when most visitors arrive on a phone.",
    readTime: "8 min read",
    image: "/template-assets/concept-clinic-v2.jpg",
    intro: "Mobile-first design is not simply shrinking a desktop layout. It means deciding what deserves attention when space, time and patience are limited.",
    sections: [
      { heading: "Prioritise the first decision", body: "The mobile opening should establish relevance and make the primary action easy to find. Secondary navigation and decorative detail can wait until the visitor has context." },
      { heading: "Design for thumbs and interruptions", body: "Use comfortable touch targets, short blocks, strong contrast and layouts that survive interrupted reading. Forms should ask only for information needed at that moment." },
      { heading: "Test real content", body: "Responsive QA should use long service names, error messages, real images and actual form states. A clean mockup is not enough to prove the experience works." },
    ],
  },
  {
    slug: "what-a-redesign-should-improve",
    category: "Case studies",
    title: "What a strong redesign should improve",
    excerpt: "Use the original site as a baseline instead of changing design for its own sake.",
    readTime: "6 min read",
    image: "/template-assets/concept-renovation-v2.jpg",
    intro: "A redesign earns its cost by making the business easier to understand, trust and choose. A new colour palette is not a result on its own.",
    sections: [
      { heading: "Keep useful identity", body: "Carry forward the facts, language and recognition that customers already rely on. Change the parts that create confusion or friction, not everything simply to make the work look new." },
      { heading: "Compare decisions before and after", body: "Look at the first impression, service discovery, proof hierarchy, mobile actions and enquiry path. These are more useful comparisons than screenshots placed side by side without context." },
      { heading: "Document the next opportunity", body: "A good redesign also shows what to improve after launch: content gaps, search questions, conversion experiments or new proof the business can collect." },
    ],
  },
  {
    slug: "website-launch-checklist",
    category: "Tools & resources",
    title: "The website launch checklist",
    excerpt: "A practical checklist for content, mobile, SEO, forms and launch quality.",
    readTime: "5 min read",
    image: "/template-assets/concept-education-v2.jpg",
    intro: "Launch day should confirm that the website works as a customer experience, not just that the deployment completed.",
    sections: [
      { heading: "Content and proof", body: "Check page titles, service descriptions, contact details, claims, testimonials and imagery. Every important promise should be clear and supportable." },
      { heading: "Technical and responsive checks", body: "Test navigation, forms, keyboard focus, mobile layouts, image loading, redirects, metadata, analytics and error states. Do this on the published URL as well as locally." },
      { heading: "The first week after launch", body: "Watch real enquiries, search coverage, broken links and user questions. Capture small improvements in a prioritised list instead of treating launch as the end of the work." },
    ],
  },
  {
    slug: "turn-more-visitors-into-customers",
    category: "Business growth",
    title: "How to turn more visitors into customers",
    excerpt: "Clarify the offer, strengthen proof and make the next step easier to take.",
    readTime: "11 min read",
    image: "/template-assets/concept-beauty-v2.jpg",
    intro: "More conversion usually comes from reducing uncertainty, not adding pressure. Visitors need to understand the offer, recognise that it fits and know what happens next.",
    sections: [
      { heading: "Tighten the offer", body: "Group services around the decisions customers make and explain the useful difference between options. A long list of capabilities is rarely as helpful as a clear route to the right one." },
      { heading: "Put proof next to the claim", body: "Place relevant evidence near the service or promise it supports. This lets visitors validate the message while it is still fresh instead of asking them to hunt through the site." },
      { heading: "Keep the next step lightweight", body: "Offer an appropriate action for the visitor’s readiness. A short enquiry, preview or focused call can outperform a generic ‘contact us’ button because it sets expectations." },
    ],
  },
  {
    slug: "when-to-redesign-your-website",
    category: "Website strategy",
    title: "When to redesign your website",
    excerpt: "Signs that the current site is costing trust, clarity or conversion.",
    readTime: "7 min read",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1100&q=82",
    intro: "A redesign is worth considering when the current site creates a measurable business or customer problem—not simply because the visual style feels dated.",
    sections: [
      { heading: "The business has changed", body: "New services, a sharper audience or a different commercial model can make an old page structure actively misleading. The website should reflect the business customers can buy today." },
      { heading: "Visitors cannot find confidence", body: "Weak proof, unclear service boundaries, poor mobile behaviour or missing next steps can make a capable business look harder to choose than it really is." },
      { heading: "The site cannot improve safely", body: "If content, analytics, forms or integrations are difficult to update, the cost is not only visual. The business loses the ability to learn and improve after launch." },
    ],
  },
];

export const getResourceArticle = (slug: string | undefined) => RESOURCE_ARTICLES.find((article) => article.slug === slug);
