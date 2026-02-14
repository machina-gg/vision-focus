# Vision Focus — 手動テストケース一覧

> リリース前のユーザー手動テスト用チェックリスト。
> E2E テストでカバー済みの項目は参照リンクで示す。

## 使い方

- [ ] チェックボックスで確認済みをマーク
- 📎 マークは E2E テスト参照（自動テストでカバー済み）

---

## 1. ブロック機能

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-001: ブロックリストに追加したサイトが newtab.html にリダイレクト
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-002: ワイルドカードで指定したサブドメインがブロックされる
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-003: ブロックリストから削除したサイトにアクセスできる
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-004: Pause トグルで全ブロックが一時停止される
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-005: Pause 解除後、通常のブロック動作に戻る
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-006: 無効化したブロックアイテムはブロックされない
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-007: 有効化したブロックアイテムがブロックされる
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-008: declarativeNetRequest でリダイレクトが実行される
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-009: ブロック時に lastBlockedDomain が記録される
- 📎 E2E 参照: `tests/e2e/block.spec.ts` — BLOCK-010: ブロック回数がカウントされる

### 手動確認項目

- [ ] ブロック画面のデザインが崩れていないこと
  - 手順: ブロック対象サイトにアクセス
  - 期待: newtab.html が全画面で表示、レイアウト崩れなし

- [ ] ブロック画面の目標テキストが正しく表示される
  - 手順: Options でカスタム目標テキストを設定 → ブロック対象サイトにアクセス
  - 期待: 設定した目標テキストが newtab.html に表示される

- [ ] ワイルドカードブロックの入力バリデーション
  - 手順: Options で `*example` や `example.*` など不正な形式を入力
  - 期待: エラーメッセージが表示される、または自動で修正される

- [ ] ブロックリストが0件の場合のUI
  - 手順: 全ブロックアイテムを削除
  - 期待: 「まだブロックサイトがありません」などの空状態メッセージが表示

- [ ] 大量のブロックリスト（50件以上）でのパフォーマンス
  - 手順: 50件以上のサイトをブロックリストに追加
  - 期待: Options 画面の表示速度・スクロールが遅くならない

---

## 2. YouTube 制御

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-001: YouTube Shorts を非表示にできる
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-002: YouTube Recommendations（関連動画）を非表示にできる
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-003: YouTube Comments を非表示にできる
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-004: YouTube 完全ブロック（blockAccess）が動作する
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-005: YouTube Time Limit を設定できる
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-006: YouTube Time Limit 超過時に CSS で全コンテンツ非表示
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-007: YouTube 設定変更が即座に反映される
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-008: YouTube 有効化/無効化がトラッキング履歴に記録される
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-009: Hide Shorts + Time Limit 同時設定時に両方が機能する
- 📎 E2E 参照: `tests/e2e/youtube.spec.ts` — YT-010: blockAccess と Time Limit の優先順位（blockAccess 優先）

### 手動確認項目

- [ ] YouTube Shorts が実際のページで非表示になる
  - 手順: YouTube を開き、Hide Shorts を有効化
  - 期待: YouTube ホーム画面で Shorts セクションが表示されない

- [ ] YouTube おすすめ動画が非表示になる
  - 手順: YouTube で動画再生中に Hide Recommendations を有効化
  - 期待: 右サイドバーのおすすめ動画が非表示になる

- [ ] YouTube コメント欄が非表示になる
  - 手順: YouTube で動画再生中に Hide Comments を有効化
  - 期待: 動画下のコメント欄が非表示になる

- [ ] YouTube Time Limit 超過時の視覚フィードバック
  - 手順: Time Limit を1分に設定 → 1分以上 YouTube を視聴
  - 期待: 画面全体が非表示になり「時間制限を超過しました」メッセージが表示される

- [ ] YouTube 埋め込み動画（他サイト）での動作
  - 手順: YouTube 埋め込み動画のあるサイトにアクセス
  - 期待: YouTube 設定が埋め込み動画にも適用される（または適用されないことを確認）

---

## 3. 時間制限

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-001: Daily Time Limit を設定できる
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-002: Hourly Time Limit を設定できる
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-003: Time Limit 超過時に newtab.html へリダイレクト（reason付き）
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-004: Time Limit 超過後、Daily は日付変更でリセット（00:00）
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-005: Time Limit 超過後、Hourly は時間変更でリセット（毎時00分）
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-006: 残り時間がポップアップで表示される
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-007: Time Limit 使用状況が Analytics タブで確認できる
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-008: Pause 有効中に Time Limit 超過した場合もリダイレクトされない
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-009: Daily リセット境界値テスト（23:59→00:00）
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-010: Hourly リセット境界値テスト（09:59→10:00）
- 📎 E2E 参照: `tests/e2e/time-limit.spec.ts` — TL-011: 複数サイトで異なる Time Limit が同時に動作する

### 手動確認項目

- [ ] Time Limit カウントダウンの視覚フィードバック
  - 手順: Popup を開き、Time Limit 設定サイトにアクセス中の残り時間を確認
  - 期待: 残り時間が「10分」「5分」など分かりやすく表示される

- [ ] Time Limit 超過直前の通知
  - 手順: Time Limit 1分前にサイトにアクセス
  - 期待: 「残り1分です」などの通知が表示される（機能があれば）

- [ ] Time Limit リセット後の初回アクセス
  - 手順: Time Limit 超過 → 翌日にアクセス
  - 期待: 時間がリセットされており、再度アクセス可能

- [ ] Time Limit の手動リセット
  - 手順: Options で Time Limit 使用状況をリセット
  - 期待: 使用時間が0秒にリセットされる

- [ ] Time Limit 設定の入力バリデーション
  - 手順: Time Limit に「-1」「0」「99999」など極端な値を入力
  - 期待: エラーメッセージまたは自動修正が表示される

---

## 4. ポップアップ

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-001: ポップアップが正常に表示される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-002: ヘッダーにロゴと設定アイコンが表示される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-003: 目標カードに目標テキストが表示される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-004: 今日のサマリー（ブロック回数、トップブロックサイト）が表示
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-005: 設定アイコンクリックでオプション画面が開く
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-006: 目標カードクリックでダッシュボード（新規タブ）が開く
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-007: ヘルプアイコンクリックでヘルプタブが開く
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-008: Pause トグルでブロック機能の一時停止ができる
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-009: パスワード保護設定時、Pause トグルにパスワード認証が必要
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-010: クイックブロックボタンに現在のドメインが表示される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-011: クイックブロッククリックでサイトがブロックリストに追加される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-012: 言語切り替えでUIが即座に変更される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-013: PremiumユーザーはAnalyticsリンクが表示される
- 📎 E2E 参照: `tests/e2e/popup.spec.ts` — POP-014: Time Limit 設定中のサイトで残り時間バッジが表示される

### 手動確認項目

- [ ] Popup のレスポンシブデザイン
  - 手順: ブラウザウィンドウサイズを変更
  - 期待: Popup が正しくレイアウトされ、スクロール不要で全内容が表示される

- [ ] Popup の読み込み速度
  - 手順: 拡張機能アイコンをクリック
  - 期待: 1秒以内に Popup が表示される

- [ ] 長い目標テキストの表示
  - 手順: 100文字以上の長い目標テキストを設定
  - 期待: テキストが省略され「...」が表示される、またはスクロール可能

- [ ] QuickBlock の重複チェック
  - 手順: 既にブロックリストにあるサイトを QuickBlock で追加しようとする
  - 期待: 「既にブロックリストに追加されています」などのメッセージが表示

- [ ] Popup を開いたままサイト移動した場合の挙動
  - 手順: Popup を開く → 別のタブに移動 → Popup を再度確認
  - 期待: Popup が現在のタブの情報に更新される

---

## 5. 新しいタブ（newtab.html）

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-001: 新規タブを開くとダッシュボードが表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-002: プリセット設定済み時、背景画像が表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-003: 目標テキストが中央に表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-004: ミニ統計カード（ブロック回数）が表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-005: 設定アイコンクリックでオプション画面が開く
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-006: 目標テキストをダブルクリックで編集モードになる
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-007: 編集した目標がEnterキーで保存される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-008: プリセット未設定時、シンプルなブロックページUIが表示
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-009: ブロックされたサイトから遷移時、ブロック情報が表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-010: ブロックサイトリストが表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-011: Premium ユーザーは壁紙ダウンロードボタンが表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-012: Time Limit 超過からの遷移時、専用メッセージが表示される
- 📎 E2E 参照: `tests/e2e/newtab.spec.ts` — NEW-013: ブロック日数（Blocking Days）が正しく表示される

### 手動確認項目

- [ ] 新しいタブの読み込み速度
  - 手順: 新しいタブを開く
  - 期待: 1秒以内にダッシュボードが表示される

- [ ] 背景画像のアスペクト比
  - 手順: 様々な解像度（1920x1080、1366x768、2560x1440）で新しいタブを開く
  - 期待: 背景画像が歪まず、全画面にフィットする

- [ ] 長いブロックサイトリスト（20件以上）の表示
  - 手順: 20件以上ブロックサイトを追加 → newtab.html を開く
  - 期待: リストがスクロール可能、またはページネーションされる

- [ ] ブロック情報バナーの自動消去
  - 手順: ブロック対象サイトにアクセス → newtab.html に遷移
  - 期待: ブロック情報バナーが3-5秒後に自動で消える（または閉じるボタンがある）

- [ ] 壁紙ダウンロードの画質
  - 手順: Premium ユーザーで壁紙をダウンロード
  - 期待: ダウンロードされた画像が元の解像度を保持している

---

## 6. 分析・レポート

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-001: サイト別ブロック回数が記録される
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-002: Unblock History（ブロック解除サイト）が記録される
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-003: 解除サイトの滞在時間が 30 秒間隔の Heartbeat で記録
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-004: トラッキング中サイトの滞在時間が記録される
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-005: Analytics Opt-In モーダルで許可/拒否を選択できる
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-006: Opt-Out した場合、トラッキングが無効化される
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-007: Analytics データをリセットできる
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-008: ネットワーク切断時に Heartbeat がローカルキューに保存
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-009: ネットワーク復旧時にキューされた Heartbeat が送信
- 📎 E2E 参照: `tests/e2e/analytics.spec.ts` — AN-010: Opt-Out 時に Unblock History も無効化される

### 手動確認項目

- [ ] Analytics タブのグラフ表示
  - 手順: 1週間以上データを蓄積 → Analytics タブを開く
  - 期待: 折れ線グラフ・棒グラフが正しく表示される

- [ ] Analytics データの精度
  - 手順: 特定のサイトに10分間滞在 → Analytics タブで滞在時間を確認
  - 期待: 滞在時間が10分±30秒の範囲内で記録されている

- [ ] Analytics CSV エクスポートの内容
  - 手順: Analytics データを CSV エクスポート → ファイルを開く
  - 期待: ヘッダー行があり、データが正しいフォーマットで出力されている

- [ ] Analytics データのメモリ使用量
  - 手順: 6ヶ月以上データを蓄積 → ブラウザのメモリ使用量を確認
  - 期待: 拡張機能のメモリ使用量が 100MB 以下

- [ ] Heartbeat 送信の頻度
  - 手順: ブラウザの開発者ツールでネットワークタブを開き、サイトにアクセス
  - 期待: Heartbeat が30秒間隔で送信される

---

## 7. オプション画面（Options）

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/options-common.spec.ts` — OPT-001: オプション画面が正常に開く
- 📎 E2E 参照: `tests/e2e/options-common.spec.ts` — OPT-002: タブ切り替えが正常に動作する
- 📎 E2E 参照: `tests/e2e/options-common.spec.ts` — OPT-003: URL ハッシュでタブ指定ができる（例: #analytics）
- 📎 E2E 参照: `tests/e2e/options-common.spec.ts` — OPT-004: Analytics Opt-In モーダルが初回訪問時に表示される

### 手動確認項目

- [ ] Options 画面の読み込み速度
  - 手順: Options 画面を開く
  - 期待: 1秒以内に全タブが表示される

- [ ] Options 画面のレスポンシブデザイン
  - 手順: ブラウザウィンドウを最小サイズ（800x600）にする
  - 期待: スクロールで全内容が表示され、レイアウト崩れがない

- [ ] Options 画面の複数タブ同時起動
  - 手順: Options 画面を2つのタブで同時に開く → 片方で設定変更
  - 期待: もう片方のタブも設定が自動更新される

- [ ] Options の設定変更の保存タイミング
  - 手順: 設定を変更 → すぐに Options を閉じる → 再度開く
  - 期待: 変更が保存されている

---

## 8. スケジュール（E2E なし）

### 手動確認項目（全て）

- [ ] スケジュールを追加できる
  - 手順: Options > Schedules > Add Schedule
  - 期待: スケジュール作成モーダルが表示される

- [ ] スケジュールの時間帯設定
  - 手順: スケジュールに開始時刻「09:00」、終了時刻「17:00」を設定
  - 期待: 設定が保存され、スケジュール一覧に表示される

- [ ] スケジュールの曜日選択
  - 手順: 月曜・水曜・金曜を選択
  - 期待: 選択された曜日のみスケジュールが有効になる

- [ ] スケジュールへのプリセット連携
  - 手順: スケジュールにプリセット「Focus Mode」を関連付け
  - 期待: スケジュール時間中に「Focus Mode」が自動適用される

- [ ] スケジュールの有効/無効切り替え
  - 手順: スケジュールのトグルスイッチをクリック
  - 期待: スケジュールが無効化され、半透明表示になる

- [ ] スケジュールの編集
  - 手順: 既存スケジュールの編集ボタンをクリック
  - 期待: 編集モーダルが開き、既存の設定が入力済み

- [ ] スケジュールの削除
  - 手順: スケジュールの削除ボタンをクリック
  - 期待: 確認ダイアログ表示 → Yes で削除される

- [ ] スケジュールの自動適用
  - 手順: 現在時刻がスケジュール時間帯に該当する状態で newtab.html を開く
  - 期待: スケジュールに設定したプリセットが自動適用されている

- [ ] スケジュール重複エラー
  - 手順: 同じ時間帯・曜日のスケジュールを2つ作成しようとする
  - 期待: 「重複しています」エラーメッセージが表示される

- [ ] スケジュール時間帯外の動作
  - 手順: スケジュール時間帯外に newtab.html を開く
  - 期待: デフォルトプリセットまたは手動選択プリセットが適用される

- [ ] 週間カレンダー表示
  - 手順: Schedules タブを開く
  - 期待: 日曜〜土曜の7列カレンダーが表示され、スケジュールが視覚的に配置される

- [ ] 複数スケジュールの同時表示
  - 手順: 5件以上のスケジュールを作成
  - 期待: 全スケジュールが一覧表示され、スクロール可能

- [ ] プリセット削除時のスケジュール無効化
  - 手順: プリセットを削除 → そのプリセットを使用していたスケジュールを確認
  - 期待: スケジュールが自動的に無効化される

- [ ] スケジュールの境界値テスト（23:59 → 00:00）
  - 手順: 23:00-23:59 のスケジュールを作成 → 23:59 に newtab.html を開く
  - 期待: スケジュールが適用されている

---

## 9. プレミアム機能（E2E なし）

### 手動確認項目（全て）

- [ ] ライセンスキー入力でプレミアム有効化
  - 手順: Options > Premium > ライセンスキー入力 → Activate
  - 期待: プレミアム機能が解放され、「Premium」バッジが表示される

- [ ] プレミアム機能の解放確認
  - 手順: プレミアム有効化後、Styles タブを開く
  - 期待: Google Fonts 選択・カスタム背景アップロードが使用可能

- [ ] プリセット上限が5件になる
  - 手順: プレミアム有効化 → プリセットを5件作成
  - 期待: 5件まで作成可能、6件目は作成不可

- [ ] カスタム背景画像のアップロード
  - 手順: Premium ユーザーで Styles タブ > Custom Background > Upload
  - 期待: ファイル選択ダイアログが開き、画像をアップロード可能

- [ ] 壁紙ダウンロード機能
  - 手順: Premium ユーザーで newtab.html を開く → Download ボタン
  - 期待: 現在の背景画像が PNG/JPG でダウンロードされる

- [ ] Analytics 全期間表示
  - 手順: Premium ユーザーで Analytics タブを開く
  - 期待: 「All Time」フィルタが選択可能

- [ ] Unblock History CSV エクスポート
  - 手順: Premium ユーザーで Analytics タブ > Unblock History > Export CSV
  - 期待: CSV ファイルがダウンロードされる

- [ ] 開発者モード（24時間体験）
  - 手順: Options > Premium > Developer Mode
  - 期待: 24時間限定でプレミアム機能が有効化、通知が表示される

- [ ] プレミアムダウングレード時の動作
  - 手順: ライセンスを解除 → プリセット・カスタム背景を確認
  - 期待: 2件目以降のプリセットがロック、カスタム背景が削除される

- [ ] Free ダウングレード時のスケジュール無効化
  - 手順: プレミアム解除 → 3件目以降のプリセットを使用していたスケジュールを確認
  - 期待: スケジュールが無効化される

- [ ] プレミアム機能比較表の表示
  - 手順: Options > Premium タブを開く
  - 期待: Free vs Premium の機能比較表が表示される

- [ ] Upgrade ボタンで決済ページへ遷移
  - 手順: Options > Premium > Upgrade
  - 期待: 決済ページ（Stripe など）が新しいタブで開く

---

## 10. パスワード保護（E2E なし）

### 手動確認項目（全て）

- [ ] パスワード設定
  - 手順: Options > Help > Set Password
  - 期待: パスワード入力フィールドが表示され、設定可能

- [ ] パスワード確認入力
  - 手順: パスワード設定時に確認用パスワードを入力
  - 期待: 2つのパスワードが一致しない場合エラーメッセージが表示される

- [ ] パスワード保護によるブロック解除制限
  - 手順: パスワード設定後、ブロックリストのトグルをオフにしようとする
  - 期待: パスワード入力モーダルが表示される

- [ ] パスワード認証成功
  - 手順: 正しいパスワードを入力
  - 期待: ブロック解除が実行される

- [ ] パスワード認証失敗
  - 手順: 間違ったパスワードを入力
  - 期待: 「パスワードが正しくありません」エラーメッセージが表示

- [ ] パスワード変更
  - 手順: Options > Help > Change Password
  - 期待: 現在のパスワード + 新しいパスワードを入力し、変更可能

- [ ] パスワード削除
  - 手順: Options > Help > Remove Password
  - 期待: 確認ダイアログ表示 → Yes でパスワード保護が解除される

- [ ] Pause トグルのパスワード保護
  - 手順: パスワード設定後、Popup で Pause トグルをクリック
  - 期待: パスワード入力モーダルが表示される

- [ ] パスワード保護の視覚フィードバック
  - 手順: パスワード設定後、Options を開く
  - 期待: 「Password Protected」などのバッジが表示される

- [ ] パスワードの文字数制限
  - 手順: 4文字未満、または100文字以上のパスワードを設定しようとする
  - 期待: エラーメッセージが表示される

---

## 11. 多言語対応（i18n）

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/i18n.spec.ts` — I18N-001: ブラウザ言語が英語の場合、英語UIが表示される
- 📎 E2E 参照: `tests/e2e/i18n.spec.ts` — I18N-002: ブラウザ言語が日本語の場合、日本語UIが表示される
- 📎 E2E 参照: `tests/e2e/i18n.spec.ts` — I18N-003: ポップアップで言語を切り替えできる
- 📎 E2E 参照: `tests/e2e/i18n.spec.ts` — I18N-004: 言語設定が全画面で統一されている
- 📎 E2E 参照: `tests/e2e/i18n.spec.ts` — I18N-005: 言語変更が即座に反映される

### 手動確認項目

- [ ] ブラウザ言語の自動検出
  - 手順: ブラウザの言語設定を日本語 → 拡張機能をインストール
  - 期待: 初回起動時に日本語UIが表示される

- [ ] 日本語UIの翻訳品質
  - 手順: 日本語に切り替え → 全画面を確認
  - 期待: 不自然な翻訳がなく、文脈に合った日本語が使用されている

- [ ] 英語UIの翻訳品質
  - 手順: 英語に切り替え → 全画面を確認
  - 期待: 文法的に正しく、ネイティブが理解できる英語が使用されている

- [ ] 言語切り替え後のリロード不要
  - 手順: Popup で言語を英語→日本語に切り替え
  - 期待: ページリロードなしで即座にUIが日本語に変わる

- [ ] 長いテキストの言語切り替え
  - 手順: 長い目標テキスト（100文字）を設定 → 言語を切り替え
  - 期待: レイアウトが崩れず、テキストが正しく表示される

- [ ] 日付・時刻のローカライズ
  - 手順: Analytics タブで日付を確認
  - 期待: 日本語の場合「2024年1月1日」、英語の場合「Jan 1, 2024」など正しい形式

---

## 12. スタイル・プリセット

### E2E カバー済み

- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST01: スタイルタブが表示される
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST02: プリセット一覧が表示される
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST03: プリセットを選択・適用できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST04: 新規プリセットを作成できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST05: プリセットを削除できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST06: 目標テキスト・サブテキストを入力できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST07: テキスト色を選択できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST08: 背景タイプ（画像/単色）を選択できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST09: デフォルト背景画像を選択できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST10: Premium ユーザーはカスタム画像をアップロードできる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST11: フォント設定（ファミリー・サイズ・ウェイト）を変更可能
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST12: Premium ユーザーは Google Fonts を選択できる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST13: 背景画像変更時にリアルタイムプレビューされる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST14: フォント変更時にリアルタイムプレビューされる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST15: 色変更時にリアルタイムプレビューされる
- 📎 E2E 参照: `tests/e2e/options-style.spec.ts` — OPT-ST16: Free ダウングレード時、2件目以降のプリセットがロックされる

### 手動確認項目

- [ ] プリセットプレビューの表示
  - 手順: Styles タブでプリセットを選択
  - 期待: 右側にプレビューが表示され、背景・テキスト色が反映される

- [ ] プリセット名の文字数制限
  - 手順: 50文字以上のプリセット名を入力
  - 期待: エラーメッセージまたは自動で30文字に切り詰められる

- [ ] カラーピッカーのアクセシビリティ
  - 手順: カラーピッカーを開く
  - 期待: キーボードで操作可能（Tab / Enter / Escape）

- [ ] カスタム背景のファイルサイズ制限
  - 手順: 10MB 以上の画像をアップロード
  - 期待: 「ファイルサイズが大きすぎます」エラーメッセージが表示される

- [ ] カスタム背景の対応フォーマット
  - 手順: PNG, JPG, WebP, GIF をそれぞれアップロード
  - 期待: PNG/JPG は正常に表示、WebP/GIF はエラーまたは警告

- [ ] Google Fonts の読み込み速度
  - 手順: Google Fonts を選択 → newtab.html を開く
  - 期待: フォントの読み込みで3秒以上遅延しない

- [ ] プリセットの複製機能（あれば）
  - 手順: 既存プリセットを複製
  - 期待: 同じ設定の新プリセットが作成される

- [ ] プリセットのエクスポート/インポート（あれば）
  - 手順: プリセットをエクスポート → インポート
  - 期待: 全設定が正しく復元される

- [ ] フォントサイズの境界値テスト
  - 手順: フォントサイズを最小・最大に設定
  - 期待: テキストが読めないほど小さくならない、画面外にはみ出さない

- [ ] 背景画像のトリミング/フィット
  - 手順: 縦長・横長・正方形の画像をそれぞれ設定
  - 期待: 全てアスペクト比を保ちつつ画面にフィットする

---

## テスト実施時の注意事項

### ブラウザ互換性

- [ ] Chrome 最新版でテスト
- [ ] Microsoft Edge 最新版でテスト
- [ ] 各ブラウザでダークモード/ライトモードを確認

### パフォーマンス

- [ ] CPU 使用率が 5% 以下（アイドル時）
- [ ] メモリ使用量が 100MB 以下（通常使用時）
- [ ] バックグラウンドでのバッテリー消費が最小限

### アクセシビリティ

- [ ] Tab キーで全操作が可能
- [ ] スクリーンリーダー（NVDA / JAWS）で読み上げ可能
- [ ] コントラスト比が WCAG AA 基準を満たす

### セキュリティ

- [ ] パスワードが平文で保存されていない
- [ ] ブロックリストが外部から読み取れない
- [ ] Analytics データが暗号化されている（Premium 機能）

---

## バグ報告テンプレート

```
### 再現手順
1.
2.
3.

### 期待される動作


### 実際の動作


### 環境
- ブラウザ:
- OS:
- 拡張機能バージョン:

### スクリーンショット


### 追加情報

```

---

**最終更新**: 2026-02-15
**作成者**: Developer エージェント
**レビュー**: PM
