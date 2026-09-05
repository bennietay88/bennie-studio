import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredMarket, persistCommercialMarket } from '../src/lib/commercialPricing.ts';

test('incoming market survives the handoff and can be changed by the buyer', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let stored = 'INTL';
  let current = new URL('https://app.bennietay.com/generate-preview?industry=cleaning&market=SG');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    get location() { return current; },
    history: { state: null, replaceState: (_state: unknown, _title: string, url: string | URL) => { current = new URL(url); } },
  } });
  try {
    assert.equal(getStoredMarket(), 'SG');
    persistCommercialMarket('GB');
    assert.equal(getStoredMarket(), 'GB');
    assert.equal(current.searchParams.get('industry'), 'cleaning');
    current = new URL('https://app.bennietay.com/pricing?market=invalid');
    assert.equal(getStoredMarket(), 'GB');
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
