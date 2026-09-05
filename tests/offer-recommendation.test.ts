import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendCommercialProduct } from '../src/lib/recommendCommercialProduct.ts';

test('a suggested five-page structure does not automatically upsell a basic enquiry goal', () => {
  for (const industry of ['Cleaning Company', 'Tuition / Education Centre', 'Accounting / Bookkeeping Firm']) {
    assert.equal(recommendCommercialProduct({industry, goal: 'Get phone calls', notes: '', requestedPages: 5}).slug, 'managed-website');
  }
});
test('custom functionality requires a scoped quote', () => {
  assert.equal(recommendCommercialProduct({industry: 'Education', goal: 'Get bookings', notes: 'Membership integration'}).slug, 'custom-website');
});
test('an explicit ongoing SEO goal can recommend Website Growth', () => {
  assert.equal(recommendCommercialProduct({industry: 'Cleaning Company', goal: 'Improve SEO', notes: ''}).slug, 'website-growth');
});
