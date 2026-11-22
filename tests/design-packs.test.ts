import test from "node:test";
import assert from "node:assert/strict";
import { parseDesignDirection } from "../src/lib/designDirector.ts";
import { DESIGN_PACK_LIST, DESIGN_PACKS, applyDesignPack, applyApprovedDesignDirection, assessDesignPackRelease, recommendDesignPack } from "../src/lib/designPacks.ts";

test("three stable approved design packs have valid renderer variants", () => {
  assert.equal(DESIGN_PACK_LIST.length, 3);
  for (const pack of DESIGN_PACK_LIST) {
    assert.equal(pack.status, "approved");
    assert.deepEqual(assessDesignPackRelease(pack), []);
  }
});
test("recommendation is deterministic and industry grounded", () => {
  assert.equal(recommendDesignPack({industry:"Dental Clinic"}).pack.id, "editorial_authority");
  assert.equal(recommendDesignPack({industry:"Wellness Spa"}).pack.id, "organic_human");
  assert.equal(recommendDesignPack({industry:"Plumbing"}).pack.id, "conversion_local");
});
test("applying a pack does not invent content or publish the website", () => {
  const original = {
    id:"one",businessId:"business",status:"draft",seo:{title:"Actual title"},
    theme:{primaryColor:"#000000",secondaryColor:"#ffffff",fontFamily:"Arial"},
    pages:[{id:"home",title:"Home",slug:"",sections:[
      {id:"hero",type:"hero",content:{headline:"Real client headline"},settings:{variant:"minimal_statement"}},
      {id:"proof",type:"proof",content:{heading:"Verified credentials"},settings:{variant:"metrics"}},
    ]}],
  } as any;
  const next = applyDesignPack(original, "editorial_authority");
  assert.equal(next.pages[0].sections[0].content.headline, "Real client headline");
  assert.equal(next.pages[0].sections[1].content.heading, "Verified credentials");
  assert.equal(next.pages[0].sections[0].settings.variant, "editorial_split");
  assert.equal(next.status, "draft");
  assert.equal(original.theme.primaryColor, "#000000");
  assert.equal(next.theme.designPackVersion, DESIGN_PACKS.editorial_authority.version);
});

test("AI recommendations accept only approved variants and never fabricate content", () => {
  const source = {
    id:"two", businessId:"customer-2", status:"draft",
    seo:{title:"Actual practice",description:"Source description",keywords:[]},
    theme:{primaryColor:"#112233",secondaryColor:"#ffffff",fontFamily:"Inter",designPackId:"conversion_local",designPackVersion:"1.0.0"},
    pages:[{id:"home",title:"Home",slug:"",sections:[
      {id:"h",type:"hero",content:{headline:"Original business identity"},settings:{}},
      {id:"s",type:"services",content:{items:[{title:"Actual service"}]},settings:{}},
      {id:"t",type:"testimonials",content:{items:[]},settings:{}},
      {id:"c",type:"cta",content:{title:"Call the clinic"},settings:{}},
    ]}],
  } as any;
  const direction = parseDesignDirection({
    designProfile:"trust_authority",typographyProfile:"authority",spacingProfile:"editorial",motionProfile:"subtle",
    heroVariant:"editorial_split",servicesVariant:"editorial_list",
    testimonialVariant:"editorial_quote",ctaVariant:"consultation",
    imageTreatment:"documentary",contentDensity:"editorial",
    rationale:["Focus on real practitioner credentials"],reviewNotes:["Check credentials"],
  });
  const updated = applyApprovedDesignDirection(source, direction);
  assert.equal(updated.pages[0].sections[0].settings.variant, "editorial_split");
  assert.equal(updated.pages[0].sections[1].settings.variant, "editorial_list");
  assert.equal(updated.pages[0].sections[0].content.headline, "Original business identity");
  assert.deepEqual(updated.pages[0].sections[2].content.items, []);
  assert.equal(updated.theme.designPackId, undefined);
  assert.equal(updated.status, "draft");
  assert.equal(source.theme.designPackId,"conversion_local");
  assert.throws(() => parseDesignDirection({...direction,heroVariant:"unapproved_hero"}));
});

test("release checks reject broken pack versions, colors and variants", () => {
  const pack = DESIGN_PACKS.conversion_local;
  assert.ok(assessDesignPackRelease({...pack, version:"latest"}).length);
  assert.ok(assessDesignPackRelease({...pack, primaryColor:"#EEEEEE", secondaryColor:"#FFFFFF"}).length);
  assert.ok(assessDesignPackRelease({...pack, sections:{...pack.sections,hero:"unknown_component"}}).length);
});

test("source-driven renderer variants remain protected when styling changes", () => {
  const original = {
    id:"source", businessId:"source-business", status:"draft",
    seo:{title:"Actual business",description:"Verified details",keywords:[]},
    theme:{sourceDriven:true,primaryColor:"#112233",secondaryColor:"#ffffff",fontFamily:"Inter"},
    pages:[{id:"home",title:"Home",slug:"",sections:[
      {id:"h",type:"hero",content:{headline:"Source-backed headline"},settings:{variant:"source_brand_hero"}},
      {id:"s",type:"services",content:{items:[{title:"Verified service"}]},settings:{variant:"editorial_list"}},
    ]}],
  } as any;
  const packed = applyDesignPack(original,"conversion_local");
  assert.equal(packed.pages[0].sections[0].settings.variant,"source_brand_hero");
  assert.equal(packed.pages[0].sections[0].content.headline,"Source-backed headline");
  const direction = parseDesignDirection({
    designProfile:"trust_authority",typographyProfile:"authority",spacingProfile:"editorial",motionProfile:"subtle",
    heroVariant:"editorial_split",servicesVariant:"editorial_list",
    testimonialVariant:"editorial_quote",ctaVariant:"consultation",
    imageTreatment:"documentary",contentDensity:"editorial",
    rationale:[],reviewNotes:[],
  });
  const ai = applyApprovedDesignDirection(original,direction);
  assert.equal(ai.pages[0].sections[0].settings.variant,"source_brand_hero");
});
