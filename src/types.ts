/**
 * SmartCall RPA SDK Type Definitions
 * v2.0 - Real-time RPA patterns (no Redis/BullMQ)
 */

/**
 * 予約リクエスト情報
 */
export interface ReservationRequest {
  /** 予約ID */
  reservationId: string;
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
  customerId?: string;
  /** 名前（姓） */
  lastName: string;
  /** 名前（名） */
  firstName: string;
  /** 電話番号 */
  phone: string;
  /** メールアドレス */
  email?: string;
}

/**
 * 予約枠情報
 */
export interface SlotInfo {
  /** 日付（YYYY-MM-DD形式） */
  date: string;
  /** 開始時刻（HH:MM形式） */
  startTime: string;
  /** 終了時刻（HH:MM形式） */
  endTime?: string;
  /** 所要時間（分） */
  durationMinutes?: number;
}

/**
 * メニュー情報
 */
export interface MenuInfo {
  /** メニューID */
  menuId?: string;
  /** メニュー名 */
  menuName: string;
  /** 価格 */
  price?: number;
}

/**
 * スタッフ情報
 */
export interface StaffInfo {
  /** スタッフID */
  staffId?: string;
  /** スタッフ名 */
  staffName: string;
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
