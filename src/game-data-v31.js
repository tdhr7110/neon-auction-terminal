export const CATALOG = [
  ['月面区画の権利証', 'RELIC', 540, '良品', '月面開発企業の清算品として持ち込まれた薄型樹脂証書。区画番号は現行台帳から消えている。', [570, 410, 170]],
  ['黒い培養鯉', 'BIO / ART', 310, '良品', '都市北部の培養池の生体作品として持ち込まれた黒い鯉。光を落とすと鱗が周囲の色を吸う。', [330, 240, 90]],
  ['第零区の物理鍵', 'RELIC', 760, '極上', '封鎖区画の機械錠を開ける品だと売り手が語る合金鍵。対応する扉は記録から抹消済み。', [800, 620, 250]],
  ['人工記憶「夏、1987」', 'DATA / ART', 590, '良品', '七秒の雨音から始まる人工記憶。記録者の名と夏の場所は欠落している。', [640, 450, 190]],
  ['未承認の義眼試作機', 'TECH', 520, '極上', '企業の承認印を持たない高感度義眼。外装と付属資料にはK-4の符号が残る。', [650, 390, 170]],
  ['旧地下鉄の最終切符', 'RELIC', 390, '良品', '旧東京地下鉄、最後の運行日に発券された品とされる乗車券。片隅に油染みが残る。', [420, 300, 110]],
  ['非合法人格バックアップ', 'DATA / ILLEGAL', 820, '極上', '死亡登録済みの人物のものとして出品された人格データ。末尾には短い子守歌が保存されている。', [880, 630, 260]],
  ['放射線で変色する絵画', 'ART', 300, '良品', '微量放射線で色調が変わるとされる無署名画。裏面には二つの異なる署名がある。', [330, 230, 80]],
  ['警察ドローンの中枢', 'TECH', 650, '良品', '廃棄警察ドローン由来として持ち込まれた制御中枢。焼けた回路に未消去の命令が残る。', [700, 610, 210]],
  ['雨の標本', 'RELIC', 230, '良品', '気象塔で採取された旧都市最後の雨として出品された密封瓶。底に三粒の煤が沈む。', [260, 180, 60]],
].map((x, i) => ({
  id: `A-${String(i + 1).padStart(2, '0')}`,
  name: x[0], cat: x[1], baseValue: x[2], bestCondition: x[3], desc: x[4],
  values: { prime: x[5][0], restored: x[5][1], forged: x[5][2] },
}));

export const EVIDENCE = [
  { kind: 'document', mark: '銀色の月印', material: '真空焼けした薄い樹脂', route: '静海区から第七码頭', owner: '企業清算人ナギ', detail: '右端の針穴' },
  { kind: 'bio', mark: '鰓蓋の三角斑', material: '光を吸う培養鱗', route: '北部培養池から雨路地', owner: '生体作家ウル', detail: '左尾の白い筋' },
  { kind: 'metal', mark: '零を囲む六角刻印', material: '黒鉛を混ぜた旧式合金', route: '封鎖された第零区から中央保管庫', owner: '元保安局員イサ', detail: '歯の三番目の欠け' },
  { kind: 'memory', mark: '末尾87の記憶符号', material: '琥珀色の記憶膜', route: '南部診療所から私設保管庫', owner: '記憶技師ハル', detail: '冒頭七秒の雨音' },
  { kind: 'optic', mark: '虹彩裏の四本線', material: '青い生体樹脂', route: '企業試験棟から無登録市場', owner: '技師K-4', detail: '焦点環の左右差' },
  { kind: 'paper', mark: '赤い環状改札印', material: '麻を混ぜた旧乗車紙', route: '旧東京駅から市史資料庫', owner: '最後の駅員サダ', detail: '角の小さな油染み' },
  { kind: 'personality', mark: '人格番号N-13', material: '熱で曇る黒い記録層', route: '北塔病院から第七码頭', owner: '死亡登録済みの患者13', detail: '記憶末尾の子守歌' },
  { kind: 'art', mark: '裏面の白い放射線記号', material: '蛍光顔料と古い下地', route: '西部工房から雨路地', owner: '無名画家を名乗る三人', detail: '右下の二重署名' },
  { kind: 'component', mark: '警察鷹章の欠け', material: '耐熱性の灰色回路板', route: '第三区警察署から解体港', owner: '整備主任トウマ', detail: '左端の焼け跡' },
  { kind: 'specimen', mark: '採取瓶の青い糸印', material: '古い硝子と吸湿紙', route: '気象塔から古書資料庫', owner: '観測員ミナ', detail: '瓶底の三粒の煤' },
];

export const PROFILES = {
  document: { target: '樹脂の積層と印刷層', archive: '月面登記原簿', expert: '古文書商', copy: '複製用の印刷版', method: '裏から透かして印圧を見る', age: '月印の退色が樹脂の内部まで続いている', fake: '月印だけが表面に新しく焼き付けられている', continuity: '針穴の断面も樹脂表面と同じ程度に黄変している', broken: '針穴の断面だけ黄変しておらず新しい' },
  bio: { target: '鱗の成長線と遺伝標識', archive: '培養生体台帳', expert: '生体屋', copy: '色素培養用の型', method: '照明を落として鱗の反応を見る', age: '三角斑が何層もの成長線をまたいで続く', fake: '斑点の色素が鱗の表面にしかない', continuity: '尾の白線が古い鱗から新しい鱗へ自然に続く', broken: '尾の白線が最近生えた鱗だけで途切れている' },
  metal: { target: '合金・刻印溝・鍵歯', archive: '第零区の錠前図面', expert: '古い鍵を扱う鍵師', copy: '合金鍵の鋳型', method: '磁性を確かめ、刻印溝を拡大する', age: '六角刻印の底まで周囲と同じ酸化がある', fake: '六角刻印だけ現行工具で削られている', continuity: '三番目の欠けの断面にも同じ酸化がある', broken: '三番目の欠けだけ古色の膜より新しい' },
  memory: { target: '記憶膜・符号・音声波形', archive: '収録セッション台帳', expert: '記憶技師', copy: '記憶媒体の複写装置', method: '読み取り専用端末で冒頭七秒を再生する', age: '末尾87の符号劣化が記憶膜全体と同じ速度だ', fake: '末尾87の部分だけ書込時刻が新しい', continuity: '雨音が前後の記憶と切れ目なくつながる', broken: '雨音の前後に編集した無音区間がある' },
  optic: { target: '生体樹脂・焦点環・機体番号', archive: '義眼試作機の設計書', expert: '義肢技師', copy: '現行樹脂の外殻と複製基板', method: '非接触走査で樹脂配合と焦点環を測る', age: '青い生体樹脂に試作年代と同じ劣化がある', fake: '青い生体樹脂は試作終了後に採用された現行配合だ', continuity: '焦点環の左右差が試験記録の値と一致する', broken: '焦点環の校正番号が試験記録に存在しない' },
  paper: { target: '紙繊維・印刷・改札印', archive: '旧交通局の発券台帳', expert: '古切符商', copy: '改札印の複製版', method: '光に透かして紙繊維と印を重ねる', age: '改札印が麻の繊維の奥まで染みている', fake: '改札印が古い汚れの上に乗っている', continuity: '油染みが紙の表裏へ同じ形で抜けている', broken: '油染みが表面の印刷にしか付いていない' },
  art: { target: '顔料・下地・署名', archive: '過去の展覧会図録', expert: '画材屋', copy: '顔料と署名型の一式', method: '弱い紫外線で絵具の層を分けて見る', age: '絵具の亀裂が下地から表面まで連続している', fake: '蛍光顔料が作品の年代より新しい', continuity: '二重署名が下絵の段階から塗り重ねられている', broken: '二重署名だけ完成後の保護膜の上にある' },
  personality: { target: '人格区間・神経署名・記録層', archive: '病院の押収目録', expert: '闇データ屋', copy: '人格断片の複写装置', method: '隔離端末で人格区間を読み取り専用走査する', age: 'N-13の神経署名が全人格区間へ連続している', fake: '人格番号N-13はヘッダ部分にだけ後から書かれている', continuity: '末尾の子守歌まで人格モデルの反応が途切れない', broken: '子守歌の直前で別人の人格断片へ切り替わる' },
  component: { target: '回路板・はんだ・焼損痕', archive: '警察の整備記録', expert: '回路修理屋', copy: '警察章の印刷型', method: '端子を通電せず拡大して熱跡を見る', age: '焼損痕が回路の古い熱履歴とつながる', fake: '警察章だけ後から回路板へ印刷されている', continuity: '左端の焼けが内部配線まで達している', broken: '左端の焼けが表面塗装だけで止まっている' },
  specimen: { target: '瓶・封印・堆積物', archive: '気象塔の採取記録', expert: '標本商', copy: '封印糸と煤の再現材', method: '瓶を動かさず側面から堆積層を見る', age: '煤が瓶底の古い堆積層へ入り込んでいる', fake: '煤が封を閉じた後から足されている', continuity: '青い糸の退色が封蝋の亀裂と同じ方向だ', broken: '青い糸だけ封蝋より新しく変色していない' },
};

export const VARIANTS = {
  prime: { id: 'prime', auth: '本物', assessment: '本物・状態良好', conditionRank: 3 },
  restored: { id: 'restored', auth: '本物', assessment: '本物・修復あり', conditionRank: 2 },
  forged: { id: 'forged', auth: '偽物', assessment: '偽物', conditionRank: 1 },
};

export const QUESTS = [
  { id: 'museum', client: '市史蒐集院', title: '失われた街の証拠', need: 2, bonus: 240, fail: 0, text: '本物のRELICを2点', match: x => x.auth === '本物' && x.cat.includes('RELIC') },
  { id: 'broker', client: '第七码頭の代理人', title: '一級資産の確保', need: 2, bonus: 360, fail: 0, text: '真価600 CR以上を2点', match: x => x.marketValue >= 600 },
  { id: 'guild', client: '無名の鑑定組合', title: '確かな品だけを', need: 2, bonus: 300, fail: 0, text: '本物の良品・極上を2点', match: x => x.auth === '本物' && x.conditionRank >= 3 },
];

export const PEOPLE = [
  { id: 'reika', name: '鑑定士 レイカ', role: '材質と加工', pic: 'p0' },
  { id: 'goro', name: '運び屋 ゴロウ', role: '輸送と梱包', pic: 'p1' },
  { id: 'vera', name: '収集家 ヴェラ', role: '所有者と希少性', pic: 'p2' },
  { id: 'morgan', name: '仲介人 モーガン', role: '競売参加者', pic: 'p3' },
];

export const PLACES = [
  { id: 'archive', name: '古書資料庫', role: '記録を照合', pic: 'l0' },
  { id: 'market', name: '雨路地の露店', role: '街を歩く', pic: 'l1' },
  { id: 'network', name: '公共ネット端末', role: '取引履歴を検索', pic: 'l2' },
  { id: 'warehouse', name: '第七码頭倉庫', role: '梱包を調べる', pic: 'l3' },
];

export const BIDDERS = [
  { name: 'ヴェラ', pic: 'p2' },
  { name: 'モーガン', pic: 'p3' },
  { name: '匿名客09', pic: 'anon' },
];

export const TOPICS = {
  reika: [['material', '素材の古さ', 'material'], ['repair', '修復・交換された跡', 'condition'], ['craft', '刻印や作り方', 'craft']],
  goro: [['labels', '荷札の順番', 'provenance'], ['seal', '封印が破られた跡', 'condition'], ['swap', '積み替えた場所', 'provenance']],
  vera: [['owner', '前の持ち主', 'provenance'], ['unique', '一点物だけの特徴', 'unique'], ['demand', '欲しがっている客', 'market']],
  morgan: [['obsession', '執着している客', 'market'], ['price', '普段の落札相場', 'price'], ['seller', '売り手が急ぐ理由', 'seller']],
  archive: [['spec', '当時の正式仕様', 'material'], ['count', '登録・生産された数', 'provenance'], ['photo', '古い写真の特徴', 'unique']],
  market: [['copies', '複製品の流通', 'craft'], ['modern', '現在使われる材料', 'material'], ['repairer', '修理屋の見立て', 'condition']],
  network: [['serial', '製造番号の重複', 'provenance'], ['timeline', '取引日時の流れ', 'provenance'], ['image', '写真が編集された跡', 'craft']],
  warehouse: [['outer', '外箱と荷札', 'provenance'], ['inner', '内側の梱包材', 'condition'], ['reseal', '開封・再封印の順番', 'craft']],
};

for (const [sourceId, topics] of Object.entries(TOPICS)) {
  TOPICS[sourceId] = topics.map(([id, label, axis]) => ({ id, label, axis }));
}

export const UPGRADES = [
  {
    id: 'insight', name: '鑑識レンズ', base: 220, step: 160,
    effect: '証言の食い違いを段階的に見抜く',
    detail: '段階1で怪しい証言を警告、2で整合する証言も確認、3で食い違いを補正します。',
    stages: ['怪しい証言に警告', '物証と整合する証言も表示', '怪しい証言を実証内容へ補正'],
  },
  {
    id: 'deal', name: '交渉補助チップ', base: 260, step: 170,
    effect: '強化品と借金精算を有利にする',
    detail: '売却は常に鑑定額100%。強化店が5→10→15%引き、借金の返済負担も段階ごとに50 CR減ります。',
    stages: ['強化店5%引き・返済負担-50', '強化店10%引き・返済負担-100', '強化店15%引き・返済負担-150'],
  },
  {
    id: 'stamina', name: '行動補助薬', base: 340, step: 220,
    effect: '周期内で使える予備行動を増やす',
    detail: '周期ごとの予備行動が2→4→6回。使わなければ次の品物へ持ち越します。',
    stages: ['周期の予備行動+2', '周期の予備行動+4', '周期の予備行動+6'],
  },
  {
    id: 'focus', name: '記憶整理装置', base: 240, step: 180,
    effect: '自分の確認を深くする',
    detail: '回数は増えず、段階1で重要箇所、2で加工、3で来歴まで同時に照合します。',
    stages: ['個体に合う重要箇所を確認', '加工方法も同時照合', '来歴または状態も同時照合'],
  },
];
