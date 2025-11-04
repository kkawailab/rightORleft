# VPSへのデプロイ手順（Digital Ocean / Vultr）

このドキュメントでは、VPS（Virtual Private Server）にRight or Left投票システムをデプロイする手順を説明します。

⚠️ **注意**: VPSデプロイは中〜上級者向けです。初心者には[Renderデプロイ](./DEPLOYMENT.md)を推奨します。

## 前提条件

- SSHの基本的な知識
- Linuxコマンドラインの経験
- クレジットカード（VPSサービスの登録に必要）

## 推奨VPSサービス

| サービス | 最小料金 | 特徴 |
|---------|---------|-----|
| **Vultr** | $2.50/月 | 日本データセンターあり、初心者向け |
| **Digital Ocean** | $4/月 | ドキュメント充実、UI優秀 |
| **Linode** | $5/月 | 信頼性高い |

## デプロイ手順

### ステップ1: VPSインスタンスの作成

#### Digital Oceanの場合

1. https://www.digitalocean.com でアカウント作成
2. 「Create」→「Droplets」を選択
3. 設定：
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($4/月プラン)
   - **Datacenter**: Singapore（日本に最も近い）
   - **Authentication**: SSH keysを追加（推奨）またはPassword
   - **Hostname**: `voting-system`

4. 「Create Droplet」をクリック

#### Vultrの場合

1. https://www.vultr.com でアカウント作成
2. 「Deploy New Server」を選択
3. 設定：
   - **Server Type**: Cloud Compute
   - **Location**: Tokyo, Japan
   - **Server Image**: Ubuntu 22.04 LTS
   - **Server Size**: $2.50/月プラン（1GB RAM）
   - **SSH Key**: 追加（推奨）

4. 「Deploy Now」をクリック

---

### ステップ2: サーバーへの接続

IPアドレスが発行されたら、SSHで接続：

```bash
ssh root@YOUR_SERVER_IP
```

初回接続時、fingerprint確認が表示されるので `yes` を入力。

---

### ステップ3: サーバーの初期設定

#### システムアップデート

```bash
apt update && apt upgrade -y
```

#### ファイアウォール設定

```bash
# UFW（ファイアウォール）を設定
ufw allow OpenSSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

#### 非rootユーザーの作成（推奨）

```bash
# 新しいユーザーを作成
adduser deployer

# sudo権限を付与
usermod -aG sudo deployer

# SSHアクセスを許可
rsync --archive --chown=deployer:deployer ~/.ssh /home/deployer

# 新しいユーザーに切り替え
su - deployer
```

---

### ステップ4: Node.jsのインストール

```bash
# Node.js 18.x（LTS）をインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認
node --version
npm --version
```

---

### ステップ5: アプリケーションのデプロイ

#### Gitのインストール

```bash
sudo apt install -y git
```

#### リポジトリのクローン

```bash
# ホームディレクトリに移動
cd ~

# リポジトリをクローン
git clone https://github.com/kkawailab/rightORleft.git

# ディレクトリに移動
cd rightORleft

# 依存関係をインストール
npm install
```

#### テスト起動

```bash
# アプリを起動してみる
npm start
```

別のターミナルから確認：
```bash
curl http://YOUR_SERVER_IP:3000
```

HTMLが返ってくれば成功。`Ctrl+C`で停止。

---

### ステップ6: PM2でプロセス管理（常時起動）

アプリを常時起動させるため、PM2をインストール：

```bash
# PM2をグローバルインストール
sudo npm install -g pm2

# アプリをPM2で起動
cd ~/rightORleft
pm2 start server.js --name voting-system

# PM2のステータス確認
pm2 status

# ログを確認
pm2 logs voting-system

# サーバー再起動時に自動起動を設定
pm2 startup systemd
# ↑ 表示されたコマンドをコピーして実行

pm2 save
```

#### PM2の基本コマンド

```bash
pm2 status              # ステータス確認
pm2 logs voting-system  # ログ確認
pm2 restart voting-system  # 再起動
pm2 stop voting-system  # 停止
pm2 delete voting-system  # 削除
```

---

### ステップ7: Nginxでリバースプロキシ設定

Nginxを使ってポート80（HTTP）でアクセスできるようにします：

#### Nginxのインストール

```bash
sudo apt install -y nginx
```

#### Nginx設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/voting-system
```

以下の内容を貼り付け：

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # または独自ドメイン

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocketサポート
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # その他のヘッダー
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`Ctrl+X`、`Y`、`Enter`で保存。

#### 設定を有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/voting-system /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 設定テスト
sudo nginx -t

# Nginxを再起動
sudo systemctl restart nginx
```

---

### ステップ8: SSL証明書の設定（HTTPS化）

Let's Encryptで無料SSL証明書を取得：

#### Certbotのインストール

```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### SSL証明書の取得

⚠️ **注意**: 独自ドメインが必要です。IPアドレスでは取得できません。

```bash
# ドメインを使用する場合
sudo certbot --nginx -d your-domain.com

# メールアドレスを入力
# 利用規約に同意（A）
# ニュースレター（Y/N）
# HTTPSリダイレクト（推奨: 2）
```

証明書は自動更新されます。

---

### ステップ9: アプリケーションの更新

コードを更新した場合：

```bash
# サーバーにSSH接続
ssh deployer@YOUR_SERVER_IP

# リポジトリディレクトリに移動
cd ~/rightORleft

# 最新のコードを取得
git pull origin main

# 依存関係を更新（必要な場合）
npm install

# PM2でアプリを再起動
pm2 restart voting-system

# ログで確認
pm2 logs voting-system
```

---

## アクセス方法

デプロイ完了後、以下のURLでアクセス：

- トップページ: `http://YOUR_SERVER_IP/`
- 教員用: `http://YOUR_SERVER_IP/presenter`
- 学生用: `http://YOUR_SERVER_IP/student`

SSL設定済みの場合: `https://your-domain.com/`

---

## 保守・運用

### ログの確認

```bash
# PM2のログ
pm2 logs voting-system

# Nginxのアクセスログ
sudo tail -f /var/log/nginx/access.log

# Nginxのエラーログ
sudo tail -f /var/log/nginx/error.log

# システムログ
sudo journalctl -u nginx -f
```

### システムアップデート（月1回推奨）

```bash
sudo apt update && sudo apt upgrade -y
sudo reboot  # 必要に応じて再起動
```

### バックアップ

```bash
# アプリケーションのバックアップ
cd ~
tar -czf voting-system-backup-$(date +%Y%m%d).tar.gz rightORleft/

# バックアップをローカルにダウンロード（ローカルマシンから実行）
scp deployer@YOUR_SERVER_IP:~/voting-system-backup-*.tar.gz ./
```

---

## トラブルシューティング

### アプリが起動しない

```bash
# PM2のステータス確認
pm2 status

# ログを確認
pm2 logs voting-system --lines 100

# ポート3000が使用されているか確認
sudo lsof -i :3000

# 手動起動でエラー確認
cd ~/rightORleft
npm start
```

### Nginxエラー

```bash
# 設定ファイルの構文チェック
sudo nginx -t

# Nginxの状態確認
sudo systemctl status nginx

# Nginxを再起動
sudo systemctl restart nginx
```

### WebSocketが動作しない

- Nginx設定で`proxy_set_header Upgrade`が正しく設定されているか確認
- ファイアウォールでポート80/443が開いているか確認
- ブラウザのコンソールでWebSocketエラーを確認

### ディスク容量不足

```bash
# ディスク使用量確認
df -h

# 不要なパッケージを削除
sudo apt autoremove -y
sudo apt clean

# PM2ログをクリア
pm2 flush
```

---

## コスト削減のヒント

### 1つのVPSで複数アプリをホスト

同じVPSで他のNode.jsアプリも動かせます：

```bash
# 別のアプリをポート3001で起動
pm2 start app2.js --name app2 -- --port 3001

# Nginxで別のドメイン/パスに割り当て
sudo nano /etc/nginx/sites-available/app2
```

### 小さいプランから開始

- 最初は最小プラン（$2.50〜4/月）で開始
- 必要に応じてスケールアップ
- Digital Oceanでは数クリックでアップグレード可能

---

## Render vs VPS まとめ

| 項目 | Render（無料） | VPS |
|-----|--------------|-----|
| **コスト** | $0 | $2.50〜6/月 |
| **セットアップ時間** | 5分 | 1〜2時間 |
| **スリープ** | あり（15分後） | なし |
| **カスタマイズ** | 制限あり | 完全自由 |
| **保守** | 不要 | 必要 |
| **学習効果** | 低い | 高い |

### おすすめの選択

- **授業で使う（無料がいい）**: → **Render**
- **常時稼働が必要**: → **VPS**（またはRender有料プラン $7/月）
- **サーバー管理を学びたい**: → **VPS**
- **複数アプリを動かしたい**: → **VPS**
- **手間をかけたくない**: → **Render**

---

## 参考リンク

- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [Vultr Documentation](https://www.vultr.com/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
