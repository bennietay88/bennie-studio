import test from "node:test";
import assert from "node:assert/strict";
import { attachUploaderOutreachDeclaration, parseProspectCsv } from "../src/lib/prospectImport.ts";

test("imports existing Bennie enriched prospect-list format", () => {
  const csv = [
    "priority,business_name,market,city_area,niche,phone,whatsapp,email,existing_website,contact_page_or_listing,contact_confidence,source_note,pitch_angle",
    "1,A Plus+ Dental KL,Malaysia,Kuala Lumpur,Dental clinic,+60105591789,https://wa.me/60105591789,,Not found publicly,https://example.com/listing,High,Directory listing,Appointment-focused website",
    "2,A.Line Dental,Malaysia,Taman Danau Desa,Dental clinic,+601123200821,https://wa.me/601123200821,hello@aline.test,https://www.alinedentalclinickl.com/,https://www.alinedentalclinickl.com/contact,High,Official contact page,Booking CTA",
  ].join("\n");

  const result = parseProspectCsv(csv);
  assert.equal(result.prospects.length, 2);
  assert.equal(result.duplicates, 0);

  const first = result.prospects[0];
  assert.equal(first.name, "A Plus+ Dental KL");
  assert.equal(first.industry, "Dental clinic");
  assert.equal(first.location, "Kuala Lumpur, Malaysia");
  assert.equal(first.contact_phone, "60105591789");
  assert.equal(first.contact_whatsapp, "60105591789");
  assert.equal(first.domain, null);
  assert.equal(first.website_status, "no_website");
  assert.match(first.notes, /Priority: 1/);
  assert.match(first.notes, /Pitch angle: Appointment-focused website/);

  const second = result.prospects[1];
  assert.equal(second.domain, "alinedentalclinickl.com");
  assert.equal(second.contact_email, "hello@aline.test");
});

test("auto maps common CSV headers and skips duplicate rows inside the file", () => {
  const csv = [
    "company_name,website_url,category,country,city,email_address,phone_number,remarks",
    "Example Co,https://www.example.com,Dentist,United Kingdom,London,hello@example.com,+442012345678,Needs a stronger CTA",
    "Example Co,https://www.example.com,Dentist,United Kingdom,London,hello@example.com,+442012345678,Duplicate",
  ].join("\n");

  const result = parseProspectCsv(csv);
  assert.equal(result.prospects.length, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.prospects[0].name, "Example Co");
  assert.equal(result.prospects[0].domain, "example.com");
  assert.equal(result.prospects[0].location, "London, United Kingdom");
  assert.equal(result.prospects[0].contact_phone, "442012345678");
});

test("rejects invalid contact data before upload", () => {
  assert.throws(
    () => parseProspectCsv("business_name,email\nExample Co,not-an-email"),
    /Row 2: email is invalid/,
  );
});

test("accepts the current qualified prospect export shape", () => {
  const csv = [
    "business_name,website,industry,location,email,phone,whatsapp,social_url,notes",
    "\"Brighton's Bathrooms Ltd\",brightonsbathrooms.com,Bathroom / Plumbing,\"Brighton, UK\",brightonsbathrooms@gmail.com,07590477434,,,\"Priority 99/100. Gmail + direct mobile and specialist positioning.\"",
    "J. A Roofing Services,jaroofpros.co.uk,Roofing,\"Norwich, UK\",j-roofingservices@hotmail.com,01603355153,,,\"Priority 98/100. Strong fast-cycle outreach angle.\"",
  ].join("\n");

  const result = parseProspectCsv(csv);
  assert.equal(result.prospects.length, 2);
  assert.equal(result.prospects[0].name, "Brighton's Bathrooms Ltd");
  assert.equal(result.prospects[0].domain, "brightonsbathrooms.com");
  assert.equal(result.prospects[0].location, "Brighton, UK");
  assert.equal(result.prospects[0].contact_phone, "07590477434");
  assert.match(result.prospects[0].notes, /Priority 99\/100/);
});

test("uploaded email contacts receive an uploader authorization declaration, not fabricated recipient opt-in", () => {
  const original = { name: "Example Co", contact_email: "hello@example.com", notes: "Research from business website" };
  const declared = attachUploaderOutreachDeclaration(original, "2026-10-14T08:00:00.000Z");
  assert.match(declared.notes, /Manual outreach authorization declared by CSV uploader/);
  assert.match(declared.notes, /2026-10-14T08:00:00.000Z/);
  assert.match(declared.notes, /not verified recipient opt-in/);
  assert.match(declared.notes, /Research from business website/);
  assert.equal(declared.marketing_consent, undefined);
  assert.equal(declared.consent_timestamp, undefined);
  assert.equal(declared.consent_source, undefined);
  assert.equal(original.notes, "Research from business website");

  const withoutEmail = attachUploaderOutreachDeclaration({ name: "Phone Only", contact_email: null, notes: null }, "2026-10-14T08:00:00.000Z");
  assert.equal(withoutEmail.notes, null);
});
