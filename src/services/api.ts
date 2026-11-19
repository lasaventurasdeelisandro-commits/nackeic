/**
 * Diclik.com — Enterprise API Client
 * Handles real HTTP communication with Express & PostgreSQL backend
 */

const configuredBase = (import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") || "";
const API_BASE = configuredBase.endsWith("/api/v1") ? configuredBase : `${configuredBase}/api/v1`;

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("directo_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response, defaultMsg: string) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || defaultMsg);
  }
  return json;
}

export const api = {
  auth: {
    async register(data: {
      email: string;
      password: string;
      role: "cliente" | "tecnico" | "profesional";
      fullName: string;
      phone?: string;
      trade?: string;
      address?: string;
    }) {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await handleResponse(res, "Error al registrar usuario");
      if (json.token && typeof window !== "undefined") {
        localStorage.setItem("directo_token", json.token);
      }
      return json;
    },

    async login(email: string, password: string) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await handleResponse(res, "Error al iniciar sesión");
      if (json.token && typeof window !== "undefined") {
        localStorage.setItem("directo_token", json.token);
      }
      return json;
    },

    async getMe() {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) return null;
      return await res.json();
    },

    async updateProfile(data: {
      fullName?: string;
      phone?: string;
      address?: string;
      bio?: string;
      hourlyRate?: number;
      isAvailable?: boolean;
    }) {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res, "Error al actualizar perfil");
    },

    async forgotPassword(email: string) {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      return handleResponse(res, "Error al solicitar recuperación");
    },

    async resetPassword(token: string, newPassword: string) {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      return handleResponse(res, "Error al restablecer contraseña");
    },

    async logout() {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { ...getAuthHeader() }
        });
      } catch {
        // Ignore network errors when clearing client session
      } finally {
        if (typeof window !== "undefined") {
          localStorage.removeItem("directo_token");
        }
      }
    }
  },

  services: {
    async getCategories() {
      const res = await fetch(`${API_BASE}/categories`);
      return handleResponse(res, "Error al consultar categorías");
    },

    async list(filters?: { category?: string; targetRole?: string; status?: string; clientId?: string }) {
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.targetRole) params.append("targetRole", filters.targetRole);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.clientId) params.append("clientId", filters.clientId);

      const res = await fetch(`${API_BASE}/services?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al consultar servicios");
    },

    async create(data: {
      title: string;
      description: string;
      categoryId?: string;
      targetRole?: "tecnico" | "profesional";
      address: string;
      lat?: number;
      lng?: number;
      urgency?: "urgente" | "express" | "programado";
      budgetStrategy?: "intemperie" | "minimo";
      minBudget?: number;
      photos?: string[];
    }) {
      const res = await fetch(`${API_BASE}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res, "Error al publicar servicio");
    },

    async getById(serviceId: string) {
      const res = await fetch(`${API_BASE}/services/${serviceId}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al consultar detalle de servicio");
    },

    async update(serviceId: string, data: { title?: string; description?: string; address?: string; minBudget?: number; urgency?: "urgente" | "express" | "programado" }) {
      const res = await fetch(`${API_BASE}/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res, "Error al actualizar servicio");
    },

    async remove(serviceId: string) {
      const res = await fetch(`${API_BASE}/services/${serviceId}`, {
        method: "DELETE",
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cancelar servicio");
    },

    async getOffers(serviceId: string) {
      const res = await fetch(`${API_BASE}/services/${serviceId}/offers`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al obtener ofertas");
    },

    async submitOffer(serviceId: string, price: number, etaMinutes: number, message?: string) {
      const res = await fetch(`${API_BASE}/services/${serviceId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ price, etaMinutes, message })
      });
      return handleResponse(res, "Error al enviar oferta");
    },

    async counterOffer(offerId: string, counterPrice: number) {
      const res = await fetch(`${API_BASE}/offers/${offerId}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ counterPrice })
      });
      return handleResponse(res, "Error al enviar contraoferta");
    },

    async rejectOffer(offerId: string) {
      const res = await fetch(`${API_BASE}/offers/${offerId}/reject`, {
        method: "POST",
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al rechazar oferta");
    },

    async acceptOffer(offerId: string) {
      const res = await fetch(`${API_BASE}/offers/${offerId}/accept`, {
        method: "POST",
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al aceptar oferta");
    },

    async listContracts() {
      const res = await fetch(`${API_BASE}/contracts`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al consultar contratos");
    },

    async updateContractStatus(contractId: string, status: "active_in_transit" | "in_progress") {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ status })
      });
      return handleResponse(res, "Error al actualizar estado de servicio");
    },

    async shareContractLocation(contractId: string, location: { lat: number; lng: number }) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/location`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(location)
      });
      return handleResponse(res, "Error al compartir ubicación");
    },

    async getContractLocation(contractId: string) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/location`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al consultar ubicación");
    },

    async verifyOtp(contractId: string, otpInput: string) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ otpInput })
      });
      return handleResponse(res, "Error al verificar código OTP");
    },

    async cancelContract(contractId: string, scenario: "client_before_arrival" | "client_after_arrival" | "tech_circumvention", reason: string) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ scenario, reason })
      });
      return handleResponse(res, "Error al cancelar contrato");
    },

    async openDispute(contractId: string, reason: string) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ reason })
      });
      return handleResponse(res, "Error al abrir reclamación");
    },

    async submitReview(contractId: string, rating: number, comment: string) {
      const res = await fetch(`${API_BASE}/contracts/${contractId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ rating, comment })
      });
      return handleResponse(res, "Error al enviar calificación");
    },

    async getProfessionalReviews(proId: string) {
      const res = await fetch(`${API_BASE}/professionals/${proId}/reviews`);
      return handleResponse(res, "Error al consultar reseñas");
    },

    async getNotifications() {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al consultar notificaciones");
    },

    async markNotificationRead(id: string) {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al marcar notificación");
    }
  },

  radar: {
    async scan(params?: { lat?: number; lng?: number; radius?: number; trade?: string; sort?: string }) {
      const query = new URLSearchParams();
      if (params?.lat !== undefined) query.append("lat", params.lat.toString());
      if (params?.lng !== undefined) query.append("lng", params.lng.toString());
      if (params?.radius) query.append("radius", params.radius.toString());
      if (params?.trade) query.append("trade", params.trade);
      if (params?.sort) query.append("sort", params.sort);

      const res = await fetch(`${API_BASE}/radar/specialists?${query.toString()}`);
      return handleResponse(res, "Error al escanear radar");
    }
  },

  chat: {
    async getConversations() {
      const res = await fetch(`${API_BASE}/chat/conversations`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar conversaciones");
    },

    async getMessages(conversationId: string) {
      const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar mensajes");
    },

    async sendMessage(conversationId: string, content: string, messageType = "text") {
      const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ content, messageType })
      });
      return handleResponse(res, "Error al enviar mensaje");
    }
  },

  wallet: {
    async getLedger() {
      const res = await fetch(`${API_BASE}/wallet/ledger`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar saldo");
    },

    async getTransactions() {
      const res = await fetch(`${API_BASE}/wallet/transactions`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar transacciones");
    },

    async testDeposit(amount: number) {
      const res = await fetch(`${API_BASE}/wallet/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ amount })
      });
      return handleResponse(res, "Error al recargar saldo");
    },

    async withdraw(amount: number, bankAccount: string, bankName: string, idempotencyKey?: string) {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          amount,
          destinationAccount: `${bankName.trim()} - ${bankAccount.trim()}`,
          idempotencyKey
        })
      });
      return handleResponse(res, "Error al solicitar retiro bancario");
    }
  },

  admin: {
    async getMetrics() {
      const res = await fetch(`${API_BASE}/admin/metrics`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar métricas de administración");
    },

    async getUsers(role?: string, status?: string) {
      const params = new URLSearchParams();
      if (role) params.append("role", role);
      if (status) params.append("status", status);

      const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar usuarios");
    },

    async verifyProfessional(userId: string, verified: boolean) {
      const res = await fetch(`${API_BASE}/admin/professionals/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ verified })
      });
      return handleResponse(res, "Error al actualizar acreditación");
    },

    async getDisputes() {
      const res = await fetch(`${API_BASE}/admin/disputes`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res, "Error al cargar disputas");
    },

    async resolveDispute(disputeId: string, decision: "refund_client" | "release_pro", notes?: string) {
      const res = await fetch(`${API_BASE}/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ decision, notes })
      });
      return handleResponse(res, "Error al resolver disputa");
    },

    async updateUserStatus(userId: string, status: "active" | "suspended" | "banned") {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ status })
      });
      return handleResponse(res, "Error al actualizar estado de usuario");
    }
  }
};
