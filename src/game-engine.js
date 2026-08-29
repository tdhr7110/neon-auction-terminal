import {
  CONTENT_VERSION, LOTS, NPCS, QUEST, UPGRADES,
  CONDITION_LABELS, lotById, npcById,
} from './slice-data.js';

export const SCHEMA_VERSION = 35;
export const DEFAULT_SEED = 'GRAY-RAIN-1707';
export const PLAYER_ID = 'player';
export const MIN_BID_STEP = 10;

const clone = value => JSON.parse(JSON.stringify(value));
const round10 = value => Math.max(0, Math.round(value / 10) * 10);

export function randomAt(seed, ...parts) {
  let value = 2166136261;
  const text = [seed, ...parts].join('|');
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  value += value << 13;
  value ^= value >>> 7;
  value += value << 3;
  value ^= value >>> 17;
  value += value << 5;
  return (value >>> 0) / 4294967296;
}

function emptyLotState(lot) {
  return {
    lotId: lot.id,
    revealedEvidenceIds: [],
    sourceStages: {},
    hypothesis: null,
    auction: null,
    result: null,
    disposition: null,
  };
}

export function createInitialState({ seed = DEFAULT_SEED, screen = 'title' } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    seed: String(seed || DEFAULT_SEED),
    screen,
    returnScreen: null,
    name: '',
    introIndex: 0,
    lotIndex: 0,
    cash: 1800,
    held: [],
    sold: [],
    deepScanUsed: false,
    npcBudgets: Object.fromEntries(NPCS.map(npc => [npc.id, npc.budget])),
    upgrades: [],
    shopPurchases: 0,
    shopLotId: null,
    quest: { id: QUEST.id, accepted: false, deliveredIds: [], rewardClaimed: false },
    lotStates: Object.fromEntries(LOTS.map(lot => [lot.id, emptyLotState(lot)])),
    ui: {
      exploreTab: 'explore', sourceId: null, conversationStep: 0,
      evidencePage: 0, ledgerTab: 'summary', ledgerPage: 0,
      tutorialPage: 0, tutorialOpen: false, resetArmed: false,
    },
    ending: null,
    lastError: '',
    migrationNotice: '',
  };
}

export const currentLot = state => LOTS[Math.max(0, Math.min(LOTS.length - 1, state.lotIndex))];
export const currentLotState = state => state.lotStates[currentLot(state).id];
export const heldValue = state => state.held.reduce((sum, entry) => sum + (lotById(entry.lotId)?.value || 0), 0);
export const netWorth = state => state.cash + heldValue(state);
export const questMatches = lot => Boolean(
  lot
  && lot.incidentId === QUEST.incidentId
  && lot.categories.some(category => QUEST.categories.includes(category))
  && QUEST.acceptedConditions.includes(lot.condition)
);
export const questProgress = state => state.held.filter(entry => questMatches(lotById(entry.lotId))).length;

export function publicEligibility(lot) {
  const category = lot.categories.some(entry => QUEST.categories.includes(entry));
  const incident = lot.incidentId === QUEST.incidentId;
  return {
    category,
    incident,
    label: !category ? '分類条件外／真贋に関係なく納品不可' : incident ? '分類 ○／事件関連 ○／真贋は要確認' : '事件条件外',
  };
}

function result(state, error = '', events = []) {
  const next = clone(state);
  next.lastError = error;
  return { state: next, error, events };
}

function update(state, mutator, events = []) {
  const next = clone(state);
  next.lastError = '';
  mutator(next);
  return { state: next, error: '', events };
}

export function investigationLimit(state) {
  return 3 + (state.upgrades.includes('stamina') ? 1 : 0);
}

export function availableEvidence(lot) {
  return [...lot.evidence, lot.deepEvidence];
}

export function evidenceById(lot, evidenceId) {
  return availableEvidence(lot).find(entry => entry.id === evidenceId) || null;
}

export function revealEvidence(state, evidenceId, { deep = false } = {}) {
  if (state.screen !== 'explore') return result(state, '探索中だけ証拠を記録できます。');
  const lot = currentLot(state);
  const lotState = currentLotState(state);
  const clue = evidenceById(lot, evidenceId);
  if (!clue) return result(state, 'この品物には存在しない調査項目です。');
  if (lotState.revealedEvidenceIds.includes(evidenceId)) return result(state, 'その証拠はすでに記録済みです。');
  if (deep) {
    if (clue.id !== lot.deepEvidence.id) return result(state, '深層スキャンの対象が正しくありません。');
    if (state.deepScanUsed) return result(state, '深層スキャンはこの周期ですでに使用しました。');
  } else {
    if (clue.id === lot.deepEvidence.id) return result(state, 'この証拠には深層スキャンが必要です。');
    const used = lotState.revealedEvidenceIds.filter(id => id !== lot.deepEvidence.id).length;
    if (used >= investigationLimit(state)) return result(state, 'このLOTで使える調査行動は残っていません。');
  }
  return update(state, next => {
    next.lotStates[lot.id].revealedEvidenceIds.push(evidenceId);
    if (deep) next.deepScanUsed = true;
    next.ui.exploreTab = 'evidence';
    next.ui.sourceId = null;
    next.ui.conversationStep = 0;
  }, [{ type: 'evidence_revealed', lotId: lot.id, evidenceId, deep }]);
}

export function evidenceRelation(lot, revealedIds, evidenceId) {
  const clue = evidenceById(lot, evidenceId);
  if (!clue || !revealedIds.includes(evidenceId)) return { id: 'unknown', label: '未確認' };
  const peers = revealedIds
    .filter(id => id !== evidenceId)
    .map(id => evidenceById(lot, id))
    .filter(peer => peer?.relationKey && peer.relationKey === clue.relationKey);
  if (!peers.length) return { id: 'pending', label: '未照合' };
  if (peers.some(peer => peer.relation !== clue.relation)) return { id: 'conflict', label: '食い違い' };
  return { id: 'match', label: '一致' };
}

export function submitHypothesis(state, condition, confidence) {
  if (!CONDITION_LABELS[condition]) return result(state, '品物の状態を選んでください。');
  if (!['low', 'medium', 'high'].includes(confidence)) return result(state, '確信度を選んでください。');
  const lotState = currentLotState(state);
  if (lotState.revealedEvidenceIds.length < 2) return result(state, '仮説には少なくとも2件の証拠が必要です。');
  return update(state, next => {
    next.lotStates[currentLot(next).id].hypothesis = { condition, confidence };
    next.screen = 'auction';
    ensureAuction(next);
  }, [{ type: 'hypothesis_submitted', lotId: currentLot(state).id, condition, confidence }]);
}

export function npcMaxBid(state, npcId, lot = currentLot(state)) {
  const npc = npcById(npcId);
  const opinion = lot?.npc?.[npcId];
  if (!npc || !opinion) return 0;
  const remaining = Math.max(0, Number(state.npcBudgets[npcId]) || 0);
  const personalityFactor = npc.style === 'cautious' ? 1 : npc.style === 'burst' ? 1 : 1;
  return Math.min(remaining, round10(opinion.evaluation * opinion.obsession * personalityFactor));
}

function openingBidder(state, lot) {
  return NPCS
    .map(npc => ({
      id: npc.id,
      cap: npcMaxBid(state, npc.id, lot),
      score: lot.npc[npc.id].obsession * 100 + randomAt(state.seed, lot.id, 'opening', npc.id) * 20,
    }))
    .filter(entry => entry.cap >= lot.openingBid)
    .sort((a, b) => b.score - a.score || b.cap - a.cap)[0]?.id || 'house';
}

function ensureAuction(state) {
  const lot = currentLot(state);
  const lotState = currentLotState(state);
  if (lotState.auction) return lotState.auction;
  const leaderId = openingBidder(state, lot);
  lotState.auction = {
    status: 'open', currentBid: lot.openingBid, leaderId, turn: 0,
    log: [{ whoId: leaderId, amount: lot.openingBid, action: '開始値を提示' }],
    npcBurstUsed: {}, settled: false,
  };
  return lotState.auction;
}

export function beginAuction(state) {
  if (!currentLotState(state).hypothesis) return result(state, '競売前に見立てと確信度を記録してください。');
  return update(state, next => {
    next.screen = 'auction';
    ensureAuction(next);
  });
}

function npcStep(npc, auction, npcId) {
  if (npc.style === 'cautious') return 10;
  if (npc.style === 'steady') return 20;
  if (!auction.npcBurstUsed[npcId]) return 50;
  return 20;
}

function chooseNpcResponse(state, lot, auction, playerOffer) {
  return NPCS.map(npc => {
    const cap = npcMaxBid(state, npc.id, lot);
    const opinion = lot.npc[npc.id];
    const urgency = (cap - playerOffer) + opinion.obsession * 80
      + randomAt(state.seed, lot.id, auction.turn, npc.id, playerOffer) * 12;
    return { npc, cap, opinion, urgency };
  })
    .filter(entry => entry.cap >= playerOffer + MIN_BID_STEP)
    .sort((a, b) => b.urgency - a.urgency || b.cap - a.cap)[0] || null;
}

export function placePlayerBid(state, increment) {
  const lotState = currentLotState(state);
  const auction = lotState.auction;
  if (state.screen !== 'auction' || !auction || auction.status !== 'open') return result(state, '現在は入札できません。');
  if (auction.leaderId === PLAYER_ID) return result(state, 'あなたが最高額です。価格を確定するまで追加では入札できません。');
  const step = Number(increment);
  if (![10, 50, 100].includes(step)) return result(state, '入札幅が正しくありません。');
  const offer = auction.currentBid + step;
  if (offer > state.cash) return result(state, `現金が${offer - state.cash} CR不足しています。見送る判断はいつでもできます。`);
  return update(state, next => {
    const lot = currentLot(next);
    const nextAuction = currentLotState(next).auction;
    nextAuction.turn += 1;
    nextAuction.currentBid = offer;
    nextAuction.leaderId = PLAYER_ID;
    nextAuction.log.push({ whoId: PLAYER_ID, amount: offer, action: `+${step}` });
    const response = chooseNpcResponse(next, lot, nextAuction, offer);
    if (response) {
      let responseStep = npcStep(response.npc, nextAuction, response.npc.id);
      responseStep = Math.max(MIN_BID_STEP, Math.min(responseStep, response.cap - offer));
      const counter = offer + responseStep;
      nextAuction.currentBid = counter;
      nextAuction.leaderId = response.npc.id;
      if (response.npc.style === 'burst' && responseStep >= 50) nextAuction.npcBurstUsed[response.npc.id] = true;
      nextAuction.log.push({
        whoId: response.npc.id,
        amount: counter,
        action: response.npc.style === 'burst' && responseStep >= 50 ? '一気に値を上げる' : response.npc.style === 'cautious' ? '最小幅で追う' : '間を置いて追う',
      });
    }
  }, [{ type: 'bid', lotId: currentLot(state).id, increment, offer }]);
}

function hypothesisComparison(lot, hypothesis) {
  if (!hypothesis) return '見立てなし';
  if (hypothesis.condition === lot.condition) return '状態まで一致';
  const expectedAuthentic = hypothesis.condition !== 'forged';
  const actualAuthentic = lot.condition !== 'forged';
  return expectedAuthentic === actualAuthentic ? '真贋のみ一致' : '見立て違い';
}

function settleResult(next, winnerId, price, addedLog = []) {
  const lot = currentLot(next);
  const lotState = currentLotState(next);
  const auction = lotState.auction;
  if (auction.settled || lotState.result) return false;
  auction.log.push(...addedLog);
  auction.currentBid = price;
  auction.leaderId = winnerId;
  auction.status = 'settled';
  auction.settled = true;
  if (winnerId !== PLAYER_ID && winnerId !== 'house') {
    next.npcBudgets[winnerId] = Math.max(0, next.npcBudgets[winnerId] - price);
  }
  const npcReason = winnerId === PLAYER_ID || winnerId === 'house' ? '' : lot.npc[winnerId].reason;
  lotState.result = {
    lotId: lot.id, winnerId, price,
    condition: lot.condition, value: lot.value,
    comparison: hypothesisComparison(lot, lotState.hypothesis),
    reason: npcReason,
    appraisal: lot.appraisal,
    log: clone(auction.log),
  };
  return true;
}

export function finalizePlayerWin(state) {
  const lotState = currentLotState(state);
  const auction = lotState.auction;
  if (!auction || auction.status !== 'open') return result(state, 'この競売はすでに決着しています。');
  if (auction.leaderId !== PLAYER_ID) return result(state, 'あなたは現在の最高入札者ではありません。');
  if (auction.currentBid > state.cash) return result(state, '所持金を超える落札はできません。');
  return update(state, next => {
    const price = currentLotState(next).auction.currentBid;
    next.cash -= price;
    settleResult(next, PLAYER_ID, price);
    next.screen = 'appraisal';
  }, [{ type: 'auction_result', lotId: currentLot(state).id, winnerId: PLAYER_ID, price: auction.currentBid }]);
}

function npcFinish(state) {
  const lot = currentLot(state);
  const auction = currentLotState(state).auction;
  const ranked = NPCS.map(npc => ({ npc, cap: npcMaxBid(state, npc.id, lot) }))
    .filter(entry => entry.cap >= lot.openingBid)
    .sort((a, b) => b.cap - a.cap || randomAt(state.seed, lot.id, 'tie', a.npc.id) - randomAt(state.seed, lot.id, 'tie', b.npc.id));
  if (!ranked.length) return { winnerId: 'house', price: auction.currentBid, log: [] };
  const winner = ranked[0];
  const runner = ranked[1] || { cap: lot.openingBid - MIN_BID_STEP, npc: null };
  let price = Math.max(auction.currentBid, Math.min(winner.cap, runner.cap + MIN_BID_STEP));
  if (price > winner.cap) price = winner.cap;
  const log = [];
  if (runner.npc && runner.npc.id !== auction.leaderId && runner.cap >= auction.currentBid + MIN_BID_STEP) {
    const runnerPrice = Math.min(runner.cap, Math.max(auction.currentBid + MIN_BID_STEP, price - MIN_BID_STEP));
    log.push({ whoId: runner.npc.id, amount: runnerPrice, action: '上限近くまで追う' });
  }
  const lastAmount = log.at(-1)?.amount || auction.currentBid;
  if (winner.npc.id !== auction.leaderId || price > lastAmount) {
    log.push({ whoId: winner.npc.id, amount: price, action: npcById(winner.npc.id).style === 'cautious' ? '利益が残る幅で止める' : '目的の品を取り切る' });
  }
  return { winnerId: winner.npc.id, price, log };
}

export function passAuction(state) {
  const auction = currentLotState(state).auction;
  if (!auction || auction.status !== 'open') return result(state, 'この競売はすでに決着しています。');
  if (auction.leaderId === PLAYER_ID) return result(state, '最高額の入札は取り消せません。「この価格で落札」を選んでください。');
  const finish = npcFinish(state);
  return update(state, next => {
    settleResult(next, finish.winnerId, finish.price, finish.log);
    next.screen = 'resolution';
  }, [{ type: 'pass', lotId: currentLot(state).id }, { type: 'auction_result', lotId: currentLot(state).id, winnerId: finish.winnerId, price: finish.price }]);
}

export function disposePlayerLot(state, disposition) {
  const lot = currentLot(state);
  const lotState = currentLotState(state);
  if (!lotState.result || lotState.result.winnerId !== PLAYER_ID) return result(state, 'あなたの落札品ではありません。');
  if (lotState.disposition) return result(state, 'この品物の処理はすでに完了しています。');
  if (!['hold', 'sell'].includes(disposition)) return result(state, '保管または売却を選んでください。');
  return update(state, next => {
    const nextLotState = currentLotState(next);
    nextLotState.disposition = disposition;
    if (disposition === 'hold') next.held.push({ lotId: lot.id, paid: nextLotState.result.price });
    else {
      next.cash += lot.value;
      next.sold.push({ lotId: lot.id, paid: nextLotState.result.price, received: lot.value });
    }
    next.screen = 'lot-result';
  }, [{ type: 'disposition', lotId: lot.id, disposition }]);
}

export function continueAfterResult(state) {
  const lotState = currentLotState(state);
  if (!lotState.result) return result(state, '競売結果を確認できません。');
  if (lotState.result.winnerId === PLAYER_ID && !lotState.disposition) return result(state, '落札品を保管するか売却してください。');
  return update(state, next => {
    if (next.lotIndex >= LOTS.length - 1) {
      next.screen = 'delivery';
      next.ui.ledgerPage = 0;
    } else {
      next.lotIndex += 1;
      next.screen = 'explore';
      next.shopLotId = null;
      next.ui.exploreTab = 'explore';
      next.ui.sourceId = null;
      next.ui.conversationStep = 0;
      next.ui.evidencePage = 0;
    }
  });
}

export function buyUpgrade(state, upgradeId) {
  const upgrade = UPGRADES.find(entry => entry.id === upgradeId);
  if (state.screen !== 'shop') return result(state, '強化は探索中の店で購入できます。');
  if (!upgrade) return result(state, 'その強化品は存在しません。');
  if (state.upgrades.includes(upgradeId)) return result(state, 'その強化は購入済みです。');
  if (state.shopPurchases >= 2) return result(state, 'この周期で購入できる強化は2つまでです。');
  if (state.shopLotId === currentLot(state).id) return result(state, 'このLOTではすでに強化品を購入しました。');
  if (state.cash < upgrade.price) return result(state, `${upgrade.price - state.cash} CR不足しています。購入しない選択も有効です。`);
  return update(state, next => {
    next.cash -= upgrade.price;
    next.upgrades.push(upgradeId);
    next.shopPurchases += 1;
    next.shopLotId = currentLot(next).id;
  }, [{ type: 'upgrade_purchased', upgradeId, price: upgrade.price }]);
}

export function deliverQuest(state, selectedLotIds) {
  if (state.screen !== 'delivery') return result(state, '納品画面で品物を選んでください。');
  if (state.quest.rewardClaimed) return result(state, 'この依頼の精算は完了しています。');
  const uniqueIds = [...new Set(selectedLotIds || [])];
  const heldIds = new Set(state.held.map(entry => entry.lotId));
  const selectedLots = uniqueIds.filter(id => heldIds.has(id)).map(lotById).filter(Boolean);
  const ok = selectedLots.length === QUEST.need && selectedLots.every(questMatches);
  return update(state, next => {
    let appraisalValue = 0;
    let payout = 0;
    if (ok) {
      appraisalValue = selectedLots.reduce((sum, lot) => sum + lot.value, 0);
      payout = appraisalValue + QUEST.bonus;
      next.cash += payout;
      const delivered = new Set(uniqueIds);
      next.held = next.held.filter(entry => !delivered.has(entry.lotId));
      next.quest.deliveredIds = uniqueIds;
    }
    next.quest.rewardClaimed = true;
    next.ending = {
      ok,
      id: ok ? 'route-reopened' : 'sealed-again',
      appraisalValue,
      bonus: ok ? QUEST.bonus : 0,
      payout,
      cash: next.cash,
      heldValue: heldValue(next),
    };
    next.screen = 'report';
  }, [{ type: 'cycle_completed', success: ok }]);
}

export function concludeFailedQuest(state) {
  return deliverQuest(state, []);
}

export function bidderMood(state, npcId) {
  const lot = currentLot(state);
  const auction = currentLotState(state).auction;
  const cap = npcMaxBid(state, npcId, lot);
  const currentBid = auction?.currentBid || lot.openingBid;
  const opinion = lot.npc[npcId];
  if ((state.npcBudgets[npcId] || 0) <= 0) return '予算を使い切った';
  if (cap < currentBid + MIN_BID_STEP && auction?.leaderId !== npcId) return '次へ資金を残した';
  const ratio = cap ? currentBid / cap : 1;
  if (opinion.obsession >= 1.15 && ratio < .92) return '執着している';
  if (ratio >= .78) return '迷っている';
  if (opinion.obsession < .85) return '興味が薄い';
  return '様子を見ている';
}

export function invariantErrors(state) {
  const errors = [];
  if (!Number.isFinite(state.cash) || state.cash < 0) errors.push('cash');
  for (const npc of NPCS) {
    const remaining = state.npcBudgets[npc.id];
    if (!Number.isFinite(remaining) || remaining < 0 || remaining > npc.budget) errors.push(`budget:${npc.id}`);
  }
  for (const lot of LOTS) {
    const lotState = state.lotStates[lot.id];
    if (!lotState) errors.push(`lot:${lot.id}`);
    if (lotState?.result?.price < 0) errors.push(`price:${lot.id}`);
    if (lotState?.auction?.leaderId === PLAYER_ID && lotState.auction.currentBid > state.cash + (lotState.result?.price || 0)) errors.push(`player-cap:${lot.id}`);
  }
  if (new Set(state.held.map(entry => entry.lotId)).size !== state.held.length) errors.push('held-duplicates');
  return errors;
}
