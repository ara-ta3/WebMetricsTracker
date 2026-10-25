# WebMetricsTracker

Google Analytics 4（GA4）から複数サイトのアクセス指標を取得し、Slack にレポートを投稿するツールです。

## Slack に届くレポートの例

```
📊 サイト指標レポート
🗓️ 2026/10/24 までの確定データ ・ 🔼🔽 は前年同期比 ・ 前年 は前年同期の PV / UU（PV＝表示回数 / UU＝アクティブユーザ / 🔗 ・ 🔎 はセッション数）
───
🌐 メインサイト
今月 10/1〜10/24            先月 9/1〜9/30
PV 12,340 🔼 +21.0%         PV 15,000 🔼 +7.1%
UU 5,678 🔽 -3.8%           UU 7,000 🔽 -2.8%
前年 10,200 / 5,900         前年 14,000 / 7,200
🔗 今月の流入 Organic Search 4,200 (67%) ・ Direct 1,500 (24%) ・ Referral 600 (10%)
🔗 先月の流入 Organic Search 5,100 (74%) ・ Direct 1,800 (26%)
🔎 今月の詳細TOP5 google/organic 3,900 ・ (direct)/(none) 1,500
🔎 先月の詳細TOP5 google/organic 4,800
📅 うち昨日 10/24 PV 412 / UU 233
🔖 example.com
───
```

- 今月・先月の PV / UU と前年同期比
- 流入チャネル（上位 3 件）と参照元 / メディア（上位 5 件）の内訳
- 昨日 1 日分の PV / UU

## 仕組み

1. `config/websites.yaml` から対象サイトと GA4 プロパティ ID を読み込む
2. GA4 Data API / Admin API で各サイトの指標を取得する
3. Slack Block Kit のメッセージを組み立て、Incoming Webhook で投稿する
4. 失敗したときは Sentry にエラーを送る

## セットアップ

### 1. GA4 のサービスアカウントを用意する

1. Google Cloud で **Google Analytics Data API** と **Google Analytics Admin API** を有効にする
2. サービスアカウントを作成し、JSON キーをダウンロードする
3. 対象の GA4 プロパティに、サービスアカウントのメールアドレスを「閲覧者」として追加する

### 2. 対象サイトを設定する

`config/websites.sample.yaml` をコピーして `config/websites.yaml` を作成し、サイト名と GA4 のプロパティ ID を書きます。

```yaml
websites:
  - name: "メインサイト"
    metrics:
      ga4:
        propertyId: 123456789
```

### 3. 環境変数を設定する

`sample.env` をコピーして `.env` を作成します。

| 変数名             | 必須 | 内容                                                       |
| ------------------ | ---- | ---------------------------------------------------------- |
| `GA_KEYFILE`       | ○    | サービスアカウントの JSON キーのパス                       |
| `SLACK_WEBHOOK`    | ○    | 投稿先の Slack Incoming Webhook URL                        |
| `SENTRY_DSN`       | ○    | エラー送信先の Sentry DSN                                  |
| `CONFIG_FILE_PATH` |      | サイト設定ファイルのパス（既定値: `config/websites.yaml`） |

`.env` と `config/websites.yaml` は `.gitignore` 済みです。

## ローカルで動かす

Node.js（バージョンは `package.json` の `engines.node`）と pnpm が必要です。

```sh
make install   # 依存パッケージのインストール
make run       # ビルドして実行（Slack に投稿されます）
```

## 開発

| コマンド        | 内容               |
| --------------- | ------------------ |
| `make lint/fix` | Prettier で整形    |
| `make lint`     | 整形チェック       |
| `make tsc`      | 型チェック・ビルド |
| `make test`     | テスト（Vitest）   |

ソースは `src/` 以下にレイヤーごとに分かれています。

- `domain/`: 期間計算や Slack メッセージの組み立てなどのロジック
- `application/`: ユースケースと外部サービスのインターフェイス
- `infrastructure/`: GA4・Slack・Sentry との接続
- `config/`: 環境変数・YAML の読み込みと DI コンテナ（Inversify）

## ライセンス

[Apache License 2.0](LICENSE)
