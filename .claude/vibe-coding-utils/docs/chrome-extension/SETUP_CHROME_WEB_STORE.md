# Chrome Web Store デプロイガイド

Chrome拡張を Chrome Web Store に公開するための手順です。

---

## 1. デベロッパーアカウントの作成

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にアクセス
2. Google アカウントでログイン
3. デベロッパー登録料（$5 の一回払い）を支払い
4. デベロッパー情報を入力

---

## 2. ビルド・パッケージング

```bash
# プロダクションビルド
pnpm build

# ZIP パッケージ作成
pnpm package
```

Plasmo が `build/chrome-mv3-prod` にビルド成果物を生成し、ZIP ファイルを作成します。

---

## 3. ストアリスティングの準備

アップロード前に以下を準備：

### 必須項目

| 項目 | 仕様 |
| ---- | ---- |
| 拡張機能名 | 最大 75 文字 |
| 説明文 | 最大 132 文字（短い説明） |
| 詳細説明 | 拡張機能の機能・使い方 |
| アイコン | 128x128 PNG |
| スクリーンショット | 1280x800 または 640x400、最低1枚 |
| カテゴリ | 該当するカテゴリを選択 |

### 推奨項目

| 項目 | 仕様 |
| ---- | ---- |
| プロモーション画像（小） | 440x280 PNG/JPG |
| プロモーション画像（大） | 920x680 PNG/JPG |
| プライバシーポリシー URL | 個人情報を扱う場合は必須 |

---

## 4. アップロード・公開

1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) で「新しいアイテム」をクリック
2. ZIP ファイルをアップロード
3. ストアリスティング情報を入力
4. プライバシーの取り組みを記入
5. 「審査のために送信」をクリック

### 審査について

- 通常 1〜3 営業日で審査完了
- 審査に落ちた場合、修正理由がメールで通知される
- 修正後、再度提出可能

---

## 5. 更新時の手順

```bash
# 1. package.json のバージョンを更新
# 2. ビルド・パッケージ
pnpm build
pnpm package

# 3. Developer Dashboard で既存アイテムを選択
# 4. 「新しいバージョンをアップロード」
# 5. 審査に提出
```

---

## 注意事項

- manifest.json の `permissions` は必要最小限にする（審査で確認される）
- `host_permissions` を使用する場合は正当な理由が必要
- プライバシーポリシーが必要な場合がある（ユーザーデータを扱う場合）
- 審査ガイドライン: [Chrome Web Store 開発者プログラムポリシー](https://developer.chrome.com/docs/webstore/program-policies)
