import express, { Request } from "express";

export interface PaymentWebhookRequest extends Request {
  rawPaymentBody?: Buffer;
}

export const jsonBody = express.json({
  limit: "2mb",
  verify: (req: PaymentWebhookRequest, _res, body) => {
    if (req.url?.split("?")[0] === "/api/v1/wallet/webhooks/payment") {
      req.rawPaymentBody = Buffer.from(body);
    }
  },
});
