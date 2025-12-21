# My RPA API

SmartCall RPA APIプロジェクトのテンプレートです。

## セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .env を編集してログインID/パスワードを設定

# ローカル開発（スタブモード）
npm run dev
```

## ディレクトリ構成

```
my-rpa-api/
├── Dockerfile          # 必須：デプロイ用
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts        # エントリポイント
│   ├── server.ts       # Expressサーバー
│   ├── worker.ts       # BullMQ Worker
│   └── pages/          # Page Objects
│       └── LoginPage.ts
└── screenshots/        # スクリーンショット保存先
```

## 実装手順

1. **LoginPage.ts を編集**: 対象サイトのセレクターを設定
2. **worker.ts を編集**: ビジネスロジックを実装
   - 空き枠取得
   - 予約作成
   - 予約キャンセル
3. **ローカルテスト**: `npm run dev` で動作確認
4. **GitHubにプッシュ**: 開発者ポータルからデプロイ

## デプロイ

1. GitHubにプッシュ
2. [開発者ポータル](https://dev-portal.smartcall.jp)からデプロイ

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `PORT` | サーバーポート（デフォルト: 3000） |
| `LOGIN_KEY` | ログインID |
| `LOGIN_PASSWORD` | ログインパスワード |
| `SMARTCALL_MODE` | 動作モード（stub: ローカル開発） |
