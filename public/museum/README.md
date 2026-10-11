# みらい博物館の画像

2026-10-11の依頼に合わせて画像生成ツールで新規制作しました。ユーザーの絵コンテは画風と演出の参考に限定し、絵コンテの文字盤・エジプト風装飾を転用していません。外観の参考原画像は作業環境に未添付でした。資料の写真を流用していません。

- exterior.webp：架空の博物館外観。生成ID exec-dd8c3c31-18cb-42d5-8213-4148276a7962。
- roman-courtyard.webp：前50年ごろのポンペイの架空の私邸。生成ID exec-47b58f26-0527-4696-9add-80cbc35fa2a3。
- roman-nap.webp：同じ舞台の寝床。生成ID exec-19ad8d64-a6db-4453-8a2e-501dca4dab0e。
- forest.webp：Hell Creek河川低地の創作復元。生成ID exec-6a5ba774-1639-4cee-bbde-a8137f3328bd。
- ru-*.webp：短毛の黒猫ルゥ。生成ID exec-6407ed88-b891-4c73-aad2-673d12cd679c。専用シートの原本は source-art/museum/ru-short-hair.png。3つの724pxセルを抽出し、nearest-neighborで96/128pxに変換しました。

背景は1536×1024のlossless WebP、ルゥは透明背景のlossless WebPです。画像内にUIの文字を埋め込まず、背景の猫と別の猫を重ねません。先に試作した長毛の猫や異なる文明の神殿は採用していません。

第三者作品の権利や独占利用権を取得したとは主張しません。歴史資料・復元上の推定・創作の区別は docs/museum-renewal.md を参照してください。

`pixel/` は共通ツールで作ったfine/standard/coarseのネイティブPNGです。サイトはstandardを読み、整数2倍で表示します。元WebPとシートを残しています。寸法・SHA-256・パレットは docs/pixel-previews/report.json、実行方法は docs/pixel-assets.md を参照してください。
