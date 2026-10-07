# CareerQuest

CareerQuest は、転職活動と面接準備のための個人用 PWA です。ビザ期限、今日の優先タスク、完了ストリークをひと目で確認し、Kanban で日々のタスクを進められます。

## 主な機能

- Vancouver 時間で計算するビザ期限と完了ストリーク
- 優先タスクを最大3件表示する TOP
- 作成・編集・ソフト削除ができるタスク管理
- dnd-kit による Kanban の移動・並び替え
- 完了履歴を残したままタスクを戻せるステータス管理
- 完了タスクから新しい「復習タスク」を作成
- カテゴリ、優先度、キーワードのフィルター
- iPhone ホーム画面にも追加できる PWA シェル
- 朝・夜の未完了タスクリマインド（Web Push）

## 技術構成

- Next.js App Router / TypeScript / Tailwind CSS
- Supabase PostgreSQL / Supabase JS（サーバーからのみ利用）
- dnd-kit / lucide-react / Zod
- Vercel

Supabase の Secret key は Server Components / Server Actions からだけ使われ、ブラウザ向けバンドルには含まれません。ログインできるユーザーも `OWNER_USER_ID` の1人だけに制限します。

## ローカル開発

必要なもの:

- Node.js 24
- npm
- ローカル Supabase を使う場合は Docker と Supabase CLI

```bash
npm install
cp .env.example .env.local
```

### 方法 A: Supabase のクラウドプロジェクトを使う

1. Supabase でプロジェクトを作成します。
2. CLI でログインし、プロジェクトをリンクします。
3. migration を適用します。`db push` は migration のみを適用し、`supabase/seed.sql` を本番へ自動投入しません。

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

4. Supabase Dashboard の **Project Settings → API Keys** から URL と `sb_secret_...` 形式の Secret key を取得し、`.env.local` に設定します。

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SERVER_SIDE_SECRET
```

`SUPABASE_SECRET_KEY` に `NEXT_PUBLIC_` を付けないでください。ブラウザコードやクライアント側環境変数へコピーしてはいけません。

### 方法 B: Supabase をローカルで起動する

```bash
npx supabase start
npx supabase db reset
```

`db reset` は migration を適用した後、開発用の `supabase/seed.sql` を投入します。コマンドの出力に表示される API URL と Secret key を `.env.local` に設定します。

> `supabase db reset` は対象データベースを再作成する破壊的なコマンドです。`--linked` を付けて本番プロジェクトに実行しないでください。

### アプリを起動する

```bash
npm run dev
```

`http://localhost:3000` を開きます。初期の `visa_expiry_date` は `null` なので、TOP の「期限を編集」から設定してください。

## データベース

初期 migration は [supabase/migrations/20260922000000_initial_schema.sql](supabase/migrations/20260922000000_initial_schema.sql) です。以下を作成します。

- `tasks`
- `task_completion_events`
- `app_settings`（`id = 1` のみ）
- 完了イベントと並び順をトランザクションで更新する `move_task` 関数
- Vancouver ローカル日付から連続日数を求める `get_current_streak` 関数

全テーブルで RLS を有効にし、`anon` / `authenticated` の権限を取り消しています。公開ポリシーはありません。サービスロールだけが Next.js サーバー経由でアクセスします。

開発サンプルは [supabase/seed.sql](supabase/seed.sql) に分離しているため、通常の `supabase db push` では本番に入りません。

## 品質チェック

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel へのデプロイ

1. Git リポジトリを Vercel に Import します。
2. Project Settings の **Environment Variables** に次の2つを追加します。
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
3. Production / Preview の必要な環境へ値を割り当てます。
4. Build Command は `npm run build`、Framework Preset は Next.js のままデプロイします。
5. Supabase と Vercel Function は、可能なら近いリージョンを選びます。

### 外部アクセスを必ず制限する

このアプリにアプリ内認証はないため、Deployment Protection は必須です。

1. Vercel の対象 Project を開きます。
2. **Security → Deployment Protection** を開きます。
3. Vercel Authentication を有効にし、scope を **All Deployments** にします。
4. シークレットウィンドウから URL を開き、認証なしでは表示されないことを確認します。

2026年9月時点では、Vercel Authentication の All Deployments は全プランで利用でき、Production ドメインも保護できます。チーム外へ渡せる Shareable Link や Protection Exception は、この個人用アプリでは作らないでください。

## PWA のインストール

PWA は Service Worker を登録します。通知を試す場合も、iPhone / iPad ではSafariからホーム画面へ追加したPWAとして開く必要があります。

- iPhone / iPad: Safari で保護済み URL を開き、共有メニューから **ホーム画面に追加**
- Chrome / Edge: アドレスバーまたはブラウザメニューの **インストール**

インストールには HTTPS が必要です（Vercel は自動で HTTPS を提供します）。オフライン時は案内画面を表示しますが、データの読み書きやオフライン同期は行いません。

## Push通知のセットアップ

通知はブラウザのWeb Push、Supabase Edge Functions、5分間隔のSupabase Cronで動作します。朝・夜の設定時刻になり、未完了の「毎日のタスク」または今日以前に指定したタスクがある場合だけ送ります。送信済み記録により同じ端末へ同じ日の通知を重複送信しません。

まずSupabase CLIへログインしてmigrationを適用し、VAPID鍵を生成します。秘密鍵はSupabase Edge Function Secretsへ直接保存され、標準出力には公開鍵だけが表示されます。

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npm run setup:vapid
npx supabase functions deploy send-task-reminders --no-verify-jwt
```

`npm run setup:vapid` が表示した `NEXT_PUBLIC_VAPID_PUBLIC_KEY` を、ローカルの `.env` とVercelのEnvironment Variablesへ同じ値で追加してください。Vercelは環境変数を追加した後に再デプロイします。

アプリのTOPにある歯車から朝・夜の時刻を設定し、「通知を有効にする」を押します。最後に「テスト」で端末へ届くことを確認してください。通知許可はブラウザの仕様上、必ずこのボタン操作から要求します。

## 運用上の注意

- サービスロールキーを Git に commit しないでください。
- キーを露出した場合は Supabase で直ちに rotate し、Vercel の環境変数も更新してください。
- DB スキーマを変更したら migration と `src/lib/supabase/database.types.ts` を一緒に更新してください。
- 個人データを含む Production DB に `supabase/seed.sql` を実行しないでください。
