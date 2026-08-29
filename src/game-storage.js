import { CONTENT_VERSION, LOTS, NPCS } from './slice-data.js';
import { SCHEMA_VERSION, createInitialState } from './game-engine.js';

export const SAVE_KEY = 'neon-auction-slice-v35';
export const LEGACY_SAVE_KEYS = [
  'auction-campaign-v33',
  'auction-campaign-v32',
  'auction-campaign-v31',
  'auction-campaign-v20',
];

const SCREENS = new Set([
  'title', 'name', 'intro', 'briefing', 'explore', 'hypothesis', 'auction',
  'resolution', 'appraisal', 'lot-result', 'shop', 'ledger', 'delivery', 'report',
]);
const CONDITION_IDS = new Set(['prime', 'restored', 'forged']);
const CONFIDENCE_IDS = new Set(['low', 'medium', 'high']);
const UPGRADE_IDS = new Set(['lens', 'stamina', 'market']);
const DISPOSITIONS = new Set(['hold', 'sell']);
const knownLotIds = new Set(LOTS.map(lot => lot.id));

const finite = (value, fallback, min = -Infinity, max = Infinity) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};
const unique = list => [...new Set(Array.isArray(list) ? list : [])];

function hydrateLotState(base, raw, lot) {
  const evidenceIds = new Set([...lot.evidence, lot.deepEvidence].map(entry => entry.id));
  const hypothesis = raw?.hypothesis
    && CONDITION_IDS.has(raw.hypothesis.condition)
    && CONFIDENCE_IDS.has(raw.hypothesis.confidence)
    ? { condition: raw.hypothesis.condition, confidence: raw.hypothesis.confidence }
    : null;
  const auction = raw?.auction && typeof raw.auction === 'object'
    ? {
      status: ['open', 'settled'].includes(raw.auction.status) ? raw.auction.status : 'open',
      currentBid: finite(raw.auction.currentBid, lot.openingBid, 0, 100000),
      leaderId: ['player', 'house', ...NPCS.map(npc => npc.id)].includes(raw.auction.leaderId) ? raw.auction.leaderId : 'house',
      turn: finite(raw.auction.turn, 0, 0, 1000),
      log: Array.isArray(raw.auction.log) ? raw.auction.log.slice(-40).map(entry => ({
        whoId: ['player', 'house', ...NPCS.map(npc => npc.id)].includes(entry?.whoId) ? entry.whoId : 'house',
        amount: finite(entry?.amount, lot.openingBid, 0, 100000),
        action: String(entry?.action || '').slice(0, 60),
      })) : [],
      npcBurstUsed: raw.auction.npcBurstUsed && typeof raw.auction.npcBurstUsed === 'object' ? raw.auction.npcBurstUsed : {},
      settled: Boolean(raw.auction.settled),
    }
    : null;
  const result = raw?.result && typeof raw.result === 'object'
    ? {
      lotId: lot.id,
      winnerId: ['player', 'house', ...NPCS.map(npc => npc.id)].includes(raw.result.winnerId) ? raw.result.winnerId : 'house',
      price: finite(raw.result.price, 0, 0, 100000),
      condition: lot.condition,
      value: lot.value,
      comparison: String(raw.result.comparison || ''),
      reason: String(raw.result.reason || ''),
      appraisal: lot.appraisal,
      log: Array.isArray(raw.result.log) ? raw.result.log.slice(-40) : [],
    }
    : null;
  return {
    ...base,
    revealedEvidenceIds: unique(raw?.revealedEvidenceIds).filter(id => evidenceIds.has(id)),
    sourceStages: raw?.sourceStages && typeof raw.sourceStages === 'object' ? raw.sourceStages : {},
    hypothesis,
    auction,
    result,
    disposition: DISPOSITIONS.has(raw?.disposition) ? raw.disposition : null,
  };
}

export function hydrateState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Number(raw.schemaVersion) !== SCHEMA_VERSION || raw.contentVersion !== CONTENT_VERSION) return null;
  const base = createInitialState({ seed: String(raw.seed || undefined), screen: SCREENS.has(raw.screen) ? raw.screen : 'title' });
  base.name = String(raw.name || '').trim().slice(0, 12);
  base.introIndex = finite(raw.introIndex, 0, 0, 3);
  base.lotIndex = finite(raw.lotIndex, 0, 0, LOTS.length - 1);
  base.cash = finite(raw.cash, 1800, 0, 1000000);
  base.deepScanUsed = Boolean(raw.deepScanUsed);
  base.npcBudgets = Object.fromEntries(NPCS.map(npc => [
    npc.id,
    finite(raw.npcBudgets?.[npc.id], npc.budget, 0, npc.budget),
  ]));
  base.upgrades = unique(raw.upgrades).filter(id => UPGRADE_IDS.has(id));
  base.shopPurchases = finite(raw.shopPurchases, base.upgrades.length, 0, 2);
  base.shopLotId = knownLotIds.has(raw.shopLotId) ? raw.shopLotId : null;
  base.quest = {
    id: base.quest.id,
    accepted: Boolean(raw.quest?.accepted),
    deliveredIds: unique(raw.quest?.deliveredIds).filter(id => knownLotIds.has(id)),
    rewardClaimed: Boolean(raw.quest?.rewardClaimed),
  };
  base.held = unique((raw.held || []).map(entry => entry?.lotId)).filter(id => knownLotIds.has(id)).map(lotId => {
    const entry = raw.held.find(candidate => candidate?.lotId === lotId);
    return { lotId, paid: finite(entry?.paid, 0, 0, 100000) };
  });
  base.sold = unique((raw.sold || []).map(entry => entry?.lotId)).filter(id => knownLotIds.has(id)).map(lotId => {
    const entry = raw.sold.find(candidate => candidate?.lotId === lotId);
    return { lotId, paid: finite(entry?.paid, 0, 0, 100000), received: finite(entry?.received, 0, 0, 100000) };
  });
  base.lotStates = Object.fromEntries(LOTS.map(lot => [
    lot.id,
    hydrateLotState(base.lotStates[lot.id], raw.lotStates?.[lot.id], lot),
  ]));
  base.returnScreen = SCREENS.has(raw.returnScreen) ? raw.returnScreen : null;
  base.ui = {
    ...base.ui,
    ...(raw.ui && typeof raw.ui === 'object' ? raw.ui : {}),
    exploreTab: ['explore', 'evidence'].includes(raw.ui?.exploreTab) ? raw.ui.exploreTab : 'explore',
    sourceId: typeof raw.ui?.sourceId === 'string' ? raw.ui.sourceId : null,
    conversationStep: finite(raw.ui?.conversationStep, 0, 0, 1),
    evidencePage: finite(raw.ui?.evidencePage, 0, 0, 10),
    ledgerTab: ['summary', 'holdings', 'rivals'].includes(raw.ui?.ledgerTab) ? raw.ui.ledgerTab : 'summary',
    ledgerPage: finite(raw.ui?.ledgerPage, 0, 0, 10),
    tutorialPage: finite(raw.ui?.tutorialPage, 0, 0, 10),
    tutorialOpen: false,
    resetArmed: false,
  };
  base.ending = raw.ending && typeof raw.ending === 'object' ? raw.ending : null;
  base.lastError = '';
  base.migrationNotice = String(raw.migrationNotice || '').slice(0, 180);
  if (!base.name && !['title', 'name'].includes(base.screen)) base.screen = 'name';
  if (base.screen === 'auction' && !base.lotStates[LOTS[base.lotIndex].id].auction) base.screen = 'hypothesis';
  if (['appraisal', 'resolution', 'lot-result'].includes(base.screen) && !base.lotStates[LOTS[base.lotIndex].id].result) base.screen = 'auction';
  if (base.screen === 'report' && !base.ending) base.screen = 'delivery';
  return base;
}

export function migrateLegacyState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const next = createInitialState({ screen: raw.name ? 'briefing' : 'name' });
  next.name = String(raw.name || '').trim().slice(0, 12);
  next.introIndex = next.name ? 3 : 0;
  next.migrationNotice = '旧版の名前を引き継ぎ、第1周期の製品デモを新しい状態で開始します。';
  return next;
}

export function loadState(storage = globalThis.localStorage) {
  const keys = [SAVE_KEY, ...LEGACY_SAVE_KEYS];
  for (const key of keys) {
    try {
      const serialized = storage?.getItem(key);
      if (!serialized) continue;
      const raw = JSON.parse(serialized);
      const state = key === SAVE_KEY ? hydrateState(raw) : migrateLegacyState(raw);
      if (state) return { state, migrated: key !== SAVE_KEY, sourceKey: key };
    } catch {
      // A damaged newer save must not block a valid older save.
    }
  }
  return { state: null, migrated: false, sourceKey: null };
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    const payload = {
      ...state,
      schemaVersion: SCHEMA_VERSION,
      contentVersion: CONTENT_VERSION,
      ui: { ...state.ui, tutorialOpen: false, resetArmed: false },
      lastError: '',
    };
    storage?.setItem(SAVE_KEY, JSON.stringify(payload));
    return { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: `保存できませんでした：${error?.message || '保存領域を確認してください'}` };
  }
}

export function resetSaves(storage = globalThis.localStorage) {
  try {
    [SAVE_KEY, ...LEGACY_SAVE_KEYS].forEach(key => storage?.removeItem(key));
    return { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: `保存データを削除できませんでした：${error?.message || '保存領域を確認してください'}` };
  }
}

