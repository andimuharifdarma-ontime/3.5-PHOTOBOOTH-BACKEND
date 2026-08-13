export const KIOSK_PAYMENT_SUCCESS_EVENT = "kiosk-payment-success" as const;
export const KIOSK_PAYMENT_FAILED_EVENT = "kiosk-payment-failed" as const;

export type KioskPaymentMessage =
  | { type: typeof KIOSK_PAYMENT_SUCCESS_EVENT; orderId: string | null }
  | { type: typeof KIOSK_PAYMENT_FAILED_EVENT; orderId: string | null; status?: string };

export function isKioskPaymentMessage(data: unknown): data is KioskPaymentMessage {
  if (!data || typeof data !== "object") return false;
  const msg = data as { type?: string };
  return (
    msg.type === KIOSK_PAYMENT_SUCCESS_EVENT || msg.type === KIOSK_PAYMENT_FAILED_EVENT
  );
}
