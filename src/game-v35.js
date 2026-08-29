import {
  LOTS, NPCS, QUEST, SOURCES, UPGRADES, INTRO, ENDINGS,
  CONDITION_LABELS, CONFIDENCE_LABELS, lotById, npcById,
} from './slice-data.js';
import {
  PLAYER_ID, createInitialState, currentLot, currentLotState, netWorth, heldValue,
  questProgress, questMatches, publicEligibility, investigationLimit, evidenceById,
  evidenceRelation, revealEvidence, submitHypothesis, placePlayerBid, passAuction,
  finalizePlayerWin, disposePlayerLot, continueAfterResult, buyUpgrade, deliverQuest,
  concludeFailedQuest, bidderMood,
} from './game-engine.js';
import { loadState, saveState, resetSaves } from './game-storage.js';

const app = document.querySelector('#app');
const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]));
const cr = value => `${Math.round(Number(value) || 0).toLocaleString('ja-JP')} CR`;
const categoryText = lot => lot.categories.join(' / ');
const routeIsStart = location.pathname.includes('start-v30');
const params = new URLSearchParams(location.search);
const seed = params.get('seed') || undefined;
const requestedNew = params.get('new') === '1';
const loaded = loadState();

let state;
if (requestedNew) {
  resetSaves();
  state = createInitialState({ seed, screen: 'name' });
  history.replaceState(null, '', location.pathname + (seed ? `?seed=${encodeURIComponent(seed)}` : ''));
} else if (loaded.state) {
  state = loaded.state;
  if (loaded.migrated) saveState(state);
} else {
  state = createInitialState({ seed, screen: routeIsStart ? 'name' : 'title' });
}

let toast = '';
let toastTimer = 0;
let actionLocked = false;
const allowedTrackEvents = new Set(['start', 'intro_complete', 'hypothesis', 'bid', 'pass', 'result', 'cycle_complete']);

export function track(event, props = {}) {
  if (!allowedTrackEvents.has(event)) return;
  const entry = { event, props: { ...props }, at: new Date().toISOString() };
  globalThis.__NEON_AUCTION_EVENTS__ = globalThis.__NEON_AUCTION_EVENTS__ || [];
  globalThis.__NEON_AUCTION_EVENTS__.push(entry);
}

const getLotState = () => currentLotState(state);
const winnerName = id => id === PLAYER_ID ? 'あなた' : id === 'house' ? '主催者預かり' : npcById(id)?.name || '不明';
const save = () => {
  const outcome = saveState(state);
  if (!outcome.ok) state.lastError = outcome.error;
  return outcome.ok;
};

function showToast(message, duration = 900) {
  toast = message;
  clearTimeout(toastTimer);
  render();
  toastTimer = setTimeout(() => {
    toast = '';
    render();
  }, duration);
}

function image(pic, kind = 'face', extra = '') {
  return `<span class="v35-image ${kind} ${esc(pic)} ${extra}" aria-hidden="true"></span>`;
}

function lotArt(lot, extra = '') {
  const x = ['-3.333%', '23.333%', '50%', '76.667%', '103.333%'][lot.sprite[0]];
  const y = lot.sprite[1] ? '100%' : '0%';
  return `<span class="v35-art ${extra}" role="img" aria-label="${esc(lot.name)}の粗い商品画像" style="--item-x:${x};--item-y:${y}"></span>`;
}

function topStats() {
  const lotLabel = ['title', 'name', 'intro', 'briefing', 'report'].includes(state.screen)
    ? 'CYCLE 01'
    : `LOT ${String(state.lotIndex + 1).padStart(2, '0')} / ${String(LOTS.length).padStart(2, '0')}`;
  return `<header class="v35-bar"><b>FILE / ${esc(state.name || '----')}</b><span>${lotLabel}</span><span>現金 ${cr(state.cash)}　総資産 ${cr(netWorth(state))}</span></header>`;
}

function systemNav() {
  if (['title', 'name', 'intro'].includes(state.screen)) return '<footer class="v35-system empty" aria-hidden="true"></footer>';
  const inLedger = state.screen === 'ledger';
  const canShop = state.screen === 'explore';
  return `<footer class="v35-system" aria-label="システム操作">
    <button data-help aria-label="遊び方を開く">遊び方</button>
    <button data-ledger ${inLedger ? 'class="active"' : ''}>${inLedger ? '戻る' : '台帳'}</button>
    ${canShop ? '<button data-shop>強化店</button>' : ''}
    <button data-save>保存</button>
    <button data-reset class="danger-action">${state.ui.resetArmed ? 'もう一度押して消去' : '最初からやり直す'}</button>
  </footer>`;
}

const tutorialPages = [
  ['目的', '灰雨避難事件の本物または修復されたRELICを2点納品する。5品すべては安全に買えないため、分類・真贋・競合の執着から見送る品も決める。'],
  ['探索', '各LOTで3回調査できる。人物や場所を選び、短いやり取りを進めると証拠になる。単独の証拠では断定せず、最低2件を照合する。'],
  ['証拠ボード', '同じ論点を扱う証拠がそろうと「一致」または「食い違い」になる。「未照合」は相手となる証拠がまだない状態。答えを数値では表示しない。'],
  ['見立て', '本物・状態良好、修復された本物、偽物から状態を選び、確信度も記録する。確信度は報酬を変えず、自分の判断を振り返るために使う。'],
  ['競売', '誰が最高額かと直近の入札履歴を見る。あなたが最高額の間は追加入札できない。競合が降りたら落札を確定し、不要なら最高額になる前に見送る。'],
  ['台帳と分類', '人格バックアップは事件に関係する本物でもDATAなのでRELIC依頼には使えない。台帳では依頼条件、現金、保管品、各品の分類をいつでも確認できる。'],
  ['深層スキャン', '1周期に1回だけ、任意のLOTで追加証拠を得る。正解は直接出ない。通常調査だけでもクリアできるため、最も迷う品に残してよい。'],
  ['鑑定と納品', '見送りでも実際の状態・価値・NPCの理由を確認できる。落札後は保管か鑑定額で売却。最終LOT後に保管品から2点を納品する。'],
];

function tutorial() {
  if (!state.ui.tutorialOpen) return '';
  const pageIndex = Math.max(0, Math.min(tutorialPages.length - 1, state.ui.tutorialPage || 0));
  const [title, text] = tutorialPages[pageIndex];
  return `<section class="v35-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <small>遊び方 ${pageIndex + 1} / ${tutorialPages.length}</small>
    <h1 id="help-title">${title}</h1><p>${text}</p>
    <div class="modal-pager"><button data-help-page="-1" ${pageIndex === 0 ? 'disabled' : ''}>← 前</button><button data-help-page="1" ${pageIndex === tutorialPages.length - 1 ? 'disabled' : ''}>次 →</button></div>
    <button class="primary" data-help-close autofocus>${pageIndex === tutorialPages.length - 1 ? '理解して戻る' : '閉じる'}</button>
  </section>`;
}

function shell(content, screenName = state.screen) {
  return `<main class="v35-app" data-testid="screen-${esc(screenName)}" data-screen="${esc(screenName)}">
    ${topStats()}<section class="v35-stage">${content}</section>${systemNav()}
    <div class="v35-status ${state.lastError ? 'error' : ''}" role="status" aria-live="polite">${esc(state.lastError || toast || state.migrationNotice || '')}</div>
    ${tutorial()}
  </main>`;
}

function titleView() {
  const hasSave = Boolean(loadState().state);
  return shell(`<section class="v35-title"><small>GRAY RAIN / PRODUCT SLICE</small><h1>NEON<br>AUCTION</h1><p>証拠をつなぎ、相手の目的を読み、買うべき品だけを競り落とす。</p>
    <div><button class="primary" data-new>${state.ui.newArmed ? 'もう一度押してNEW FILE' : 'NEW FILE'}</button><button data-continue ${hasSave ? '' : 'disabled'}>CONTINUE</button><button data-help>遊び方</button></div>
  </section>`, 'title');
}

function nameView() {
  return shell(`<form class="v35-name" data-name-form><small>PLAYER FILE</small><h1>主人公の名前</h1><p>住民記録が消えるまで、残り5周期。</p><label for="player-name">名前</label><input id="player-name" name="name" maxlength="12" autocomplete="off" value="${esc(state.name)}" placeholder="NAME" autofocus><button class="primary" type="submit" data-name-submit>物語を始める</button></form>`, 'name');
}

function introView() {
  const index = Math.max(0, Math.min(INTRO.length - 1, state.introIndex));
  const frame = INTRO[index];
  return shell(`<section class="v35-intro"><header><small>PROLOGUE ${index + 1} / ${INTRO.length}</small><h1>${frame.title}</h1></header><article>${image(frame.pic, frame.kind, 'hero')}<div><small>${frame.label}</small><b>${frame.speaker || state.name}</b><p>${frame.text}</p></div></article><footer><button data-intro-skip>導入を飛ばす</button><button class="primary" data-intro-next>${index === INTRO.length - 1 ? '依頼書を確認' : '次へ'}</button></footer></section>`, 'intro');
}

function briefingView() {
  return shell(`<section class="v35-briefing"><header><small>REQUEST / CYCLE 01</small><h1>${QUEST.title}</h1><p>${QUEST.client}</p></header><article><div><b>納品条件</b><strong>RELIC × ${QUEST.need}</strong><p>${QUEST.text}</p></div><dl><div><dt>達成追加</dt><dd>${cr(QUEST.bonus)}</dd></div><div><dt>売却・納品</dt><dd>鑑定額 100%</dd></div><div><dt>注意</dt><dd>DATAは本物でも対象外</dd></div></dl></article><aside><b>判断の基準</b><p>${QUEST.hint}</p><button class="primary" data-accept-request>依頼を受ける</button></aside></section>`, 'briefing');
}

function itemHeader(lot) {
  const eligibility = publicEligibility(lot);
  return `<header class="v35-item-header">${lotArt(lot, 'hero')}<div><small>${esc(lot.serial)} / ${esc(categoryText(lot))}</small><h1>${esc(lot.name)}</h1><p>${esc(lot.description)}</p><div class="item-meta"><span>推定 ${cr(lot.estimate[0]).replace(' CR', '')}—${cr(lot.estimate[1])}</span><span class="${eligibility.category ? 'eligible' : 'ineligible'}">${esc(eligibility.label)}</span></div></div></header>`;
}

function lensHint(lot, revealedIds) {
  if (!state.upgrades.includes('lens')) return '';
  const revealed = revealedIds.map(id => evidenceById(lot, id)).filter(Boolean);
  const next = lot.evidence.find(clue => !revealedIds.includes(clue.id) && revealed.some(other => other.relationKey === clue.relationKey));
  return next ? `<p class="lens-hint">照合レンズ：${esc(SOURCES[next.sourceId].name)}を確かめると「${esc(next.title)}」の未照合が進む。</p>` : '<p class="lens-hint">照合レンズ：現在の証拠に、未照合の相手候補はない。</p>';
}

function explorationPanel(lot, lotState) {
  const selected = lot.evidence.find(clue => clue.sourceId === state.ui.sourceId) || null;
  const used = lotState.revealedEvidenceIds.filter(id => id !== lot.deepEvidence.id).length;
  const limit = investigationLimit(state);
  const remaining = Math.max(0, limit - used);
  const sourceCards = lot.evidence.map(clue => {
    const source = SOURCES[clue.sourceId];
    const recorded = lotState.revealedEvidenceIds.includes(clue.id);
    return `<button data-source="${source.id}" data-evidence-id="${clue.id}" class="source-card ${state.ui.sourceId === source.id ? 'active' : ''} ${recorded ? 'recorded' : ''}" ${recorded ? 'disabled' : ''}>
      ${image(source.pic, source.kind)}<span><b>${esc(source.name)}</b><small>${esc(clue.category)} / ${recorded ? '記録済み' : source.kind === 'place' ? '調べる' : '話を聞く'}</small></span>
    </button>`;
  }).join('');
  let detail = '<div class="empty-copy"><b>調査先を選ぶ</b><p>同じ論点の証拠を二つ以上つなぐ。人物の発言は、その人が隠したい事情も読む。</p></div>';
  if (selected) {
    const source = SOURCES[selected.sourceId];
    const step = Math.max(0, Math.min(1, state.ui.conversationStep || 0));
    const recorded = lotState.revealedEvidenceIds.includes(selected.id);
    detail = `<div class="conversation"><small>${esc(source.role)} / ${esc(selected.category)}</small><h2>${esc(source.name)}</h2><p>${esc(selected.exchange[step])}</p><div class="conversation-prompt">${esc(selected.prompt)}</div><button class="primary" data-converse="${selected.id}" ${recorded || remaining <= 0 ? 'disabled' : ''}>${remaining <= 0 ? '調査行動なし' : step === 0 ? (source.kind === 'place' ? '詳しく調べる' : 'さらに聞く') : '証拠として記録する'}</button></div>`;
  }
  return `<section class="investigation-grid"><div class="source-list">${sourceCards}</div><aside class="investigation-detail">${detail}<footer><span>調査行動 ${remaining} / ${limit}</span><button data-deep-scan ${state.deepScanUsed || lotState.revealedEvidenceIds.includes(lot.deepEvidence.id) ? 'disabled' : ''}>深層スキャン ${state.deepScanUsed ? '使用済み' : '1回'}</button></footer></aside></section>`;
}

function evidenceBoard(lot, lotState) {
  const ids = lotState.revealedEvidenceIds;
  const slots = [...lot.evidence, lot.deepEvidence].map(clue => {
    const revealed = ids.includes(clue.id);
    const relation = evidenceRelation(lot, ids, clue.id);
    const deep = clue.id === lot.deepEvidence.id;
    return `<article class="evidence-card ${revealed ? relation.id : 'unknown'}" data-evidence-id="${clue.id}"><header><small>${esc(clue.category)} / ${deep ? '深層' : esc(SOURCES[clue.sourceId].name)}</small><span>${relation.label}</span></header><h2>${revealed ? esc(clue.title) : deep ? '深層スキャン枠' : '未確認の証拠'}</h2><p>${revealed ? esc(clue.text) : deep ? (state.deepScanUsed ? '別のLOTで使用済み。' : 'このLOTで使うと追加証拠を得る。') : `${esc(SOURCES[clue.sourceId].name)}から確認できる。`}</p></article>`;
  }).join('');
  const enough = ids.length >= 2;
  return `<section class="evidence-board"><div>${slots}</div>${lensHint(lot, ids)}<footer><span>記録 ${ids.length}件 / 仮説には2件以上</span>${!state.deepScanUsed && !ids.includes(lot.deepEvidence.id) ? '<button data-deep-scan>このLOTで深層スキャン</button>' : ''}<button class="primary" data-to-hypothesis ${enough ? '' : 'disabled'}>見立てを提出</button></footer>${!enough ? '<p class="invalid-reason">証拠が足りません。あと1件以上を調べてください。</p>' : ''}</section>`;
}

function exploreView() {
  const lot = currentLot(state);
  const lotState = getLotState();
  const tab = state.ui.exploreTab || 'explore';
  return shell(`<section class="v35-explore">${itemHeader(lot)}<nav class="phase-tabs" aria-label="探索表示"><button data-explore-tab="explore" class="${tab === 'explore' ? 'active' : ''}">探索</button><button data-explore-tab="evidence" class="${tab === 'evidence' ? 'active' : ''}">証拠ボード ${lotState.revealedEvidenceIds.length}</button></nav>${tab === 'explore' ? explorationPanel(lot, lotState) : evidenceBoard(lot, lotState)}</section>`, 'explore');
}

function hypothesisView() {
  const lot = currentLot(state);
  const lotState = getLotState();
  const draftCondition = state.ui.draftCondition || lotState.hypothesis?.condition || '';
  const draftConfidence = state.ui.draftConfidence || lotState.hypothesis?.confidence || '';
  const evidenceList = lotState.revealedEvidenceIds.map(id => evidenceById(lot, id)).filter(Boolean).map(clue => `<li><span>${esc(clue.category)}</span>${esc(clue.title)}</li>`).join('');
  return shell(`<section class="v35-hypothesis"><article>${lotArt(lot, 'hero')}<div><small>${esc(categoryText(lot))}</small><h1>${esc(lot.name)}</h1><p>${esc(publicEligibility(lot).label)}</p><ul>${evidenceList}</ul></div></article><section><header><small>HYPOTHESIS</small><h2>今回の個体をどう読む？</h2></header><div class="choice-grid">${Object.entries(CONDITION_LABELS).map(([id, label]) => `<button data-condition="${id}" class="${draftCondition === id ? 'active' : ''}"><b>${label}</b><small>${id === 'prime' ? '素材・来歴・状態が一続き' : id === 'restored' ? '主要部は当時物、後年の処置あり' : '別個体・複製・すり替え'}</small></button>`).join('')}</div><div class="confidence-grid" aria-label="確信度">${Object.entries(CONFIDENCE_LABELS).map(([id, label]) => `<button data-confidence="${id}" class="${draftConfidence === id ? 'active' : ''}">${label}</button>`).join('')}</div><footer><button data-back-evidence>証拠へ戻る</button><button class="primary" data-submit-hypothesis ${draftCondition && draftConfidence ? '' : 'disabled'}>この見立てで競売へ</button></footer>${!(draftCondition && draftConfidence) ? '<p class="invalid-reason">状態と確信度の両方を選んでください。</p>' : ''}</section></section>`, 'hypothesis');
}

function budgetSignal(npc) {
  const ratio = state.npcBudgets[npc.id] / npc.budget;
  return ratio >= .65 ? '予算に余力' : ratio >= .3 ? '残りを意識' : ratio > 0 ? '残り少ない' : '予算なし';
}

function auctionView() {
  const lot = currentLot(state);
  const lotState = getLotState();
  const auction = lotState.auction;
  const leader = winnerName(auction.leaderId);
  const playerLeading = auction.leaderId === PLAYER_ID;
  const logs = auction.log.slice(-6).reverse().map(entry => `<p><span>${esc(entry.action)}</span><b>${esc(winnerName(entry.whoId))}</b><strong>${cr(entry.amount)}</strong></p>`).join('');
  const bidders = NPCS.map(npc => `<article class="bidder-card ${auction.leaderId === npc.id ? 'leading' : ''}" data-npc-id="${npc.id}">${image(npc.pic, 'face')}<div><b>${esc(npc.name)}</b><span>${esc(bidderMood(state, npc.id))}</span><small>${esc(budgetSignal(npc))} / ${esc(lot.npc[npc.id].tell)}</small></div></article>`).join('');
  const insufficient = auction.currentBid + 10 > state.cash;
  const bidButtons = [10, 50, 100].map(step => `<button data-bid="${step}" ${playerLeading || auction.currentBid + step > state.cash ? 'disabled' : ''}>+${step}</button>`).join('');
  const reason = playerLeading
    ? 'あなたが最高額です。追加入札はできません。競合はすでに降りています。'
    : insufficient ? '最小入札まで現金が不足しています。見送っても進行できます。' : '自分の上限額を超える前に、見送る判断も有効です。';
  return shell(`<section class="v35-auction"><article class="auction-item">${lotArt(lot, 'hero')}<small>${esc(categoryText(lot))}</small><h1>${esc(lot.name)}</h1><p>${esc(lot.description)}</p><b>見立て：${esc(CONDITION_LABELS[lotState.hypothesis.condition])}</b><span>${esc(publicEligibility(lot).label)}</span></article><section class="auction-price"><small>CURRENT BID</small><strong class="price-pop">${cr(auction.currentBid)}</strong><p><b>${esc(leader)}</b> が最高額</p><div class="bid-controls">${bidButtons}${playerLeading ? '<button class="primary" data-confirm-win>この価格で落札</button>' : '<button data-pass>この品を見送る</button>'}</div><p class="invalid-reason">${reason}</p><div class="auction-log" aria-label="入札履歴">${logs}</div></section><aside class="bidder-list"><header><h2>参加者</h2><small>表情と上げ方から読む</small></header>${bidders}</aside></section>`, 'auction');
}

function reasonEvidence(lot) {
  return lot.reasonEvidence.map(id => evidenceById(lot, id)).filter(Boolean).map(clue => `<li><b>${esc(clue.id)} ${esc(clue.title)}</b><span>${esc(clue.text)}</span></li>`).join('');
}

function resultSummary(kind) {
  const lot = currentLot(state);
  const lotState = getLotState();
  const result = lotState.result;
  const winner = winnerName(result.winnerId);
  const eligibility = questMatches(lot) ? '依頼条件 ○' : lot.categories.includes('RELIC') ? '依頼条件 ×（真贋）' : '依頼条件 ×（分類）';
  return `<section class="v35-reveal ${lot.condition}"><article>${lotArt(lot, 'hero')}<div><small>${kind} / LOT ${state.lotIndex + 1}</small><h1>${esc(lot.name)}</h1><p>${esc(lot.description)}</p></div></article><section class="reveal-grade"><small>${result.winnerId === PLAYER_ID ? 'SOLD TO YOU' : 'SOLD'}</small><h2>${esc(winner)}</h2><strong>${cr(result.price)}</strong><div><span>${esc(CONDITION_LABELS[lot.condition])}</span><b>鑑定額 ${cr(lot.value)}</b><em>${eligibility}</em></div></section><section class="reveal-reason"><header><h2>見立ての答え合わせ</h2><span>${esc(result.comparison)}</span></header><p>${esc(lot.appraisal)}</p><ul>${reasonEvidence(lot)}</ul>${result.winnerId !== PLAYER_ID ? `<aside><b>${esc(winner)}が追った理由</b><p>${esc(result.reason)}</p></aside>` : ''}</section></section>`;
}

function appraisalView() {
  const lot = currentLot(state);
  const result = getLotState().result;
  const spread = lot.value - result.price;
  return shell(`${resultSummary('鑑定結果')}<footer class="reveal-actions"><span>${spread >= 0 ? `鑑定額より ${cr(spread)}安い` : `鑑定額より ${cr(Math.abs(spread))}高い`}</span><button data-dispose="hold">保管して依頼候補へ</button><button class="primary" data-dispose="sell">鑑定額で売却 / ${cr(lot.value)}</button></footer>`, 'appraisal');
}

function resolutionView() {
  const result = getLotState().result;
  const flow = result.log.slice(-5).map(entry => `<span><small>${esc(entry.action)}</small><b>${esc(winnerName(entry.whoId))}</b><strong>${cr(entry.amount)}</strong></span>`).join('');
  return shell(`${resultSummary('見送り結果')}<footer class="reveal-actions"><div class="final-bid-flow">${flow}</div><button class="primary" data-result-next>${state.lotIndex === LOTS.length - 1 ? '納品へ進む' : '次のLOTへ'}</button></footer>`, 'resolution');
}

function lotResultView() {
  const lot = currentLot(state);
  const lotState = getLotState();
  const held = lotState.disposition === 'hold';
  return shell(`<section class="v35-lot-result">${lotArt(lot, 'hero')}<small>LOT ${state.lotIndex + 1} COMPLETE</small><h1>${held ? '保管庫へ登録' : '売却完了'}</h1><p>${esc(lot.name)}を${held ? '依頼候補として保管した。台帳で分類と現在の資産を確認できる。' : `${cr(lot.value)}で売却した。現金は次のLOTへ持ち越される。`}</p><dl><div><dt>現金</dt><dd>${cr(state.cash)}</dd></div><div><dt>保管品</dt><dd>${state.held.length}点 / ${cr(heldValue(state))}</dd></div><div><dt>依頼候補</dt><dd>${questProgress(state)} / ${QUEST.need}</dd></div></dl><button class="primary" data-result-next>${state.lotIndex === LOTS.length - 1 ? '納品へ進む' : '次のLOTへ'}</button></section>`, 'lot-result');
}

function shopView() {
  const cards = UPGRADES.map(upgrade => {
    const owned = state.upgrades.includes(upgrade.id);
    const limit = state.shopPurchases >= 2;
    const sameLot = state.shopLotId === currentLot(state).id;
    const short = state.cash < upgrade.price;
    const disabled = owned || limit || sameLot || short;
    const reason = owned ? '購入済み' : limit ? '周期上限2個' : sameLot ? 'このLOTでは購入済み' : short ? `不足 ${cr(upgrade.price - state.cash)}` : '購入可能';
    return `<button class="upgrade-card" data-buy="${upgrade.id}" ${disabled ? 'disabled' : ''}><span class="shop-image shop-${upgrade.sprite}" aria-hidden="true"></span><div><small>${reason}</small><h2>${esc(upgrade.name)}</h2><strong>${cr(upgrade.price)}</strong><p><b>${esc(upgrade.effect)}</b><br>${esc(upgrade.detail)}</p></div></button>`;
  }).join('');
  return shell(`<section class="v35-shop"><header><small>EXPLORATION SHOP / 購入 ${state.shopPurchases} / 2</small><h1>探索用の強化</h1><p>購入しない選択にも価値がある。依頼品へ残す現金と比べる。</p></header><div>${cards}</div><footer><span>現金 ${cr(state.cash)}</span><button class="primary" data-shop-close>探索へ戻る</button></footer></section>`, 'shop');
}

function ledgerSummary() {
  const lot = currentLot(state);
  return `<div class="ledger-summary"><article><small>依頼</small><h2>${esc(QUEST.title)}</h2><strong>RELIC ${questProgress(state)} / ${QUEST.need}</strong><p>${esc(QUEST.hint)}</p></article><article><small>資産</small><dl><div><dt>現金</dt><dd>${cr(state.cash)}</dd></div><div><dt>保管評価</dt><dd>${cr(heldValue(state))}</dd></div><div><dt>総資産</dt><dd>${cr(netWorth(state))}</dd></div></dl></article><article><small>現在の品</small><h2>${esc(lot.name)}</h2><strong>${esc(categoryText(lot))}</strong><p>${esc(publicEligibility(lot).label)}</p><span>深層スキャン：${state.deepScanUsed ? '使用済み' : '未使用'}</span></article></div>`;
}

function ledgerHoldings() {
  const pageSize = 3;
  const pageCount = Math.max(1, Math.ceil(state.held.length / pageSize));
  const page = Math.max(0, Math.min(pageCount - 1, state.ui.ledgerPage || 0));
  const cards = state.held.slice(page * pageSize, page * pageSize + pageSize).map(entry => {
    const lot = lotById(entry.lotId);
    return `<article>${lotArt(lot)}<div><small>${esc(categoryText(lot))}</small><h2>${esc(lot.name)}</h2><p>${esc(CONDITION_LABELS[lot.condition])}</p><strong>${cr(lot.value)}</strong><span>${questMatches(lot) ? '依頼条件 ○' : '依頼条件 ×'}</span></div></article>`;
  }).join('') || '<div class="empty-copy"><b>保管品なし</b><p>落札後に「保管」を選ぶと、ここへ登録される。</p></div>';
  return `<div class="ledger-holdings">${cards}</div><div class="pager"><button data-ledger-page="-1" ${page === 0 ? 'disabled' : ''}>←</button><span>${page + 1} / ${pageCount}</span><button data-ledger-page="1" ${page >= pageCount - 1 ? 'disabled' : ''}>→</button></div>`;
}

function ledgerRivals() {
  return `<div class="ledger-rivals">${NPCS.map(npc => `<article>${image(npc.pic, 'face')}<div><small>${esc(budgetSignal(npc))}</small><h2>${esc(npc.name)}</h2><p><b>目的</b> ${esc(npc.wants)}</p><p><b>隠すこと</b> ${esc(npc.hides)}</p><p><b>観察できる癖</b> ${esc(npc.tell)}</p></div></article>`).join('')}</div>`;
}

function ledgerView() {
  const tab = state.ui.ledgerTab || 'summary';
  const body = tab === 'holdings' ? ledgerHoldings() : tab === 'rivals' ? ledgerRivals() : ledgerSummary();
  return shell(`<section class="v35-ledger"><header><small>PLAYER LEDGER</small><h1>台帳</h1><p>真贋、分類、依頼適合、価値を分けて確認する。</p></header><nav class="phase-tabs"><button data-ledger-tab="summary" class="${tab === 'summary' ? 'active' : ''}">概要</button><button data-ledger-tab="holdings" class="${tab === 'holdings' ? 'active' : ''}">保管品 ${state.held.length}</button><button data-ledger-tab="rivals" class="${tab === 'rivals' ? 'active' : ''}">競合3人</button></nav><section class="ledger-body">${body}</section><button class="primary ledger-close" data-ledger-close>元の画面へ戻る</button></section>`, 'ledger');
}

function deliveryView() {
  const selected = Array.isArray(state.ui.deliverySelection) ? state.ui.deliverySelection : [];
  const pageSize = 3;
  const pageCount = Math.max(1, Math.ceil(state.held.length / pageSize));
  const page = Math.max(0, Math.min(pageCount - 1, state.ui.ledgerPage || 0));
  const cards = state.held.slice(page * pageSize, page * pageSize + pageSize).map(entry => {
    const lot = lotById(entry.lotId);
    const active = selected.includes(lot.id);
    return `<button data-delivery-select="${lot.id}" class="delivery-card ${active ? 'active' : ''}">${lotArt(lot)}<span><small>${esc(categoryText(lot))}</small><b>${esc(lot.name)}</b><em>${esc(CONDITION_LABELS[lot.condition])}</em><strong>${cr(lot.value)}</strong><i>${questMatches(lot) ? '依頼条件 ○' : lot.categories.includes('RELIC') ? '依頼条件 × 真贋' : '依頼条件 × 分類'}</i></span></button>`;
  }).join('') || '<div class="empty-copy"><b>納品できる保管品がない</b><p>依頼未達として周期を締めても進行不能にはならない。</p></div>';
  const selectedLots = selected.map(lotById).filter(Boolean);
  const valid = selectedLots.length === QUEST.need && selectedLots.every(questMatches);
  const exact = selectedLots.length === QUEST.need;
  const warning = !exact ? `2点選択してください（現在${selectedLots.length}点）` : valid ? '条件一致。この2点を納品できる。' : '条件外の品が含まれる。このまま納品すると依頼失敗。';
  return shell(`<section class="v35-delivery"><header><small>DELIVERY / CYCLE 01</small><h1>${esc(QUEST.title)}</h1><p>${esc(QUEST.text)}</p></header><div class="delivery-list">${cards}</div><aside><b>選択 ${selectedLots.length} / ${QUEST.need}</b><p class="${valid ? 'valid' : 'invalid'}">${warning}</p><dl><div><dt>現金</dt><dd>${cr(state.cash)}</dd></div><div><dt>保管評価</dt><dd>${cr(heldValue(state))}</dd></div></dl><div class="pager"><button data-delivery-page="-1" ${page === 0 ? 'disabled' : ''}>←</button><span>${page + 1} / ${pageCount}</span><button data-delivery-page="1" ${page >= pageCount - 1 ? 'disabled' : ''}>→</button></div><button class="primary" data-deliver ${exact ? '' : 'disabled'}>${valid ? '納品を確定' : '条件外を含めて納品'}</button><button data-fail-cycle>依頼未達として周期を終える</button></aside></section>`, 'delivery');
}

function reportView() {
  const ending = state.ending;
  const story = ending.ok ? ENDINGS.success : ENDINGS.failure;
  const heldPersona = state.held.some(entry => entry.lotId === 'persona-backup');
  const extra = ending.ok && heldPersona ? ' 保管庫のN-13が六音を返した。歌の間隔は、雨の採取番号A-17と同じだった。' : '';
  return shell(`<section class="v35-report ${ending.ok ? 'success' : 'failure'}"><small>CYCLE 01 COMPLETE</small><h1>${esc(story.title)}</h1><p>${esc(story.text + extra)}</p><dl><div><dt>依頼</dt><dd>${ending.ok ? '達成' : '未達'}</dd></div><div><dt>納品鑑定額</dt><dd>${cr(ending.appraisalValue)}</dd></div><div><dt>達成追加</dt><dd>${cr(ending.bonus)}</dd></div><div><dt>受取合計</dt><dd>${cr(ending.payout)}</dd></div><div><dt>持越現金</dt><dd>${cr(state.cash)}</dd></div><div><dt>残保管品</dt><dd>${cr(heldValue(state))}</dd></div></dl><div class="report-actions"><button class="primary" data-replay>もう一度プレイ</button><button data-to-title>タイトルへ</button></div><footer><b>次周期への兆候</b><span>依頼人ユウナの目的は展示ではない。最終列車の乗客と、第零区の出口を探している。</span></footer></section>`, 'report');
}

const views = {
  title: titleView, name: nameView, intro: introView, briefing: briefingView,
  explore: exploreView, hypothesis: hypothesisView, auction: auctionView,
  resolution: resolutionView, appraisal: appraisalView, 'lot-result': lotResultView,
  shop: shopView, ledger: ledgerView, delivery: deliveryView, report: reportView,
};

function render(focusSelector = '') {
  app.innerHTML = (views[state.screen] || titleView)();
  if (focusSelector) queueMicrotask(() => app.querySelector(focusSelector)?.focus());
}

function applyEngine(outcome, focusSelector = '') {
  state = outcome.state;
  if (!outcome.error) {
    save();
    for (const event of outcome.events || []) {
      if (event.type === 'hypothesis_submitted') track('hypothesis', event);
      if (event.type === 'bid') track('bid', event);
      if (event.type === 'pass') track('pass', event);
      if (event.type === 'auction_result') track('result', event);
      if (event.type === 'cycle_completed') track('cycle_complete', event);
    }
  }
  render(focusSelector);
}

function mutate(mutator, { persist = true, focus = '' } = {}) {
  mutator(state);
  state.lastError = '';
  if (persist) save();
  render(focus);
}

function startNamedRun(nameValue) {
  const name = String(nameValue || '').trim().slice(0, 12);
  if (!name) {
    state.lastError = '名前を1文字以上入力してください。';
    render('#player-name');
    return;
  }
  state.name = name;
  state.screen = 'intro';
  state.introIndex = 0;
  state.migrationNotice = '';
  save();
  track('start', { seed: state.seed });
  render('[data-intro-next]');
}

app.addEventListener('submit', event => {
  const form = event.target.closest('[data-name-form]');
  if (!form) return;
  event.preventDefault();
  startNamedRun(new FormData(form).get('name'));
});

app.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('#player-name')) {
    event.preventDefault();
    startNamedRun(event.target.value);
    return;
  }
  if (event.key === 'Escape' && state.ui.tutorialOpen) {
    state.ui.tutorialOpen = false;
    render('[data-help]');
  }
});

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || actionLocked) return;
  if (button.dataset.nameSubmit !== undefined) {
    event.preventDefault();
    startNamedRun(app.querySelector('#player-name')?.value);
    return;
  }
  if (button.type === 'submit' && button.closest('[data-name-form]')) return;
  event.preventDefault();
  actionLocked = true;
  queueMicrotask(() => { actionLocked = false; });

  if (button.dataset.help !== undefined) {
    state.ui.tutorialOpen = true;
    state.ui.tutorialPage = 0;
    render('[data-help-close]');
    return;
  }
  if (button.dataset.helpClose !== undefined) {
    state.ui.tutorialOpen = false;
    render('[data-help]');
    return;
  }
  if (button.dataset.helpPage) {
    state.ui.tutorialPage = Math.max(0, Math.min(tutorialPages.length - 1, state.ui.tutorialPage + Number(button.dataset.helpPage)));
    render('[data-help-close]');
    return;
  }
  if (button.dataset.save !== undefined) {
    if (save()) showToast('保存しました');
    else render('[data-save]');
    return;
  }
  if (button.dataset.reset !== undefined) {
    if (!state.ui.resetArmed) {
      state.ui.resetArmed = true;
      state.lastError = '保存データを消すには、3秒以内にもう一度押してください。';
      render('[data-reset]');
      setTimeout(() => {
        if (!state.ui.resetArmed) return;
        state.ui.resetArmed = false;
        state.lastError = '';
        render();
      }, 3000);
      return;
    }
    const reset = resetSaves();
    state = createInitialState({ seed: state.seed, screen: 'name' });
    if (!reset.ok) state.lastError = reset.error;
    render('#player-name');
    return;
  }
  if (button.dataset.new !== undefined) {
    if (loadState().state && !state.ui.newArmed) {
      state.ui.newArmed = true;
      state.lastError = '現在の保存を置き換えます。もう一度押すとNEW FILEを開始します。';
      render('[data-new]');
      return;
    }
    resetSaves();
    state = createInitialState({ seed: state.seed, screen: 'name' });
    render('#player-name');
    return;
  }
  if (button.dataset.continue !== undefined) {
    const resumed = loadState().state;
    state = resumed || createInitialState({ seed: state.seed, screen: 'name' });
    render();
    return;
  }
  if (button.dataset.introSkip !== undefined || button.dataset.introNext !== undefined) {
    const finished = button.dataset.introSkip !== undefined || state.introIndex >= INTRO.length - 1;
    if (finished) {
      state.screen = 'briefing';
      state.ui.tutorialOpen = true;
      state.ui.tutorialPage = 0;
      track('intro_complete', { skipped: button.dataset.introSkip !== undefined });
    } else state.introIndex += 1;
    save();
    render(finished ? '[data-help-close]' : '[data-intro-next]');
    return;
  }
  if (button.dataset.acceptRequest !== undefined) {
    state.quest.accepted = true;
    state.screen = 'explore';
    state.migrationNotice = '';
    save();
    render('[data-source]');
    return;
  }
  if (button.dataset.exploreTab) {
    state.ui.exploreTab = button.dataset.exploreTab;
    state.ui.sourceId = null;
    state.ui.conversationStep = 0;
    render(`[data-explore-tab="${button.dataset.exploreTab}"]`);
    return;
  }
  if (button.dataset.source) {
    state.ui.sourceId = button.dataset.source;
    state.ui.conversationStep = 0;
    render(`[data-source="${button.dataset.source}"]`);
    return;
  }
  if (button.dataset.converse) {
    if ((state.ui.conversationStep || 0) === 0) {
      state.ui.conversationStep = 1;
      save();
      render(`[data-converse="${button.dataset.converse}"]`);
    } else applyEngine(revealEvidence(state, button.dataset.converse), '[data-explore-tab="evidence"]');
    return;
  }
  if (button.dataset.deepScan !== undefined) {
    applyEngine(revealEvidence(state, currentLot(state).deepEvidence.id, { deep: true }), '[data-explore-tab="evidence"]');
    return;
  }
  if (button.dataset.toHypothesis !== undefined) {
    if (getLotState().revealedEvidenceIds.length < 2) {
      state.lastError = '仮説には少なくとも2件の証拠が必要です。';
      render();
    } else mutate(next => { next.screen = 'hypothesis'; }, { focus: '[data-condition]' });
    return;
  }
  if (button.dataset.condition) {
    state.ui.draftCondition = button.dataset.condition;
    render(`[data-condition="${button.dataset.condition}"]`);
    return;
  }
  if (button.dataset.confidence) {
    state.ui.draftConfidence = button.dataset.confidence;
    render(`[data-confidence="${button.dataset.confidence}"]`);
    return;
  }
  if (button.dataset.backEvidence !== undefined) {
    mutate(next => { next.screen = 'explore'; next.ui.exploreTab = 'evidence'; }, { focus: '[data-to-hypothesis]' });
    return;
  }
  if (button.dataset.submitHypothesis !== undefined) {
    const outcome = submitHypothesis(state, state.ui.draftCondition, state.ui.draftConfidence);
    if (!outcome.error) {
      outcome.state.ui.draftCondition = '';
      outcome.state.ui.draftConfidence = '';
    }
    applyEngine(outcome, '[data-bid="10"]');
    return;
  }
  if (button.dataset.bid) {
    applyEngine(placePlayerBid(state, Number(button.dataset.bid)), '[data-pass], [data-confirm-win]');
    return;
  }
  if (button.dataset.pass !== undefined) {
    applyEngine(passAuction(state), '[data-result-next]');
    return;
  }
  if (button.dataset.confirmWin !== undefined) {
    applyEngine(finalizePlayerWin(state), '[data-dispose="hold"]');
    return;
  }
  if (button.dataset.dispose) {
    applyEngine(disposePlayerLot(state, button.dataset.dispose), '[data-result-next]');
    return;
  }
  if (button.dataset.resultNext !== undefined) {
    applyEngine(continueAfterResult(state), state.lotIndex < LOTS.length - 1 ? '[data-source]' : '[data-delivery-select]');
    return;
  }
  if (button.dataset.shop !== undefined) {
    mutate(next => { next.returnScreen = next.screen; next.screen = 'shop'; }, { focus: '[data-buy]' });
    return;
  }
  if (button.dataset.shopClose !== undefined) {
    mutate(next => { next.screen = next.returnScreen || 'explore'; next.returnScreen = null; }, { focus: '[data-shop]' });
    return;
  }
  if (button.dataset.buy) {
    applyEngine(buyUpgrade(state, button.dataset.buy), `[data-buy="${button.dataset.buy}"]`);
    return;
  }
  if (button.dataset.ledger !== undefined) {
    if (state.screen === 'ledger') {
      const returnScreen = state.returnScreen || 'explore';
      state.screen = returnScreen;
      state.returnScreen = null;
    } else {
      state.returnScreen = state.screen;
      state.screen = 'ledger';
      state.ui.ledgerTab = 'summary';
    }
    save();
    render(state.screen === 'ledger' ? '[data-ledger-tab="summary"]' : '[data-ledger]');
    return;
  }
  if (button.dataset.ledgerClose !== undefined) {
    state.screen = state.returnScreen || 'explore';
    state.returnScreen = null;
    save();
    render('[data-ledger]');
    return;
  }
  if (button.dataset.ledgerTab) {
    state.ui.ledgerTab = button.dataset.ledgerTab;
    state.ui.ledgerPage = 0;
    render(`[data-ledger-tab="${button.dataset.ledgerTab}"]`);
    return;
  }
  if (button.dataset.ledgerPage) {
    state.ui.ledgerPage = Math.max(0, state.ui.ledgerPage + Number(button.dataset.ledgerPage));
    render();
    return;
  }
  if (button.dataset.deliveryPage) {
    state.ui.ledgerPage = Math.max(0, state.ui.ledgerPage + Number(button.dataset.deliveryPage));
    render();
    return;
  }
  if (button.dataset.deliverySelect) {
    const selected = Array.isArray(state.ui.deliverySelection) ? [...state.ui.deliverySelection] : [];
    const index = selected.indexOf(button.dataset.deliverySelect);
    if (index >= 0) selected.splice(index, 1);
    else if (selected.length < QUEST.need) selected.push(button.dataset.deliverySelect);
    else state.lastError = `納品は${QUEST.need}点までです。先に選択を外してください。`;
    state.ui.deliverySelection = selected;
    save();
    render(`[data-delivery-select="${button.dataset.deliverySelect}"]`);
    return;
  }
  if (button.dataset.deliver !== undefined) {
    applyEngine(deliverQuest(state, state.ui.deliverySelection || []), '[data-replay]');
    return;
  }
  if (button.dataset.failCycle !== undefined) {
    applyEngine(concludeFailedQuest(state), '[data-replay]');
    return;
  }
  if (button.dataset.replay !== undefined) {
    resetSaves();
    state = createInitialState({ seed: state.seed, screen: 'name' });
    render('#player-name');
    return;
  }
  if (button.dataset.toTitle !== undefined) {
    state.screen = 'title';
    save();
    render('[data-continue]');
  }
});

render();

