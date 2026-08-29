# NEON AUCTION

未来の地下市場を舞台に、証拠と競合心理を読む5ロット制オークション推理ゲームの製品縦切りデモです。

公開版: https://tdhr7110.github.io/neon-auction-terminal/

## Play

静的ファイルだけで動作します。ビルド後の出力をローカルサーバーで配信してください。

```bash
npm run build
python -m http.server 4173 --directory dist/client
```

`http://localhost:4173` を開きます。既存保存がある場合は「続きから」、新規検証はタイトルの「最初から」で開始できます。

## Vertical slice

- 同じ「灰雨避難事件」につながる固定5ロット
- 物証・状態・来歴・証言・市場情報を照合する証拠ボード
- 総予算、執着、目的、入札癖を持つ競合3人
- 1周期1回の深層スキャン、分類と依頼適合を分けた台帳
- seed付き決定論的な競売と、バージョン付きローカル保存
- 360×640からデスクトップまで、1 viewport = 1 screen の固定UI

## QA

`npm test` で競売制約、seed再現性、保存移行、深層スキャン、2つの達成ルートと失敗ルートを検証します。`npm run check` と `npm run build` も併用してください。ローカルサーバー起動中に `npm run qa` を実行すると4画面幅の完走スモークテストを行えます（必要なら `CHROME_PATH` でChrome実行ファイルを指定）。

## Deploy

`main` へのpushでGitHub Actionsが検証・ビルドし、`dist/client` をGitHub Pagesへ公開します。OpenAI Sites固有の設定は使用しません。

