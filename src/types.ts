/**
 * SmartCall RPA SDK Type Definitions
 * v2.0 - Real-time RPA patterns (no Redis/BullMQ)
 */

/**
 * 予約リクエスト情報
 */
export interface ReservationRequest {
  /** 予約ID */
  reservation_id: string;
  /** 操作種別 */
  operation: 'create' | 'update' | 'cancel';
  /** 顧客情報 */
  customer: CustomerInfo;
  /** 予約枠情報 */
  slot: SlotInfo;
  /** メニュー情報 */
  menu?: MenuInfo;
  /** スタッフ情報 */
  staff?: StaffInfo;
  /** 備考 */
  notes?: string;
}

/**
 * 顧客情報
 */
export interface CustomerInfo {
  /** 顧客ID */
  customer_id?: string;
  /** 名前（フルネーム） */
  name: string;
  /** 電話番号 */
  phone: string;
  /** メールアドレス */
  email?: string;
  /** 備考 */
  notes?: string;
}

/**
 * 予約枠情報
 */
export interface SlotInfo {
  /** 日付（YYYY-MM-DD形式） */
  date: string;
  /** 開始時刻（HH:MM形式） */
  start_at: string;
  /** 終了時刻（HH:MM形式） */
  end_at?: string;
  /** 所要時間（分） */
  duration_min?: number;
}

/**
 * メニュー情報
 */
export interface MenuInfo {
  /** メニューID */
  menu_id?: string;
  /** 外部メニューID */
  external_menu_id?: string;
  /** メニュー名 */
  menu_name: string;
  /** 価格 */
  price?: number;
}

/**
 * スタッフ情報
 */
export interface StaffInfo {
  /** スタッフID */
  staff_id?: string;
  /** 外部スタッフID */
  external_staff_id?: string;
  /** スタッフ名 */
  staff_name: string;
}

/**
 * SDK設定情報
 */
export interface SmartCallConfig {
  /** API設定ID */
  apiConfigId: number;
  /** 環境（staging/production） */
  environment: string;
}
