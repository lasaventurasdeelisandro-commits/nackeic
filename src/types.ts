export interface Specialist {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  specialty: string;
  focus: string;
}

export interface Question {
  id: string;
  text: string;
  description: string;
  options?: { value: string; label: string; details?: string }[];
  placeholder?: string;
}

export interface Module {
  id: string;
  title: string;
  icon: string;
  category: "Negocio" | "Tecnología" | "Seguridad y Pagos" | "Operaciones y Crecimiento";
  description: string;
  questions: Question[];
  specialistIds: string[]; // Specialists relevant to this module
}

export interface ModuleAnswers {
  [questionId: string]: string;
}

export interface SpecificationState {
  [moduleId: string]: {
    answers: ModuleAnswers;
    generatedSpec: string;
    isApproved: boolean;
  };
}

// DIRECTO MARKETPLACE TYPES
export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  averagePrice: string;
  countActive: number;
}

export interface Offer {
  id: string;
  requestId: string;
  proId: string;
  proName: string;
  proAvatar: string;
  proRole: string;
  proRating: number;
  proReviews: number;
  badges: string[]; // e.g. ["KYC Biométrico", "Seguro $10k", "Top Rated"]
  price: number;
  estimatedArrivalMin: number;
  message: string;
  status: "pending" | "countered" | "accepted" | "rejected";
  counterPrice?: number;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  title: string;
  category: string;
  description: string;
  address: string;
  urgency: "Inmediata" | "Agendada";
  targetPrice: number;
  clientName: string;
  clientAvatar: string;
  clientPhone: string;
  createdAt: string;
  status: "open" | "negotiating" | "in_progress" | "completed" | "cancelled";
  acceptedOfferId?: string;
  photoUrl?: string;
  locationCoords?: { lat: number; lng: number };
  proCurrentCoords?: { lat: number; lng: number; speedKmH: number; distanceKm: number };
  releaseCode?: string;
  escrowLockedAmount?: number;
}

export interface WalletTransaction {
  id: string;
  type: "income" | "payout" | "escrow_hold" | "escrow_release" | "topup";
  amount: number;
  title: string;
  date: string;
  status: "completed" | "pending";
  referenceId?: string;
}

