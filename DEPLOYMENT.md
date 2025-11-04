# Renderへのデプロイ手順

このドキュメントでは、Right or Left投票システムをRenderにデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- このリポジトリがGitHubにpushされていること

## デプロイ手順

### 1. Renderアカウントの作成

1. https://render.com にアクセス
2. 「Get Started」をクリック
3. GitHubアカウントでサインアップ（推奨）

### 2. 新しいWebサービスの作成

1. Renderダッシュボードで「New +」ボタンをクリック
2. 「Web Service」を選択
3. GitHubリポジトリを接続：
   - 初回の場合、「Connect GitHub」をクリック
   - Renderに必要な権限を許可
   - このリポジトリ（rightORleft）を選択

### 3. サービスの設定

以下の設定を入力します：

- **Name**: `right-or-left-voting`（または任意の名前）
- **Region**: `Singapore`（日本に最も近い）
- **Branch**: `main`
- **Root Directory**: 空白のまま
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: `Free`

### 4. 環境変数の設定（オプション）

「Advanced」セクションで以下を設定できます：

- `NODE_ENV`: `production`
- `PORT`: 自動的に設定されるため不要

### 5. デプロイ

1. 「Create Web Service」ボタンをクリック
2. デプロイが自動的に開始されます（数分かかります）
3. ログでデプロイの進行状況を確認できます

### 6. アプリケーションへのアクセス

デプロイが完了したら：

1. Renderが自動生成したURLが表示されます（例：`https://right-or-left-voting.onrender.com`）
2. 以下のページにアクセスできます：
   - メインページ: `https://your-app.onrender.com/`
   - 発表者用: `https://your-app.onrender.com/presenter`
   - 学生用: `https://your-app.onrender.com/student`

## 自動デプロイ

Renderは自動的にGitHubと連携しています：

- `main`ブランチに`git push`すると自動的に再デプロイされます
- デプロイ履歴はRenderダッシュボードで確認できます

## 無料プランの制限事項

- **スリープ機能**: 15分間アクセスがないとスリープモードになります
  - 次回アクセス時、起動に30〜60秒かかります
  - 授業前に一度アクセスして起動しておくことを推奨
- **月間制限**: 750時間/月まで無料
- **リソース**: CPU/メモリが制限されています（通常の授業使用には十分）

## トラブルシューティング

### デプロイが失敗する場合

1. Renderのログを確認
2. `package.json`に`"start"`スクリプトがあることを確認
3. Node.jsバージョンの互換性を確認

### WebSocketが動作しない場合

- Renderは自動的にWebSocketをサポートしています
- HTTPSが自動的に有効になるため、`wss://`プロトコルを使用してください

### アプリが起動しない場合

- 環境変数`PORT`をRenderが自動設定します
- `server.js`が`process.env.PORT`を正しく使用していることを確認

## カスタムドメインの設定（オプション）

無料プランでもカスタムドメインを設定できます：

1. Renderダッシュボードで「Settings」タブ
2. 「Custom Domain」セクションで独自ドメインを追加
3. DNSレコードを設定（手順が表示されます）

## 参考リンク

- [Render公式ドキュメント](https://render.com/docs)
- [Node.jsデプロイガイド](https://render.com/docs/deploy-node-express-app)
