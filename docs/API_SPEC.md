# RPA共通インターフェース仕様書

**バージョン**: 1.0
**作成日**: 2025-12-18
**対象**: SmartCall RPA連携開発者

---

## 1. 概要

本仕様書は、SmartCallと各予約システム（BeautyMerit、HotPepper、LINE予約など）をRPA連携する際の共通インターフェースを定義します。

### 1.1 アーキテクチャ

```
┌─────────────┐      sync-cycle       ┌─────────────┐      RPA処理      ┌─────────────┐
│  SmartCall  │ ───────────────────▶ │  RPA Server │ ───────────────▶ │  予約システム │
│   (admin)   │                       │  (Node.js)  │                   │ (BeautyMerit │
│             │ ◀─────────────────── │             │ ◀─────────────── │  HotPepper等) │
└─────────────┘      callback         └─────────────┘                   └─────────────┘
```

### 1.2 通信フロー

1. SmartCallがRPAサーバーに`sync-cycle`リクエストを送信
2. RPAサーバーが予約システムにアクセスし処理を実行
3. RPAサーバーがSmartCallに`callback`で結果を通知

---

## 2. エンドポイント

### 2.1 sync-cycle（SmartCall → RPA）

予約同期サイクルを開始するリクエスト。

#### リクエスト

```
POST /{provider}/sync-cycle
Content-Type: application/json
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `job_id` | string | Yes | ジョブ識別子（UUID形式） |
| `external_shop_id` | string | Yes | 予約システム側の店舗ID |
| `callback_url` | string | Yes | 結果通知先URL |
| `date_from` | string | No | 同期開始日（YYYY-MM-DD）デフォルト: 当日 |
| `date_to` | string | No | 同期終了日（YYYY-MM-DD）デフォルト: 7日後 |
| `reservations` | array | No | 予約操作リスト |

#### reservations配列の要素

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `reservation_id` | string | Yes | SmartCall側の予約ID |
| `operation` | string | Yes | 操作種別: `create` / `cancel` |
| `date` | string | Yes | 予約日（YYYY-MM-DD） |
| `time` | string | Yes | 予約時刻（HH:MM） |
| `duration_min` | number | No | 所要時間（分）デフォルト: 30 |
| `customer_name` | string | Yes | 顧客名 |
| `customer_phone` | string | Yes | 顧客電話番号 |
| `party_size` | number | No | 人数 デフォルト: 1 |
| `menu_name` | string | No | メニュー名 |
| `notes` | string | No | 備考 |

#### リクエスト例

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_shop_id": "73510325",
  "callback_url": "http://192.168.20.50:3003/internal/beautymerit/sync-cycle-callback",
  "date_from": "2025-12-18",
  "date_to": "2025-12-25",
  "reservations": [
    {
      "reservation_id": "sc_res_1734500000000_abc123",
      "operation": "create",
      "date": "2025-12-20",
      "time": "14:00",
      "duration_min": 60,
      "customer_name": "山田 太郎",
      "customer_phone": "090-1234-5678",
      "party_size": 1,
      "menu_name": "カット",
      "notes": "初めてのご来店"
    }
  ]
}
```

#### レスポンス

```json
{
  "success": true,
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Job accepted"
}
```

| ステータス | 説明 |
|-----------|------|
| 200 | ジョブ受付成功 |
| 400 | リクエスト形式エラー |
| 401 | 認証エラー |
| 500 | サーバーエラー |

---

### 2.2 callback（RPA → SmartCall）

RPA処理結果をSmartCallに通知。

#### リクエスト

```
POST {callback_url}
Content-Type: application/json
```

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `job_id` | string | Yes | 対応するジョブID |
| `external_shop_id` | string | Yes | 店舗ID |
| `status` | string | Yes | ジョブ全体のステータス |
| `reservation_results` | array | No | 予約操作結果リスト |
| `available_slots` | array | No | 空き枠情報 |
| `error` | object | No | エラー情報 |

#### statusの値

| 値 | 説明 |
|------|------|
| `success` | 全処理成功 |
| `partial_success` | 一部成功 |
| `failed` | 全処理失敗 |

#### reservation_results配列の要素

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `reservation_id` | string | SmartCall側の予約ID |
| `operation` | string | 操作種別: `create` / `cancel` |
| `status` | string | 結果: `success` / `conflict` / `failed` |
| `external_reservation_id` | string | 予約システム側の予約ID（成功時） |
| `error_message` | string | エラーメッセージ（失敗時） |

#### available_slots配列の要素

| パラメータ | 型 | 説明 |
|-----------|------|------|
| `date` | string | 日付（YYYY-MM-DD） |
| `time` | string | 時刻（HH:MM） |
| `duration_min` | number | 所要時間（分） |
| `stock` | number | 空き枠数 |
| `resource_name` | string | リソース名（担当者名など） |

#### コールバック例

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_shop_id": "73510325",
  "status": "success",
  "reservation_results": [
    {
      "reservation_id": "sc_res_1734500000000_abc123",
      "operation": "create",
      "status": "success",
      "external_reservation_id": "BM-2025121800001"
    }
  ],
  "available_slots": [
    {
      "date": "2025-12-20",
      "time": "09:00",
      "duration_min": 30,
      "stock": 2
    },
    {
      "date": "2025-12-20",
      "time": "09:30",
      "duration_min": 30,
      "stock": 1
    }
  ]
}
```

---

## 3. 予約ステータス遷移

### 3.1 SmartCall側のステータス

```
                    ┌─────────────┐
                    │   pending   │ ← 電話で予約受付
                    └──────┬──────┘
                           │ sync-cycle送信
                           ▼
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
    ┌─────────────────┐       ┌─────────────────┐
    │    confirmed    │       │   sync_failed   │
    │   （予約成功）    │       │  （同期失敗）    │
    └─────────────────┘       └─────────────────┘
              │
              │ キャンセル要求
              ▼
    ┌─────────────────┐
    │ cancel_pending  │
    └────────┬────────┘
             │ sync-cycle送信
             ▼
    ┌─────────────────┐       ┌─────────────────┐
    │    cancelled    │       │    conflict     │
    │ （キャンセル完了） │       │   （競合発生）   │
    └─────────────────┘       └─────────────────┘
```

### 3.2 ステータスマッピング

| RPAコールバック結果 | SmartCallステータス |
|-------------------|-------------------|
| `success` (create) | `confirmed` |
| `success` (cancel) | `cancelled` |
| `conflict` | `conflict` |
| `failed` | `sync_failed` |

---

## 4. エラーハンドリング

### 4.1 エラーコード

| コード | 説明 | 対処 |
|--------|------|------|
| `AUTH_FAILED` | 認証失敗 | 認証情報を確認 |
| `SHOP_NOT_FOUND` | 店舗が見つからない | external_shop_idを確認 |
| `SLOT_NOT_AVAILABLE` | 指定時間に空きなし | 別の時間を提案 |
| `DUPLICATE_RESERVATION` | 重複予約 | 既存予約を確認 |
| `RESERVATION_NOT_FOUND` | キャンセル対象の予約なし | 予約IDを確認 |
| `SYSTEM_ERROR` | システムエラー | リトライまたは手動対応 |
| `TIMEOUT` | タイムアウト | リトライ |

### 4.2 エラーレスポンス例

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "external_shop_id": "73510325",
  "status": "failed",
  "reservation_results": [
    {
      "reservation_id": "sc_res_1734500000000_abc123",
      "operation": "create",
      "status": "failed",
      "error_code": "SLOT_NOT_AVAILABLE",
      "error_message": "指定された時間帯に空きがありません"
    }
  ],
  "error": {
    "code": "PARTIAL_FAILURE",
    "message": "一部の予約処理に失敗しました"
  }
}
```

---

## 5. 認証

### 5.1 APIキー認証（オプション）

```
Authorization: Bearer {api_key}
```

現時点では内部ネットワーク通信のため認証はオプションですが、将来的に外部連携する場合は必須とします。

---

## 6. タイムアウト・リトライ

| 項目 | 値 |
|------|------|
| sync-cycleタイムアウト | 30秒 |
| callbackタイムアウト | 10秒 |
| リトライ回数 | 3回 |
| リトライ間隔 | 1秒、2秒、4秒（指数バックオフ） |

---

## 7. プロバイダー別エンドポイント

| プロバイダー | sync-cycleエンドポイント |
|-------------|------------------------|
| BeautyMerit | `POST /beautymerit/sync-cycle` |
| HotPepper | `POST /hotpepper/sync-cycle` |
| LINE予約 | `POST /line/sync-cycle` |

---

## 8. 実装チェックリスト

新しいRPA連携を実装する際のチェックリスト:

- [ ] sync-cycleエンドポイントの実装
- [ ] コールバック送信の実装
- [ ] 認証処理の実装（必要な場合）
- [ ] エラーハンドリングの実装
- [ ] リトライ処理の実装
- [ ] ログ出力の実装
- [ ] ローカル環境でのテスト
- [ ] ステージング環境での統合テスト
- [ ] 本番環境へのデプロイ

---

## 9. 参考実装

BeautyMerit連携の実装を参考にしてください:
- リポジトリ: `kirirom-digital/milestone_smartcall_rpa_rpa-beautymerit`
- エンドポイント実装: `src/routes/sync-cycle.ts`
- コールバック送信: `src/services/callback.ts`

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2025-12-18 | 初版作成 |
