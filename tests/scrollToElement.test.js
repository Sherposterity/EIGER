// Ported from Codex review FOR_FABLE_VERIFY_PILL_SCROLL_2026-09-27 (eiger-ops/reviews). DOM-free simulation of the frame-driven scroll helper.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollToElement } from '../src/components/verification/scrollToElement.js';

function setup({ reduced = false } = {}) {
  let id = 0;
  const frames = new Map(), events = new Map(), writes = [];
  const original = new Map(['window', 'document', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  globalThis.window = { scrollY: 0, scrollX: 3, innerHeight: 800, matchMedia: () => ({ matches: reduced }), scrollTo: options => { writes.push(options); window.scrollY = options.top; }, addEventListener: (name, fn) => { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); }, removeEventListener: (name, fn) => events.get(name)?.delete(fn) };
  globalThis.document = { documentElement: { scrollHeight: 6000 } };
  globalThis.getComputedStyle = () => ({ scrollMarginTop: '64px' });
  globalThis.requestAnimationFrame = fn => { frames.set(++id, fn); return id; };
  globalThis.cancelAnimationFrame = key => frames.delete(key);
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => 0 } });
  const el = { isConnected: true, y: 4000, getBoundingClientRect() { return { top: this.y - window.scrollY }; } };
  return { el, writes, frames, tick: now => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now)); }, emit: (name, e = {}) => [...(events.get(name) ?? [])].forEach(fn => fn(e)), restore: () => { for (const [k, d] of original) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } } };
}

test('frame writes are instant; moving target respects scroll margin', () => {
  const h = setup(); try { scrollToElement(h.el); h.tick(350); h.el.y += 100; h.tick(700); assert.equal(window.scrollY, 4036); assert.ok(h.writes.every(w => w.behavior === 'instant' && w.left === 3)); } finally { h.restore(); }
});
test('reduce motion jumps immediately and completes', () => {
  const h = setup({ reduced: true }); try { let done = 0; scrollToElement(h.el, { onComplete: () => done++ }); assert.equal(window.scrollY, 3936); assert.equal(done, 1); assert.equal(h.frames.size, 0); } finally { h.restore(); }
});
test('unmount cleanup and detached target prevent subsequent page scroll', () => {
  const h = setup(); try { const cancel = scrollToElement(h.el); cancel(); h.tick(700); assert.equal(h.writes.length, 0); scrollToElement(h.el); h.el.isConnected = false; h.tick(700); assert.equal(h.writes.length, 0); } finally { h.restore(); }
});
test('manual input cancels without falsely completing', () => {
  const h = setup(); try { let done = false; scrollToElement(h.el, { onComplete: () => { done = true; } }); h.tick(100); const n = h.writes.length; h.emit('wheel'); h.tick(700); assert.equal(h.writes.length, n); assert.equal(done, false); } finally { h.restore(); }
});
test('new request cancels old and targets within maximum scroll', () => {
  const h = setup(); try { let oldDone = false; scrollToElement(h.el, { onComplete: () => { oldDone = true; } }); const next = { ...h.el, y: 9000 }; scrollToElement(next); h.tick(700); assert.equal(window.scrollY, 5200); assert.equal(oldDone, false); } finally { h.restore(); }
});
