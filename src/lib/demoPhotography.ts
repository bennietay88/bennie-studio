/** Illustrative stock and studio imagery; not actual staff, clients or commissioned work. */
export const DEMO_PHOTOGRAPHY: Record<string,{source:string;alt:string}> = {
  "dental-clinic": {
    "source": "/template-assets/flagship-clinic.jpg",
    "alt": "Dental care setting"
  },
  "renovation-contractor": {
    "source": "/template-assets/flagship-renovation.jpg",
    "alt": "Contemporary renovated interior"
  },
  "professional-advisory": {
    "source": "/template-assets/flagship-professional.jpg",
    "alt": "Professional advisory setting"
  },
  "tuition-centre": {
    "source": "/template-assets/flagship-education.jpg",
    "alt": "Learning and tuition setting"
  },
  "beauty-wellness": {
    "source": "/template-assets/flagship-beauty.jpg",
    "alt": "Beauty and wellness setting"
  },
  "accounting-firm": {
    "source": "https://www.pexels.com/photo/6694547/",
    "alt": "Accounting workspace"
  },
  "physiotherapy-clinic": {
    "source": "https://www.pexels.com/photo/31234755/",
    "alt": "Physiotherapy rehabilitation setting"
  },
  "real-estate-agency": {
    "source": "https://www.pexels.com/photo/35818904/",
    "alt": "Residential architecture"
  },
  "cleaning-service": {
    "source": "https://www.pexels.com/photo/9462746/",
    "alt": "Professional cleaning"
  },
  "hvac-specialist": {
    "source": "https://www.pexels.com/photo/5463580/",
    "alt": "Air conditioning maintenance"
  },
  "landscape-design": {
    "source": "https://www.pexels.com/photo/38808595/",
    "alt": "Landscaped garden"
  },
  "business-consulting": {
    "source": "https://www.pexels.com/photo/36765719/",
    "alt": "Business consulting meeting"
  },
  "interior-design": {
    "source": "https://www.pexels.com/photo/28456458/",
    "alt": "Contemporary interior"
  },
  "auto-detailing": {
    "source": "https://www.pexels.com/photo/35149476/",
    "alt": "Automotive detailing"
  },
  "fitness-coaching": {
    "source": "https://www.pexels.com/photo/4854267/",
    "alt": "Fitness training"
  },
  "photography-studio": {
    "source": "https://www.pexels.com/photo/30697993/",
    "alt": "Photography studio"
  },
  "pet-wellness": {
    "source": "https://www.pexels.com/photo/7469233/",
    "alt": "Pet care setting"
  },
  "event-planning": {
    "source": "https://www.pexels.com/photo/28931887/",
    "alt": "Event reception setting"
  }
};
export const demoPhotoPath=(slug:string)=>DEMO_PHOTOGRAPHY[slug]?"/images/case-studies/photography/"+slug+".jpg":"";
