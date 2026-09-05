import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReviewWebsiteStrategy } from '../src/constants/reviewPoweredWaas.ts';
test('a service name cannot be mistaken for customer review evidence', () => {
  const result = buildReviewWebsiteStrategy({businessName: 'Demo', industry: 'Cleaning', mainServices: 'Professional fast cleaning', city: 'Singapore', reviews: ''});
  assert.equal(result.intelligence.hasReviews, false);
  assert.doesNotMatch(result.heroHeadline, /trusted|feedback|reviews/i);
  assert.doesNotMatch(result.trustSignals.join(' '), /Provided review text/);
  assert.match(result.intelligence.risks.join(' '), /No reviews supplied/);
});
