import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredMarket, persistCommercialMarket } from '../src/lib/commercialPricing.ts';

test('new-sale market preferences cannot override the verified USD catalogue', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = 'SG';
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } });
  try {
    assert.equal(getStoredMarket(), 'INTL');
    persistCommercialMarket('GB');
    assert.equal(getStoredMarket(), 'INTL');
    assert.equal(stored, 'INTL');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
