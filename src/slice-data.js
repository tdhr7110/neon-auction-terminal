export const CONTENT_VERSION = 'gray-rain-1';

export const CONDITION_LABELS = {
  prime: '本物・状態良好',
  restored: '修復された本物',
  forged: '偽物',
};

export const CONFIDENCE_LABELS = {
  low: 'まだ迷いがある',
  medium: '根拠がある',
  high: 'かなり確信している',
};

export const QUEST = {
  id: 'gray-rain-relics',
  client: '市史蒐集院／ユウナ',
  title: '灰雨避難記録',
  need: 2,
  bonus: 320,
  categories: ['RELIC'],
  incidentId: 'gray-rain',
  acceptedConditions: ['prime', 'restored'],
  text: '灰雨避難事件の一次物証にあたるRELICを2点。修復された品も受領する。DATA / ARTは事件に関係していても対象外。',
  hint: '真贋と分類は別に確認する。RELICでも偽物は不可、DATAは本物でも不可。',
};

export const SOURCES = {
  reika: { id: 'reika', name: '鑑定士 レイカ', role: '材質と状態を読む', pic: 'p0', kind: 'face' },
  goro: { id: 'goro', name: '運び屋 ゴロウ', role: '輸送順を覚えている', pic: 'p1', kind: 'face' },
  vera: { id: 'vera', name: '収集家 ヴェラ', role: '事件RELICを集める', pic: 'p2', kind: 'face' },
  morgan: { id: 'morgan', name: '仲介人 モーガン', role: '相場と港の来歴を知る', pic: 'p3', kind: 'face' },
  anon09: { id: 'anon09', name: '匿名客09', role: '事件の細部を知りすぎている', pic: 'anon', kind: 'face' },
  archive: { id: 'archive', name: '旧市資料庫', role: '公的記録を照合する', pic: 'l0', kind: 'place' },
  market: { id: 'market', name: '雨路地の市場', role: '複製品と相場を調べる', pic: 'l1', kind: 'place' },
  network: { id: 'network', name: '公共ネット端末', role: '押収記録を検索する', pic: 'l2', kind: 'place' },
  warehouse: { id: 'warehouse', name: '第七码頭倉庫', role: '荷札と梱包を調べる', pic: 'l3', kind: 'place' },
};

export const NPCS = [
  {
    id: 'vera', name: 'ヴェラ', pic: 'p2', budget: 980,
    wants: 'RELIC / ART。失われた駅員の記録を集める。',
    history: '灰雨避難事件で記録を失った駅員の娘。',
    knows: '発券台帳と事件RELICの市場流通。',
    hides: '家族が最終列車へ乗った事実。',
    vagueWhen: '事件RELICが安い間は希少性を低く語る。',
    tell: '知らないはずの台帳番号を口にし、+20を重ねて上限前で止まる。',
    style: 'steady',
  },
  {
    id: 'morgan', name: 'モーガン', pic: 'p3', budget: 900,
    wants: '再販益。安く買える品だけを追う。',
    history: '事件当夜、第七码頭の輸送記録を扱った仲介人。',
    knows: '市場価格と港へ届いた正確な分刻み時刻。',
    hides: '封鎖後も荷が動いた第七码頭の経路。',
    vagueWhen: '来歴が第七码頭へ届くと、受渡しを一件省く。',
    tell: '常に最小幅で上げ、再販余地が消えた瞬間に降りる。',
    style: 'cautious',
  },
  {
    id: 'anon09', name: '匿名客09', pic: 'anon', budget: 1050,
    wants: 'N-13、A-17、K-6。転売以外の理由で回収する。',
    history: '身元不明。最終構内放送と同じ六音を口ずさむ。',
    knows: '公開されていない音数、採取番号、鍵の符号。',
    hides: '人格N-13との個人的な関係。',
    vagueWhen: '人格・雨・門の情報源を「公開資料」とだけ言う。',
    tell: '対象品では一度だけ+50し、指で0・1・3を叩く。',
    style: 'burst',
  },
];

const evidence = (id, category, sourceId, title, text, relationKey, relation, exchange, prompt) => ({
  id, category, sourceId, title, text, relationKey, relation, exchange, prompt,
});

export const LOTS = [
  {
    id: 'last-ticket', serial: 'R17-042', name: '旧地下鉄の最終切符', categories: ['RELIC'], incidentId: 'gray-rain',
    condition: 'prime', value: 440, estimate: [260, 560], openingBid: 80, sprite: [0, 1],
    description: '旧東京駅の最終運行日に使われたとされる一枚。油染みと赤い環状印が残る。',
    timeline: '00:03 搬入／00:07 改札',
    misread: '同じ環状印を持つ記念刷りが流通し、発券台帳の返納欄も欠けている。',
    appraisal: '印が麻繊維の奥まで入り、搬入番号と改札時の摩耗が一続き。記念刷り特有の反転もない。',
    reasonEvidence: ['T1', 'T3', 'T4'],
    evidence: [
      evidence('T1', '物証', 'reika', '紙と改札印', '赤い環状印は麻繊維の奥まで入り、切断面には気象塔で使われた青い硝子粉が残る。', 'ticket-route', 'match', ['レイカ「印より先に紙が古い。問題は、この紙がどこを通ったかね」', '裏から光を通す。印と繊維の境目はなく、表面だけを古くした跡もない。'], '紙の繊維と印の順番を見る'),
      evidence('T3', '来歴', 'archive', '発券台帳 7-119', '00:03に旧東京駅へ搬入。042番だけ返納欄が空白で、記録はそこで途切れる。', 'ticket-ledger', 'match', ['資料庫端末に返納済みの束が並ぶ。ひとつだけ空欄がある。', '搬入欄は7-119、個体番号は042。売り手の番号と同じだ。'], '発券台帳の搬入と返納を照合する'),
      evidence('T4', '証言', 'vera', 'ヴェラの記憶', '「7-119は駅へ届かなかった記念刷りよ。運行用は7-118まで」――彼女はまだ見せていない台帳番号を口にした。', 'ticket-ledger', 'conflict', ['ヴェラ「環状印だけで熱くならないことね。記念刷りはいくらでもある」', '台帳を伏せたまま番号を尋ねると、彼女は7-119と即答した。'], 'ヴェラが知る発券番号を聞く'),
    ],
    deepEvidence: evidence('T5', '市場情報', 'market', '記念刷りの版', '市場の記念刷りは駅名の一字が左右反転する。新聞写真と今回の印は同じ向き。', 'ticket-route', 'match', ['走査結果', '市場で押収された版と新聞写真を重ねる。反転の有無が分かれた。'], '印刷版の向きを比較する'),
    npc: {
      vera: { evaluation: 410, obsession: 1.12, reason: '父の台帳番号につながる切符として収集したい。', tell: '番号を否定しながら、品物から目を離さない。' },
      morgan: { evaluation: 400, obsession: 0.80, reason: '再販できるが、利益が薄くなれば即座に降りる。', tell: '値幅を最小に保ち、手元の相場表を閉じかけている。' },
      anon09: { evaluation: 380, obsession: 1.00, reason: '最終列車との関係は見るが、人格データほど優先しない。', tell: '打刻孔を一度数え、静かに席へ戻る。' },
    },
  },
  {
    id: 'persona-backup', serial: 'N13-6C2', name: '非合法人格バックアップ', categories: ['DATA', 'ILLEGAL'], incidentId: 'gray-rain',
    condition: 'prime', value: 780, estimate: [390, 900], openingBid: 120, sprite: [1, 1],
    description: '死亡登録済みの人格N-13。末尾には、六音の子守歌と構内放送の残響がある。',
    timeline: '00:13 最終構内放送',
    misread: '人格番号とヘッダは複写できる。違法データであること自体は由来を保証しない。',
    appraisal: '番号ではなく、全人格区間の神経署名、経年誤差、病院固有の検査値が同時に続く。',
    reasonEvidence: ['B1', 'B3', 'B4'],
    evidence: [
      evidence('B1', '状態', 'reika', '神経署名の連続', 'N-13の署名はヘッダだけでなく、感情応答の揺らぎと末尾の歌まで途切れず続く。', 'persona-origin', 'match', ['レイカ「名前の札は貼り替えられる。中の揺らぎを見る」', '読み取り専用で走査する。反応の癖は区間ごとに少しずつ老化している。'], '人格区間を読み取り専用で走査する'),
      evidence('B3', '来歴', 'network', '病院の押収目録', '長さ4分12秒、末尾検査値6C2の記録が一件ある。歌の音数は公開欄にない。', 'persona-secret', 'match', ['端末は押収目録の公開欄と封鎖欄を分けて表示する。', '公開欄には長さと検査値だけ。音声内容は黒塗りだ。'], '北塔病院の押収目録を検索する'),
      evidence('B4', '証言', 'anon09', '匿名客の六音', '「資料にあるのは六音の歌だ。最後の一音は欠けている」――公開目録には音数の記載がない。', 'persona-secret', 'conflict', ['匿名客09「そのデータは壊れている。資料にもそうある」', 'どの資料か問うと、彼は六音目だけを小さく口ずさんだ。'], '匿名客09の情報源を確かめる'),
    ],
    deepEvidence: evidence('B5', '物証', 'network', '病院固有の応答', '隔離端末で「A-17」と入力すると、校正記録と同じ0.8秒の沈黙と語順の入れ替わりを返す。', 'persona-origin', 'match', ['走査結果', '公開されていない病院の校正語へ、記録どおりの遅延で応答した。'], '校正語への応答を比較する'),
    npc: {
      vera: { evaluation: 350, obsession: 0.70, reason: '分類外で収集方針から外れ、深追いしない。', tell: 'DATAと表示された時点で台帳を閉じた。' },
      morgan: { evaluation: 690, obsession: 0.86, reason: '違法市場で再販益が見込める範囲だけ追う。', tell: '買い手候補の数を指で数え、上げ幅は常に小さい。' },
      anon09: { evaluation: 560, obsession: 1.25, reason: 'N-13を市場から消すことが目的。採算を超えて追う。', tell: '六音を口ずさみ、一度だけ大きく値を跳ねさせる。' },
    },
  },
  {
    id: 'rain-specimen', serial: 'A17-R3', name: '雨の標本', categories: ['RELIC'], incidentId: 'gray-rain',
    condition: 'restored', value: 310, estimate: [170, 470], openingBid: 70, sprite: [4, 1],
    description: '旧気象塔で採取された最後の雨。瓶底に三層の煤、口元に新しい青糸がある。',
    timeline: '23:48 採取',
    misread: '青い糸と封の一部が新しく、外見だけでは瓶ごとの入れ替えにも見える。',
    appraisal: '瓶と三層の堆積物は採取記録へ続く一方、蓋と糸だけが後年の安定化処置と一致する。',
    reasonEvidence: ['R1', 'R2', 'R3'],
    evidence: [
      evidence('R1', '物証', 'reika', '三層の煤', '煤の各層に、旧気象塔フィルター由来のチタン片が深さを変えて混じる。', 'rain-vessel', 'match', ['レイカ「瓶を振らないで。層が残っていること自体が記録になる」', '側面から照らすと三層は崩れず、異なる深さに同じチタン片が見える。'], '瓶を動かさず堆積層を見る'),
      evidence('R2', '状態', 'market', '封の時間差', '瓶の亀裂は古いが、青糸の染料は封蝋より新しい。瓶口だけに再加熱の跡がある。', 'rain-seal', 'conflict', ['市場の修理屋「糸だけなら交換できる。中身まで替えたかは別の話だ」', '封蝋と糸を別々の波長で見る。退色の年代が揃わない。'], '封蝋と青糸の年代を比べる'),
      evidence('R3', '来歴', 'archive', '資料写真 A-17', '写真の瓶底の欠けと三層の高さは一致する。ただし当時の封印糸は灰色。', 'rain-seal', 'match', ['資料写真は荒いが、瓶底の欠けだけははっきり残る。', '輪郭を重ねると瓶は一致し、糸の色だけが違う。'], '採取写真と瓶の輪郭を重ねる'),
    ],
    deepEvidence: evidence('R5', '市場情報', 'archive', '修復工房台帳', '「A-17、瓶口を安定化。蓋と糸を交換。内容物は動かさない」と記録されている。', 'rain-vessel', 'match', ['走査結果', '薄い筆圧の工房記録が、採取番号A-17へつながった。'], '欠落した工房台帳を復元する'),
    npc: {
      vera: { evaluation: 300, obsession: 1.10, reason: '事件RELICだが、修復歴を読んで価格は抑える。', tell: '青糸を否定しつつ、採取番号を手帳へ写す。' },
      morgan: { evaluation: 290, obsession: 0.75, reason: '修復品の再販余地が薄く、早めに降りる。', tell: '封の新しさを見て、上げ幅を最小にする。' },
      anon09: { evaluation: 300, obsession: 1.20, reason: 'A-17を人格N-13と結ぶため、採算より回収を優先。', tell: '青糸を見た瞬間、指で0・1・3を叩く。' },
    },
  },
  {
    id: 'summer-memory', serial: 'MEM-1987', name: '人工記憶「夏、1987」', categories: ['DATA', 'ART'], incidentId: 'gray-rain',
    condition: 'forged', value: 120, estimate: [180, 520], openingBid: 60, sprite: [3, 0],
    description: '七秒の雨音から始まる人工記憶。同題作品の記録はあるが、収録者名は欠落している。',
    timeline: '事件後に流通',
    misread: '題名と七秒の雨音は当時の展覧会記録に実在する。',
    appraisal: '題名だけは古いが、媒体の安定剤、収録形式、反復ノイズは後年に組み上げた同一データを示す。',
    reasonEvidence: ['M1', 'M3', 'M4'],
    evidence: [
      evidence('M1', '物証', 'reika', '記憶膜の安定剤', '琥珀色の膜には、題名が発表された五年後から使われた安定剤が含まれる。', 'memory-era', 'conflict', ['レイカ「題名の年代と、器の年代を分けて考える」', '非接触走査で安定剤の配合を読む。作品発表年とは重ならない。'], '記憶膜の材料年代を測る'),
      evidence('M3', '来歴', 'archive', '1987年の展覧会図録', '同題作品はあるが、形式欄は「文字と環境音」。神経収録番号は記載されていない。', 'memory-era', 'match', ['図録には「夏、1987」の文字と会場スピーカーの配置図がある。', '媒体欄に神経記憶はなく、個人へ譲渡した記録もない。'], '同題作品の形式を図録で確認する'),
      evidence('M4', '証言', 'vera', '存在しない画廊', '「作者はその夜、私設画廊で神経版も作った」――挙げた画廊の開業は三年後。', 'memory-era', 'conflict', ['ヴェラ「図録にない版もある。私は作者の画廊を知っているわ」', '画廊名を記録と照合すると、1987年にはまだ建物すらない。'], 'ヴェラが語る私設版の場所を聞く'),
    ],
    deepEvidence: evidence('M5', '市場情報', 'network', '三件の同一フレーム', '別々の所有者を名乗る三記録が、441フレーム目の躊躇と書込時刻の並びまで一致する。', 'memory-copy', 'match', ['走査結果', '三つの売買記録を波形で重ねると、編集の継ぎ目まで同じだった。'], '過去の出品データを波形照合する'),
    npc: {
      vera: { evaluation: 260, obsession: 1.15, reason: 'ARTとして欲しがるが、存在しない画廊の話で相場を作ろうとする。', tell: '作者名ではなく、自分の語った来歴だけを繰り返す。' },
      morgan: { evaluation: 190, obsession: 0.65, reason: '複製疑惑が強く、短期転売できる価格までしか出さない。', tell: '開始直後から出口を見ている。' },
      anon09: { evaluation: 200, obsession: 0.90, reason: '雨音には反応するが、N-13とのつながりを感じず慎重。', tell: '七秒を聞き終える前に指を止める。' },
    },
  },
  {
    id: 'district-zero-key', serial: 'K6-058', name: '第零区の物理鍵', categories: ['RELIC'], incidentId: 'gray-rain',
    condition: 'prime', value: 640, estimate: [360, 820], openingBid: 100, sprite: [2, 0],
    description: '封鎖区の手動門K-6に使われたとされる合金鍵。三番目の歯だけ片側へ削れている。',
    timeline: '23:51 手動門を解錠',
    misread: '零刻印だけ研磨が新しく、古い合金片から作った展示用鍵にも見える。',
    appraisal: '合金だけでなく、錠前方向の摩耗と0.6mmの現場加工が保守記録へつながる。',
    reasonEvidence: ['K1', 'K3', 'K4'],
    evidence: [
      evidence('K1', '物証', 'reika', '合金と摩耗', '黒鉛を混ぜた合金比率は旧式錠前ピンと一致し、歯三の酸化は削れた谷まで続く。', 'key-use', 'match', ['レイカ「古い合金を使うだけならできる。摩耗の向きまで見る」', '鍵歯を拡大する。時計回りの圧痕は表面処理の下まで達している。'], '合金比率と鍵歯の摩耗を見る'),
      evidence('K3', '来歴', 'archive', '23:51の保守記録', '「手動門K-6、歯三を0.6mm削る」。今回の左右差は0.58mm。', 'key-time', 'match', ['保守記録は公式封鎖時刻の二十一分後にも続いている。', 'K-6の欄だけ手書き。削り量と担当者印が残る。'], '手動門K-6の保守記録を照合する'),
      evidence('K4', '証言', 'morgan', 'モーガンの搬出時刻', '「中央保管庫へ移ったのは日付が変わってからだ」――彼の控えの搬出欄は23:56。', 'key-time', 'conflict', ['モーガン「港へ来たのは翌日だ。封鎖の夜とは関係ない」', '分刻みの控えを見せるよう迫る。23:56の数字だけ指で隠した。'], '第七码頭へ届いた時刻を聞く'),
    ],
    deepEvidence: evidence('K5', '市場情報', 'warehouse', '押収された刻印型', '複製型は歯を左右対称に作る。今回の鍵にはK-6記録と同じ片側0.58mmの削りがある。', 'key-use', 'match', ['走査結果', '倉庫の複製型と三次元輪郭を重ねる。片側の削りだけは型に存在しない。'], '押収された複製型と輪郭を比べる'),
    npc: {
      vera: { evaluation: 480, obsession: 1.10, reason: '最終列車の乗客が通った門を探すため回収したい。', tell: '鍵ではなく、歯三の削りだけを見ている。' },
      morgan: { evaluation: 520, obsession: 0.85, reason: '高値転売できるが、港の記録が露見する前に競りを終えたい。', tell: '時刻を曖昧にしながら、最小幅で追う。' },
      anon09: { evaluation: 460, obsession: 1.20, reason: 'N-13が開けた門の位置を知るため、採算外でも追う。', tell: '歯三を見て、指で0・1・3を叩く。' },
    },
  },
];

export const UPGRADES = [
  { id: 'lens', name: '照合レンズ', price: 220, effect: '証拠ボードで、未照合の組を一つ示す。', detail: '答えは表示しない。次に確かめる相手だけ分かる。', sprite: 0 },
  { id: 'stamina', name: '予備行動薬', price: 280, effect: '今周期の各LOTで調査行動を1回追加。', detail: '情報は増えるが、依頼品へ残す現金は減る。', sprite: 2 },
  { id: 'market', name: '相場照合端末', price: 240, effect: '競合の状態ラベルを一段詳しくする。', detail: '上限額そのものは分からない。', sprite: 1 },
];

export const INTRO = [
  { pic: 'l1', kind: 'place', label: '雨路地 / 残り5周期', title: '街を出る期限', speaker: '語り', text: '住民記録を消された者は、五周期後に外門を閉ざされる。あなたは出域枠を買うため、夜の競売で依頼品を探している。' },
  { pic: 'p0', kind: 'face', label: '鑑定所', title: '答えは一つの証拠にない', speaker: 'レイカ', text: '「素材が古いだけでは足りない。状態、来歴、話した人の都合を二つ以上つないで」' },
  { pic: 'p3', kind: 'face', label: '競売会場の裏口', title: '価格は価値ではない', speaker: 'モーガン', text: '「欲しい理由が違えば、同じ品にも別の上限がつく。誰が値を上げたかを見失うな」' },
  { pic: 'l0', kind: 'place', label: '市史蒐集院', title: '灰雨避難記録', speaker: 'ユウナ', text: '「展示品が欲しいわけではありません。公式には走らなかった最終列車――その夜の一次物証を二つ」' },
];

export const ENDINGS = {
  success: {
    id: 'route-reopened', title: '消された避難路',
    text: '二つの物証を重ねると、封鎖後も列車と手動門が動いた時系列が成立した。ユウナの受領票の宛先は展示室ではなく、「住民記録から消された避難者一覧」。彼女も失踪者を探している。',
  },
  failure: {
    id: 'sealed-again', title: '証拠は散った',
    text: '品物は別々の手へ渡り、公式記録の矛盾は一続きにならなかった。ユウナは「次は品名ではなく、門の位置を優先して」とだけ残す。匿名客09は六音を口ずさみ、雨の中へ消えた。',
  },
};

export const lotById = id => LOTS.find(lot => lot.id === id);
export const npcById = id => NPCS.find(npc => npc.id === id);
export const sourceById = id => SOURCES[id];

