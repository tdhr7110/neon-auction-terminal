import test from 'node:test';
import assert from 'node:assert/strict';

import { LOTS, NPCS, QUEST, CONTENT_VERSION, lotById } from '../src/slice-data.js';
import {
  SCHEMA_VERSION, PLAYER_ID, createInitialState, currentLot, currentLotState,
  revealEvidence, submitHypothesis, placePlayerBid, passAuction, finalizePlayerWin,
  disposePlayerLot, continueAfterResult, npcMaxBid, deliverQuest, questMatches,
  invariantErrors,
} from '../src/game-engine.js';
import {
  SAVE_KEY, LEGACY_SAVE_KEYS, hydrateState, loadState, saveState, resetSaves,
} from '../src/game-storage.js';

class MemoryStorage {
  constructor(entries = {}) { this.data = new Map(Object.entries(entries)); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

function acceptAndExplore(seed = 'TEST-SEED') {
  const state = createInitialState({ seed, screen: 'explore' });
  state.name = 'TEST';
  state.quest.accepted = true;
  return state;
}

function revealTwo(state) {
  const lot = currentLot(state);
  let outcome = revealEvidence(state, lot.evidence[0].id);
  assert.equal(outcome.error, '');
  outcome = revealEvidence(outcome.state, lot.evidence[1].id);
  assert.equal(outcome.error, '');
  return outcome.state;
}

function enterAuction(state, condition = currentLot(state).condition, confidence = 'medium') {
  const investigated = revealTwo(state);
  const outcome = submitHypothesis(investigated, condition, confidence);
  assert.equal(outcome.error, '');
  return outcome.state;
}

function bidUntilLeading(state, maxTurns = 120) {
  let next = state;
  for (let turn = 0; turn < maxTurns && currentLotState(next).auction.leaderId !== PLAYER_ID; turn += 1) {
    const outcome = placePlayerBid(next, 10);
    assert.equal(outcome.error, '');
    next = outcome.state;
  }
  assert.equal(currentLotState(next).auction.leaderId, PLAYER_ID);
  return next;
}

function playStrategy(targetLotIds, seed = 'STRATEGY') {
  const targets = new Set(targetLotIds);
  let state = acceptAndExplore(seed);
  for (let index = 0; index < LOTS.length; index += 1) {
    state = enterAuction(state);
    let outcome;
    if (targets.has(currentLot(state).id)) {
      state = bidUntilLeading(state);
      outcome = finalizePlayerWin(state);
      assert.equal(outcome.error, '');
      outcome = disposePlayerLot(outcome.state, 'hold');
    } else {
      outcome = passAuction(state);
    }
    assert.equal(outcome.error, '');
    outcome = continueAfterResult(outcome.state);
    assert.equal(outcome.error, '');
    state = outcome.state;
  }
  assert.equal(state.screen, 'delivery');
  return state;
}

test('fixed first cycle is data-driven and contains every required condition', () => {
  assert.equal(LOTS.length, 5);
  assert.deepEqual(new Set(LOTS.map(lot => lot.condition)), new Set(['prime', 'restored', 'forged']));
  for (const lot of LOTS) {
    assert.ok(lot.evidence.length + 1 >= 3 && lot.evidence.length + 1 <= 5, lot.id);
    assert.ok(lot.reasonEvidence.length >= 2, lot.id);
    assert.ok(lot.reasonEvidence.every(id => lot.evidence.some(clue => clue.id === id) || lot.deepEvidence.id === id), lot.id);
    assert.ok(Object.keys(lot.npc).length === 3, lot.id);
    const preReveal = [...lot.evidence, lot.deepEvidence].map(clue => clue.text).join('');
    assert.doesNotMatch(preReveal, /本物|偽物|修復された本物/, lot.id);
  }
  const backup = lotById('persona-backup');
  assert.equal(backup.condition, 'prime');
  assert.equal(backup.categories.includes('DATA'), true);
  assert.equal(backup.categories.includes('RELIC'), false);
  assert.equal(questMatches(backup), false);
});

test('same seed and commands reproduce the same auction log', () => {
  const run = () => {
    let state = enterAuction(acceptAndExplore('REPEATABLE'));
    for (let index = 0; index < 9 && currentLotState(state).auction.leaderId !== PLAYER_ID; index += 1) {
      state = placePlayerBid(state, index % 2 ? 50 : 10).state;
    }
    return currentLotState(state).auction;
  };
  assert.deepEqual(run(), run());
});

test('NPC never exceeds its cap or total remaining budget and is charged once', () => {
  let state = enterAuction(acceptAndExplore('NPC-BUDGET'));
  const caps = Object.fromEntries(NPCS.map(npc => [npc.id, npcMaxBid(state, npc.id)]));
  const before = { ...state.npcBudgets };
  const outcome = passAuction(state);
  assert.equal(outcome.error, '');
  state = outcome.state;
  const result = currentLotState(state).result;
  assert.notEqual(result.winnerId, PLAYER_ID);
  assert.ok(result.price <= caps[result.winnerId]);
  assert.ok(result.price <= before[result.winnerId]);
  assert.equal(state.npcBudgets[result.winnerId], before[result.winnerId] - result.price);
  const duplicate = passAuction(state);
  assert.match(duplicate.error, /すでに決着/);
  assert.equal(duplicate.state.npcBudgets[result.winnerId], state.npcBudgets[result.winnerId]);
  assert.deepEqual(invariantErrors(state), []);
});

test('insufficient cash and self-raise are rejected with reasons', () => {
  let lowCash = enterAuction(acceptAndExplore('LOW-CASH'));
  lowCash.cash = currentLotState(lowCash).auction.currentBid;
  const rejected = placePlayerBid(lowCash, 10);
  assert.match(rejected.error, /不足/);
  assert.equal(rejected.state.cash, lowCash.cash);

  let leading = bidUntilLeading(enterAuction(acceptAndExplore('SELF-RAISE')));
  const beforeBid = currentLotState(leading).auction.currentBid;
  const selfRaise = placePlayerBid(leading, 10);
  assert.match(selfRaise.error, /最高額/);
  assert.equal(currentLotState(selfRaise.state).auction.currentBid, beforeBid);
});

test('player settlement and disposition are idempotent', () => {
  let state = bidUntilLeading(enterAuction(acceptAndExplore('PLAYER-WIN')));
  const cashBefore = state.cash;
  const price = currentLotState(state).auction.currentBid;
  let outcome = finalizePlayerWin(state);
  assert.equal(outcome.error, '');
  state = outcome.state;
  assert.equal(state.cash, cashBefore - price);
  const secondSettle = finalizePlayerWin(state);
  assert.match(secondSettle.error, /すでに決着/);
  assert.equal(secondSettle.state.cash, state.cash);

  outcome = disposePlayerLot(state, 'hold');
  assert.equal(outcome.error, '');
  state = outcome.state;
  assert.equal(state.held.length, 1);
  const secondHold = disposePlayerLot(state, 'hold');
  assert.match(secondHold.error, /すでに完了/);
  assert.equal(secondHold.state.held.length, 1);
  assert.deepEqual(invariantErrors(state), []);
});

test('selling returns the disclosed appraisal value exactly once', () => {
  let state = bidUntilLeading(enterAuction(acceptAndExplore('PLAYER-SELL')));
  state = finalizePlayerWin(state).state;
  const cashAfterPurchase = state.cash;
  const lot = currentLot(state);
  let outcome = disposePlayerLot(state, 'sell');
  assert.equal(outcome.error, '');
  state = outcome.state;
  assert.equal(state.cash, cashAfterPurchase + lot.value);
  assert.deepEqual(state.sold.at(-1), {
    lotId: lot.id,
    paid: currentLotState(state).result.price,
    received: lot.value,
  });
  outcome = disposePlayerLot(state, 'sell');
  assert.match(outcome.error, /すでに完了/);
  assert.equal(outcome.state.cash, state.cash);
});

test('wrong hypothesis still gets a fair post-auction comparison and can continue', () => {
  let state = enterAuction(acceptAndExplore('WRONG'), 'forged', 'high');
  let outcome = passAuction(state);
  assert.equal(outcome.error, '');
  state = outcome.state;
  assert.equal(currentLotState(state).result.comparison, '見立て違い');
  state = continueAfterResult(state).state;
  assert.equal(state.lotIndex, 1);
  assert.equal(state.screen, 'explore');
});

test('deep scan works once per cycle and survives save/hydration', () => {
  let state = acceptAndExplore('SCAN');
  const deepId = currentLot(state).deepEvidence.id;
  let outcome = revealEvidence(state, deepId, { deep: true });
  assert.equal(outcome.error, '');
  state = outcome.state;
  assert.equal(state.deepScanUsed, true);
  state.lotIndex = 1;
  const repeat = revealEvidence(state, currentLot(state).deepEvidence.id, { deep: true });
  assert.match(repeat.error, /すでに使用/);
  const restored = hydrateState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.deepScanUsed, true);
  assert.ok(restored.lotStates['last-ticket'].revealedEvidenceIds.includes(deepId));
});

test('save layer skips corrupt newest data, migrates legacy safely, and resets all keys', () => {
  const legacy = JSON.stringify({ schemaVersion: 33, name: '旧名', cash: 9999, screen: 'auction' });
  const storage = new MemoryStorage({ [SAVE_KEY]: '{broken', [LEGACY_SAVE_KEYS[0]]: legacy });
  const loaded = loadState(storage);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.state.name, '旧名');
  assert.equal(loaded.state.screen, 'briefing');
  assert.equal(loaded.state.cash, 1800);
  assert.equal(loaded.state.schemaVersion, SCHEMA_VERSION);
  assert.equal(loaded.state.contentVersion, CONTENT_VERSION);
  assert.equal(saveState(loaded.state, storage).ok, true);
  assert.ok(storage.getItem(SAVE_KEY));
  assert.equal(resetSaves(storage).ok, true);
  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.equal(storage.getItem(LEGACY_SAVE_KEYS[0]), null);
});

test('two rational quest routes succeed, an invalid route fails, reward cannot duplicate', () => {
  for (const ids of [['last-ticket', 'rain-specimen'], ['rain-specimen', 'district-zero-key']]) {
    const played = playStrategy(ids, `ROUTE-${ids.join('-')}`);
    assert.ok(played.cash >= 0);
    const outcome = deliverQuest(played, ids);
    assert.equal(outcome.error, '');
    assert.equal(outcome.state.ending.ok, true);
    assert.equal(outcome.state.quest.rewardClaimed, true);
    assert.deepEqual(invariantErrors(outcome.state), []);
    const duplicate = deliverQuest(outcome.state, ids);
    assert.notEqual(duplicate.error, '');
    assert.equal(duplicate.state.cash, outcome.state.cash);
  }
  const trapState = playStrategy(['persona-backup', 'last-ticket'], 'TRAP-ROUTE');
  const trap = deliverQuest(trapState, ['persona-backup', 'last-ticket']);
  assert.equal(trap.state.ending.ok, false);
  assert.equal(trap.state.ending.payout, 0);
});

test('buying every lot above all NPC caps is impossible with starting cash', () => {
  const state = acceptAndExplore('ECONOMY');
  const required = LOTS.reduce((sum, lot, index) => {
    state.lotIndex = index;
    const highestCap = Math.max(...NPCS.map(npc => npcMaxBid(state, npc.id, lot)));
    return sum + highestCap + 10;
  }, 0);
  assert.ok(required > 1800, `required=${required}`);
  assert.equal(QUEST.need, 2);
});

test('all-pass smoke route reaches a non-blocking cycle ending', () => {
  let state = acceptAndExplore('SMOKE');
  for (let index = 0; index < LOTS.length; index += 1) {
    state = enterAuction(state, index === 0 ? 'forged' : currentLot(state).condition);
    let outcome = passAuction(state);
    assert.equal(outcome.error, '');
    state = outcome.state;
    outcome = continueAfterResult(state);
    assert.equal(outcome.error, '');
    state = outcome.state;
  }
  assert.equal(state.screen, 'delivery');
  const ending = deliverQuest(state, []);
  assert.equal(ending.error, '');
  assert.equal(ending.state.screen, 'report');
  assert.equal(ending.state.ending.ok, false);
  assert.deepEqual(invariantErrors(ending.state), []);
});

