# Bulk outreach eligibility correction

- Existing intro send-button confirmation and follow-up batch checkbox are retained; neither creates recipient permission.
- Preview shows specific permission defects rather than overwriting all failures with a generic consent error.
- Canada and Australia can pass with valid address-bound consent only. No historic consent data is changed.
- Unattempted rows are identified when a quota or shared provider failure stops a batch.
- Before production, generate a Supabase migration using `supabase migration new outreach_jurisdiction_expansion`, copy the SQL from `docs/outreach-jurisdiction-release.sql`, replay in staging and check the constraints. The CLI was unavailable when drafting this change; the SQL is not yet a migration. Deploy the database change before the matching app version.
- Run existing outreach tests, recipient consent tests, type checking and production build, then test one authorized recipient in each batch workflow. Do not retry uncertain deliveries or remove suppressions.
