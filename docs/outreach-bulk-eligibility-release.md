# Bulk outreach eligibility correction

- Existing intro send-button confirmation and follow-up batch checkbox are retained; neither creates recipient permission.
- Preview shows specific permission defects rather than overwriting all failures with a generic consent error.
- Canada and Australia can pass with valid address-bound consent only. No historic consent data is changed.
- Unattempted rows are identified when a quota or shared provider failure stops a batch.
- Supabase migration `20261124160435_outreach_jurisdiction_expansion` was applied to the live Website Builder project and both constraints were verified as validated. The matching migration file is committed here. Consent evidence constraints and RLS remain enabled. Staging replay and application tests remain outstanding.
- Run existing outreach tests, recipient consent tests, type checking and production build, then test one authorized recipient in each batch workflow. Do not retry uncertain deliveries or remove suppressions.
