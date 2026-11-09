import crypto from 'crypto';

export interface CommercialPlan {
  id: string;
  code: 'free' | 'premium' | 'business';
  name: string;
  priceCents: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  maxFileUploadBytes: number;
  maxGroupMembers: number;
  aiTranscription: boolean;
  businessTools: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planCode: 'free' | 'premium' | 'business';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  provider: 'stripe' | 'google_play' | 'revenue_cat' | 'manual';
  externalSubscriptionId?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CommercialAuditLog {
  id: string;
  userId: string;
  action: 'checkout_initiated' | 'subscription_activated' | 'subscription_renewed' | 'subscription_canceled' | 'payment_failed';
  amountCents: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  signatureVerified: boolean;
  metadata: Record<string, any>;
  timestamp: number;
}

export const NAKEIC_PLANS: Record<string, CommercialPlan> = {
  free: {
    id: 'plan_free',
    code: 'free',
    name: 'NAKEIC Estándar (Gratuito)',
    priceCents: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      'Mensajería instantánea ilimitada sin publicidad',
      'Cifrado de extremo a extremo Double Ratchet',
      'Llamadas de voz y video en alta definición',
      'Grupos de hasta 200 personas',
      'Envío de archivos de hasta 100 MB'
    ],
    maxFileUploadBytes: 100 * 1024 * 1024,
    maxGroupMembers: 200,
    aiTranscription: false,
    businessTools: false
  },
  premium: {
    id: 'plan_premium',
    code: 'premium',
    name: 'NAKEIC Premium',
    priceCents: 499, // $4.99 / mes
    currency: 'USD',
    interval: 'month',
    features: [
      'Envío de archivos de hasta 4 GB',
      'Transcripción de notas de voz con IA Gemini',
      'Insignia de verificación exclusiva en perfil',
      'Grupos ampliados de hasta 10,000 personas',
      'Canales ilimitados y reacciones personalizadas'
    ],
    maxFileUploadBytes: 4 * 1024 * 1024 * 1024,
    maxGroupMembers: 10000,
    aiTranscription: true,
    businessTools: false
  },
  business: {
    id: 'plan_business',
    code: 'business',
    name: 'NAKEIC Business',
    priceCents: 1499, // $14.99 / mes
    currency: 'USD',
    interval: 'month',
    features: [
      'Todo lo incluido en Premium',
      'Herramientas empresariales: catálogo de productos',
      'Respuestas rápidas configurables con atajo /',
      'Etiquetas de clientes y canales comerciales',
      'Soporte multi-agente y API de integración'
    ],
    maxFileUploadBytes: 4 * 1024 * 1024 * 1024,
    maxGroupMembers: 50000,
    aiTranscription: true,
    businessTools: true
  }
};

export class BillingService {
  private subscriptions: Map<string, UserSubscription> = new Map();
  private auditLogs: CommercialAuditLog[] = [];
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret || process.env.BILLING_WEBHOOK_SECRET || 'nkc_live_whsec_' + crypto.randomBytes(16).toString('hex');
  }

  getPlans(): CommercialPlan[] {
    return Object.values(NAKEIC_PLANS);
  }

  getUserSubscription(userId: string): UserSubscription {
    const existing = this.subscriptions.get(userId);
    const now = Date.now();
    if (existing) {
      if (existing.currentPeriodEnd < now && existing.status === 'active') {
        existing.status = 'past_due';
      }
      return existing;
    }
    // Default free plan for every user
    const freeSub: UserSubscription = {
      id: `sub_free_${userId}`,
      userId,
      planCode: 'free',
      status: 'active',
      provider: 'manual',
      currentPeriodStart: now,
      currentPeriodEnd: now + 365 * 24 * 3600 * 1000,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now
    };
    this.subscriptions.set(userId, freeSub);
    return freeSub;
  }

  verifyWebhookSignature(payloadString: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(payloadString);
      const computed = hmac.digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  processPaymentWebhook(payload: any, signatureHeader?: string): { success: boolean; error?: string } {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const isValid = this.verifyWebhookSignature(payloadStr, signatureHeader);

    // Anti-fraud: reject activations without verified webhook signature
    if (!isValid) {
      this.logAudit({
        id: `aud_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId: payload?.userId || 'unknown',
        action: 'payment_failed',
        amountCents: payload?.amountCents || 0,
        currency: payload?.currency || 'USD',
        status: 'failed',
        signatureVerified: false,
        metadata: { reason: 'Invalid or missing cryptographic webhook signature' },
        timestamp: Date.now()
      });
      return { success: false, error: 'Firma criptográfica de webhook inválida. Activación rechazada por protección antifraude.' };
    }

    const { userId, planCode, provider, externalSubscriptionId, amountCents, currency } = payload;
    if (!userId || !planCode || !NAKEIC_PLANS[planCode]) {
      return { success: false, error: 'Carga útil de facturación incompleta o plan no reconocido.' };
    }

    const now = Date.now();
    const periodEnd = now + 30 * 24 * 3600 * 1000; // 30 days
    const sub: UserSubscription = {
      id: `sub_${userId}_${now}`,
      userId,
      planCode,
      status: 'active',
      provider: provider || 'stripe',
      externalSubscriptionId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now
    };

    this.subscriptions.set(userId, sub);

    this.logAudit({
      id: `aud_${now}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      action: 'subscription_activated',
      amountCents: amountCents || NAKEIC_PLANS[planCode].priceCents,
      currency: currency || 'USD',
      status: 'success',
      signatureVerified: true,
      metadata: { planCode, provider, externalSubscriptionId },
      timestamp: now
    });

    return { success: true };
  }

  private logAudit(entry: CommercialAuditLog) {
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs.shift();
    }
  }

  getAuditLogs(): CommercialAuditLog[] {
    return [...this.auditLogs];
  }

  getWebhookSecret(): string {
    return this.webhookSecret;
  }
}

export const billingService = new BillingService();
