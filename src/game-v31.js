import {
  CATALOG, EVIDENCE, PROFILES, VARIANTS, QUESTS, PEOPLE, PLACES,
  BIDDERS, TOPICS, UPGRADES,
} from './game-data-v31.js';

const SOURCES = [...PEOPLE, ...PLACES];
const SAVE = 'auction-campaign-v33';
const LEGACY_SAVES = ['auction-campaign-v32', 'auction-campaign-v31', 'auction-campaign-v20'];
const app = document.querySelector('#app');
const cr = n => `${Math.round(n).toLocaleString()} CR`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const shuffle = list => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const hash = text => {
  let value = 2166136261;
  for (const char of String(text)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return (value >>> 0) / 4294967295;
};

const baseState = {
  schemaVersion: 33,
  screen: 'title', tutorial: 0, prologue: 0, name: '', cycle: 1, cash: 1800, debt: 0,
  round: 0, questId: null, lots: [], held: [], actions: 2, actionReserve: 0, time: 0, lastPlace: null,
  clues: [], focus: null, topic: null, assessment: null, will: 1, bid: 60, leader: 1,
  log: [], won: null, paid: 0, selected: [], hotRounds: [], usedTopics: [],
  exploreTab: 'search', notePage: 0, inventoryPage: 0,
  relations: { reika: 0, goro: 0, vera: 0, morgan: 0 },
  upgrades: { insight: 0, deal: 0, stamina: 0, focus: 0 },
  variantHistory: {}, shopUsed: false, shopPurchases: 0, sideBetUsed: false,
  infoSaleUsed: false, overlay: false, flash: '', ending: null, lastOutcome: null,
  resolution: null, shopReturn: 'explore', resetArmed: false,
};

const fresh = () => JSON.parse(JSON.stringify(baseState));
const catalogItem = id => CATALOG.find(item => item.id === id);
const itemIndex = item => CATALOG.findIndex(entry => entry.id === (item?.baseId || item?.id));
const sourceById = id => SOURCES.find(source => source.id === id);
const topicById = (sourceId, topicId) => (TOPICS[sourceId] || []).find(topic => topic.id === topicId);
const worth = item => Math.round(item?.marketValue ?? item?.value ?? 0);
const currentQuest = () => QUESTS.find(quest => quest.id === s.questId) || null;
const current = () => s.lots[s.round];
const neutralDescription = base => {
  const index = CATALOG.indexOf(base);
  const evidence = EVIDENCE[Math.max(0, index)];
  return `${base.desc} 識別点：${evidence.detail}／${evidence.mark}。`;
};
const actionCapacity = () => 2;
const actionReserveCapacity = () => s.upgrades.stamina * 2;
const selfCheckCapacity = () => 1;
const loanRepayment = () => Math.max(300, 450 - s.upgrades.deal * 50);
const upgradePrice = (upgrade, level) => upgrade.base + level * upgrade.step;
const shopPrice = (upgrade, level) => Math.round(upgradePrice(upgrade, level) * (1 - s.upgrades.deal * .05) / 10) * 10;
const chapterNumber = () => Math.ceil(s.cycle / 5);
const chapterGoal = () => 5000 + (chapterNumber() - 1) * 2500;
const netWorth = () => s.cash + s.held.reduce((sum, item) => sum + worth(item), 0) - s.debt;

function assessmentComparison(item, assessmentId = s.assessment) {
  const exact = assessmentId === item.variant;
  const authOnly = assessmentId !== 'forged' && item.variant !== 'forged';
  return exact ? '見立て一致' : authOnly ? '真贋のみ一致' : '見立て違い';
}

function outcomeRecord(item, winner, price) {
  return {
    item: item.name,
    winner,
    price,
    verdict: `${item.auth} / ${item.condition}`,
    prediction: VARIANTS[s.assessment]?.assessment || '未設定',
    comparison: assessmentComparison(item),
  };
}

function normalizeItem(item) {
  if (!item) return item;
  const base = catalogItem(item.baseId || item.id) || CATALOG[0];
  if (item.variant && item.baseId && item.marketValue !== undefined) {
    return { ...item, desc: neutralDescription(base) };
  }
  const variant = item.auth === '偽物' ? 'forged' : (['良品', '極上'].includes(item.condition) ? 'prime' : 'restored');
  const caseId = item.caseId || `${base.id}-legacy`;
  const marketValue = item.auth === '偽物'
    ? Math.round((item.value || base.baseValue) * .42)
    : (item.value || base.baseValue);
  return {
    ...base,
    baseId: base.id,
    caseId,
    serial: item.serial || `${base.id}-旧記録`,
    variant,
    auth: item.auth || VARIANTS[variant].auth,
    condition: item.condition || (variant === 'prime' ? base.bestCondition : variant === 'restored' ? '修復品' : '精巧'),
    conditionRank: variant === 'prime' ? 3 : variant === 'restored' ? 2 : 1,
    marketValue,
    claimValue: item.value || base.baseValue,
    range: item.range || [Math.round(base.baseValue * .55), Math.round(base.baseValue * 1.35)],
    desc: neutralDescription(base),
    visual: item.visual || `case-${Math.floor(hash(caseId) * 3)}`,
  };
}

function normalizeState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const clean = { ...raw };
  delete clean.rep;
  delete clean.quest;
  const next = { ...fresh(), ...clean };
  next.schemaVersion = 33;
  next.prologue = Math.max(0, Math.min(3, Number(raw.prologue) || 0));
  next.questId = raw.questId || raw.quest?.id || null;
  next.lots = Array.isArray(raw.lots) ? raw.lots.map(normalizeItem) : [];
  next.held = Array.isArray(raw.held) ? raw.held.map(normalizeItem) : [];
  next.won = raw.won ? normalizeItem(raw.won) : null;
  next.clues = Array.isArray(raw.clues) ? raw.clues : [];
  next.usedTopics = Array.isArray(raw.usedTopics) ? raw.usedTopics : [];
  next.selected = Array.isArray(raw.selected) ? raw.selected : [];
  next.variantHistory = raw.variantHistory || {};
  next.relations = { ...baseState.relations, ...(raw.relations || {}) };
  next.upgrades = { ...baseState.upgrades, ...(raw.upgrades || {}) };
  next.overlay = false;
  next.flash = '';
  next.resetArmed = false;
  if (next.screen === 'resolution' && !next.resolution) next.screen = 'auction';
  if (next.screen === 'shop' && Number(raw.schemaVersion || 0) < 33) next.shopReturn = 'post-auction';
  if (next.screen === 'delivery' && !next.questId) next.screen = 'quest';
  return next;
}

function readSave() {
  try {
    const raw = [SAVE, ...LEGACY_SAVES].map(key => localStorage.getItem(key)).find(Boolean);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

const savedAtLoad = readSave();
let s = savedAtLoad || fresh();
const newRun = new URLSearchParams(location.search).get('new') === '1';
if (newRun) {
  try {
    localStorage.removeItem(SAVE);
    LEGACY_SAVES.forEach(key => localStorage.removeItem(key));
  } catch {}
  s = { ...fresh(), screen: 'name' };
  history.replaceState(null, '', location.pathname);
} else if (!savedAtLoad && location.pathname.includes('start')) {
  s.screen = 'name';
}

function save() {
  try {
    const persisted = { ...s, schemaVersion: 33, overlay: false, flash: '', resetArmed: false };
    delete persisted.rep;
    delete persisted.quest;
    localStorage.setItem(SAVE, JSON.stringify(persisted));
  } catch {}
}

function createItem(base, variantId) {
  const suffix = Math.floor(Math.random() * 900 + 100);
  const caseId = `${base.id}-${s.cycle}-${suffix}`;
  const claimValue = Math.round(base.baseValue * (.94 + hash(`${caseId}-claim`) * .12) / 10) * 10;
  const condition = variantId === 'prime'
    ? base.bestCondition
    : variantId === 'restored' ? '修復品' : (base.id === 'A-06' || base.id === 'A-08' || base.id === 'A-10' ? '粗悪' : '精巧');
  const favorite = base.cat.includes('ART') || base.cat.includes('RELIC');
  const mislead = Object.fromEntries(PEOPLE.map(person => {
    const relation = s.relations[person.id] || 0;
    const bias = { reika: .08, goro: .14, vera: favorite ? .28 : .18, morgan: .08 }[person.id] || 0;
    return [person.id, hash(`${caseId}:${person.id}`) < Math.max(.03, bias - relation * .025)];
  }));
  return {
    ...base,
    baseId: base.id,
    caseId,
    serial: `${base.id}-${suffix}`,
    variant: variantId,
    auth: VARIANTS[variantId].auth,
    condition,
    conditionRank: VARIANTS[variantId].conditionRank,
    marketValue: base.values[variantId],
    claimValue,
    range: [Math.round(claimValue * .55), Math.round(claimValue * 1.35)],
    desc: neutralDescription(base),
    visual: `case-${Math.floor(hash(`${caseId}-visual`) * 3)}`,
    mislead,
  };
}

function validCycle(lots) {
  const forged = lots.filter(item => item.variant === 'forged').length;
  return forged === 3 && QUESTS.every(quest => lots.filter(quest.match).length >= 3);
}

function generateLots() {
  const pool = ['prime', 'prime', 'prime', 'prime', 'restored', 'restored', 'restored', 'forged', 'forged', 'forged'];
  let lots = [];
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const variants = shuffle(pool);
    const candidate = CATALOG.map((base, index) => createItem(base, variants[index]));
    const avoidsRepeat = candidate.every(item => !s.variantHistory[item.baseId] || s.variantHistory[item.baseId] !== item.variant);
    if (validCycle(candidate) && (avoidsRepeat || attempt > 180)) {
      lots = candidate;
      break;
    }
  }
  if (!lots.length) {
    const fallback = ['prime', 'restored', 'prime', 'prime', 'forged', 'prime', 'restored', 'forged', 'restored', 'forged'];
    lots = CATALOG.map((base, index) => createItem(base, fallback[index]));
  }
  lots.forEach(item => { s.variantHistory[item.baseId] = item.variant; });
  return shuffle(lots);
}

function profileFor(item) {
  return PROFILES[EVIDENCE[itemIndex(item)]?.kind] || PROFILES.document;
}

function hotBidder() {
  return (s.round + Math.max(0, itemIndex(current()))) % 3;
}

function npcLimit(index, item) {
  const favorite = index === 0 && (item.cat.includes('ART') || item.cat.includes('RELIC'));
  const hot = s.hotRounds.includes(s.round);
  let factor = index === 0 ? (favorite ? .82 : .64) : (index === 1 ? .72 : .68);
  if (hot && index === hotBidder()) factor = 1.08 + ((s.round + itemIndex(item)) % 3) * .06;
  else if (hot) factor = Math.max(factor, .74);
  return Math.round(item.claimValue * factor / 10) * 10;
}

function sourceCost(sourceId) {
  const isPlace = PLACES.some(place => place.id === sourceId);
  return isPlace && s.lastPlace && s.lastPlace !== sourceId ? 2 : 1;
}

function topicKey(sourceId, topicId) {
  return `${sourceId}:${topicId}`;
}

function sourceMisleads(sourceId, item) {
  if (!PEOPLE.some(person => person.id === sourceId)) return false;
  if (item.mislead && Object.hasOwn(item.mislead, sourceId)) return item.mislead[sourceId];
  const relation = s.relations[sourceId] || 0;
  const favorite = item.cat.includes('ART') || item.cat.includes('RELIC');
  const bias = { reika: .08, goro: .14, vera: favorite ? .28 : .18, morgan: .08 }[sourceId] || 0;
  return hash(`${item.caseId}:${sourceId}`) < Math.max(.03, bias - relation * .025);
}

function shownVariant(item, sourceId) {
  if (!sourceMisleads(sourceId, item)) return item.variant;
  if (item.variant === 'forged' || item.variant === 'restored') return 'prime';
  return 'forged';
}

function axisFact(item, axis, variantId = item.variant) {
  const e = EVIDENCE[itemIndex(item)];
  const p = profileFor(item);
  const hot = s.hotRounds.includes(s.round);
  if (axis === 'market') {
    return hot
      ? `${BIDDERS[hotBidder()].name}が開始前に席を確保した。採算を外れても追う気配がある。`
      : '事前注文は見つからない。参加者は推定価格より手前で降りる構えだ。';
  }
  if (axis === 'price') {
    return hot
      ? `普段の相場は${cr(item.claimValue)}前後だが、今夜は一人だけ相場を無視しそうだ。`
      : `近い品の落札は${cr(item.claimValue * .68)}から${cr(item.claimValue * .82)}に収まっている。`;
  }
  if (axis === 'seller') {
    if (variantId === 'forged') return '売り手は鑑定前の即日決済を求め、連絡先を二度変えている。';
    if (variantId === 'restored') return '売り手は来歴を示すが、修理を受けた一年間だけ記録を出したがらない。';
    return '売り手は来歴照会を認め、落札を急いでいない。';
  }
  if (axis === 'material') {
    if (variantId === 'prime') return `${p.age}。${e.material}の劣化も全体で揃っている。`;
    if (variantId === 'restored') return `${p.age}。主要部は当時物だが、${e.detail}の周囲だけ表面処理が新しい。`;
    return `${p.fake}。ただし${e.material}の古い破片が一部に混ぜられている。`;
  }
  if (axis === 'condition') {
    if (variantId === 'prime') return `${p.continuity}。交換や接着の境目は見つからない。`;
    if (variantId === 'restored') return `${e.detail}の周囲に新しい接着層がある。古い本体を後から補っている。`;
    return `${p.broken}。表面だけ古く見せる処理が残る。`;
  }
  if (axis === 'craft') {
    if (variantId === 'prime') return `${e.mark}は下層から作られ、${p.target}の時代と矛盾しない。`;
    if (variantId === 'restored') return `${e.mark}は当時物だが、${e.detail}の仕上げだけ別の工具で補われている。`;
    return `${p.copy}で${e.mark}を再現できる。細部の順番が正式仕様と逆だ。`;
  }
  if (axis === 'unique') {
    if (variantId === 'prime') return `${e.owner}の古い写真にも${e.detail}が同じ位置に写っている。`;
    if (variantId === 'restored') return `${e.detail}は写真と一致するが、その周囲の欠損は後年の写真で補修されている。`;
    return `${e.owner}名義の二人の売り手が、同じ${e.detail}を別々の品に示している。`;
  }
  if (variantId === 'prime') return `${e.owner}から始まる記録は途切れず、${e.route}の順序も一致する。`;
  if (variantId === 'restored') return `${e.owner}からの記録は正しいが、修復工房へ渡った一年間だけ空白がある。`;
  return `${e.owner}名義の同じ品が二市場に同時出品され、${e.route}の到着印も逆順だ。`;
}

function evidenceText(sourceId, topic, item) {
  const source = sourceById(sourceId);
  const lie = sourceMisleads(sourceId, item);
  const corrected = s.upgrades.insight >= 3 && lie;
  const variantId = corrected ? item.variant : shownVariant(item, sourceId);
  const fact = axisFact(item, topic.axis, variantId);
  const labels = { reika: '現物', goro: '輸送', vera: '所有者', morgan: '競り', archive: '資料', market: '街の照合', network: '取引記録', warehouse: '梱包' };
  const warning = corrected
    ? '鑑識レンズ：食い違いを検出。物証に合う内容へ補正した。 '
    : s.upgrades.insight >= 1 && lie
      ? '鑑識レンズ：この話は、すでに得た物証の時間順と合わない。 '
      : s.upgrades.insight >= 2 && PEOPLE.includes(source)
        ? '鑑識レンズ：この話は、確認済みの物証と矛盾しない。 '
        : '';
  return `${warning}【${labels[sourceId]}／${topic.label}】${PEOPLE.includes(source) ? `「${fact}」` : fact}`;
}

function selfCheck(item) {
  const selfCount = s.clues.filter(clue => clue.sourceId === 'self').length;
  const defaultAxis = selfCount % 2 === 0 ? 'condition' : 'material';
  const decisiveAxis = item.variant === 'restored' ? 'condition' : item.variant === 'forged' ? 'provenance' : 'material';
  const axis = s.upgrades.focus >= 1 ? decisiveAxis : defaultAxis;
  const secondAxis = axis === 'condition' ? 'provenance' : 'condition';
  const craftCheck = s.upgrades.focus >= 2 ? ` 追加照合：${axisFact(item, 'craft')}` : '';
  const deepCheck = s.upgrades.focus >= 3 ? ` 補助照合：${axisFact(item, secondAxis)}` : '';
  const axisLabel = axis === 'condition' ? '状態' : axis === 'provenance' ? '来歴' : '材質';
  return {
    sourceId: 'self', topicId: axis, who: '自分の観察', label: axis === 'condition' ? '継ぎ目と修復跡' : axis === 'provenance' ? '来歴のつながり' : '素材と年代',
    text: `【自分／${axisLabel}】${profileFor(item).method}。${axisFact(item, axis)}${craftCheck}${deepCheck}`,
  };
}

function sourceIntro(source, item) {
  const e = EVIDENCE[itemIndex(item)];
  return {
    reika: `「${item.name}ね。${profileFor(item).target}から見ましょう」`,
    goro: `「${e.route}の荷か。荷札の順番なら覚えている」`,
    vera: `「${e.owner}の名前まで辿ったの？」`,
    morgan: '「真贋は品物を見て。私は競る人間を見る」',
  }[source.id] || `「${item.name}」について、何を調べるか決める。`;
}

function topicPrompt(source, topic) {
  return `${topic.label}について${PEOPLE.includes(source) ? '聞く' : '調べる'}。別の証拠と照合できる形で記録する。`;
}

function img(pic, kind = 'face') {
  return `<div class="${kind} ${pic}"></div>`;
}

function art(item, large = '') {
  const index = Math.max(0, itemIndex(item));
  const x = ['-3.333%', '23.333%', '50%', '76.667%', '103.333%'][index % 5];
  const y = Math.floor(index / 5) ? '100%' : '0%';
  return `<div class="itemart ${large} ${item?.visual || 'case-0'}" data-case="${esc(item?.serial || '')}" style="--item-x:${x};--item-y:${y}"></div>`;
}

function chapterCycle() {
  return `${((s.cycle - 1) % 5) + 1}/5`;
}

function shell(content) {
  const hasPhase = content.includes('class="phase"') ? ' has-phase' : '';
  const shopLink = s.screen === 'explore' ? '<button data-open-shop>強化店</button>' : '';
  const system = ['title', 'name', 'prologue'].includes(s.screen) ? '' : `<nav class="sys"><button data-help>?</button>${shopLink}<button data-save>保存</button><button data-reset>${s.resetArmed ? '削除を確認' : '初期化'}</button></nav>`;
  const debt = s.debt ? `｜借${Math.round(s.debt).toLocaleString()}` : '';
  const stats = `資産 ${Math.round(netWorth()).toLocaleString()}/${chapterGoal().toLocaleString()}｜現金 ${Math.round(s.cash).toLocaleString()}${debt}｜${chapterCycle()}`;
  return `<main class="app v34${hasPhase}"><header class="bar"><b>FILE / ${esc(s.name || '----')}</b><span>${stats}</span></header>${content}${system}${s.overlay ? help() : ''}${s.flash ? `<div class="flash">${esc(s.flash)}</div>` : ''}</main>`;
}

const helpPages = [
  ['目的', '5周期以内に依頼を達成し、借金を返済して純資産を章目標まで増やす。現在の純資産と目標は上部でいつでも確認できる。'],
  ['品物の個体差', '同じ品名でも、状態良好・修復品・偽物の個体がある。品名を暗記せず、今回の傷、素材、来歴を読む。'],
  ['探索', '人物や場所を選び、3つの質問・調べ方から1つを選ぶ。人物は思惑で嘘をつくことがある。場所の記録は正しいが、情報が欠けることがある。'],
  ['強化店', '探索中は画面下の「強化店」から任意で入れる。競売後に強制移動はしない。1つの品物につき1回、1周期に2回まで強化できる。'],
  ['見立て', '証拠を2件以上集めたら、状態良好な本物・修復された本物・偽物のどれかを予想する。数字ではなく証拠の一致と食い違いで決める。'],
  ['競売', '通常の参加者は価値より手前で降りる。執着している人物は相場を超えることがある。見送った後も、誰が最後に値を上げたか表示される。'],
  ['鑑定と納品', '落札できない品も見立ての答え合わせができる。納品成功時は品物の鑑定額100%と達成追加金を受け取り、失敗時は品物が返る。'],
];

function help() {
  const page = helpPages[s.tutorial] || helpPages[0];
  const last = helpPages.length - 1;
  return `<section class="help"><small>遊び方 ${s.tutorial + 1}/${helpPages.length}</small><h1>${page[0]}</h1><p>${page[1]}</p><div><button data-tut="-1" ${s.tutorial === 0 ? 'disabled' : ''}>←</button><button data-tut="1" ${s.tutorial === last ? 'disabled' : ''}>→</button></div><button class="solid" data-close>${s.tutorial === last ? 'ゲームへ' : '閉じる'}</button></section>`;
}

function title() {
  const hasSave = Boolean(readSave());
  return shell(`<section class="title"><small>終わりなき競売記録</small><h1>競売記録<br><span>AUCTION FILE</span></h1><p>品名ではなく証拠を読み、あなたの上限額を決める。</p><a class="solid" href="/start-v30.html?new=1">新しく始める</a><button class="line" data-load ${hasSave ? '' : 'disabled'}>続きから</button><button class="line" data-open-tutorial>遊び方</button></section>`);
}

function naming() {
  return shell('<section class="naming"><small>プレイヤー登録</small><h1>主人公の名前</h1><p>5周期後、この街を出る。</p><input id="nm" maxlength="12" placeholder="NAME"><button class="solid" data-name>登録して物語を始める</button></section>');
}

const PROLOGUE = [
  { pic: 'l1', kind: 'place', label: '雨路地 / 23:40', title: '五周期で街を出る', speaker: '語り', text: '依頼品を探す競売人になった。本物、修復品、偽物は、同じ売り文句と同じ顔で夜の競売へ並ぶ。' },
  { pic: 'p0', kind: 'face', label: '鑑定所', title: '売り文句より現物', speaker: '鑑定士 レイカ', text: '「話は作れる。でも素材の古さと修復の跡は消しきれない。聞いたことは、必ず現物と照らして」' },
  { pic: 'p3', kind: 'face', label: '競売会場の裏口', title: '値段は真価ではない', speaker: '仲介人 モーガン', text: '「誰か一人が欲しがれば、競りは壊れる。壇上へ上がる前に、自分の上限を決めておきな」' },
  { pic: 'l1', kind: 'place', label: '主人公の独白', title: '今夜の依頼', speaker: '', text: '依頼に合う品を見抜いて納める。無駄な競りを避け、五周期で純資産5,000 CRへ。まずは依頼を選ぼう。' },
];

function prologue() {
  const index = Math.max(0, Math.min(PROLOGUE.length - 1, s.prologue || 0));
  const frame = PROLOGUE[index];
  const speaker = frame.speaker || s.name;
  return shell(`<section class="prologue"><header><small>PROLOGUE ${index + 1}/${PROLOGUE.length}</small><h1>${frame.title}</h1></header><article>${img(frame.pic, frame.kind)}<div><small>${frame.label}</small><b>${esc(speaker)}</b><p>${frame.text}</p></div></article><footer><button class="line" data-prologue-skip>飛ばす</button><button class="solid" data-prologue-next>${index === PROLOGUE.length - 1 ? '依頼を選ぶ' : '次へ'}</button></footer></section>`);
}

function questScreen() {
  return shell(`<section class="quest"><header><small>依頼 / 第${s.cycle}周期</small><h1>依頼を選ぶ</h1><p>今回の個体を見抜き、条件に合う品を2点納める。</p></header><div>${QUESTS.map(quest => `<button data-quest="${quest.id}"><small>${quest.client}</small><h2>${quest.title}</h2><p>${quest.text}</p><dl><span>鑑定額 100%</span><span>達成追加 ${cr(quest.bonus)}</span></dl></button>`).join('')}</div></section>`);
}

function questProgress() {
  const quest = currentQuest();
  return quest ? s.held.filter(quest.match).length : 0;
}

function shop() {
  const remaining = Math.max(0, 2 - s.shopPurchases);
  const outcome = s.lastOutcome ? `<aside class="shop-result"><b>前品の結果</b><span>${esc(s.lastOutcome.item)} / ${esc(s.lastOutcome.winner)} ${cr(s.lastOutcome.price)}</span><small>見立て ${esc(s.lastOutcome.prediction || '未記録')} → ${esc(s.lastOutcome.verdict)}（${esc(s.lastOutcome.comparison || '照合なし')}）</small></aside>` : '';
  return shell(`<section class="shop"><header><small>探索中の強化店 / 今周期あと${remaining}回</small><h1>能力を強化する</h1><p>保管 ${s.held.length}点 / 依頼候補 ${questProgress()}/${currentQuest()?.need || 0}</p>${outcome}</header><div>${UPGRADES.map((upgrade, index) => {
    const level = s.upgrades[upgrade.id];
    const price = shopPrice(upgrade, level);
    const disabled = s.shopUsed || remaining === 0 || level >= 3 || s.cash < price;
    return `<button class="shop-card" data-buy="${upgrade.id}" ${disabled ? 'disabled' : ''}><span class="shopart shopart-${index}" aria-hidden="true"></span><small>強化段階 ${level} / 3</small><h2>${upgrade.name}</h2><b>${cr(price)}</b><p><strong>${upgrade.effect}</strong><br>${upgrade.detail}</p></button>`;
  }).join('')}</div><button class="line" data-shop-back>${s.shopReturn === 'post-auction' ? (s.round >= 9 ? '納品へ進む' : '次の品物へ進む') : '探索へ戻る'}</button></section>`);
}

function noteOrigin(clue) {
  if (clue.sourceId === 'self' || clue.who === '自分の観察') return '自分で確認';
  return PEOPLE.some(person => person.id === clue.sourceId || person.name === clue.who) ? '人物から聞いた' : '街・資料で調べた';
}

function explore() {
  const item = current();
  const source = s.focus ? sourceById(s.focus) : null;
  const topic = source && s.topic ? topicById(source.id, s.topic) : null;
  const tab = s.exploreTab || 'search';
  const mine = s.clues.filter(clue => clue.sourceId === 'self' || clue.who === '自分の観察');
  const heard = s.clues.filter(clue => clue.sourceId !== 'self' && clue.who !== '自分の観察');
  const pageCount = Math.max(1, Math.ceil(Math.max(mine.length, heard.length) / 3));
  const page = Math.min(s.notePage || 0, pageCount - 1);
  const cards = list => list.slice(page * 3, page * 3 + 3).map(clue => `<p class="note-card"><small>${noteOrigin(clue)} / ${esc(clue.who)} / ${esc(clue.label || '')}</small><span>${esc(clue.text)}</span></p>`).join('') || '<em>まだ記録はない。</em>';
  const usedCount = sourceId => s.usedTopics.filter(key => key.startsWith(`${sourceId}:`)).length;
  const sourceButtons = (list, kind) => list.map(entry => `<button data-focus="${entry.id}" class="${s.focus === entry.id ? 'on' : ''}">${img(entry.pic, kind)}<span><b>${entry.name}</b><small>${entry.role} / ${usedCount(entry.id)}/3${PEOPLE.includes(entry) ? ` / 会話 ${s.relations[entry.id]}` : ''}</small></span></button>`).join('');
  const cost = source ? sourceCost(source.id) : 1;
  const availableActions = s.actions + s.actionReserve;
  let methodBody = '<div class="method-empty">左から人物または場所を選んでください。</div>';
  let methodTitle = '調査先を選ぶ';
  if (source && !topic) {
    methodTitle = PEOPLE.includes(source) ? '何について聞く？' : '何を調べる？';
    methodBody = `<div class="topic-options">${TOPICS[source.id].map(option => {
      const used = s.usedTopics.includes(topicKey(source.id, option.id));
      return `<button data-topic="${option.id}" class="${used ? 'used' : ''}">${used ? '✓ ' : ''}${option.label}${used ? ' / 記録済み' : ''}</button>`;
    }).join('')}</div>`;
  } else if (source && topic) {
    methodTitle = topic.label;
    const reserveUse = Math.max(0, cost - s.actions);
    methodBody = `<div class="topic-confirm"><p>${topicPrompt(source, topic)}</p><button class="solid" data-confirm-topic ${availableActions < cost ? 'disabled' : ''}>${availableActions < cost ? `行動不足 / 必要${cost}` : `${PEOPLE.includes(source) ? 'もう一歩聞いて記録' : '詳しく調べて記録'} / ${reserveUse ? `予備${reserveUse}使用` : `行動${cost}`}`}</button><button class="line" data-cancel-topic>選び直す</button></div>`;
  }
  const itemHeader = `<header class="sceneview itemview ${tab === 'notes' ? 'info-itemview' : ''}">${art(item, 'large')}<div><small>${item.serial} / ${item.cat}</small><h1>${item.name}</h1><p class="item-desc">${item.desc}</p><small class="estimate">推定 ${item.range[0]}—${item.range[1]} CR</small></div></header>`;
  const sceneHeader = tab === 'search' && source
    ? `<header class="sceneview">${img(source.pic, source.pic.startsWith('l') ? 'place' : 'face')}<div><small>${source.role}</small><h1>${source.name}</h1><p>${topic ? topicPrompt(source, topic) : sourceIntro(source, item)}</p></div></header>`
    : itemHeader;
  return shell(`<section class="phase"><b>探索 / LOT ${s.round + 1}</b><span>行動 ${s.actions}　予備 ${s.actionReserve}　証拠 ${s.clues.length}件　保管 ${s.held.length}</span></section><section class="scene has-tabs ${tab === 'notes' ? 'info-mode' : ''}">${sceneHeader}<nav class="explore-tabs"><button data-explore-tab="search" class="${tab === 'search' ? 'on' : ''}">探索</button><button data-explore-tab="notes" class="${tab === 'notes' ? 'on' : ''}">情報 ${s.clues.length}</button></nav>${tab === 'search' ? `<div class="scenegrid"><section class="sources"><nav><b>人物</b></nav>${sourceButtons(PEOPLE, 'face')}<nav><b>街・資料</b></nav>${sourceButtons(PLACES, 'place')}</section><aside class="dialog investigate method-panel"><h2>${methodTitle}</h2><div class="method-status">${source ? `必要行動 ${cost} / 記録済み ${usedCount(source.id)}/3` : '人物4人・場所4か所'}</div><div class="method-body">${methodBody}</div><button class="line" data-recheck ${!s.will ? 'disabled' : ''}>自分で品物を確かめる / ${s.will}</button><button class="solid" data-auction ${s.clues.length < 2 ? 'disabled' : ''}>見立てを決める</button></aside></div>` : `<section class="notesboard"><article class="note-column self-notes"><header><small>自分の観察</small><h2>自分で確かめたこと</h2><b>${mine.length}件</b></header><div>${cards(mine)}</div><button class="line" data-recheck ${!s.will ? 'disabled' : ''}>もう一度確かめる / ${s.will}</button></article><article class="note-column source-notes"><header><small>証言・調査結果</small><h2>人物・街から得た情報</h2><b>${heard.length}件</b></header><div>${cards(heard)}</div></article><footer class="note-nav"><button data-note-page="-1" ${page === 0 ? 'disabled' : ''}>← 前</button><span>${page + 1} / ${pageCount}</span><button data-note-page="1" ${page >= pageCount - 1 ? 'disabled' : ''}>次 →</button><button class="solid" data-auction ${s.clues.length < 2 ? 'disabled' : ''}>見立てを決める</button></footer></section>`}</section>`);
}

const ASSESSMENTS = [
  { id: 'prime', label: '本物・状態良好', hint: '素材、来歴、状態が一続き' },
  { id: 'restored', label: '本物・修復あり', hint: '主要部は本物だが手が入った' },
  { id: 'forged', label: '偽物', hint: '別個体・複製・すり替え' },
];

function assessment() {
  const item = current();
  return shell(`<section class="assessment">${art(item, 'large')}<header><small>競売前の見立て / 証拠 ${s.clues.length}件</small><h1>${item.name}</h1><p>今回の個体をどう読む？ 鑑定後に答え合わせします。</p></header><div class="assessment-choices">${ASSESSMENTS.map(option => `<button data-assess="${option.id}" class="${s.assessment === option.id ? 'on' : ''}"><b>${option.label}</b><small>${option.hint}</small></button>`).join('')}</div><footer><button class="line" data-back-explore>情報へ戻る</button><button class="solid" data-enter-auction ${s.assessment ? '' : 'disabled'}>この見立てで競売へ</button></footer></section>`);
}

function funding() {
  const repayment = loanRepayment();
  return `<div class="funding"><b>最小入札まで資金が足りません</b><button data-pass>この品を見送る</button><button data-loan>借金 +300 / 返済${repayment}</button><button data-info ${s.infoSaleUsed ? 'disabled' : ''}>調査情報を売る +60 / 今周期1回</button><p>落札者予想：参加料30 / 的中100</p>${BIDDERS.map((bidder, index) => `<button data-predict="${index}" ${s.sideBetUsed || s.cash < 30 ? 'disabled' : ''}>${bidder.name}</button>`).join('')}</div>`;
}

function auction() {
  const item = current();
  const lead = s.leader === 3 ? 'あなた' : BIDDERS[s.leader].name;
  const cannotRaise = s.leader !== 3 && s.cash < s.bid + 10;
  const hot = s.hotRounds.includes(s.round);
  const mood = hot ? `${BIDDERS[hotBidder()].name}が開始前から品物を見続けている。` : '参加者は慎重だ。推定価値より手前で降りそうに見える。';
  const controls = cannotRaise ? funding() : `<div class="bid-controls"><button data-bid="10" ${s.leader === 3 || s.bid + 10 > s.cash ? 'disabled' : ''}>+10</button><button data-bid="50" ${s.leader === 3 || s.bid + 50 > s.cash ? 'disabled' : ''}>+50</button><button data-bid="100" ${s.leader === 3 || s.bid + 100 > s.cash ? 'disabled' : ''}>+100</button><button data-pass>${s.leader === 3 ? 'この価格で決める' : '見送る'}</button></div>`;
  const ticker = s.log.slice(-2).map(entry => `<span><b>${entry.who}</b> ${cr(entry.amount)}</span>`).join('<i>→</i>');
  return shell(`<section class="phase"><b>競売 / LOT ${s.round + 1}</b><span>最高入札 ${lead}</span></section><section class="auction"><article>${art(item)}<small>${item.cat}</small><h1>${item.name}</h1><p class="item-desc">${item.desc}</p><b>見立て：${VARIANTS[s.assessment]?.assessment || '未設定'} / 依頼 ${currentQuest().text}</b></article><section class="price"><span>現在価格</span><strong>${cr(s.bid)}</strong><p>${lead} が最高額</p><small>${mood}</small><div class="bid-ticker">${ticker}</div>${controls}</section><aside><h2>参加者</h2>${BIDDERS.map((bidder, index) => `<div class="bidder ${s.leader === index ? 'on' : ''}">${img(bidder.pic, 'face small')}<b>${bidder.name}</b><i>${hot && index === hotBidder() ? '執着している' : '様子を見ている'}</i></div>`).join('')}<div class="history">${s.log.slice(-5).reverse().map(entry => `<p><b>${entry.who}</b><span>${cr(entry.amount)}</span></p>`).join('')}</div></aside></section>`);
}

function resolution() {
  const result = s.resolution;
  if (!result) return auction();
  const item = current();
  const bids = result.bids?.length
    ? result.bids.map((entry, index) => `<p class="resolution-step" style="--delay:${index * 90}ms"><small>${esc(entry.action)}</small><b>${esc(entry.who)}</b><strong>${cr(entry.amount)}</strong></p>`).join('')
    : '<p class="resolution-step"><small>追加入札なし</small><b>現在の最高額を維持</b><strong>—</strong></p>';
  return shell(`<section class="resolution-screen"><article>${art(item, 'large')}<div><small>見送り / LOT ${s.round + 1}</small><h1>${item.name}</h1><p>${result.startWho} ${cr(result.startPrice)}から、残った参加者の入札を確認する。</p></div></article><section class="resolution-log"><header><small>最終入札の流れ</small><h2>誰が値を上げたか</h2></header><div>${bids}</div></section><aside><small>SOLD</small><h2>${esc(result.winner)}</h2><strong>${cr(result.price)}</strong><dl><div><dt>あなたの見立て</dt><dd>${esc(result.prediction)}</dd></div><div><dt>実際</dt><dd>${esc(result.verdict)}</dd></div><div><dt>照合</dt><dd>${esc(result.comparison)}</dd></div></dl>${result.notice ? `<p>${esc(result.notice)}</p>` : ''}</aside><button class="solid" data-resolution-next>${s.round >= 9 ? '結果を確認して納品へ' : '結果を確認して次の品物へ'}</button></section>`);
}

function appraisal() {
  const item = s.won;
  const result = assessmentComparison(item);
  const reasonAxis = item.variant === 'restored' ? 'condition' : item.variant === 'forged' ? 'provenance' : 'material';
  return shell(`<section class="appraisal">${art(item, 'large')}<small>鑑定結果</small><h1>${item.name}</h1><p class="item-desc">${item.desc}</p><div class="grade"><span>${item.auth} / ${item.condition}</span><b>${cr(worth(item))}</b></div><dl><div><dt>あなたの見立て</dt><dd>${VARIANTS[s.assessment]?.assessment || '未設定'}</dd></div><div><dt>照合</dt><dd>${result}</dd></div><div><dt>落札額</dt><dd>${cr(s.paid)}</dd></div></dl><p>決め手：${axisFact(item, reasonAxis)}</p><footer><button class="line" data-hold>保管して依頼候補にする</button><button class="solid" data-sell>鑑定額で売却 / ${cr(worth(item))}</button></footer></section>`);
}

function delivery() {
  const quest = currentQuest();
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(s.held.length / pageSize));
  const page = Math.min(s.inventoryPage || 0, pageCount - 1);
  const entries = s.held.map((item, index) => ({ item, index })).slice(page * pageSize, page * pageSize + pageSize);
  const inventory = entries.map(({ item, index }) => `<button data-select="${index}" class="${s.selected.includes(index) ? 'on' : ''}"><span>${item.cat}</span><b>${item.name}</b><small>${item.auth} / ${item.condition}</small></button>`).join('') || '<em>保管品なし</em>';
  const eligible = s.selected.map(index => s.held[index]).filter(Boolean).filter(quest.match).length;
  return shell(`<section class="delivery"><header><small>納品 / 第${s.cycle}周期</small><h1>${quest.title}</h1><p>${quest.text}</p></header><div class="inventory">${inventory}</div><aside><b>選択 ${s.selected.length}/${quest.need}</b><span>条件一致 ${eligible}</span><div class="inventory-nav"><button data-inventory-page="-1" ${page === 0 ? 'disabled' : ''}>←</button><small>${page + 1}/${pageCount}</small><button data-inventory-page="1" ${page >= pageCount - 1 ? 'disabled' : ''}>→</button></div><button class="solid" data-deliver ${s.selected.length === quest.need ? '' : 'disabled'}>納品を決定</button></aside></section>`);
}

function report() {
  const ending = s.ending;
  const payout = ending.payout ?? ending.reward ?? 0;
  return shell(`<section class="report"><small>周期結果</small><h1>${ending.ok ? '依頼達成' : '依頼未達'}</h1><p>${ending.text}</p><div><span>品物の鑑定額</span><b>${cr(ending.appraisalValue || 0)}</b><span>達成追加</span><b>${cr(ending.bonus || 0)}</b><span>受取合計</span><b>${cr(payout)}</b><span>持越金</span><b>${cr(s.cash)}</b><span>借金</span><b>${cr(s.debt)}</b></div><button class="solid" data-next>${s.cycle % 5 === 0 ? '章の結果へ' : '次の依頼'}</button></section>`);
}

function finale() {
  const net = netWorth();
  const chapter = chapterNumber();
  const goal = chapterGoal();
  const win = net >= goal && s.debt === 0;
  const heldValue = s.held.reduce((sum, item) => sum + worth(item), 0);
  return shell(`<section class="report"><small>第${chapter}章 / 第${s.cycle}周期</small><h1>${win ? '脱出権を確保' : '街に残る'}</h1><p>${win ? '今なら街を出られる。それでも競売記録は続けられる。' : '目標には届かなかった。次章で巻き返せる。'}</p><div><span>純資産</span><b>${cr(net)}</b><span>章目標</span><b>${cr(goal)}</b><span>保管品</span><b>${cr(heldValue)}</b><span>借金</span><b>${cr(s.debt)}</b></div><button class="solid" data-continue-campaign>次の章へ</button><a class="line" href="/start-v30.html?new=1">ここで終了</a></section>`);
}

function render() {
  const views = { title, name: naming, prologue, quest: questScreen, shop, explore, assessment, auction, resolution, appraisal, delivery, report, finale };
  app.innerHTML = (views[s.screen] || title)();
}

function startQuest(questId) {
  const hotRounds = shuffle([...Array(10).keys()]).slice(0, 2);
  Object.assign(s, {
    questId,
    lots: generateLots(),
    round: 0,
    actions: actionCapacity(),
    actionReserve: actionReserveCapacity(),
    will: selfCheckCapacity(),
    time: 0,
    lastPlace: null,
    clues: [], focus: null, topic: null, assessment: null,
    bid: 60, leader: 1, log: [{ who: BIDDERS[1].name, amount: 60 }],
    selected: [], hotRounds, usedTopics: [], exploreTab: 'search', notePage: 0,
    inventoryPage: 0, shopUsed: false, shopPurchases: 0, shopReturn: 'explore', sideBetUsed: false, infoSaleUsed: false,
    lastOutcome: null, resolution: null, screen: 'explore',
  });
  save();
  render();
}

function prepareNextLot() {
  s.round += 1;
  if (s.round >= 10) {
    s.screen = 'delivery';
    s.selected = [];
    s.inventoryPage = 0;
  } else {
    Object.assign(s, {
      screen: 'explore', actions: actionCapacity(), will: selfCheckCapacity(),
      time: 0, clues: [], focus: null, topic: null, assessment: null,
      bid: 60 + s.round * 10, leader: s.round % 3,
      log: [{ who: BIDDERS[s.round % 3].name, amount: 60 + s.round * 10 }],
      usedTopics: [], exploreTab: 'search', notePage: 0, shopUsed: false, shopReturn: 'explore',
      won: null, paid: 0,
    });
  }
  save();
  render();
}

function openPostAuction(outcome) {
  if (outcome) {
    const { bids, startWho, startPrice, notice, ...summary } = outcome;
    s.lastOutcome = summary;
  }
  s.resolution = null;
  prepareNextLot();
}

function npcOutcome() {
  const item = current();
  const ranked = BIDDERS.map((bidder, index) => ({ index, name: bidder.name, limit: npcLimit(index, item) })).sort((a, b) => b.limit - a.limit);
  const winner = ranked[0];
  const runner = ranked[1];
  const hammer = Math.max(s.bid, Math.min(winner.limit, runner.limit + 20));
  const bids = [];
  const runnerBid = Math.min(runner.limit, hammer - 20);
  if (runnerBid > s.bid) bids.push({ who: runner.name, amount: runnerBid, action: '上限近くまで追う' });
  if (hammer > s.bid || s.leader !== winner.index) bids.push({ who: winner.name, amount: hammer, action: '最後に値を上げる' });
  if (!bids.length) bids.push({ who: winner.name, amount: hammer, action: '最高額を維持' });
  return {
    ...outcomeRecord(item, winner.name, hammer),
    startWho: s.leader === 3 ? 'あなた' : BIDDERS[s.leader].name,
    startPrice: s.bid,
    bids,
  };
}

function openResolution(outcome, notice = '') {
  s.resolution = { ...outcome, notice };
  s.screen = 'resolution';
  save();
  render();
}

function settlePlayerWin() {
  if (s.cash < s.bid) return;
  s.cash -= s.bid;
  s.won = current();
  s.paid = s.bid;
  s.screen = 'appraisal';
  save();
  render();
}

function repayDebt() {
  const payment = Math.min(s.cash, s.debt);
  s.cash -= payment;
  s.debt -= payment;
}

function setFlash(message, duration = 650) {
  s.flash = message;
  render();
  setTimeout(() => {
    if (s.flash === message) {
      s.flash = '';
      render();
    }
  }, duration);
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  event.preventDefault();

  if (button.dataset.help !== undefined || button.dataset.openTutorial !== undefined) {
    s.overlay = true;
    s.tutorial = 0;
    render();
    return;
  }
  if (button.dataset.close !== undefined) {
    s.overlay = false;
    render();
    return;
  }
  if (button.dataset.tut) {
    s.tutorial = Math.max(0, Math.min(helpPages.length - 1, s.tutorial + Number(button.dataset.tut)));
    render();
    return;
  }
  if (button.dataset.save !== undefined) {
    save();
    setFlash('保存しました', 500);
    return;
  }
  if (button.dataset.reset !== undefined) {
    if (!s.resetArmed) {
      s.resetArmed = true;
      render();
      setTimeout(() => {
        if (!s.resetArmed) return;
        s.resetArmed = false;
        render();
      }, 3000);
      return;
    }
    try {
      localStorage.removeItem(SAVE);
      LEGACY_SAVES.forEach(key => localStorage.removeItem(key));
    } catch {}
    s = { ...fresh(), screen: location.pathname.includes('start') ? 'name' : 'title' };
    render();
    return;
  }
  if (button.dataset.load !== undefined) {
    s = readSave() || { ...fresh(), screen: 'name' };
    render();
    return;
  }
  if (button.dataset.name !== undefined) {
    const input = document.querySelector('#nm');
    const name = input?.value.trim().slice(0, 12);
    if (name) {
      s.name = name;
      s.screen = 'prologue';
      s.prologue = 0;
      s.overlay = false;
      save();
      render();
    }
    return;
  }
  if (button.dataset.prologueNext !== undefined || button.dataset.prologueSkip !== undefined) {
    const finished = button.dataset.prologueSkip !== undefined || s.prologue >= PROLOGUE.length - 1;
    if (finished) {
      s.screen = 'quest';
      s.overlay = true;
      s.tutorial = 0;
    } else {
      s.prologue += 1;
    }
    save();
    render();
    return;
  }
  if (button.dataset.quest) {
    startQuest(button.dataset.quest);
    return;
  }
  if (button.dataset.focus) {
    s.focus = button.dataset.focus;
    s.topic = null;
    s.exploreTab = 'search';
    render();
    return;
  }
  if (button.dataset.topic) {
    const key = topicKey(s.focus, button.dataset.topic);
    if (s.usedTopics.includes(key)) {
      const index = s.clues.findIndex(clue => clue.sourceId === s.focus && clue.topicId === button.dataset.topic);
      s.exploreTab = 'notes';
      s.notePage = Math.max(0, Math.floor(Math.max(0, index) / 3));
      render();
      return;
    }
    s.topic = button.dataset.topic;
    render();
    return;
  }
  if (button.dataset.cancelTopic !== undefined) {
    s.topic = null;
    render();
    return;
  }
  if (button.dataset.confirmTopic !== undefined) {
    const source = sourceById(s.focus);
    const topic = topicById(s.focus, s.topic);
    const cost = sourceCost(s.focus);
    if (!source || !topic || s.actions + s.actionReserve < cost) return;
    const regularUse = Math.min(s.actions, cost);
    s.actions -= regularUse;
    s.actionReserve -= cost - regularUse;
    s.time += 1;
    if (PLACES.includes(source)) s.lastPlace = source.id;
    s.clues.push({
      sourceId: source.id,
      topicId: topic.id,
      who: source.name,
      label: topic.label,
      text: evidenceText(source.id, topic, current()),
    });
    s.usedTopics.push(topicKey(source.id, topic.id));
    if (PEOPLE.includes(source)) s.relations[source.id] = Math.min(5, s.relations[source.id] + 1);
    s.topic = null;
    s.exploreTab = 'notes';
    s.notePage = Math.max(0, Math.ceil(Math.max(
      s.clues.filter(clue => clue.sourceId === 'self').length,
      s.clues.filter(clue => clue.sourceId !== 'self').length,
    ) / 3) - 1);
    save();
    render();
    return;
  }
  if (button.dataset.recheck !== undefined) {
    if (s.will <= 0) return;
    s.will -= 1;
    s.clues.push(selfCheck(current()));
    s.exploreTab = 'notes';
    s.notePage = Math.max(0, Math.ceil(Math.max(
      s.clues.filter(clue => clue.sourceId === 'self').length,
      s.clues.filter(clue => clue.sourceId !== 'self').length,
    ) / 3) - 1);
    save();
    render();
    return;
  }
  if (button.dataset.exploreTab) {
    s.exploreTab = button.dataset.exploreTab;
    s.notePage = 0;
    render();
    return;
  }
  if (button.dataset.openShop !== undefined) {
    s.shopReturn = 'explore';
    s.screen = 'shop';
    save();
    render();
    return;
  }
  if (button.dataset.notePage) {
    s.notePage = Math.max(0, s.notePage + Number(button.dataset.notePage));
    render();
    return;
  }
  if (button.dataset.auction !== undefined) {
    s.screen = 'assessment';
    render();
    return;
  }
  if (button.dataset.assess) {
    s.assessment = button.dataset.assess;
    render();
    return;
  }
  if (button.dataset.backExplore !== undefined) {
    s.screen = 'explore';
    s.exploreTab = 'notes';
    render();
    return;
  }
  if (button.dataset.enterAuction !== undefined) {
    if (!s.assessment) return;
    s.screen = 'auction';
    save();
    render();
    return;
  }
  if (button.dataset.bid !== undefined) {
    if (s.leader === 3) return;
    const offer = s.bid + Number(button.dataset.bid);
    if (offer > s.cash) return;
    const item = current();
    s.bid = offer;
    s.leader = 3;
    s.log.push({ who: 'あなた', amount: offer });
    const candidates = BIDDERS.map((bidder, index) => ({ index, limit: npcLimit(index, item) }))
      .filter(candidate => candidate.limit >= offer + 10)
      .sort((a, b) => b.limit - a.limit);
    if (candidates.length) {
      const rival = candidates[0];
      const hot = s.hotRounds.includes(s.round) && rival.index === hotBidder();
      const step = hot && offer > item.claimValue * .7 ? 50 : 20;
      s.bid = Math.min(rival.limit, offer + step);
      s.leader = rival.index;
      s.log.push({ who: BIDDERS[rival.index].name, amount: s.bid });
    }
    save();
    render();
    return;
  }
  if (button.dataset.pass !== undefined) {
    if (s.leader === 3) settlePlayerWin();
    else openResolution(npcOutcome());
    return;
  }
  if (button.dataset.loan !== undefined) {
    s.cash += 300;
    s.debt += loanRepayment();
    save();
    render();
    return;
  }
  if (button.dataset.predict !== undefined) {
    if (s.sideBetUsed || s.cash < 30) return;
    s.cash -= 30;
    s.sideBetUsed = true;
    const pick = Number(button.dataset.predict);
    const winner = BIDDERS.map((bidder, index) => ({ index, limit: npcLimit(index, current()) }))
      .sort((a, b) => b.limit - a.limit)[0].index;
    if (pick === winner) {
      s.cash += 100;
      openResolution(npcOutcome(), '落札者予想 的中 / 収支 +70 CR');
    } else {
      openResolution(npcOutcome(), '落札者予想 はずれ / 収支 -30 CR');
    }
    return;
  }
  if (button.dataset.info !== undefined) {
    if (s.infoSaleUsed) return;
    s.infoSaleUsed = true;
    s.cash += 60;
    s.clues = [];
    openResolution(npcOutcome(), '調査情報を売却 / +60 CR');
    return;
  }
  if (button.dataset.resolutionNext !== undefined) {
    openPostAuction(s.resolution);
    return;
  }
  if (button.dataset.hold !== undefined) {
    s.held.push(s.won);
    openPostAuction(outcomeRecord(s.won, 'あなた', s.paid));
    return;
  }
  if (button.dataset.sell !== undefined) {
    s.cash += worth(s.won);
    openPostAuction(outcomeRecord(s.won, 'あなた', s.paid));
    return;
  }
  if (button.dataset.buy) {
    const upgrade = UPGRADES.find(entry => entry.id === button.dataset.buy);
    const level = s.upgrades[upgrade.id];
    const price = shopPrice(upgrade, level);
    if (!s.shopUsed && s.shopPurchases < 2 && level < 3 && s.cash >= price) {
      s.cash -= price;
      s.upgrades[upgrade.id] += 1;
      if (upgrade.id === 'stamina') s.actionReserve += 2;
      s.shopUsed = true;
      s.shopPurchases += 1;
      save();
      setFlash(`${upgrade.name}を購入`, 550);
    }
    return;
  }
  if (button.dataset.shopBack !== undefined) {
    if (s.shopReturn === 'post-auction') prepareNextLot();
    else {
      s.screen = 'explore';
      save();
      render();
    }
    return;
  }
  if (button.dataset.inventoryPage) {
    s.inventoryPage = Math.max(0, s.inventoryPage + Number(button.dataset.inventoryPage));
    render();
    return;
  }
  if (button.dataset.select !== undefined) {
    const index = Number(button.dataset.select);
    const selectedAt = s.selected.indexOf(index);
    if (selectedAt >= 0) s.selected.splice(selectedAt, 1);
    else if (s.selected.length < currentQuest().need) s.selected.push(index);
    else setFlash(`納品は${currentQuest().need}点まで`, 650);
    render();
    return;
  }
  if (button.dataset.deliver !== undefined) {
    const quest = currentQuest();
    const chosenEntries = [...new Set(s.selected)]
      .map(index => ({ index, item: s.held[index] }))
      .filter(entry => entry.item);
    const ok = chosenEntries.length === quest.need && chosenEntries.every(entry => quest.match(entry.item));
    const appraisalValue = ok ? chosenEntries.reduce((sum, entry) => sum + worth(entry.item), 0) : 0;
    const bonus = ok ? quest.bonus : 0;
    const payout = appraisalValue + bonus;
    if (ok) {
      s.cash += payout;
      const delivered = new Set(chosenEntries.map(entry => entry.index));
      s.held = s.held.filter((item, index) => !delivered.has(index));
    }
    s.ending = {
      ok,
      appraisalValue,
      bonus,
      payout,
      text: ok ? `${quest.client}との取引が成立した。鑑定額と達成追加を受け取った。` : '条件不一致。品物は返却され、支払いは発生しなかった。',
    };
    s.screen = 'report';
    save();
    render();
    return;
  }
  if (button.dataset.next !== undefined) {
    repayDebt();
    if (s.cycle % 5 === 0) s.screen = 'finale';
    else {
      s.cycle += 1;
      s.questId = null;
      s.screen = 'quest';
    }
    save();
    render();
    return;
  }
  if (button.dataset.continueCampaign !== undefined) {
    s.cycle += 1;
    s.questId = null;
    s.screen = 'quest';
    save();
    render();
  }
});

render();

