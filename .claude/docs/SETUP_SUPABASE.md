# Supabase Local セットアップ

データストレージに Supabase を使用する場合の環境構築手順です。

---

## 前提条件

- Docker Desktop がインストール・起動していること
- Next.js 環境構築が完了していること（[SETUP_NEXTJS.md](./SETUP_NEXTJS.md)）

---

## 1. セットアップ手順

```bash
# 1. Supabase CLI のインストール
npm install -D supabase

# 2. Supabase クライアントのインストール
npm install @supabase/supabase-js

# 3. Supabase プロジェクトの初期化
npx supabase init

# 4. ローカル環境の起動
npx supabase start
```

起動後、以下の情報が表示されます：

- API URL: `http://127.0.0.1:54321`
- anon key: ローカル用の匿名キー
- Studio URL: `http://127.0.0.1:54323`（管理画面）

---

## 2. 環境変数の設定

### .env.local

```bash
# Supabase（ローカル開発用）
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<起動時に表示されたanon key>
```

### .env.local.example（Git管理用）

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 3. Supabase クライアント設定

`src/lib/supabase.ts` を作成：

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 4. npm scripts 追加

package.json に以下を追加：

```json
{
  "scripts": {
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status",
    "supabase:reset": "supabase db reset"
  }
}
```

---

## 5. マイグレーション

```bash
# 新しいマイグレーションを作成
npx supabase migration new <migration_name>

# マイグレーションを適用
npx supabase db reset
```

マイグレーションファイルは `supabase/migrations/` に保存されます。

---

## 6. Storage（画像アップロード）

Supabase Storage は `supabase start` で自動的に起動します。

### バケット作成（SQL マイグレーション）

`supabase/migrations/XXXXXX_create_storage_bucket.sql`:

```sql
-- バケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- アップロードポリシー（認証ユーザーのみ）
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

-- 閲覧ポリシー（全員）
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
```

### アップロード実装例

`src/lib/storage.ts`:

```typescript
import { supabase } from './supabase';

export async function uploadImage(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('images')
    .upload(path, file);

  if (error) throw error;
  return data;
}

export function getImageUrl(path: string) {
  const { data } = supabase.storage.from('images').getPublicUrl(path);

  return data.publicUrl;
}
```

---

## 7. Auth（認証）

Supabase Auth も `supabase start` で自動的に起動します。

### 対応認証方式

- Email / Password
- Magic Link（パスワードレス）
- OAuth（Google, GitHub, Twitter など）
- Phone Auth（SMS）

### 認証実装例

`src/lib/auth.ts`:

```typescript
import { supabase } from './supabase';

// サインアップ
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// サインイン
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// サインアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// 現在のユーザー取得
export async function getCurrentUser() {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
}
```

### セッション管理（App Router）

`src/components/providers/AuthProvider.tsx`:

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext<{ user: User | null }>({ user: null })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### OAuth 設定（本番環境）

1. Supabase ダッシュボード → Authentication → Providers
2. 使用するプロバイダーを有効化（Google, GitHub など）
3. 各プロバイダーの Client ID / Secret を設定

※ ローカル環境では Email/Password 認証でテスト可能

---

## 8. 本番環境（Supabase Cloud）へのデプロイ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. 本番用の環境変数を Vercel に設定
3. マイグレーションを本番に適用：

```bash
npx supabase link --project-ref <project-id>
npx supabase db push
```
