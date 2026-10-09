# DEEP TIME — Babylon.jsフル3D Stage 1

2026-10-09。エンジン・フル3Dの一次仕様は `babylon-full3d-spec.md`、操作・音楽・美術の方針は `dinosaur-stage1.md`。今回の完成範囲はStage 1。

`DeepTimeGame.client.vue` がDOMの開始 / HUD / pause / result / 音量 / 品質 / loading / failure / 日英表示を担当する。`RunWorld` がBabylonの3D描画・音声・入力を接続し、`RunController` はエンジンから独立したゲームの開始・死亡・760ms retry・pause・clearを管理する。毎フレームの状態をVueへ流さず、ready・mode・best・failed・clearedを通知する。到達率の表示は必要な変更のみDOMに反映する。

主人公、地面、段差、岩、根、倒木、落下石、山の稜線、シダ、群れ、T. rex、灰、地層を3D空間に構成する。カメラは固定横視点、進行はX、ジャンプはY、衝突は同じ平面に制限する。見た目のメッシュと簡略AABBを分ける。外部の物理エンジンは採用しない。

`app/game/dinosaur` の既存ルールを維持する。240Hz、18,432 ticks、150 BPM、48小節、76.8秒、50入力の音楽グリッド、速度曲線、70ms coyote・100ms buffer、ジャンプ速度-620・重力1850、障害物inset、SAFE_END71.2秒、得点とrankのしきい値は変更していない。60 / 120Hz / 不規則deltaの決定論テストを引き継いだ。pauseはaccumulatorを破棄して固定状態を停止し、リトライは同じ初期状態と音楽へ戻す。

`app/games/dinosaur/stage.ts` は部品ID・3D位置 / 回転 / サイズ・collider・出現時刻を定義する。既存の6つの12.8秒区間を組み合わせてStage 1を構成し、start / goal / checkpoint / camera / lighting / musicも型付きで持つ。Stage 1はチェックポイント無しの一撃死。追加ステージは別のLevelと配置を `defineRunStage` へ渡し、ゲーム側の登録を追加する。専用エディターと他ジャンル向けの共通レベル形式は追加していない。

CALM → HERD → PREDATOR → FLASH → FALLOUT → BOUNDARY。既存のcueと音声タイミングで群れ・捕食者の登場・衝撃・崩れる足場・灰・白への移行を再生する。地面の地層はK–Pgの線へつながる。障害物にランダム性はない。地面と障害物は表示区間だけ有効化し、装飾・灰・群れはプールを使う。影・解像度・装飾を品質設定で下げても判定は変えない。

プレイヤーはホームと同じ提供GLBで高さ54に親Transformで補正する。GLBは無変更。元のボーンで小さな脚振り、体の上下、空中傾き・死亡姿勢を追加した。これは手続き的な補助動作で、制作済みの歩行クリップは無い。周囲のT. rex / トリケラトプスは別の立体部品で作った仮モデル。専用の美術GLBと自然な歩行・走行クリップが必要で、完成済み素材とは扱わない。

音声は既存の作品用Ogg / AAC、mineral / pulseの2ステムと効果音。AudioContext時刻に開始点を合わせ、180ms超の例外的なずれだけ修正する。pause / resume / retryでsourceを止めて解放する。`scripts/build-deep-time-audio.py` は保持。旧2D plateの実行時使用は終了し、生成スクリプトとピクセルアート原本は残した。

保存キーとpayloadは維持。失敗はbestProgress、clearはbestClearScore / bestSync / rank / clearedを保存し、共通v2と車の解放へ渡す。ミュート・音量・品質は共通設定、言語は既存のキー。保存不可でもゲームは続く。CanvasのWebGL2が使えない場合は再読み込み・ホームへの復帰を表示し、2D代替版は作っていない。

縦横とsafe areaに合わせて800 unitsの構図を調整する。player位置は横28%、floorは縦75.5%を基本にし、予告時間やジャンプ軌道は画面比率に依存しない。pause / clearはDOMの同じボタンをタッチとキーボードで使う。reduced motionは衝撃・灰・カメラの揺れを抑える。

`?deepTimeDebug=1` はdev限定で `window.__deepTime` を公開し、実ルールへの入力予約・区間の進行・draw call / mesh / material / texture / audio / FPSの検証に使う。無敵状態や偽のclearを納品テストに使わない。本番には公開しない。

検証結果・ソフトウェア描画と実機の違い・残作業は [検証記録](verification/babylon-migration.md) を参照。
