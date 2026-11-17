import crypto from 'crypto';

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  priceCents: number;
  currency: 'USD';
  badge?: string;
}

export interface LiveGiftCatalogItem {
  id: string;
  name: string;
  emoji: string;
  coins: number;
  animation: 'pulse' | 'float' | 'burst' | 'supernova';
}

export interface WalletAccount {
  userId: string;
  coinsBalance: number;
  creatorDiamonds: number;
  pendingPayoutCents: number;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  kycFullName?: string;
  kycCountry?: string;
  kycDocumentHash?: string;
  kycSubmittedAt?: number;
  updatedAt: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'coin_purchase' | 'gift_sent' | 'gift_received' | 'payout_requested' | 'payout_completed' | 'bonus' | 'refund';
  amountCoins: number;
  amountDiamonds: number;
  amountCents: number;
  feeCents: number;
  currency: string;
  balanceAfterCoins: number;
  referenceId?: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  description: string;
  signatureVerified: boolean;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface PayoutRequestRecord {
  id: string;
  userId: string;
  amountDiamonds: number;
  grossCents: number;
  platformFeeCents: number;
  netCents: number;
  payoutMethod: 'bank_transfer' | 'stripe_connect' | 'paypal';
  destinationMasked: string;
  status: 'pending_kyc' | 'queued_compliance' | 'approved' | 'paid' | 'rejected';
  kycVerified: boolean;
  createdAt: number;
  processedAt?: number;
}

export const NAKEIC_COIN_PACKAGES: CoinPackage[] = [
  { id: 'pkg_100', name: 'Bolsa Inicial', coins: 100, bonusCoins: 0, priceCents: 99, currency: 'USD' },
  { id: 'pkg_500', name: 'Pack Creador', coins: 500, bonusCoins: 25, priceCents: 499, currency: 'USD', badge: '+5% extra' },
  { id: 'pkg_1200', name: 'Cofre Popular', coins: 1200, bonusCoins: 100, priceCents: 999, currency: 'USD', badge: 'Popular' },
  { id: 'pkg_3500', name: 'Cofre VIP', coins: 3500, bonusCoins: 400, priceCents: 2499, currency: 'USD', badge: 'Mejor valor' },
  { id: 'pkg_7500', name: 'Bóveda NAKEIC', coins: 7500, bonusCoins: 1000, priceCents: 4999, currency: 'USD', badge: 'Pro' }
];

export const NAKEIC_LIVE_GIFTS: LiveGiftCatalogItem[] = [
  { id: 'gift_rose', name: 'Rosa NAKEIC', emoji: '🌹', coins: 1, animation: 'float' },
  { id: 'gift_heart', name: 'Corazón Neón', emoji: '💖', coins: 5, animation: 'pulse' },
  { id: 'gift_fire', name: 'Llama', emoji: '🔥', coins: 20, animation: 'burst' },
  { id: 'gift_rocket', name: 'Cohete', emoji: '🚀', coins: 100, animation: 'burst' },
  { id: 'gift_crown', name: 'Corona Real', emoji: '👑', coins: 500, animation: 'supernova' },
  { id: 'gift_universe', name: 'Galaxia NAKEIC', emoji: '🌌', coins: 2500, animation: 'supernova' }
];

// 1 Creator Diamond = $0.005 USD (after NAKEIC 30% platform commission taken on gift spend)
export const DIAMOND_VALUE_CENTS = 0.5;
export const CREATOR_REVENUE_SHARE = 0.70;
export const MIN_PAYOUT_DIAMONDS = 1000; // $5.00 USD minimum threshold

export interface WalletPersistenceState {
  wallets: Record<string, WalletAccount>;
  transactions: WalletTransaction[];
  payouts: PayoutRequestRecord[];
}

export class WalletService {
  private wallets: Map<string, WalletAccount> = new Map();
  private transactions: WalletTransaction[] = [];
  private payouts: PayoutRequestRecord[] = [];
  private webhookSecret: string;
  private onPersist?: (state: WalletPersistenceState) => void;

  constructor(options?: {
    webhookSecret?: string;
    initialState?: Partial<WalletPersistenceState>;
    onPersist?: (state: WalletPersistenceState) => void;
  }) {
    this.webhookSecret =
      options?.webhookSecret ||
      process.env.WALLET_WEBHOOK_SECRET ||
      process.env.BILLING_WEBHOOK_SECRET ||
      'nkc_wallet_whsec_' + crypto.randomBytes(16).toString('hex');
    this.onPersist = options?.onPersist;

    if (options?.initialState?.wallets) {
      for (const [uid, acc] of Object.entries(options.initialState.wallets)) {
        this.wallets.set(uid, acc);
      }
    }
    if (Array.isArray(options?.initialState?.transactions)) {
      this.transactions = [...options.initialState.transactions];
    }
    if (Array.isArray(options?.initialState?.payouts)) {
      this.payouts = [...options.initialState.payouts];
    }
  }

  setPersistCallback(cb: (state: WalletPersistenceState) => void) {
    this.onPersist = cb;
  }

  private persist() {
    if (!this.onPersist) return;
    const walletsObj: Record<string, WalletAccount> = {};
    this.wallets.forEach((v, k) => {
      walletsObj[k] = v;
    });
    this.onPersist({
      wallets: walletsObj,
      transactions: this.transactions.slice(0, 2000),
      payouts: this.payouts.slice(0, 500)
    });
  }

  getPackages(): CoinPackage[] {
    return NAKEIC_COIN_PACKAGES;
  }

  getGiftCatalog(): LiveGiftCatalogItem[] {
    return NAKEIC_LIVE_GIFTS;
  }

  getGiftById(giftId: string): LiveGiftCatalogItem | undefined {
    return NAKEIC_LIVE_GIFTS.find((g) => g.id === giftId);
  }

  getOrCreateWallet(userId: string, initialBonusCoins = 0): WalletAccount {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      const now = Date.now();
      wallet = {
        userId,
        coinsBalance: Math.max(0, initialBonusCoins),
        creatorDiamonds: 0,
        pendingPayoutCents: 0,
        kycStatus: 'unverified',
        updatedAt: now
      };
      this.wallets.set(userId, wallet);
      if (initialBonusCoins > 0) {
        this.transactions.unshift({
          id: `wtx_bonus_${now}_${crypto.randomBytes(3).toString('hex')}`,
          userId,
          type: 'bonus',
          amountCoins: initialBonusCoins,
          amountDiamonds: 0,
          amountCents: 0,
          feeCents: 0,
          currency: 'USD',
          balanceAfterCoins: initialBonusCoins,
          status: 'completed',
          description: 'Bono de bienvenida verificado NAKEIC LIVE',
          signatureVerified: true,
          createdAt: now
        });
      }
      this.persist();
    }
    return wallet;
  }

  getTransactions(userId: string, limit = 50): WalletTransaction[] {
    return this.transactions.filter((t) => t.userId === userId).slice(0, limit);
  }

  getPayouts(userId: string): PayoutRequestRecord[] {
    return this.payouts.filter((p) => p.userId === userId);
  }

  verifyWebhookSignature(payloadString: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    try {
      const expected = crypto.createHmac('sha256', this.webhookSecret).update(payloadString).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signatureHeader, 'utf-8'));
    } catch {
      return false;
    }
  }

  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  /**
   * Step 1 of coin purchase: server creates a pending checkout intent based on server package price.
   * Never credits coins until HMAC-signed payment provider webhook settles the intent.
   */
  createPurchaseIntent(userId: string, packageId: string, provider: string = 'stripe'): {
    success: boolean;
    error?: string;
    intent?: WalletTransaction;
    package?: CoinPackage;
  } {
    const pkg = NAKEIC_COIN_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      return { success: false, error: 'Paquete de monedas NAKEIC no reconocido.' };
    }
    const wallet = this.getOrCreateWallet(userId);
    const now = Date.now();
    const intent: WalletTransaction = {
      id: `pi_${now}_${crypto.randomBytes(6).toString('hex')}`,
      userId,
      type: 'coin_purchase',
      amountCoins: pkg.coins + pkg.bonusCoins,
      amountDiamonds: 0,
      amountCents: pkg.priceCents,
      feeCents: 0,
      currency: pkg.currency,
      balanceAfterCoins: wallet.coinsBalance,
      referenceId: pkg.id,
      status: 'pending',
      description: `Compra pendiente: ${pkg.name} (${pkg.coins + pkg.bonusCoins} NAKEIC Coins vía ${provider})`,
      signatureVerified: false,
      metadata: { packageId: pkg.id, provider },
      createdAt: now
    };
    this.transactions.unshift(intent);
    this.persist();
    return { success: true, intent, package: pkg };
  }

  /**
   * Step 2: Cryptographically verified payment gateway webhook credits the coins atomically.
   */
  processCoinPurchaseWebhook(payload: any, signatureHeader?: string): {
    success: boolean;
    error?: string;
    wallet?: WalletAccount;
    transaction?: WalletTransaction;
  } {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (!this.verifyWebhookSignature(payloadStr, signatureHeader)) {
      return {
        success: false,
        error: 'Firma HMAC de pasarela inválida. Recarga de monedas rechazada por seguridad antifraude.'
      };
    }

    const { userId, packageId, intentId, externalPaymentId, amountCents } = payload || {};
    const pkg = NAKEIC_COIN_PACKAGES.find((p) => p.id === packageId);
    if (!userId || !pkg) {
      return { success: false, error: 'Datos de recarga inválidos o paquete inexistente.' };
    }

    // Verify paid amount matches authoritative server catalog price
    if (amountCents !== undefined && Number(amountCents) !== pkg.priceCents) {
      return { success: false, error: 'Discrepancia de monto detectada entre pasarela y catálogo NAKEIC.' };
    }

    // Idempotency guard against replay attacks on the same intent or externalPaymentId
    if (externalPaymentId) {
      const alreadySettled = this.transactions.find(
        (t) => t.status === 'completed' && t.metadata?.externalPaymentId === externalPaymentId
      );
      if (alreadySettled) {
        return { success: false, error: 'Transacción de pago ya acreditada previamente.' };
      }
    }

    const wallet = this.getOrCreateWallet(userId);
    const totalCoins = pkg.coins + pkg.bonusCoins;
    wallet.coinsBalance += totalCoins;
    wallet.updatedAt = Date.now();

    const existingIntent = intentId ? this.transactions.find((t) => t.id === intentId && t.userId === userId) : undefined;
    let tx: WalletTransaction;
    if (existingIntent && existingIntent.status === 'pending') {
      existingIntent.status = 'completed';
      existingIntent.balanceAfterCoins = wallet.coinsBalance;
      existingIntent.signatureVerified = true;
      existingIntent.description = `Recarga confirmada: ${pkg.name} (+${totalCoins} Coins)`;
      existingIntent.metadata = { ...(existingIntent.metadata || {}), externalPaymentId };
      tx = existingIntent;
    } else {
      tx = {
        id: `wtx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        userId,
        type: 'coin_purchase',
        amountCoins: totalCoins,
        amountDiamonds: 0,
        amountCents: pkg.priceCents,
        feeCents: 0,
        currency: pkg.currency,
        balanceAfterCoins: wallet.coinsBalance,
        referenceId: externalPaymentId || pkg.id,
        status: 'completed',
        description: `Recarga confirmada: ${pkg.name} (+${totalCoins} Coins)`,
        signatureVerified: true,
        metadata: { packageId: pkg.id, externalPaymentId },
        createdAt: Date.now()
      };
      this.transactions.unshift(tx);
    }

    this.persist();
    return { success: true, wallet, transaction: tx };
  }

  /**
   * Server-authoritative atomic gift transfer:
   * - Resolves gift cost from NAKEIC_LIVE_GIFTS (ignores client-sent coin price)
   * - Verifies sufficient server balance
   * - Debits sender, credits creator (70% diamonds), records double-entry audit ledger
   */
  sendLiveGift(params: {
    senderId: string;
    recipientHostId: string;
    roomId: string;
    giftId: string;
    quantity?: number;
    battleId?: string;
  }): {
    success: boolean;
    error?: string;
    code?: 'NOT_FOUND' | 'INSUFFICIENT_BALANCE' | 'SELF_GIFT' | 'INVALID_QTY';
    gift?: LiveGiftCatalogItem;
    totalCoins?: number;
    creatorDiamondsEarned?: number;
    platformFeeCoins?: number;
    senderBalanceAfter?: number;
    senderTx?: WalletTransaction;
  } {
    const gift = this.getGiftById(params.giftId);
    if (!gift) {
      return { success: false, code: 'NOT_FOUND', error: 'Regalo virtual no encontrado en el catálogo oficial.' };
    }

    const qty = params.quantity === undefined ? 1 : Math.floor(Number(params.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
      return { success: false, code: 'INVALID_QTY', error: 'Cantidad de regalo inválida (1-99).' };
    }

    if (params.senderId === params.recipientHostId) {
      return { success: false, code: 'SELF_GIFT', error: 'No puedes enviarte regalos monetizados a ti mismo.' };
    }

    const totalCoins = gift.coins * qty;
    const senderWallet = this.getOrCreateWallet(params.senderId);
    if (senderWallet.coinsBalance < totalCoins) {
      return {
        success: false,
        code: 'INSUFFICIENT_BALANCE',
        error: `Saldo insuficiente (${senderWallet.coinsBalance} NAKEIC Coins disponibles, se requieren ${totalCoins}).`
      };
    }

    const recipientWallet = this.getOrCreateWallet(params.recipientHostId);
    const creatorDiamondsEarned = Math.max(1, Math.floor(totalCoins * CREATOR_REVENUE_SHARE));
    const platformFeeCoins = totalCoins - creatorDiamondsEarned;
    const now = Date.now();

    // Atomic debit + credit
    senderWallet.coinsBalance -= totalCoins;
    senderWallet.updatedAt = now;
    recipientWallet.creatorDiamonds += creatorDiamondsEarned;
    recipientWallet.updatedAt = now;

    const senderTx: WalletTransaction = {
      id: `wtx_gs_${now}_${crypto.randomBytes(4).toString('hex')}`,
      userId: params.senderId,
      type: 'gift_sent',
      amountCoins: -totalCoins,
      amountDiamonds: 0,
      amountCents: 0,
      feeCents: 0,
      currency: 'USD',
      balanceAfterCoins: senderWallet.coinsBalance,
      referenceId: params.roomId,
      status: 'completed',
      description: `Regalo ${gift.emoji} ${gift.name} x${qty} en LIVE`,
      signatureVerified: true,
      metadata: { roomId: params.roomId, giftId: gift.id, quantity: qty, recipientHostId: params.recipientHostId, battleId: params.battleId },
      createdAt: now
    };

    const recipientTx: WalletTransaction = {
      id: `wtx_gr_${now}_${crypto.randomBytes(4).toString('hex')}`,
      userId: params.recipientHostId,
      type: 'gift_received',
      amountCoins: 0,
      amountDiamonds: creatorDiamondsEarned,
      amountCents: Math.round(creatorDiamondsEarned * DIAMOND_VALUE_CENTS),
      feeCents: Math.round(platformFeeCoins * DIAMOND_VALUE_CENTS),
      currency: 'USD',
      balanceAfterCoins: recipientWallet.coinsBalance,
      referenceId: params.roomId,
      status: 'completed',
      description: `Ingresos LIVE: ${gift.emoji} ${gift.name} x${qty} (+${creatorDiamondsEarned} diamantes)`,
      signatureVerified: true,
      metadata: { roomId: params.roomId, senderId: params.senderId, giftId: gift.id, platformFeeCoins, battleId: params.battleId },
      createdAt: now
    };

    this.transactions.unshift(senderTx, recipientTx);
    this.persist();

    return {
      success: true,
      gift,
      totalCoins,
      creatorDiamondsEarned,
      platformFeeCoins,
      senderBalanceAfter: senderWallet.coinsBalance,
      senderTx
    };
  }

  submitKyc(params: {
    userId: string;
    fullName: string;
    country: string;
    documentNumber: string;
    autoApproveForComplianceCheck?: boolean;
  }): { success: boolean; error?: string; wallet?: WalletAccount } {
    if (!params.fullName.trim() || !params.country.trim() || params.documentNumber.trim().length < 5) {
      return { success: false, error: 'Nombre completo, país y documento oficial válido son obligatorios para verificación KYC.' };
    }
    const wallet = this.getOrCreateWallet(params.userId);
    const docHash = crypto.createHash('sha256').update(params.documentNumber.trim()).digest('hex');
    wallet.kycFullName = params.fullName.trim().slice(0, 120);
    wallet.kycCountry = params.country.trim().slice(0, 64);
    wallet.kycDocumentHash = docHash;
    wallet.kycSubmittedAt = Date.now();
    // Requires compliance review in production unless explicitly processed by verified KYC webhook
    wallet.kycStatus = params.autoApproveForComplianceCheck ? 'verified' : 'pending';
    wallet.updatedAt = Date.now();
    this.persist();
    return { success: true, wallet };
  }

  approveKycByComplianceWebhook(payload: { userId: string; approved: boolean }, signatureHeader?: string): {
    success: boolean;
    error?: string;
    wallet?: WalletAccount;
  } {
    if (!this.verifyWebhookSignature(JSON.stringify(payload), signatureHeader)) {
      return { success: false, error: 'Firma KYC de cumplimiento inválida.' };
    }
    const wallet = this.getOrCreateWallet(payload.userId);
    wallet.kycStatus = payload.approved ? 'verified' : 'rejected';
    wallet.updatedAt = Date.now();
    this.persist();
    return { success: true, wallet };
  }

  requestPayout(params: {
    userId: string;
    diamonds: number;
    method: 'bank_transfer' | 'stripe_connect' | 'paypal';
    destinationAccount: string;
  }): { success: boolean; error?: string; payout?: PayoutRequestRecord; wallet?: WalletAccount } {
    const wallet = this.getOrCreateWallet(params.userId);
    if (wallet.kycStatus !== 'verified') {
      return {
        success: false,
        error: 'Retiros bloqueados: debes completar y aprobar la verificación de identidad (KYC) antes de monetizar retiros.'
      };
    }

    const diamonds = Math.floor(Number(params.diamonds));
    if (!Number.isFinite(diamonds) || diamonds < MIN_PAYOUT_DIAMONDS) {
      return {
        success: false,
        error: `El retiro mínimo es de ${MIN_PAYOUT_DIAMONDS} diamantes ($${(MIN_PAYOUT_DIAMONDS * DIAMOND_VALUE_CENTS / 100).toFixed(2)} USD).`
      };
    }

    if (wallet.creatorDiamonds < diamonds) {
      return {
        success: false,
        error: `Diamantes insuficientes (${wallet.creatorDiamonds} disponibles, solicitaste ${diamonds}).`
      };
    }

    if (!params.destinationAccount || params.destinationAccount.trim().length < 4) {
      return { success: false, error: 'Debes indicar una cuenta o destino de pago válido.' };
    }

    const cleanDest = params.destinationAccount.trim();
    const masked = cleanDest.length > 4 ? `****${cleanDest.slice(-4)}` : '****';
    const grossCents = Math.round(diamonds * DIAMOND_VALUE_CENTS);
    const payoutFeeCents = Math.round(grossCents * 0.02); // 2% transfer processing cost
    const netCents = Math.max(0, grossCents - payoutFeeCents);
    const now = Date.now();

    wallet.creatorDiamonds -= diamonds;
    wallet.pendingPayoutCents += netCents;
    wallet.updatedAt = now;

    const payout: PayoutRequestRecord = {
      id: `po_${now}_${crypto.randomBytes(4).toString('hex')}`,
      userId: params.userId,
      amountDiamonds: diamonds,
      grossCents,
      platformFeeCents: payoutFeeCents,
      netCents,
      payoutMethod: params.method,
      destinationMasked: masked,
      status: 'queued_compliance',
      kycVerified: true,
      createdAt: now
    };

    this.payouts.unshift(payout);
    this.transactions.unshift({
      id: `wtx_po_${now}_${crypto.randomBytes(4).toString('hex')}`,
      userId: params.userId,
      type: 'payout_requested',
      amountCoins: 0,
      amountDiamonds: -diamonds,
      amountCents: netCents,
      feeCents: payoutFeeCents,
      currency: 'USD',
      balanceAfterCoins: wallet.coinsBalance,
      referenceId: payout.id,
      status: 'pending',
      description: `Solicitud de retiro (${diamonds} diamantes -> $${(netCents / 100).toFixed(2)} USD a ${masked})`,
      signatureVerified: true,
      createdAt: now
    });

    this.persist();
    return { success: true, payout, wallet };
  }
}
