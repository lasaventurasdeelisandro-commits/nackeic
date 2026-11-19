import React, { useState, useEffect, useRef } from "react";
import { DiclikOperations } from "./DiclikOperations";
import { api } from "../services/api.ts";
import { DiclikAccountModal, AuthUserSummary } from "./DiclikAccountModal.tsx";
import {
  Search,
  CheckCircle2,
  Navigation,
  QrCode,
  CreditCard,
  Zap,
  Wrench,
  ShieldCheck,
  MapPin,
  RefreshCw,
  User,
  Bell,
  Clock,
  Sparkles,
  ArrowRight,
  Maximize2,
  Lock,
  Download,
  Share2,
  PhoneCall,
  MessageCircle,
  FileCheck,
  Calculator,
  Compass,
  Check,
  Star,
  Layers,
  Filter,
  Car,
  Wind,
  Key,
  BadgeCheck,
  X,
  AlertCircle,
  Radio,
  Sliders,
  Send,
  ArrowLeft,
  Navigation2,
  DollarSign,
  Briefcase,
  Volume2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  SlidersHorizontal,
  ArrowUpDown,
  ThumbsUp,
  Tag,
  Phone,
  Flame,
  MessageSquare,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  Eye,
  HelpCircle,
  CheckSquare,
  Info,
  Plus,
  Minus,
  RotateCcw,
  ThumbsDown,
  Sun,
  FileText,
  Stethoscope,
  Scale,
  ShieldAlert,
  GraduationCap,
  HeartPulse,
  Activity,
  Receipt,
  Percent,
  AlertTriangle,
  Wallet,
  Banknote,
  FileWarning,
  List,
  Smartphone
} from "lucide-react";

export interface CancellationFinancials {
  totalDealPrice: number;
  scenario: "success" | "client_before_arrival" | "client_after_arrival" | "tech_circumvention";
  penaltyRatePercent: number; // 15% or 20% or 100%
  penaltyAmount: number;
  platformCutPercentOfPenalty: number; // 15% or 20% or 100%
  platformEarnings: number; // Directo earnings: e.g. 15% of 15% or 20% of 20%
  specialistCompensation: number; // What tech gets
  clientRefundAmount: number; // What client gets back
  reasonTitle: string;
  notes: string;
}

export function calculateFinancialBreakdown(
  dealPrice: number,
  scenario: "success" | "client_before_arrival" | "client_after_arrival" | "tech_circumvention"
): CancellationFinancials {
  const price = Math.max(0, dealPrice || 3000);

  if (scenario === "success") {
    // 30% Base Platform Commission on successfully completed negotiation
    const platformCommission = price * 0.30;
    const specialistPayout = price * 0.70;
    return {
      totalDealPrice: price,
      scenario: "success",
      penaltyRatePercent: 0,
      penaltyAmount: 0,
      platformCutPercentOfPenalty: 30,
      platformEarnings: platformCommission,
      specialistCompensation: specialistPayout,
      clientRefundAmount: 0,
      reasonTitle: "Servicio Concluido con Éxito (Comisión 30%)",
      notes: "Cobro del 30% de la negociación final para la plataforma Diclik.com y 70% desembolsado al especialista."
    };
  }

  if (scenario === "client_before_arrival") {
    // 15% penalty if client cancels BEFORE arrival. Directo earns 15% OF the 15% penalty. Specialist gets 85% of penalty. Client refunded 85%.
    const penalty = price * 0.15;
    const platformGain = penalty * 0.15; // 15% del 15%
    const techGain = penalty * 0.85; // 85% del 15%
    const clientRefund = price - penalty;
    return {
      totalDealPrice: price,
      scenario: "client_before_arrival",
      penaltyRatePercent: 15,
      penaltyAmount: penalty,
      platformCutPercentOfPenalty: 15,
      platformEarnings: platformGain,
      specialistCompensation: techGain,
      clientRefundAmount: clientRefund,
      reasonTitle: "Multa de Cancelación Anticipada (En Camino - 15%)",
      notes: "El cliente canceló antes de la llegada. Multa de 15% por concepto de consulta/chequeo técnico reservado. La plataforma gana el 15% del 15% (RD$ " + platformGain.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ") y el especialista recibe el 85% restante (RD$ " + techGain.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ")."
    };
  }

  if (scenario === "client_after_arrival") {
    // 20% penalty if client cancels AFTER arrival (in situ). Directo earns 20% OF the 20% penalty. Specialist gets 80% of penalty. Client refunded 80%.
    const penalty = price * 0.20;
    const platformGain = penalty * 0.20; // 20% del 20%
    const techGain = penalty * 0.80; // 80% del 20%
    const clientRefund = price - penalty;
    return {
      totalDealPrice: price,
      scenario: "client_after_arrival",
      penaltyRatePercent: 20,
      penaltyAmount: penalty,
      platformCutPercentOfPenalty: 20,
      platformEarnings: platformGain,
      specialistCompensation: techGain,
      clientRefundAmount: clientRefund,
      reasonTitle: "Pago por Chequeo Técnico / Diagnóstico In Situ (20%)",
      notes: "El especialista ya se presentó en el lugar. Multa del 20% por diagnóstico y chequeo presencial. La plataforma gana el 20% del 20% (RD$ " + platformGain.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ") y el especialista recibe el 80% restante (RD$ " + techGain.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ")."
    };
  }

  // tech_circumvention (Técnico o Profesional cancela: Se asume que el negocio se hizo por fuera)
  const fullPlatformFee = price * 0.30;
  return {
    totalDealPrice: price,
    scenario: "tech_circumvention",
    penaltyRatePercent: 100,
    penaltyAmount: price,
    platformCutPercentOfPenalty: 100,
    platformEarnings: fullPlatformFee,
    specialistCompensation: -fullPlatformFee, // Débito por infracción contractual / negocio por fuera
    clientRefundAmount: price, // Devolución total del 100% al cliente
    reasonTitle: "Cancelación por Proveedor (Cláusula Anti-Negocio por Fuera)",
    notes: "Cancelación efectuada por el técnico/profesional. Se determina presunción de negocio acordado por fuera. Se cobra el monto total de la comisión de la plataforma (RD$ " + fullPlatformFee.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ") a la cuenta del proveedor y se reembolsa el 100% al cliente."
  };
}

export interface NegotiationTurn {
  id: string;
  sender: "client" | "tech";
  senderName: string;
  avatar: string;
  text: string;
  price?: number;
  actionType: "initial" | "counter" | "accept" | "reject";
  timestamp: string;
  reason?: string;
}

export type ServiceCategoryKey =
  | "salud"
  | "legal"
  | "plomeria"
  | "electricidad"
  | "cerrajeria"
  | "climatizacion"
  | "mecanica"
  | "arquitectura"
  | "ingenieria"
  | "contabilidad"
  | "veterinaria"
  | "otro";

export interface AreaTaxonomy {
  id: ServiceCategoryKey;
  name: string;
  shortLabel: string;
  icon: string;
  roleName: string;
  doctorOrLawyerTitle: string;
  requiredCredential: string;
  credentialSample: string;
  targetRole: "tecnico" | "profesional";
  keywordsRegex: RegExp;
  description: string;
}

export interface NearbySpecialist {
  id: string;
  name: string;
  type: "tecnico" | "profesional";
  category: ServiceCategoryKey;
  categoryLabel: string;
  avatar: string;
  initials: string;
  rating: number;
  reviewsCount: number;
  distanceKm: number;
  etaMin: number;
  basePrice: number;
  negotiatedPrice?: number;
  priceNote?: string;
  status: "disponible" | "en_servicio" | "en_camino";
  badges: string[];
  vehicle: string;
  phone: string;
  address: string;
  latOffset: number; // percentage from top
  lngOffset: number; // percentage from left
  specialty: string;
  quoteMessage?: string;
  photoEvaluationNote?: string;
  licenseNumber?: string;
}

export interface CustomerServiceRequest {
  id: string;
  clientName: string;
  clientAvatar: string;
  clientPhone: string;
  clientRating: number;
  clientServicesCount: number;
  category: ServiceCategoryKey;
  categoryLabel: string;
  serviceTitle: string;
  problemDescription: string;
  problemDetails?: string;
  clientAddress: string;
  distanceKm: number;
  etaMin: number;
  offeredBudget: number;
  priceStrategy?: "intemperie" | "minimo";
  minPrice?: number;
  photos?: string[];
  escrowSecured: boolean;
  urgency: "urgente" | "express" | "programado";
  timeAgo: string;
  latOffset: number;
  lngOffset: number;
  targetRole: "tecnico" | "profesional" | "ambos";
  status: "disponible" | "aceptado" | "en_camino" | "en_sitio" | "completado";
  requiredTradeLabel?: string;
}

export const AREA_TAXONOMIES: Record<ServiceCategoryKey, AreaTaxonomy> = {
  salud: {
    id: "salud",
    name: "Salud, Medicina & Pediatría",
    shortLabel: "Salud & Pediatría",
    icon: "🩺",
    roleName: "Médico Colegiado / Pediatra",
    doctorOrLawyerTitle: "Médico Colegiado / Pediatra",
    requiredCredential: "Exequátur del Poder Ejecutivo y Carnet del Colegio Médico Dominicano (CMD)",
    credentialSample: "CMD #14892 • Exeq. #8821",
    targetRole: "profesional",
    keywordsRegex: /pediatr|m[eé]dic|salud|doctor|cardi[oó]log|cl[íi]nic|ginecol|enfermer|cirujan|odont[oó]log|dentist|psiquiatr|terapi|vacun|nutrici|urgencia m[eé]dica|pediatra/i,
    description: "Área médica regulada exclusivamente para médicos con Exequátur y registro en el Colegio Médico Dominicano."
  },
  legal: {
    id: "legal",
    name: "Legal, Jurídico & Notarial",
    shortLabel: "Legal & Abogados",
    icon: "⚖️",
    roleName: "Abogado con Exequátur",
    doctorOrLawyerTitle: "Abogado con Exequátur y Cédula Profesional",
    requiredCredential: "Exequátur del Poder Ejecutivo y Carnet del Colegio de Abogados de la R.D. (CARD)",
    credentialSample: "CARD #33412 • Exeq. #1145",
    targetRole: "profesional",
    keywordsRegex: /abogad|legal|notari|jur[íi]dic|contrat|litigi|penal|civil|laboral|inmobiliari|demand|herenci|divorci|fideicomiso/i,
    description: "Área jurídica exclusiva para abogados colegiados autorizados para emitir actos legales y asesoría juramentada."
  },
  plomeria: {
    id: "plomeria",
    name: "Plomería & Redes Hidráulicas",
    shortLabel: "Plomería 24/7",
    icon: "🔧",
    roleName: "Plomero Certificado",
    doctorOrLawyerTitle: "Plomero Master & Técnico Hidráulico",
    requiredCredential: "Certificación Técnica de Plomería y Redes Sanitarias",
    credentialSample: "CERT-PLOM-RD #9921",
    targetRole: "tecnico",
    keywordsRegex: /plomer|fuga|tuber[íi]a|inodor|fregader|lavaman|tinaco|bomba de agua|calentador|grifo|cisterna|destape|drenaje|gas/i,
    description: "Técnicos certificados en detección de fugas, bombas hidroneumáticas y redes sanitarias."
  },
  electricidad: {
    id: "electricidad",
    name: "Electricidad & Redes Eléctricas",
    shortLabel: "Electricidad CODIA",
    icon: "⚡",
    roleName: "Electricista Certificado",
    doctorOrLawyerTitle: "Electricista Certificado CODIA",
    requiredCredential: "Cédula CODIA / Matrícula Técnica Eléctrica",
    credentialSample: "CODIA #77410",
    targetRole: "tecnico",
    keywordsRegex: /electric|corto|breaker|tablero|cable|voltaje|luz|inversor|planta el[eé]ctric|transformador|solar|fotovolt|generador/i,
    description: "Especialistas en instalaciones eléctricas de alta y baja tensión, paneles y corrección de cortocircuitos."
  },
  climatizacion: {
    id: "climatizacion",
    name: "Climatización & HVAC",
    shortLabel: "Climas & HVAC",
    icon: "❄️",
    roleName: "Técnico en Climas",
    doctorOrLawyerTitle: "Técnico Certificado en Climas & Refrigeración",
    requiredCredential: "Certificación en Refrigeración R410A / Manejo de Gases Inverter",
    credentialSample: "CERT-HVAC #4430",
    targetRole: "tecnico",
    keywordsRegex: /aire|clima|minisplit|acondicionad|hvac|refrigeraci|enfri|goteo aire|gas refrigerante|compresor|inverter/i,
    description: "Mantenimiento, recarga y reparación de sistemas de aire acondicionado residencial e industrial."
  },
  cerrajeria: {
    id: "cerrajeria",
    name: "Cerrajería & Seguridad Física",
    shortLabel: "Cerrajería",
    icon: "🔐",
    roleName: "Cerrajero Residencial",
    doctorOrLawyerTitle: "Cerrajero Especialista en Cerraduras y Smart Locks",
    requiredCredential: "Acreditación de Cerrajería Sin Daño y Cerraduras Digitales",
    credentialSample: "ACRED-LOCK #1209",
    targetRole: "tecnico",
    keywordsRegex: /cerrajer|llave|candado|cerradura|chapa|puerta trancada|chapa digital|yale|biom[eé]tric|duplicado/i,
    description: "Aperturas de emergencia sin daño, duplicados de alta seguridad y cerraduras biométricas."
  },
  ingenieria: {
    id: "ingenieria",
    name: "Ingeniería Civil & Estructural",
    shortLabel: "Ingeniería CODIA",
    icon: "🏗️",
    roleName: "Ingeniero Civil Colegiado",
    doctorOrLawyerTitle: "Ingeniero Civil / Perito Estructural CODIA",
    requiredCredential: "Cédula Profesional CODIA y Registro de Perito Evaluador",
    credentialSample: "CODIA #18920-CIVIL",
    targetRole: "profesional",
    keywordsRegex: /ingenier|perit|c[aá]lcul|estructur|viga|muro|fisur|s[ií]smic|hormig[oó]n|suelo|topograf/i,
    description: "Dictámenes periciales estructurales, cálculo sismorresistente y memorias técnicas oficiales."
  },
  arquitectura: {
    id: "arquitectura",
    name: "Arquitectura & Supervisión DRO",
    shortLabel: "Arquitectura",
    icon: "📐",
    roleName: "Arquitecto Colegiado",
    doctorOrLawyerTitle: "Arquitecto Colegiado / Director de Obra DRO",
    requiredCredential: "Cédula Profesional CODIA / Colegio Dominicano de Arquitectos",
    credentialSample: "CODIA #22140-ARQ",
    targetRole: "profesional",
    keywordsRegex: /arquitect|plano|bim|cad|dro|diseño|remodelaci|fachada|permiso construcci|render|interior/i,
    description: "Planos arquitectónicos en BIM/CAD, licencias de construcción y dirección responsable de obra."
  },
  mecanica: {
    id: "mecanica",
    name: "Mecánica Automotriz & Auxilio",
    shortLabel: "Mecánica & Baterías",
    icon: "🚗",
    roleName: "Mecánico Automotriz",
    doctorOrLawyerTitle: "Mecánico Automotriz Certificado con Scanner OBD2",
    requiredCredential: "Certificación en Electromecánica y Diagnóstico Computarizado",
    credentialSample: "CERT-MEC-AUTO #8832",
    targetRole: "tecnico",
    keywordsRegex: /mec[aá]nic|carro|auto|veh[íi]cul|bater[íi]a|neum[aá]tic|goma|pinch|scanner|obd|arrancador|motor|frenos/i,
    description: "Auxilio vial de emergencia, diagnóstico con scanner multimarca y reemplazo de baterías en sitio."
  },
  veterinaria: {
    id: "veterinaria",
    name: "Veterinaria & Salud Animal",
    shortLabel: "Veterinaria",
    icon: "🐾",
    roleName: "Médico Veterinario",
    doctorOrLawyerTitle: "Médico Veterinario Colegiado",
    requiredCredential: "Exequátur de Médico Veterinario y Registro Oficial",
    credentialSample: "COLVET #3319 • Exeq. #502",
    targetRole: "profesional",
    keywordsRegex: /veterinari|perro|gato|mascota|animal|vacuna perro|cirug[íi]a animal|consulta canina|felin/i,
    description: "Atención médica a domicilio para mascotas, vacunación, desparasitación y consultas veterinarias."
  },
  contabilidad: {
    id: "contabilidad",
    name: "Contabilidad & Asesoría DGII",
    shortLabel: "Contabilidad CPA",
    icon: "💼",
    roleName: "Contador CPA",
    doctorOrLawyerTitle: "Contador Público Autorizado (CPA)",
    requiredCredential: "Exequátur del Poder Ejecutivo y Carnet ICPARD (CPA)",
    credentialSample: "ICPARD #10940 • Exeq. #2180",
    targetRole: "profesional",
    keywordsRegex: /contad|cpa|impuest|dgii|fiscal|auditor|declaraci|itbis|finanz|balance/i,
    description: "Declaraciones de impuestos ante la DGII, estados financieros auditados y asesoría tributaria."
  },
  otro: {
    id: "otro",
    name: "Servicios Generales Acreditados",
    shortLabel: "Especialistas",
    icon: "⭐",
    roleName: "Especialista Acreditado",
    doctorOrLawyerTitle: "Especialista Acreditado en su Área",
    requiredCredential: "Acreditación y Validación de Identidad Diclik.com KYC",
    credentialSample: "KYC-DIR #001",
    targetRole: "tecnico",
    keywordsRegex: /.*/i,
    description: "Servicios y técnicos especializados con verificación completa de identidad y antecedentes."
  }
};

export function detectAreaForQuery(query: string): AreaTaxonomy {
  const clean = query.trim().toLowerCase();
  if (/pediatr|m[eé]dic|salud|doctor|cardi[oó]log|cl[íi]nic|ginecol|enfermer|cirujan|odont[oó]log|dentist|psiquiatr|terapi|vacun|nutrici|pediatra/i.test(clean)) {
    return AREA_TAXONOMIES.salud;
  }
  if (/abogad|legal|notari|jur[íi]dic|contrat|litigi|penal|civil|laboral|inmobiliari|demand|herenci|divorci/i.test(clean)) {
    return AREA_TAXONOMIES.legal;
  }
  if (/plomer|fuga|tuber[íi]a|inodor|fregader|lavaman|tinaco|bomba de agua|calentador|grifo|cisterna|destape/i.test(clean)) {
    return AREA_TAXONOMIES.plomeria;
  }
  if (/electric|corto|breaker|tablero|cable|voltaje|luz|inversor|planta el[eé]ctric|transformador|solar|fotovolt/i.test(clean)) {
    return AREA_TAXONOMIES.electricidad;
  }
  if (/aire|clima|minisplit|acondicionad|hvac|refrigeraci|enfri|goteo aire|gas refrigerante/i.test(clean)) {
    return AREA_TAXONOMIES.climatizacion;
  }
  if (/cerrajer|llave|candado|cerradura|chapa|puerta trancada|chapa digital|yale/i.test(clean)) {
    return AREA_TAXONOMIES.cerrajeria;
  }
  if (/ingenier|perit|c[aá]lcul|estructur|viga|muro|fisur|s[ií]smic|hormig[oó]n|codia/i.test(clean)) {
    return AREA_TAXONOMIES.ingenieria;
  }
  if (/arquitect|plano|bim|cad|dro|diseño|remodelaci|fachada|permiso construcci/i.test(clean)) {
    return AREA_TAXONOMIES.arquitectura;
  }
  if (/mec[aá]nic|carro|auto|veh[íi]cul|bater[íi]a|neum[aá]tic|goma|pinch|scanner|obd/i.test(clean)) {
    return AREA_TAXONOMIES.mecanica;
  }
  if (/veterinari|perro|gato|mascota|animal|vacuna perro/i.test(clean)) {
    return AREA_TAXONOMIES.veterinaria;
  }
  if (/contad|cpa|impuest|dgii|fiscal|auditor|declaraci/i.test(clean)) {
    return AREA_TAXONOMIES.contabilidad;
  }
  return AREA_TAXONOMIES.otro;
}

export const PRESET_JOB_PHOTOS = [
  {
    id: "preset_1",
    title: "Fuga en Tubería / Lavamanos",
    category: "plomeria",
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "preset_2",
    title: "Cortocircuito / Breaker Quemado",
    category: "electricidad",
    url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "preset_3",
    title: "Cerradura Trancada / Llave Rota",
    category: "cerrajeria",
    url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "preset_4",
    title: "Aire Acondicionado Goteando",
    category: "climatizacion",
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "preset_5",
    title: "Fisura en Viga / Muro Estructural",
    category: "ingenieria",
    url: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "preset_6",
    title: "Avería Mecánica / Batería Descargada",
    category: "mecanica",
    url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80"
  }
];

// SPECIALISTS STRICTLY MAPPED BY AREA SO THAT DOCTORS, LAWYERS, PLUMBERS, ETC. NEVER MIX
export const SPECIALISTS_BY_AREA: Record<ServiceCategoryKey, NearbySpecialist[]> = {
  salud: [
    {
      id: "spec_med_01",
      name: "Dra. Camila Santos Almonte",
      type: "profesional",
      category: "salud",
      categoryLabel: "Pediatra Neonatóloga & Infantil",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "CS",
      rating: 5.0,
      reviewsCount: 184,
      distanceKm: 0.6,
      etaMin: 9,
      basePrice: 4800,
      negotiatedPrice: 4200,
      priceNote: "🩺 Consulta a domicilio con otoscopio digital",
      status: "disponible",
      badges: ["Exequátur #8821", "Colegio Médico CMD", "Robert Reid Cabral", "Top Rated"],
      vehicle: "Vehículo Particular",
      phone: "+1 809-771-4490",
      address: "Piantini • 600m de ti",
      latOffset: 35,
      lngOffset: 34,
      specialty: "Pediatría general, neonatología, urgencias respiratorias y control de vacunas.",
      quoteMessage: "Llevo equipo de diagnóstico pediátrico completo, oxímetro neonatal y recetario oficial.",
      licenseNumber: "CMD-14892 • Exeq. #8821"
    },
    {
      id: "spec_med_02",
      name: "Dr. Alejandro Méndez Peña",
      type: "profesional",
      category: "salud",
      categoryLabel: "Médico Pediatra Integral",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "AM",
      rating: 4.9,
      reviewsCount: 126,
      distanceKm: 1.1,
      etaMin: 12,
      basePrice: 5000,
      negotiatedPrice: 4500,
      priceNote: "⚡ Disponibilidad inmediata para evaluación",
      status: "disponible",
      badges: ["Exequátur #9042", "CMD #09431", "Urgencias Pediátricas"],
      vehicle: "Auto Particular",
      phone: "+1 829-550-1122",
      address: "Bella Vista • 1.1 km",
      latOffset: 55,
      lngOffset: 65,
      specialty: "Fiebre, gastroenteritis infantil, otitis media y prescripción médica con firma digital.",
      quoteMessage: "En ruta en 12 minutos con maletín médico pediátrico y pruebas rápidas.",
      licenseNumber: "CMD-09431 • Exeq. #9042"
    },
    {
      id: "spec_med_03",
      name: "Dra. Valentina Cruz Guzmán",
      type: "profesional",
      category: "salud",
      categoryLabel: "Pediatría & Vacunación Infantil",
      avatar: "https://images.unsplash.com/photo-1594824813680-e7f093a54b9f?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "VC",
      rating: 4.9,
      reviewsCount: 92,
      distanceKm: 1.5,
      etaMin: 15,
      basePrice: 4200,
      negotiatedPrice: 3800,
      priceNote: "👶 Tarifa accesible de atención domiciliaria",
      status: "disponible",
      badges: ["Exequátur #6610", "CMD #11204", "Atención Domiciliaria"],
      vehicle: "Vehículo Particular",
      phone: "+1 849-880-9944",
      address: "Naco • 1.5 km",
      latOffset: 25,
      lngOffset: 72,
      specialty: "Evaluación física del niño, control de crecimiento y seguimiento telefónico.",
      quoteMessage: "Atención cálida y respetuosa para tu pequeño en la comodidad de su hogar.",
      licenseNumber: "CMD-11204 • Exeq. #6610"
    }
  ],
  legal: [
    {
      id: "spec_leg_01",
      name: "Lic. Manuel De Jesús Valerio",
      type: "profesional",
      category: "legal",
      categoryLabel: "Abogado Civilista & Notario Público",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "MV",
      rating: 5.0,
      reviewsCount: 147,
      distanceKm: 0.9,
      etaMin: 12,
      basePrice: 7500,
      negotiatedPrice: 6500,
      priceNote: "⚖️ Dictamen legal firmado y protocolizado",
      status: "disponible",
      badges: ["Exequátur #1145", "CARD #33412", "Notario Público Colegiado"],
      vehicle: "Vehículo Particular",
      phone: "+1 809-441-2299",
      address: "Piantini • 900m",
      latOffset: 40,
      lngOffset: 45,
      specialty: "Contratos de compraventa, revisión inmobiliaria, actos bajo firma privada y notaría.",
      quoteMessage: "Revisión inmediata del contrato con cláusulas de protección legal y firma notarial.",
      licenseNumber: "CARD-33412 • Exeq. #1145"
    },
    {
      id: "spec_leg_02",
      name: "Licda. Patricia Rosario Henríquez",
      type: "profesional",
      category: "legal",
      categoryLabel: "Abogada Corporativa e Inmobiliaria",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "PR",
      rating: 4.9,
      reviewsCount: 115,
      distanceKm: 1.4,
      etaMin: 16,
      basePrice: 8000,
      negotiatedPrice: 7000,
      priceNote: "📜 Asesoría contractual de alta seguridad",
      status: "disponible",
      badges: ["Exequátur #2810", "CARD #41209", "Derecho Inmobiliario"],
      vehicle: "Vehículo Particular",
      phone: "+1 829-994-5511",
      address: "Naco • 1.4 km",
      latOffset: 65,
      lngOffset: 55,
      specialty: "Depuración de títulos en Registro Inmobiliario, contratos de alquiler y sociedades comerciales.",
      quoteMessage: "Protegemos tu inversión con análisis exhaustivo de cargas y gravámenes en el Registro de Títulos.",
      licenseNumber: "CARD-41209 • Exeq. #2810"
    }
  ],
  plomeria: [
    {
      id: "spec_01",
      name: "Carlos Mendoza",
      type: "tecnico",
      category: "plomeria",
      categoryLabel: "Plomería & Gas Master",
      avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "CM",
      rating: 4.9,
      reviewsCount: 142,
      distanceKm: 0.4,
      etaMin: 8,
      basePrice: 2100,
      negotiatedPrice: 1800,
      priceNote: "¡Mejor Precio! Descuento por cercanía",
      status: "disponible",
      badges: ["Verificado KYC", "Garantía Diclik.com RD$ 50k", "Top Rated"],
      vehicle: "Moto de Servicio Express",
      phone: "+1 809-982-4410",
      address: "A 400m de tu domicilio • Piantini",
      latOffset: 38,
      lngOffset: 32,
      specialty: "Detección de fugas no invasiva, bombas hidroneumáticas, cobre y termofusión.",
      quoteMessage: "Estoy a 4 esquinas con herramienta completa. Puedo iniciar en 8 minutos.",
      licenseNumber: "CERT-PLOM-RD #9921"
    },
    {
      id: "spec_plom_02",
      name: "Ramón Peralta",
      type: "tecnico",
      category: "plomeria",
      categoryLabel: "Maestro Plomero & Calentadores",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "RP",
      rating: 4.8,
      reviewsCount: 88,
      distanceKm: 1.0,
      etaMin: 11,
      basePrice: 2500,
      negotiatedPrice: 2200,
      priceNote: "🔧 Especialista en gas y calentadores",
      status: "disponible",
      badges: ["Garantía Diclik.com", "Instalador Certificado"],
      vehicle: "Camioneta de Servicio",
      phone: "+1 829-440-9988",
      address: "Naco • 1.0 km",
      latOffset: 60,
      lngOffset: 30,
      specialty: "Calentadores de paso, tinacos, cisternas y tuberías de gas GLP.",
      quoteMessage: "Llevo racores de bronce, selladores anaeróbicos y herramienta de presión.",
      licenseNumber: "CERT-PLOM-RD #4102"
    }
  ],
  electricidad: [
    {
      id: "spec_02",
      name: "Roberto Gómez",
      type: "tecnico",
      category: "electricidad",
      categoryLabel: "Electricista Certificado CODIA",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "RG",
      rating: 4.8,
      reviewsCount: 98,
      distanceKm: 0.8,
      etaMin: 12,
      basePrice: 2400,
      negotiatedPrice: 2200,
      priceNote: "Incluye diagnóstico termográfico",
      status: "disponible",
      badges: ["Certificado CODIA", "Termografía Digital"],
      vehicle: "Camioneta Utilitaria",
      phone: "+1 829-831-9001",
      address: "Naco • 800m de ti",
      latOffset: 25,
      lngOffset: 68,
      specialty: "Cortocircuitos, balanceo de cargas, centros de carga y cableado de alta seguridad.",
      quoteMessage: "Llevo analizador de fallas y repuestos termomagnéticos certificados.",
      licenseNumber: "CODIA #77410"
    },
    {
      id: "spec_elec_02",
      name: "Darío Santana",
      type: "tecnico",
      category: "electricidad",
      categoryLabel: "Técnico en Tableros & Inversores",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "DS",
      rating: 4.9,
      reviewsCount: 130,
      distanceKm: 1.2,
      etaMin: 14,
      basePrice: 2600,
      negotiatedPrice: 2300,
      priceNote: "⚡ Atención a emergencias eléctricas",
      status: "disponible",
      badges: ["Inversores Trace/Outback", "Breakers Certificados"],
      vehicle: "Moto de Asistencia",
      phone: "+1 849-220-4433",
      address: "Piantini • 1.2 km",
      latOffset: 70,
      lngOffset: 60,
      specialty: "Inversores, bancos de baterías, plantas de emergencia y cortocircuitos.",
      quoteMessage: "Equipo de medición digital fluke listo para resolver la falla.",
      licenseNumber: "CODIA #81204"
    }
  ],
  cerrajeria: [
    {
      id: "spec_03",
      name: "Miguel Ángel Torres",
      type: "tecnico",
      category: "cerrajeria",
      categoryLabel: "Cerrajería Residencial y Digital",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "MT",
      rating: 5.0,
      reviewsCount: 215,
      distanceKm: 1.1,
      etaMin: 14,
      basePrice: 1800,
      negotiatedPrice: 1600,
      priceNote: "Apertura limpia garantizada",
      status: "disponible",
      badges: ["Aperturas Sin Daño", "Cerraduras Smart"],
      vehicle: "Scooter Express",
      phone: "+1 849-410-8832",
      address: "Av. 27 de Febrero • 1.1 km",
      latOffset: 65,
      lngOffset: 28,
      specialty: "Apertura de chapas de alta seguridad, duplicados con chip y cerraduras biométricas.",
      quoteMessage: "Aperturas limpias sin perforar. Garantía por escrito.",
      licenseNumber: "ACRED-LOCK #1209"
    }
  ],
  climatizacion: [
    {
      id: "spec_04",
      name: "Daniel Estrada",
      type: "tecnico",
      category: "climatizacion",
      categoryLabel: "Técnico Climas & Minisplits",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "DE",
      rating: 4.9,
      reviewsCount: 76,
      distanceKm: 1.6,
      etaMin: 18,
      basePrice: 3000,
      negotiatedPrice: 2700,
      priceNote: "Precio con recarga de gas incluida",
      status: "disponible",
      badges: ["Refrigerante Ecológico", "Mantenimiento Preventivo"],
      vehicle: "Furgoneta Taller",
      phone: "+1 809-771-3490",
      address: "Bella Vista • 1.6 km",
      latOffset: 74,
      lngOffset: 76,
      specialty: "Carga de gas R410A, limpieza profunda antibacteriana, detección de fugas inverter.",
      quoteMessage: "Equipo manómetro digital listo y bomba de vacío.",
      licenseNumber: "CERT-HVAC #4430"
    }
  ],
  ingenieria: [
    {
      id: "spec_06",
      name: "Ing. Elena Soto",
      type: "profesional",
      category: "ingenieria",
      categoryLabel: "Perito en Cálculo Estructural",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "ES",
      rating: 5.0,
      reviewsCount: 89,
      distanceKm: 1.3,
      etaMin: 15,
      basePrice: 10800,
      negotiatedPrice: 9500,
      priceNote: "Dictamen firmado con Cédula y QR",
      status: "disponible",
      badges: ["Cédula CODIA", "Firma Digital QR", "Perito Colegiado"],
      vehicle: "Vehículo Particular",
      phone: "+1 849-990-2234",
      address: "Despacho Los Cacicazgos • 1.3 km",
      latOffset: 32,
      lngOffset: 84,
      specialty: "Dictámenes de seguridad estructural sismorresistente, memorias de cálculo y ampliaciones.",
      quoteMessage: "Visita técnica inmediata y entrega de dictamen legal con firma electrónica.",
      licenseNumber: "CODIA #18920-CIVIL"
    },
    {
      id: "spec_08",
      name: "Ing. Sofía Ramos",
      type: "profesional",
      category: "ingenieria",
      categoryLabel: "Ingeniera en Energía & Solar",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "SR",
      rating: 4.9,
      reviewsCount: 52,
      distanceKm: 2.8,
      etaMin: 30,
      basePrice: 9000,
      negotiatedPrice: 8000,
      priceNote: "Dimensionamiento solar y dictamen CNE/Edeeste",
      status: "disponible",
      badges: ["Certificación Fotovoltaica", "Ahorro Energético CNE"],
      vehicle: "Vehículo Particular",
      phone: "+1 829-129-8876",
      address: "Oficina Evaristo Morales • 2.8 km",
      latOffset: 15,
      lngOffset: 48,
      specialty: "Dimensionamiento fotovoltaico, auditorías de consumo eléctrico y dictamen de puesta a tierra.",
      quoteMessage: "Evaluación solar integral para reducción drástica de factura eléctrica.",
      licenseNumber: "CODIA #29011-ELECT"
    }
  ],
  arquitectura: [
    {
      id: "spec_07",
      name: "Arq. Fernando Valdez",
      type: "profesional",
      category: "arquitectura",
      categoryLabel: "Director Responsable de Obra",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "FV",
      rating: 4.9,
      reviewsCount: 110,
      distanceKm: 2.5,
      etaMin: 25,
      basePrice: 13200,
      negotiatedPrice: 11500,
      priceNote: "Supervisión de obra y planos en Revit/BIM",
      status: "disponible",
      badges: ["Colegio de Arquitectos", "Planos BIM/CAD", "Supervisión CODIA"],
      vehicle: "Vehículo Particular",
      phone: "+1 809-334-5566",
      address: "Estudio Gazcue • 2.5 km",
      latOffset: 82,
      lngOffset: 45,
      specialty: "Planos arquitectónicos, permisos de construcción, remodelación integral y supervisión.",
      quoteMessage: "Revisión en sitio de obra y trámites ante ayuntamiento y MOPC listos.",
      licenseNumber: "CODIA #22140-ARQ"
    }
  ],
  mecanica: [
    {
      id: "spec_05",
      name: "Javier Morales",
      type: "tecnico",
      category: "mecanica",
      categoryLabel: "Auxilio Mecánico & Baterías",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "JM",
      rating: 4.7,
      reviewsCount: 64,
      distanceKm: 2.2,
      etaMin: 22,
      basePrice: 2700,
      negotiatedPrice: 2400,
      priceNote: "Incluye scanner OBD2 y booster",
      status: "disponible",
      badges: ["Scanner OBD2", "Pasa Corriente Booster"],
      vehicle: "Unidad Móvil de Rescate",
      phone: "+1 829-601-1198",
      address: "Av. John F. Kennedy • 2.2 km",
      latOffset: 18,
      lngOffset: 24,
      specialty: "Diagnóstico computarizado, reemplazo de batería en sitio y cambio de neumáticos.",
      quoteMessage: "Llego equipado con arrancador industrial y scanner multimarca.",
      licenseNumber: "CERT-MEC-AUTO #8832"
    }
  ],
  veterinaria: [
    {
      id: "spec_vet_01",
      name: "Dra. Laura De León",
      type: "profesional",
      category: "veterinaria",
      categoryLabel: "Médico Veterinario Colegiado",
      avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "LL",
      rating: 4.9,
      reviewsCount: 78,
      distanceKm: 1.2,
      etaMin: 14,
      basePrice: 3500,
      negotiatedPrice: 3000,
      priceNote: "🐾 Atención médica para mascotas en casa",
      status: "disponible",
      badges: ["Exequátur #502", "COLVET #3319", "Atención Domicilio"],
      vehicle: "Unidad Veterinaria Móvil",
      phone: "+1 809-550-9922",
      address: "Piantini • 1.2 km",
      latOffset: 45,
      lngOffset: 55,
      specialty: "Medicina preventiva para caninos y felinos, vacunación séxtuple, desparasitación y curaciones.",
      quoteMessage: "Llevo instrumental veterinario estéril y vacunas refrigeradas para tu mascota.",
      licenseNumber: "COLVET #3319 • Exeq. #502"
    }
  ],
  contabilidad: [
    {
      id: "spec_cpa_01",
      name: "Lic. Ramón Almonte, CPA",
      type: "profesional",
      category: "contabilidad",
      categoryLabel: "Contador Público Autorizado (CPA)",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "RA",
      rating: 5.0,
      reviewsCount: 95,
      distanceKm: 1.8,
      etaMin: 18,
      basePrice: 6000,
      negotiatedPrice: 5000,
      priceNote: "💼 Asesoría fiscal y auditoría DGII",
      status: "disponible",
      badges: ["Exequátur #2180", "ICPARD #10940", "Perito Fiscal"],
      vehicle: "Vehículo Particular",
      phone: "+1 829-441-3377",
      address: "Naco • 1.8 km",
      latOffset: 30,
      lngOffset: 70,
      specialty: "Declaraciones juradas IR-1, IR-2, envío de formatos 606/607, estados auditados y RNC.",
      quoteMessage: "Revisión fiscal integral y optimización de impuestos con respaldo de firma CPA.",
      licenseNumber: "ICPARD #10940 • Exeq. #2180"
    }
  ],
  otro: [
    {
      id: "spec_gen_01",
      name: "Carlos Mendoza",
      type: "tecnico",
      category: "otro",
      categoryLabel: "Especialista General Verificado",
      avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "CM",
      rating: 4.9,
      reviewsCount: 142,
      distanceKm: 0.5,
      etaMin: 8,
      basePrice: 2200,
      negotiatedPrice: 1900,
      priceNote: "Verificado Diclik.com KYC",
      status: "disponible",
      badges: ["Verificado KYC", "Garantía Diclik.com RD$ 50k"],
      vehicle: "Moto de Servicio",
      phone: "+1 809-982-4410",
      address: "Piantini • 500m",
      latOffset: 38,
      lngOffset: 35,
      specialty: "Servicio técnico integral con herramientas certificadas.",
      quoteMessage: "Listo para iniciar el servicio con garantía Diclik.com.",
      licenseNumber: "KYC-DIR #001"
    }
  ]
};

// Flattened base specialists for global radar
const BASE_SPECIALISTS_CATALOG: NearbySpecialist[] = [
  ...SPECIALISTS_BY_AREA.plomeria,
  ...SPECIALISTS_BY_AREA.electricidad,
  ...SPECIALISTS_BY_AREA.salud,
  ...SPECIALISTS_BY_AREA.legal,
  ...SPECIALISTS_BY_AREA.cerrajeria,
  ...SPECIALISTS_BY_AREA.climatizacion,
  ...SPECIALISTS_BY_AREA.ingenieria,
  ...SPECIALISTS_BY_AREA.arquitectura,
  ...SPECIALISTS_BY_AREA.mecanica
];

const INITIAL_CUSTOMER_REQUESTS: CustomerServiceRequest[] = [
  {
    id: "req_01",
    clientName: "Mariana Villanueva",
    clientAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 809-391-7701",
    clientRating: 4.9,
    clientServicesCount: 14,
    category: "plomeria",
    categoryLabel: "Plomería & Fugas",
    serviceTitle: "Fuga de Gas y Reparación de Calentador",
    problemDescription: "Huele a gas cerca del calentador de paso y la tubería de cobre tiene una pequeña fisura en la tuerca unión. Urge atender hoy mismo.",
    problemDetails: "El calentador es de 10L, la fuga está justo en la tuerca de alimentación de gas. Hay fotos adjuntas del maneral y la tubería.",
    clientAddress: "Calle Max Henríquez Ureña #184, Apto 402, Piantini, Santo Domingo",
    distanceKm: 1.2,
    etaMin: 8,
    offeredBudget: 3900,
    priceStrategy: "minimo",
    minPrice: 3900,
    photos: ["https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"],
    escrowSecured: true,
    urgency: "urgente",
    timeAgo: "Hace 2 min",
    latOffset: 34,
    lngOffset: 42,
    targetRole: "tecnico",
    status: "disponible",
    requiredTradeLabel: "Plomero Master & Técnico Hidráulico"
  },
  {
    id: "req_02",
    clientName: "Lic. Jorge Arismendi",
    clientAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 829-882-4419",
    clientRating: 4.8,
    clientServicesCount: 9,
    category: "electricidad",
    categoryLabel: "Electricidad & Cortos",
    serviceTitle: "Cortocircuito en Tablero Principal",
    problemDescription: "Se disparó el breaker principal de 40A y huele a plástico quemado. Media casa está sin luz.",
    problemDetails: "Breaker Schneider disparado, cables recalentados visibles en la foto. Se dejó a la intemperie para que el técnico proponga según el daño.",
    clientAddress: "Av. Abraham Lincoln #92, Torre 2B, Naco, Santo Domingo",
    distanceKm: 0.9,
    etaMin: 6,
    offeredBudget: 5100,
    priceStrategy: "intemperie",
    photos: ["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80"],
    escrowSecured: true,
    urgency: "urgente",
    timeAgo: "Hace 4 min",
    latOffset: 28,
    lngOffset: 65,
    targetRole: "tecnico",
    status: "disponible",
    requiredTradeLabel: "Electricista Certificado CODIA"
  },
  {
    id: "req_med_01",
    clientName: "Licda. Carolina Morales",
    clientAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 849-551-7700",
    clientRating: 5.0,
    clientServicesCount: 16,
    category: "salud",
    categoryLabel: "Salud & Pediatría Colegiada",
    serviceTitle: "Consulta Médica Pediátrica Urgente a Domicilio",
    problemDescription: "Mi bebé de 2 años presenta fiebre persistente de 38.9°C, tos con flema y dolor de garganta. Requiero visita de Médico Pediatra con Exequátur oficial y otoscopio.",
    problemDetails: "Tiene 24 horas con fiebre que cede poco con paracetamol. Requerimos evaluación pulmonar, otoscopia y receta médica sellada con carnet del Colegio Médico Dominicano.",
    clientAddress: "Av. Gustavo Mejía Ricart #140, Torre Empresarial, Piantini, Santo Domingo",
    distanceKm: 0.8,
    etaMin: 9,
    offeredBudget: 4800,
    priceStrategy: "minimo",
    minPrice: 4800,
    photos: [],
    escrowSecured: true,
    urgency: "urgente",
    timeAgo: "Hace 3 min",
    latOffset: 42,
    lngOffset: 38,
    targetRole: "profesional",
    status: "disponible",
    requiredTradeLabel: "Médico Colegiado / Pediatra (CMD)"
  },
  {
    id: "req_leg_01",
    clientName: "Dr. Nelson Abreu",
    clientAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 809-661-8844",
    clientRating: 4.9,
    clientServicesCount: 24,
    category: "legal",
    categoryLabel: "Legal & Notaría Oficial",
    serviceTitle: "Revisión de Contrato de Compraventa Inmobiliaria y Acto Notarial",
    problemDescription: "Requiero abogado con Exequátur y Cédula Profesional del CARD para revisar contrato de compraventa de inmueble en torre residencial y redactar acto notarial protocolizado.",
    problemDetails: "Contrato de 14 páginas sobre apartamento en Piantini. Necesitamos verificación de cargas en Registro Inmobiliario e informe legal por escrito.",
    clientAddress: "Calle Sarasota #190, Bella Vista, Santo Domingo",
    distanceKm: 1.4,
    etaMin: 12,
    offeredBudget: 7500,
    priceStrategy: "intemperie",
    photos: [],
    escrowSecured: true,
    urgency: "express",
    timeAgo: "Hace 8 min",
    latOffset: 58,
    lngOffset: 52,
    targetRole: "profesional",
    status: "disponible",
    requiredTradeLabel: "Abogado con Exequátur y Carnet CARD"
  },
  {
    id: "req_03",
    clientName: "Dra. Carmen Montes",
    clientAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 849-660-2299",
    clientRating: 5.0,
    clientServicesCount: 22,
    category: "cerrajeria",
    categoryLabel: "Cerrajería de Emergencia",
    serviceTitle: "Cerradura Digital Smart Bloqueada",
    problemDescription: "La chapa electrónica no reconoce la huella ni el código PIN de emergencia y no puedo entrar a la residencia.",
    problemDetails: "Marca Yale Digital. Subí foto frontal de la cerradura para que lleven la herramienta adecuada sin perforar la puerta.",
    clientAddress: "Calle Sarasota #210, Bella Vista, Santo Domingo",
    distanceKm: 1.5,
    etaMin: 10,
    offeredBudget: 3000,
    priceStrategy: "intemperie",
    photos: ["https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80"],
    escrowSecured: true,
    urgency: "urgente",
    timeAgo: "Hace 6 min",
    latOffset: 62,
    lngOffset: 25,
    targetRole: "tecnico",
    status: "disponible",
    requiredTradeLabel: "Cerrajero Especialista en Smart Locks"
  },
  {
    id: "req_04",
    clientName: "Roberto Salazar",
    clientAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 809-441-8823",
    clientRating: 4.7,
    clientServicesCount: 5,
    category: "climatizacion",
    categoryLabel: "Climas & HVAC",
    serviceTitle: "Minisplit Inverter 24k BTU Goteando",
    problemDescription: "El equipo tira agua sobre el mueble y dejó de enfriar con fuerza. Requiere destape de desagüe y revisión de gas refrigerante.",
    problemDetails: "Unidad evaporadora en recámara principal. Foto adjunta del goteo sobre la pared.",
    clientAddress: "Av. Anacaona #340, Penthouse 1, Los Cacicazgos, Santo Domingo",
    distanceKm: 2.1,
    etaMin: 14,
    offeredBudget: 4500,
    priceStrategy: "minimo",
    minPrice: 4500,
    photos: ["https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80"],
    escrowSecured: true,
    urgency: "express",
    timeAgo: "Hace 11 min",
    latOffset: 72,
    lngOffset: 70,
    targetRole: "tecnico",
    status: "disponible",
    requiredTradeLabel: "Técnico Certificado en Climas"
  },
  {
    id: "req_05",
    clientName: "Arq. David Cordero",
    clientAvatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 829-993-1102",
    clientRating: 5.0,
    clientServicesCount: 31,
    category: "ingenieria",
    categoryLabel: "Ingeniería & Peritajes",
    serviceTitle: "Dictamen Estructural por Fisuras",
    problemDescription: "Requerimos visita técnica de Perito Estructural Colegiado con Cédula CODIA para dictaminar fisuras en viga de hormigón armado de 3 niveles con firma QR.",
    problemDetails: "Fisura en ángulo de 45 grados en viga de carga. Fotos de alta resolución adjuntas.",
    clientAddress: "Av. Winston Churchill #480, Evaristo Morales, Santo Domingo",
    distanceKm: 1.8,
    etaMin: 12,
    offeredBudget: 22800,
    priceStrategy: "intemperie",
    photos: ["https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80"],
    escrowSecured: true,
    urgency: "urgente",
    timeAgo: "Hace 15 min",
    latOffset: 30,
    lngOffset: 80,
    targetRole: "profesional",
    status: "disponible",
    requiredTradeLabel: "Ingeniero Civil / Perito Estructural CODIA"
  },
  {
    id: "req_06",
    clientName: "Ing. Rodrigo Peña",
    clientAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
    clientPhone: "+1 849-778-9911",
    clientRating: 4.9,
    clientServicesCount: 18,
    category: "arquitectura",
    categoryLabel: "Arquitectura & Supervisión",
    serviceTitle: "Firma Responsiva CODIA y Planos BIM",
    problemDescription: "Supervisión técnica de obra y responsiva CODIA para remodelación de local comercial de 280 m² con entrega de memorias de cálculo.",
    problemDetails: "Plano arquitectónico preliminary adjunto.",
    clientAddress: "Calle Román Baldorioty #1120, Arroyo Hondo, Santo Domingo",
    distanceKm: 2.4,
    etaMin: 16,
    offeredBudget: 31200,
    priceStrategy: "minimo",
    minPrice: 31200,
    photos: [],
    escrowSecured: true,
    urgency: "express",
    timeAgo: "Hace 20 min",
    latOffset: 80,
    lngOffset: 50,
    targetRole: "profesional",
    status: "disponible",
    requiredTradeLabel: "Arquitecto Colegiado / DRO"
  }
];

// Helper to generate dynamic candidates STRICTLY FILTERED BY THE REQUESTED AREA
function generateDynamicSpecialistsForQuery(
  query: string,
  options?: {
    photosCount?: number;
    priceStrategy?: "intemperie" | "minimo";
    minBudget?: number;
    problemDetails?: string;
  }
): NearbySpecialist[] {
  const detectedTaxonomy = detectAreaForQuery(query);
  const areaKey = detectedTaxonomy.id;
  const isProfessional = detectedTaxonomy.targetRole === "profesional";

  const isIntemperie = options?.priceStrategy === "intemperie";
  const userMin = options?.minBudget && options.minBudget > 0 ? options.minBudget : (isProfessional ? 5000 : 2100);

  // Dynamic base price based on area and client options
  const dynamicBasePrice = isIntemperie
    ? (isProfessional ? 5500 : 2300)
    : Math.max(userMin, isProfessional ? 4200 : 1800);

  // If we have predefined specialists in this area (e.g. salud, legal, plomeria, etc.), use them!
  const areaCatalog = SPECIALISTS_BY_AREA[areaKey] || [];

  if (areaCatalog.length > 0) {
    return areaCatalog.map((spec, index) => {
      const priceOffset = index === 0 ? 0 : index * 400;
      const negotiated = isIntemperie ? dynamicBasePrice + priceOffset : Math.max(dynamicBasePrice, spec.basePrice - 200);
      return {
        ...spec,
        basePrice: dynamicBasePrice + priceOffset + 300,
        negotiatedPrice: negotiated,
        photoEvaluationNote: options?.photosCount ? `Revisó las ${options.photosCount} foto(s) de tu solicitud` : undefined
      };
    });
  }

  // Fallback dynamic generation strictly for custom unique trades (e.g. joyero, tapicero, etc.)
  const cleanQuery = query.trim();
  const titleQuery = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);

  return [
    {
      id: `dyn_01_${Date.now()}`,
      name: isProfessional ? `Lic. Alejandro Morales` : `Carlos Mendoza`,
      type: isProfessional ? "profesional" : "tecnico",
      category: areaKey,
      categoryLabel: `Especialista en ${titleQuery}`,
      avatar: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "AM",
      rating: 4.9,
      reviewsCount: 142,
      distanceKm: 0.5,
      etaMin: 8,
      basePrice: dynamicBasePrice + 400,
      negotiatedPrice: isIntemperie ? dynamicBasePrice - 200 : dynamicBasePrice,
      priceNote: isIntemperie ? "🏷️ Cotización tras evaluar fotos" : "🏆 ¡Mejor Precio Negociado!",
      status: "disponible",
      badges: ["Acreditado en " + detectedTaxonomy.shortLabel, "Garantía Diclik.com RD$ 50k", "Top Rated"],
      vehicle: isProfessional ? "Vehículo Particular" : "Moto de Servicio Express",
      phone: "+1 809-982-4410",
      address: "A 500m de tu ubicación • Piantini",
      latOffset: 34,
      lngOffset: 38,
      specialty: `Servicio experto acreditado en ${cleanQuery} con garantía oficial por escrito.`,
      quoteMessage: `Vi tu solicitud para ${cleanQuery}. Cuento con acreditación profesional y equipo completo.`,
      licenseNumber: detectedTaxonomy.credentialSample,
      photoEvaluationNote: options?.photosCount ? `Evaluó tus ${options.photosCount} foto(s)` : undefined
    },
    {
      id: `dyn_02_${Date.now()}`,
      name: isProfessional ? `Dra. Gabriela Vega` : `Roberto Gómez`,
      type: isProfessional ? "profesional" : "tecnico",
      category: areaKey,
      categoryLabel: `Máster Certificado en ${titleQuery}`,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "GV",
      rating: 5.0,
      reviewsCount: 154,
      distanceKm: 1.1,
      etaMin: 12,
      basePrice: dynamicBasePrice + 1000,
      negotiatedPrice: dynamicBasePrice + 300,
      priceNote: "⚡ Calificación 5.0 con Cédula",
      status: "disponible",
      badges: [detectedTaxonomy.doctorOrLawyerTitle, "Seguro Escrow Activo"],
      vehicle: "Unidad Móvil Equipada",
      phone: "+1 829-601-3388",
      address: "Naco • 1.1 km",
      latOffset: 58,
      lngOffset: 65,
      specialty: `Atención prioritaria y dictamen profesional para ${cleanQuery}.`,
      quoteMessage: `Especialista certificado listo con repuestos de primera calidad y firma digital.`,
      licenseNumber: detectedTaxonomy.credentialSample,
      photoEvaluationNote: options?.photosCount ? `Evaluó tus ${options.photosCount} foto(s)` : undefined
    }
  ];
}

interface DirectoMobileAppProps {
  onSpeak: (text: string) => void;
  initialRole?: "cliente" | "tecnico" | "profesional";
  onSwitchToAdmin?: () => void;
  standalone?: boolean;
}

const demoEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const isDemo = demoEnv?.MODE === "test" && demoEnv?.VITE_DICLIK_DEMO === "true";

export function DirectoMobileApp({
  onSpeak,
  initialRole = "cliente",
  standalone = false
}: DirectoMobileAppProps) {
  // Mobile app mode: 'cliente', 'tecnico', or 'profesional'
  const [mobileRole, setMobileRole] = useState<"cliente" | "tecnico" | "profesional">(initialRole);

  // Account & Session State (Authenticated PostgreSQL user)
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [publishedRequestId, setPublishedRequestId] = useState("");
  const [publicationMessage, setPublicationMessage] = useState("");
  const publicationPending = useRef(false);

  useEffect(() => {
    if (initialRole) {
      setMobileRole(initialRole);
    }
  }, [initialRole]);

  // Synchronize initial real specialists, requests and active auth session from PostgreSQL backend
  useEffect(() => {
    api.auth.getMe()
      .then((me) => {
        const u = me?.user || me;
        if (u && u.id) {
          setAuthUser({
            id: u.id,
            email: u.email,
            role: u.role,
            fullName: u.full_name,
            phone: u.phone
          });
        }
      })
      .catch(() => {});

    if (!isDemo) return;

    api.radar.scan({ radius: 15, trade: "todos" })
      .then((pros) => {
        if (pros && Array.isArray(pros) && pros.length > 0) {
          setBiddingSpecialists(pros);
          setSelectedSpecialist(pros[0]);
        }
      })
      .catch((err) => console.warn("[Diclik DB Notice] Radar sync:", err.message));

    api.services.list()
      .then((dbReqs) => {
        if (dbReqs && Array.isArray(dbReqs) && dbReqs.length > 0) {
          const mapped: CustomerServiceRequest[] = dbReqs.map((r: any) => {
            const cat = (r.category_id || "otro") as ServiceCategoryKey;
            const tax = AREA_TAXONOMIES[cat] || AREA_TAXONOMIES.otro;
            return {
              id: r.id,
              clientName: r.client_name || "Cliente Diclik.com",
              clientAvatar: r.client_avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
              clientPhone: r.client_phone || "Protegido hasta contratar",
              clientRating: Number(r.client_rating || 5.0),
              clientServicesCount: Number(r.client_services_count || 1),
              category: cat,
              categoryLabel: tax.name,
              serviceTitle: r.title,
              problemDescription: r.description,
              clientAddress: r.address,
              distanceKm: 1.0,
              etaMin: 10,
              offeredBudget: Number(r.min_budget || 2500),
              priceStrategy: r.budget_strategy || "intemperie",
              photos: Array.isArray(r.photos) ? r.photos : [],
              escrowSecured: true,
              urgency: r.urgency || "urgente",
              timeAgo: "En PostgreSQL",
              latOffset: 45,
              lngOffset: 50,
              targetRole: r.target_role || "tecnico",
              status: "disponible",
              requiredTradeLabel: tax.doctorOrLawyerTitle
            };
          });
          setRequestsList((prev) => {
            const existingIds = new Set(mapped.map((m) => m.id));
            return [...mapped, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }
      })
      .catch((err) => console.warn("[Diclik DB Notice] Services sync:", err.message));
  }, []);

  // Mobile screen view: "home" | "radar" | "requests_feed" | "tech_navigation" | "otp" | "tracking" | "profesionales"
  const [currentScreen, setCurrentScreen] = useState<
    "home" | "radar" | "requests_feed" | "tech_navigation" | "otp" | "tracking" | "profesionales" | "chat"
  >("home");

  // Client Universal Search Engine State
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [activeRequestedTrade, setActiveRequestedTrade] = useState<string>("Técnicos y Profesionales en tu Zona");
  const [isSearchingRadar, setIsSearchingRadar] = useState<boolean>(false);
  const [biddingSpecialists, setBiddingSpecialists] = useState<NearbySpecialist[]>(BASE_SPECIALISTS_CATALOG);
  const [sortFilter, setSortFilter] = useState<"precio" | "rapido" | "rating">("precio");

  // Negotiation Modal / Multi-Turn Negotiation State
  const [negotiatingSpecialist, setNegotiatingSpecialist] = useState<NearbySpecialist | null>(null);
  const [negotiationTurns, setNegotiationTurns] = useState<NegotiationTurn[]>([]);
  const [standingOffer, setStandingOffer] = useState<{
    price: number;
    proposedBy: "client" | "tech";
    senderName: string;
  } | null>(null);
  const [negotiationStatus, setNegotiationStatus] = useState<"active" | "agreed" | "rejected">("active");
  const [agreedDealPrice, setAgreedDealPrice] = useState<number | null>(null);
  const [customCounterAmount, setCustomCounterAmount] = useState<string>("2000");
  const [customCounterReason, setCustomCounterReason] = useState<string>("");
  const [isCounterFormOpen, setIsCounterFormOpen] = useState<boolean>(true);
  const [activeSimulatorRole, setActiveSimulatorRole] = useState<"client" | "tech">("client");

  // Active Specialist Profile Specialty & Credentials (for strict trade boundaries)
  const [specialistActiveTrade, setSpecialistActiveTrade] = useState<ServiceCategoryKey>("plomeria");
  const [specialistCredentialCode, setSpecialistCredentialCode] = useState<string>("CERT-PLOM-8841");
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<string>("todas");

  // Mandatory Professional & Technical Area Verification Modal
  const [areaVerificationModal, setAreaVerificationModal] = useState<{
    isOpen: boolean;
    job: CustomerServiceRequest;
    action: "accept" | "quote";
    requiredTaxonomy: AreaTaxonomy;
    enteredCredential: string;
  } | null>(null);

  // Requests Feed State for Technicians & Professionals
  const [requestsList, setRequestsList] = useState<CustomerServiceRequest[]>(INITIAL_CUSTOMER_REQUESTS);
  const [activeAcceptedJob, setActiveAcceptedJob] = useState<CustomerServiceRequest | null>(INITIAL_CUSTOMER_REQUESTS[0]);
  const [jobStage, setJobStage] = useState<"en_camino" | "en_sitio" | "trabajando" | "completado">("en_camino");
  const [navEtaMin, setNavEtaMin] = useState<number>(8);
  const [turnInstruction, setTurnInstruction] = useState<string>("En 150m gira a la derecha en Calle Durango");

  // Client Detailed Request Creation & Photo Capture State
  const [clientProblemDetails, setClientProblemDetails] = useState<string>("");
  const [clientJobPhotos, setClientJobPhotos] = useState<string[]>(isDemo ? [
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
  ] : []);
  const [clientPriceStrategy, setClientPriceStrategy] = useState<"intemperie" | "minimo">("intemperie");
  const [clientMinBudget, setClientMinBudget] = useState<string>("2400");
  const [clientAddressInput, setClientAddressInput] = useState<string>(isDemo ? "Av. Winston Churchill #402, Piantini, Santo Domingo" : "");
  const [clientUrgency, setClientUrgency] = useState<"urgente" | "express" | "programado">("urgente");

  // Modals for camera, sample photos, photo zoom & tech bidding
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isPresetPhotosModalOpen, setIsPresetPhotosModalOpen] = useState<boolean>(false);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Technician / Professional proposal submission modal
  const [proposingJob, setProposingJob] = useState<CustomerServiceRequest | null>(null);
  const [techQuotePrice, setTechQuotePrice] = useState<string>("");
  const [techQuoteMessage, setTechQuoteMessage] = useState<string>("");

  // Radar screen settings & view mode toggle (radar map simulation vs standard list view)
  const [radarViewMode, setRadarViewMode] = useState<"radar" | "list">("radar");
  const [radarFilter, setRadarFilter] = useState<"todos" | "tecnicos" | "profesionales" | "plomeria" | "electricidad" | "cerrajeria" | "climatizacion">("todos");
  const [radarRadiusKm, setRadarRadiusKm] = useState<number>(3.5);
  const [selectedSpecialist, setSelectedSpecialist] = useState<NearbySpecialist | null>(BASE_SPECIALISTS_CATALOG[0]);
  const [activeRequestedSpecialist, setActiveRequestedSpecialist] = useState<NearbySpecialist | null>(BASE_SPECIALISTS_CATALOG[0]);

  // Active OTP code simulator
  const [otpCode, setOtpCode] = useState<string>("8492");
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const [otpInput, setOtpInput] = useState<string>("");

  // Standalone mode detection
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsAppInstalled(isStandalone);
  }, []);

  // Tracking job simulator
  const [etaMinutes, setEtaMinutes] = useState<number>(8);

  // Quick suggestions list for the search bar
  const POPULAR_SEARCH_SUGGESTIONS = [
    "Plomero urgente",
    "Electricista",
    "Cerrajero",
    "Soldador / Herrero",
    "Arquitecto DRO",
    "Abogado",
    "Mecánico",
    "Aire Acondicionado",
    "Carpintero",
    "Pintor",
    "Ingeniero Estructural",
    "Instalador Solar"
  ];

  // Photo handlers for Client
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = "";
    if (!isDemo && (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.size > 170_000 || clientJobPhotos.length >= 8)) {
      setPublicationMessage("Adjunta hasta 8 imágenes JPG, PNG, WebP o GIF de hasta 170 KB cada una.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setClientJobPhotos((prev) => [...prev, reader.result as string]);
        onSpeak("Foto del trabajo adjuntada con éxito.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatedCameraCapture = () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80"
    ];
    const picked = samplePhotos[clientJobPhotos.length % samplePhotos.length];
    setClientJobPhotos((prev) => [...prev, picked]);
    setIsCameraActive(false);
    onSpeak("¡Foto del problema capturada y adjuntada!");
  };

  const handleSelectPresetPhoto = (url: string) => {
    if (!clientJobPhotos.includes(url)) {
      setClientJobPhotos((prev) => [...prev, url]);
      onSpeak("Foto de muestra agregada al detalle del trabajo.");
    }
    setIsPresetPhotosModalOpen(false);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setClientJobPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Technician bidding proposal submission
  const handleOpenTechProposalModal = (req: CustomerServiceRequest) => {
    setProposingJob(req);
    setTechQuotePrice((req.offeredBudget || 2800).toString());
    setTechQuoteMessage(
      req.photos && req.photos.length > 0
        ? `Hola, revisé tus fotos y el detalle. Puedo resolverlo hoy mismo con refacciones originales y garantía.`
        : `Hola, soy especialista certificado. Tengo equipo listo para atender tu servicio de inmediato.`
    );
    onSpeak(`Revisando solicitud de ${req.clientName} para enviar cotización.`);
  };

  const handleSubmitTechProposal = () => {
    const priceNum = parseFloat(techQuotePrice);
    if (!priceNum || !proposingJob) return;

    // Update job in requestsList
    setRequestsList((prev) =>
      prev.map((r) =>
        r.id === proposingJob.id
          ? { ...r, offeredBudget: priceNum, timeAgo: "Propuesta enviada" }
          : r
      )
    );

    // Also inject into biddingSpecialists if client switches or searches
    const newSpecialistEntry: NearbySpecialist = {
      id: `my_bid_${Date.now()}`,
      name: mobileRole === "tecnico" ? "Técnico Registrado (Tú)" : "Profesional Colegiado (Tú)",
      type: mobileRole === "tecnico" ? "tecnico" : "profesional",
      category: proposingJob.category,
      categoryLabel: proposingJob.categoryLabel,
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      initials: "YO",
      rating: 5.0,
      reviewsCount: 1,
      distanceKm: 0.4,
      etaMin: 7,
      basePrice: priceNum,
      negotiatedPrice: priceNum,
      priceNote: "⚡ Tu cotización enviada",
      status: "disponible",
      badges: ["Tú Oferta", "Verificado"],
      vehicle: "Unidad Propia",
      phone: "+1 809-555-0100",
      address: "En tu zona • 400m",
      latOffset: 48,
      lngOffset: 52,
      specialty: techQuoteMessage,
      quoteMessage: techQuoteMessage,
      photoEvaluationNote: proposingJob.photos?.length ? `Revisó las ${proposingJob.photos.length} fotos adjuntas` : undefined
    };

    setBiddingSpecialists((prev) => [newSpecialistEntry, ...prev]);

    onSpeak(`Cotización de RD$ ${priceNum.toLocaleString()} pesos dominicanos enviada exitosamente.`);
    setProposingJob(null);
  };

  // Client Search & Detailed Request Trigger
  const handleClientSearchAndRequest = async (queryToSearch?: string) => {
    const term = (queryToSearch || clientSearchQuery).trim() || "Técnico General";

    const minNum = parseFloat(clientMinBudget) || 0;
    const detectedTax = detectAreaForQuery(term);

    if (!isDemo) {
      if (!authUser) {
        setIsAccountModalOpen(true);
        return;
      }
      if (authUser.role !== "cliente" || publicationPending.current) return;
      publicationPending.current = true;
      setPublicationMessage("");
      try {
        const categories = await api.services.getCategories();
        const registeredCategory = categories.find((category: { id: string }) => category.id === detectedTax.id);
        const result = await api.services.create({
          title: term,
          description: clientProblemDetails.trim() || term,
          address: clientAddressInput.trim(),
          categoryId: registeredCategory?.id,
          targetRole: detectedTax.targetRole,
          urgency: clientUrgency,
          budgetStrategy: clientPriceStrategy,
          minBudget: minNum,
          photos: clientJobPhotos,
        });
        setPublishedRequestId(result.requestId);
        setCurrentScreen("requests_feed");
        setPublicationMessage("Solicitud publicada. Aquí podrás revisar las ofertas recibidas.");
      } catch (error) {
        setPublicationMessage(error instanceof Error ? error.message : "No se pudo publicar la solicitud.");
      } finally {
        publicationPending.current = false;
      }
      return;
    }

    setActiveRequestedTrade(term);
    setIsSearchingRadar(true);
    setCurrentScreen("radar");
    const isPro = detectedTax.targetRole === "profesional";

    const calculatedBudget = clientPriceStrategy === "intemperie" 
      ? (isPro ? 8500 : 2500)
      : (minNum > 0 ? minNum : (isPro ? 7500 : 2200));

    // Create a real new customer request in the network feed
    const newReqId = `req_user_${Date.now()}`;
    const newRequestItem: CustomerServiceRequest = {
      id: newReqId,
      clientName: "Usuario Diclik.com (Tú)",
      clientAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
      clientPhone: "+1 809-555-0199",
      clientRating: 5.0,
      clientServicesCount: 1,
      category: detectedTax.id,
      categoryLabel: detectedTax.name,
      serviceTitle: term,
      problemDescription: clientProblemDetails || `Solicitud de servicio para ${term} en Santo Domingo con fotos y detalles adjuntos.`,
      problemDetails: clientProblemDetails,
      clientAddress: clientAddressInput || "Santo Domingo, República Dominicana",
      distanceKm: 0.8,
      etaMin: 8,
      offeredBudget: calculatedBudget,
      priceStrategy: clientPriceStrategy,
      minPrice: clientPriceStrategy === "minimo" ? minNum : undefined,
      photos: [...clientJobPhotos],
      escrowSecured: true,
      urgency: clientUrgency,
      timeAgo: "Ahora mismo",
      latOffset: 45,
      lngOffset: 50,
      targetRole: detectedTax.targetRole,
      status: "disponible",
      requiredTradeLabel: detectedTax.doctorOrLawyerTitle
    };

    // Prepend to requests list so technicians can see it in real-time
    setRequestsList((prev) => [newRequestItem, ...prev.filter((r) => r.id !== newReqId)]);

    // Dynamic specialist lookup or generation with photo evaluation & price strategy
    const candidates = generateDynamicSpecialistsForQuery(term, {
      photosCount: clientJobPhotos.length,
      priceStrategy: clientPriceStrategy,
      minBudget: minNum,
      problemDetails: clientProblemDetails
    });

    setBiddingSpecialists(candidates);
    setSelectedSpecialist(candidates[0]);

    if (clientPriceStrategy === "intemperie") {
      onSpeak(
        `Solicitud enviada a la intemperie con ${clientJobPhotos.length} foto(s). Los especialistas revisaron el trabajo y están proponiendo sus precios en pesos dominicanos. Elige el mejor precio en el listado debajo del mapa.`
      );
    } else {
      onSpeak(
        `Solicitud enviada con presupuesto mínimo de RD$ ${minNum.toLocaleString()} pesos dominicanos y ${clientJobPhotos.length} foto(s). Mostrando especialistas en el radar para negociar y elegir la mejor oferta.`
      );
    }

    // Simulate new incoming live proposals arriving in the radar list
    setTimeout(() => {
      setIsSearchingRadar(false);
    }, 1200);
  };

  // Direct Immediate Assignment by Client
  const handleAssignSpecialistNow = (specialist: NearbySpecialist) => {
    setActiveRequestedSpecialist(specialist);
    const chosenPrice = specialist.negotiatedPrice || specialist.basePrice;
    setEtaMinutes(specialist.etaMin);
    setIsOtpVerified(false);
    
    // Generate new OTP
    const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setOtpCode(newOtp);

    setCurrentScreen("tracking");
    onSpeak(
      `¡Has elegido a ${specialist.name} por RD$ ${chosenPrice.toLocaleString()} pesos dominicanos! Solicitud confirmada y en camino a tu ubicación. Tiempo de llegada estimado: ${specialist.etaMin} minutos.`
    );
  };

  // Start Negotiation Dialogue with a specialist
  const handleOpenNegotiation = (specialist: NearbySpecialist) => {
    setNegotiatingSpecialist(specialist);
    const initialPrice = specialist.negotiatedPrice || specialist.basePrice || 6000;
    
    const initialTurn: NegotiationTurn = {
      id: `turn_${Date.now()}_1`,
      sender: "tech",
      senderName: specialist.name,
      avatar: specialist.avatar,
      text: `Hola, soy ${specialist.name}. Mi cotización para este trabajo es de RD$ ${initialPrice.toLocaleString()} con mano de obra y garantía incluida.`,
      price: initialPrice,
      actionType: "initial",
      timestamp: "Ahora mismo"
    };

    setNegotiationTurns([initialTurn]);
    setStandingOffer({
      price: initialPrice,
      proposedBy: "tech",
      senderName: specialist.name
    });
    setNegotiationStatus("active");
    setAgreedDealPrice(null);
    // Pre-fill counter blank space with a reasonable proposed amount
    setCustomCounterAmount("2000");
    setCustomCounterReason("Solo dispongo de RD$ 2,000 pesos");
    setIsCounterFormOpen(true);
    setActiveSimulatorRole("client");

    onSpeak(
      `Abriendo negociación directa con ${specialist.name}. Su oferta inicial es de RD$ ${initialPrice.toLocaleString()} pesos dominicanos. Puedes aceptar, rechazar o ingresar otra cantidad en el espacio en blanco.`
    );
  };

  // ACCEPT the current standing offer (either Client accepts Tech's proposal, or Tech accepts Client's proposal)
  const handleAcceptStandingOffer = (acceptedBy: "client" | "tech") => {
    if (!standingOffer || !negotiatingSpecialist) return;
    const finalPrice = standingOffer.price;

    const acceptTurn: NegotiationTurn = {
      id: `turn_${Date.now()}`,
      sender: acceptedBy,
      senderName: acceptedBy === "client" ? "Cliente (Tú)" : negotiatingSpecialist.name,
      avatar: acceptedBy === "client" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80"
        : negotiatingSpecialist.avatar,
      text: acceptedBy === "client"
        ? `✅ ¡Acepto tu oferta de RD$ ${finalPrice.toLocaleString()}! Trato enlazado y cerrado.`
        : `✅ ¡Acepto tus RD$ ${finalPrice.toLocaleString()}! Trato cerrado y enlazado. Saldré hacia tu domicilio.`,
      price: finalPrice,
      actionType: "accept",
      timestamp: "Ahora mismo"
    };

    setNegotiationTurns((prev) => [...prev, acceptTurn]);
    setNegotiationStatus("agreed");
    setAgreedDealPrice(finalPrice);

    // Update specialist in bidding list with negotiated price
    setBiddingSpecialists((prev) =>
      prev.map((s) =>
        s.id === negotiatingSpecialist.id
          ? {
              ...s,
              negotiatedPrice: finalPrice,
              priceNote: `🤝 ¡Trato acordado en RD$ ${finalPrice.toLocaleString()}!`
            }
          : s
      )
    );

    onSpeak(
      `¡Trato cerrado exitosamente por RD$ ${finalPrice.toLocaleString()} pesos dominicanos! Se ha abierto el mapa indicando de inmediato la ruta hacia donde debe dirigirse: ${clientAddressInput || "el domicilio del cliente"}.`
    );
  };

  // REJECT current standing offer
  const handleRejectStandingOffer = (rejectedBy: "client" | "tech") => {
    if (!standingOffer || !negotiatingSpecialist) return;
    const currentPrice = standingOffer.price;

    const rejectTurn: NegotiationTurn = {
      id: `turn_${Date.now()}`,
      sender: rejectedBy,
      senderName: rejectedBy === "client" ? "Cliente (Tú)" : negotiatingSpecialist.name,
      avatar: rejectedBy === "client"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80"
        : negotiatingSpecialist.avatar,
      text: rejectedBy === "client"
        ? `❌ No puedo pagar RD$ ${currentPrice.toLocaleString()}. Mi presupuesto es menor. Propondré otra cantidad en el espacio en blanco.`
        : `❌ No puedo realizar el trabajo por RD$ ${currentPrice.toLocaleString()} por costo de insumos. Por favor ingresa otra cantidad en el espacio en blanco.`,
      price: currentPrice,
      actionType: "reject",
      timestamp: "Ahora mismo"
    };

    setNegotiationTurns((prev) => [...prev, rejectTurn]);
    setNegotiationStatus("rejected");
    setIsCounterFormOpen(true);

    onSpeak(
      `Oferta de RD$ ${currentPrice.toLocaleString()} no aceptada. Ingresa una nueva cantidad en el espacio en blanco para continuar negociando.`
    );
  };

  // SEND CUSTOM COUNTER OFFER (Otra Negociación - Espacio en Blanco)
  const handleSendCustomCounterOffer = (sender: "client" | "tech", overrideAmount?: number, overrideReason?: string) => {
    if (!negotiatingSpecialist) return;

    const amountNum = overrideAmount !== undefined ? overrideAmount : parseFloat(customCounterAmount);
    if (!amountNum || amountNum <= 0) {
      onSpeak("Por favor ingresa una cantidad válida en pesos dominicanos en el espacio en blanco.");
      return;
    }

    const reasonText = overrideReason !== undefined ? overrideReason : customCounterReason.trim();

    const counterTurn: NegotiationTurn = {
      id: `turn_${Date.now()}`,
      sender: sender,
      senderName: sender === "client" ? "Cliente (Tú)" : negotiatingSpecialist.name,
      avatar: sender === "client"
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80"
        : negotiatingSpecialist.avatar,
      text: sender === "client"
        ? (reasonText ? `Propongo RD$ ${amountNum.toLocaleString()} pesos. (${reasonText})` : `¿Aceptarías RD$ ${amountNum.toLocaleString()} pesos dominicanos y cerramos el trato ahora?`)
        : (reasonText ? `Te lo puedo hacer en RD$ ${amountNum.toLocaleString()} pesos. (${reasonText})` : `Mi contrapropuesta es de RD$ ${amountNum.toLocaleString()} pesos con garantía incluida.`),
      price: amountNum,
      actionType: "counter",
      reason: reasonText,
      timestamp: "Ahora mismo"
    };

    const newTurns = [...negotiationTurns, counterTurn];
    setNegotiationTurns(newTurns);
    setStandingOffer({
      price: amountNum,
      proposedBy: sender,
      senderName: sender === "client" ? "Cliente (Tú)" : negotiatingSpecialist.name
    });
    setNegotiationStatus("active");
    setCustomCounterReason("");

    onSpeak(`Contraoferta de RD$ ${amountNum.toLocaleString()} pesos dominicanos enviada.`);

    // If client sent the counteroffer, simulate realistic dynamic response from Technician
    if (sender === "client") {
      setTimeout(() => {
        const initialQuote = negotiatingSpecialist.negotiatedPrice || negotiatingSpecialist.basePrice || 6000;
        
        // Scenario A: Client offered >= 70% of base, or after 2 client turns -> Tech decides to ACCEPT!
        if (amountNum >= initialQuote * 0.75 || newTurns.filter(t => t.sender === "client").length >= 2) {
          handleAcceptStandingOffer("tech");
        } else {
          // Scenario B: Large difference (e.g. 6000 vs 2000) -> Tech offers realistic middle ground (e.g. 3500 or 4000)
          const techCounterPrice = Math.round(((initialQuote + amountNum) / 2) / 100) * 100;
          
          const techResponseTurn: NegotiationTurn = {
            id: `turn_${Date.now()}_resp`,
            sender: "tech",
            senderName: negotiatingSpecialist.name,
            avatar: negotiatingSpecialist.avatar,
            text: `Entiendo tu postura. RD$ ${amountNum.toLocaleString()} es muy ajustado por los materiales, pero te lo puedo dejar en RD$ ${techCounterPrice.toLocaleString()} para ayudarte hoy mismo.`,
            price: techCounterPrice,
            actionType: "counter",
            timestamp: "Ahora mismo"
          };

          setNegotiationTurns((prev) => [...prev, techResponseTurn]);
          setStandingOffer({
            price: techCounterPrice,
            proposedBy: "tech",
            senderName: negotiatingSpecialist.name
          });
          setCustomCounterAmount((amountNum + 500).toString());
          onSpeak(
            `${negotiatingSpecialist.name} te ha contraofertado RD$ ${techCounterPrice.toLocaleString()} pesos dominicanos. Puedes aceptar o ingresar otra cantidad en el espacio en blanco.`
          );
        }
      }, 1000);
    }
  };

  // Finalize and hire from negotiation
  const handleFinalizeAndHireFromNegotiation = () => {
    if (!negotiatingSpecialist) return;
    const finalPrice = agreedDealPrice || standingOffer?.price || negotiatingSpecialist.negotiatedPrice || negotiatingSpecialist.basePrice;

    handleAssignSpecialistNow({
      ...negotiatingSpecialist,
      negotiatedPrice: finalPrice
    });
    setNegotiatingSpecialist(null);
  };

  // TECHNICIAN / PROFESSIONAL: Accept Service Request and Launch GPS Navigation to Client's Location
  const handleAcceptCustomerJob = (job: CustomerServiceRequest) => {
    setActiveAcceptedJob(job);
    setJobStage("en_camino");
    setNavEtaMin(job.etaMin);
    setTurnInstruction(`En 150m gira a la derecha hacia ${job.clientAddress.split(",")[0]}`);
    setIsOtpVerified(false);
    setOtpInput("");

    // Update list status
    setRequestsList((prev) =>
      prev.map((r) => (r.id === job.id ? { ...r, status: "aceptado" } : r))
    );

    setCurrentScreen("tech_navigation");
    onSpeak(
      `¡Servicio aceptado con éxito! Iniciando navegación satelital hacia el domicilio de ${job.clientName}. Distancia: ${job.distanceKm} km. Tiempo estimado: ${job.etaMin} minutos. Fondos retenidos en Escrow: RD$ ${job.offeredBudget.toLocaleString()} pesos dominicanos.`
    );
  };

  // Guard checks for accepting or quoting a job from another category
  const handleAttemptAcceptJob = (job: CustomerServiceRequest) => {
    // If provider specialty does not match the request area
    if (job.category !== specialistActiveTrade) {
      const taxonomy = AREA_TAXONOMIES[job.category] || detectAreaForQuery(job.serviceTitle || job.categoryLabel);
      setAreaVerificationModal({
        isOpen: true,
        job,
        action: "accept",
        requiredTaxonomy: taxonomy,
        enteredCredential: taxonomy.credentialSample
      });
      onSpeak(
        `Atención: Esta solicitud es exclusiva para profesionales del área de ${taxonomy.name}. ¿Usted es ${taxonomy.doctorOrLawyerTitle}?`
      );
      return;
    }
    handleAcceptCustomerJob(job);
  };

  const handleAttemptQuoteJob = (job: CustomerServiceRequest) => {
    // If provider specialty does not match the request area
    if (job.category !== specialistActiveTrade) {
      const taxonomy = AREA_TAXONOMIES[job.category] || detectAreaForQuery(job.serviceTitle || job.categoryLabel);
      setAreaVerificationModal({
        isOpen: true,
        job,
        action: "quote",
        requiredTaxonomy: taxonomy,
        enteredCredential: taxonomy.credentialSample
      });
      onSpeak(
        `Atención: Esta solicitud es exclusiva para profesionales del área de ${taxonomy.name}. ¿Usted es ${taxonomy.doctorOrLawyerTitle}?`
      );
      return;
    }
    handleOpenTechProposalModal(job);
  };

  const handleConfirmAreaVerification = () => {
    if (!areaVerificationModal) return;
    const { job, action, requiredTaxonomy, enteredCredential } = areaVerificationModal;
    setSpecialistActiveTrade(job.category);
    setSpecialistCredentialCode(enteredCredential || requiredTaxonomy.credentialSample);
    setAreaVerificationModal(null);
    onSpeak(`Acreditación confirmada como ${requiredTaxonomy.doctorOrLawyerTitle}. Procediendo con la solicitud.`);
    if (action === "accept") {
      handleAcceptCustomerJob(job);
    } else {
      handleOpenTechProposalModal(job);
    }
  };

  const handleCancelAreaVerification = () => {
    if (!areaVerificationModal) return;
    const curTax = AREA_TAXONOMIES[specialistActiveTrade] || AREA_TAXONOMIES["plomeria"];
    onSpeak(`Operación cancelada. Regresando a tus solicitudes de ${curTax.name}.`);
    setAreaVerificationModal(null);
  };

  const handleMarkArrivalAtClient = () => {
    setJobStage("en_sitio");
    setTurnInstruction("¡Has llegado al domicilio del cliente!");
    onSpeak(`Has llegado al domicilio. Notificando a ${activeAcceptedJob?.clientName}. Recuerda solicitar el código OTP al terminar el trabajo.`);
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpInput.trim();
    if (!cleanOtp || cleanOtp.length !== 4 || cleanOtp !== otpCode) {
      onSpeak("Código de seguridad incorrecto. Verifica los 4 dígitos exactos con el cliente antes de liberar fondos.");
      return;
    }

    setIsOtpVerified(true);
    setJobStage("completado");
    onSpeak(`¡Código de seguridad validado exitosamente! Se han transferido RD$ ${(activeAcceptedJob?.offeredBudget || 3900).toLocaleString()} pesos dominicanos a tu saldo disponible en Diclik.com.`);
  };

  // Filter and sort candidates list under the map
  const sortedBiddingSpecialists = [...biddingSpecialists].sort((a, b) => {
    const priceA = a.negotiatedPrice || a.basePrice;
    const priceB = b.negotiatedPrice || b.basePrice;
    if (sortFilter === "precio") return priceA - priceB;
    if (sortFilter === "rapido") return a.etaMin - b.etaMin;
    if (sortFilter === "rating") return b.rating - a.rating;
    return 0;
  });

  // Filtered specialists based on radar filter and radius for general view
  const filteredSpecialists = BASE_SPECIALISTS_CATALOG.filter((s) => {
    if (s.distanceKm > radarRadiusKm) return false;
    if (radarFilter === "todos") return true;
    if (radarFilter === "tecnicos") return s.type === "tecnico";
    if (radarFilter === "profesionales") return s.type === "profesional";
    return s.category === radarFilter;
  });

  // Filtered client requests for technician / professional strictly respecting targetRole and optional category tab
  const filteredRequests = requestsList.filter((req) => {
    if (mobileRole === "tecnico" && req.targetRole === "profesional") return false;
    if (mobileRole === "profesional" && req.targetRole === "tecnico") return false;
    if (feedCategoryFilter !== "todas" && req.category !== feedCategoryFilter) return false;
    return true;
  });

  // Render Inner Mobile UI Content
  const renderMobileContent = () => (
    <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-900 text-white select-none relative">
      {/* Top Mobile Bar */}
      <div className="p-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <img
            src="/assets/brand/diclik-header.png"
            alt="Diclik.com - Un clic, miles de soluciones"
            className="w-9 h-9 rounded-xl object-cover shadow-md border border-amber-400/50 shrink-0"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="text-xs font-black tracking-tight text-white">Diclik.com</h4>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <span className="text-[9px] text-amber-400 font-bold block leading-tight">
              {mobileRole === "cliente"
                ? "Un clic, miles de soluciones"
                : mobileRole === "tecnico"
                ? "🛠️ Técnico de Campo"
                : "🎓 Panel Profesional"}
            </span>
          </div>
        </div>

        {/* Header Actions: Account & Role Switcher */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsAccountModalOpen(true)}
            title={authUser ? authUser.fullName : "Iniciar sesión / Mi Cuenta"}
            className={`px-2 py-1.5 rounded-xl border text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${
              authUser
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-400/60"
            }`}
          >
            <User className="w-3 h-3" />
            <span>{authUser ? "Cuenta" : "Entrar"}</span>
          </button>

          {/* Quick Role Switcher Pill for Mobile */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => {
              setMobileRole("cliente");
              setCurrentScreen("home");
              onSpeak("Modo Cliente activado. Puedes buscar cualquier técnico o profesional en el mundo.");
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              mobileRole === "cliente" ? "bg-amber-400 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Cliente
          </button>
          <button
            onClick={() => {
              setMobileRole("tecnico");
              setCurrentScreen("requests_feed");
              onSpeak("Modo Técnico activado. Mostrando solicitudes de clientes en vivo listas para aceptar.");
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              mobileRole === "tecnico" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Técnico
          </button>
          <button
            onClick={() => {
              setMobileRole("profesional");
              setCurrentScreen("requests_feed");
              onSpeak("Modo Profesional activado. Mostrando proyectos de peritaje y dictámenes.");
            }}
            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              mobileRole === "profesional" ? "bg-emerald-400 text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Pro
          </button>
        </div>
      </div>
    </div>

      {/* Dynamic Screen View */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 relative">
        
        {isDemo && <p role="status" className="rounded-lg bg-amber-950 p-2 text-amber-200 text-xs">Modo de pruebas · negociación, GPS y fondos de demostración</p>}
        {!isDemo && publicationMessage && <p role="status" className="rounded-lg bg-slate-800 p-2 text-sm">{publicationMessage}</p>}
        {!isDemo && (currentScreen !== "home" || mobileRole !== "cliente" || (authUser && authUser.role !== "cliente")) && (
          <div key={`${currentScreen}:${authUser?.id || ""}:${mobileRole}`}>
          <DiclikOperations
            view={currentScreen === "radar" || currentScreen === "profesionales" ? "radar" : currentScreen === "chat" ? "chat" : ["tracking", "otp", "tech_navigation"].includes(currentScreen) ? "contracts" : "requests"}
            user={authUser}
            role={authUser?.role === "tecnico" || authUser?.role === "profesional" ? authUser.role : mobileRole}
            initialRequest={currentScreen === "requests_feed" ? publishedRequestId : undefined}
            onSignIn={() => setIsAccountModalOpen(true)}
          />
          </div>
        )}
        {/* SCREEN 1: CLIENT HOME WITH UNIVERSAL SEARCH ENGINE & RADAR PROPOSALS */}
        {currentScreen === "home" && (isDemo || (mobileRole === "cliente" && (!authUser || authUser.role === "cliente"))) && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* COMPREHENSIVE CLIENT REQUEST BUILDER CARD */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-400/60 p-4 rounded-3xl shadow-xl space-y-3.5 relative overflow-hidden">
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>Crear Solicitud de Servicio</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1 bg-slate-950/70 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Radar Satelital 24/7</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-black text-white leading-snug">
                  ¿Qué técnico o profesional necesitas hoy?
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Describe tu problema, sube fotos y fija un precio o déjalo a la intemperie para negociar con los mejores postulados.
                </p>
              </div>

              {/* 1. TRADE / SPECIALIST INPUT */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                  <Search className="w-3 h-3" />
                  <span>Oficio o Profesión Requerida</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Ej. Plomero, Electricista, Soldador, Abogado, Ingeniero..."
                    className="w-full bg-slate-950/90 border border-amber-400/60 rounded-2xl pl-3.5 pr-8 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold shadow-inner"
                  />
                  {clientSearchQuery && (
                    <button
                      onClick={() => setClientSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* POPULAR QUICK SUGGESTIONS CHIPS */}
              <div className="flex flex-wrap gap-1">
                {POPULAR_SEARCH_SUGGESTIONS.slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setClientSearchQuery(suggestion)}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      clientSearchQuery === suggestion
                        ? "bg-amber-400 text-slate-950 border-amber-400 font-black"
                        : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* 2. PROBLEM DETAIL & DESCRIPTION */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                  <FileText className="w-3 h-3" />
                  <span>Detalle del Trabajo o Avería</span>
                </label>
                <textarea
                  rows={2}
                  value={clientProblemDetails}
                  onChange={(e) => setClientProblemDetails(e.target.value)}
                  placeholder="Ej: Fuga continua en la tubería bajo el lavamanos principal. Gotea a chorro y requiere cambio de conector flexible..."
                  className="w-full bg-slate-950/90 border border-slate-700 rounded-2xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-normal leading-relaxed"
                />
              </div>

              {/* 3. PHOTO ATTACHMENT & CAMERA (TIRAR FOTO / SUBIR IMAGEN) */}
              <div className="space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fotos del Trabajo ({clientJobPhotos.length})</span>
                  </span>
                  <span className="text-[9px] text-amber-400 font-bold">
                    Ayuda a los técnicos a cotizar exacto
                  </span>
                </div>

                {/* Photo Action Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => isDemo ? setIsCameraActive(true) : fileInputRef.current?.click()}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Camera className="w-4 h-4 text-amber-300" />
                    <span>Tirar Foto</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer active:scale-95 border border-slate-700"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Subir Imagen</span>
                  </button>

                  <button
                    onClick={() => isDemo ? setIsPresetPhotosModalOpen(true) : fileInputRef.current?.click()}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-bold flex flex-col items-center justify-center space-y-1 transition-all cursor-pointer active:scale-95 border border-slate-700"
                  >
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    <span>Ejemplos</span>
                  </button>

                  {/* Hidden native file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Attached Photos Carousel / Grid */}
                {clientJobPhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {clientJobPhotos.map((photoUrl, idx) => (
                      <div key={idx} className="relative shrink-0 group">
                        <img
                          src={photoUrl}
                          alt={`Foto de trabajo ${idx + 1}`}
                          onClick={() => setExpandedPhotoUrl(photoUrl)}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400/80 cursor-pointer shadow-md group-hover:opacity-90 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-md cursor-pointer hover:bg-red-600"
                          title="Eliminar foto"
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 left-1 bg-slate-950/80 text-amber-300 text-[8px] font-bold px-1 rounded">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. PRICING STRATEGY (INTEMPERIE VS PRECIO MÍNIMO) */}
              <div className="space-y-2 bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center space-x-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estrategia de Precio & Negociación</span>
                  </label>
                  <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    RD$ Dominicanos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Strategy Option A: A LA INTEMPERIE */}
                  <button
                    onClick={() => {
                      setClientPriceStrategy("intemperie");
                      onSpeak("Modo a la intemperie seleccionado. Los técnicos propondrán su precio al ver las fotos.");
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      clientPriceStrategy === "intemperie"
                        ? "bg-amber-400 text-slate-950 border-amber-300 font-bold ring-2 ring-amber-400/40 shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center space-x-1">
                        <span>🍃</span>
                        <span>A la Intemperie</span>
                      </span>
                      {clientPriceStrategy === "intemperie" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      )}
                    </div>
                    <p className={`text-[9px] leading-tight ${clientPriceStrategy === "intemperie" ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                      Sin precio inicial. Los técnicos evalúan fotos y proponen su oferta.
                    </p>
                  </button>

                  {/* Strategy Option B: PRECIO MÍNIMO */}
                  <button
                    onClick={() => {
                      setClientPriceStrategy("minimo");
                      onSpeak("Modo presupuesto mínimo seleccionado. Ingresa el precio base para negociar.");
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      clientPriceStrategy === "minimo"
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold ring-2 ring-emerald-400/40 shadow-lg"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center space-x-1">
                        <span>💰</span>
                        <span>Precio Mínimo</span>
                      </span>
                      {clientPriceStrategy === "minimo" && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                      )}
                    </div>
                    <p className={`text-[9px] leading-tight ${clientPriceStrategy === "minimo" ? "text-slate-900 font-semibold" : "text-slate-400"}`}>
                      Tú pones una base en RD$ y los técnicos negocian desde ahí.
                    </p>
                  </button>
                </div>

                {/* Conditional Input for Minimum Budget */}
                {clientPriceStrategy === "minimo" && (
                  <div className="pt-2 space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold text-slate-300 block">
                      Tu Presupuesto Mínimo Sugerido (RD$):
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-black text-xs">
                          RD$
                        </span>
                        <input
                          type="number"
                          step={100}
                          value={clientMinBudget}
                          onChange={(e) => setClientMinBudget(e.target.value)}
                          placeholder="Ej. 2500"
                          className="w-full bg-slate-900 border border-emerald-500 rounded-xl pl-11 pr-3 py-2 text-xs font-black text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <button
                        onClick={() => setClientMinBudget((prev) => (Math.max(500, (parseFloat(prev) || 0) - 200)).toString())}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black border border-slate-700 cursor-pointer"
                      >
                        -200
                      </button>
                      <button
                        onClick={() => setClientMinBudget((prev) => ((parseFloat(prev) || 0) + 200).toString())}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black border border-slate-700 cursor-pointer"
                      >
                        +200
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. ADDRESS & LOCATION */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>Dirección del Servicio (Santo Domingo)</span>
                </label>
                <input
                  type="text"
                  aria-label="Dirección del servicio"
                  value={clientAddressInput}
                  onChange={(e) => setClientAddressInput(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-[11px] text-slate-200 focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              {/* PRIMARY CTA BUTTON: SOLICITAR SERVICIO Y ABRIR RADAR DE NEGOCIACIÓN */}
              <button
                onClick={() => handleClientSearchAndRequest()}
                className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-300 text-slate-950 font-black text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl active:scale-95 cursor-pointer mt-2"
              >
                <Radio className="w-4 h-4 text-slate-950 animate-pulse" />
                <span>{isDemo ? "SOLICITAR SERVICIO Y ABRIR RADAR DE PRECIOS" : "PUBLICAR SOLICITUD"}</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>

            {/* DIRECT CATEGORY FAST TILES */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-extrabold text-slate-300 uppercase tracking-wider text-[10px]">
                  Acceso Rápido por Especialidad
                </span>
                <span className="text-[10px] text-amber-400 font-bold">Pago Escrow RD$</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setClientSearchQuery("Plomero urgente");
                    handleClientSearchAndRequest("Plomería y Fugas");
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-amber-400/50 rounded-2xl text-left transition-all cursor-pointer active:scale-95 group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      2 cerca
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-white">Plomería 24/7</div>
                  <div className="text-[10px] text-slate-400">Fugas, bombas, tinacos</div>
                </button>

                <button
                  onClick={() => {
                    setClientSearchQuery("Electricista");
                    handleClientSearchAndRequest("Electricidad y Cortos");
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-indigo-400/50 rounded-2xl text-left transition-all cursor-pointer active:scale-95 group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      2 cerca
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-white">Electricidad</div>
                  <div className="text-[10px] text-slate-400">Cortos, paneles, inversores</div>
                </button>

                <button
                  onClick={() => {
                    setClientSearchQuery("Cerrajero");
                    handleClientSearchAndRequest("Cerrajería y Chapas");
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-emerald-400/50 rounded-2xl text-left transition-all cursor-pointer active:scale-95 group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Key className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      1 cerca
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-white">Cerrajería</div>
                  <div className="text-[10px] text-slate-400">Aperturas, chapas smart</div>
                </button>

                <button
                  onClick={() => {
                    setClientSearchQuery("Arquitecto / Ingeniero");
                    handleClientSearchAndRequest("Arquitectos e Ingenieros");
                  }}
                  className="p-3.5 bg-slate-800/90 hover:bg-slate-800 border border-slate-700/90 hover:border-sky-400/50 rounded-2xl text-left transition-all cursor-pointer active:scale-95 group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                      3 cerca
                    </span>
                  </div>
                  <div className="font-extrabold text-xs text-white">Profesionales</div>
                  <div className="text-[10px] text-slate-400">DRO, planos, peritajes</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 2: LIVE RADAR MAP + BIDDING SPECIALISTS LIST BELOW THE MAP */}
        {isDemo && currentScreen === "radar" && (
          <div className="space-y-3 animate-fadeIn">
            {/* Top Search & Active Request Header */}
            <div className="bg-slate-800/95 border border-slate-700 p-3 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                    Radar Activo: {activeRequestedTrade}
                  </span>
                </div>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  {biddingSpecialists.length} Postulados
                </span>
              </div>

              {/* Request Strategy Summary Pill */}
              <div className="flex items-center justify-between text-[10px] bg-slate-900 p-2 rounded-xl border border-slate-700/80">
                <span className="text-slate-300">
                  Estrategia: <strong className="text-amber-400">{clientPriceStrategy === "intemperie" ? "🍃 A la Intemperie" : `💰 Min. RD$ ${parseFloat(clientMinBudget || "0").toLocaleString()}`}</strong>
                </span>
                <span className="text-slate-400 flex items-center space-x-1">
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span>{clientJobPhotos.length} foto(s) evaluadas</span>
                </span>
              </div>

              {/* Quick in-radar search refinement */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleClientSearchAndRequest();
                    }}
                    placeholder="Cambiar o refinar búsqueda..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  onClick={() => handleClientSearchAndRequest()}
                  className="px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl cursor-pointer active:scale-95"
                >
                  Buscar
                </button>
              </div>

              {/* View Mode Switcher Pill */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 text-[10px]">
                <span className="text-slate-400 font-bold">Modo de visualización:</span>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-700">
                  <button
                    onClick={() => {
                      setRadarViewMode("radar");
                      onSpeak("Vista de radar satelital activada.");
                    }}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                      radarViewMode === "radar"
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Radio className="w-3 h-3" />
                    <span>Radar Satelital</span>
                  </button>
                  <button
                    onClick={() => {
                      setRadarViewMode("list");
                      onSpeak("Vista de lista estándar activada.");
                    }}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                      radarViewMode === "list"
                        ? "bg-amber-400 text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <List className="w-3 h-3" />
                    <span>Lista ({biddingSpecialists.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RADAR VIEW OR EXPANDED LIST HEADER */}
            {radarViewMode === "radar" ? (
              /* LIVE RADAR MAP GRAPHIC */
              <div className="h-56 sm:h-64 bg-slate-950 rounded-3xl border-2 border-slate-700/80 relative overflow-hidden shadow-2xl">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] [background-size:24px_24px]"></div>

                {/* Sonar Concentric Circles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full border border-emerald-500/20 animate-ping opacity-30"></div>
                  <div className="w-36 h-36 rounded-full border border-emerald-500/25"></div>
                  <div className="w-56 h-56 rounded-full border border-emerald-500/15"></div>
                </div>

                {/* Radar Laser Sweep */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(16,185,129,0.2)_0deg,transparent_60deg,transparent_360deg)] animate-spin opacity-70"></div>
                </div>

                {/* Center Client Position Pin */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg ring-4 ring-amber-400/30 animate-pulse font-black text-xs">
                      📍
                    </div>
                  </div>
                  <span className="text-[8px] font-black bg-slate-950/90 text-amber-400 px-1.5 py-0.5 rounded-full border border-amber-400/40 mt-0.5 shadow-md whitespace-nowrap">
                    Tu Domicilio
                  </span>
                </div>

                {/* Specialist Markers on Radar */}
                {sortedBiddingSpecialists.map((specialist, idx) => {
                  const isSelected = selectedSpecialist?.id === specialist.id;
                  const price = specialist.negotiatedPrice || specialist.basePrice;
                  return (
                    <div
                      key={specialist.id}
                      onClick={() => {
                        setSelectedSpecialist(specialist);
                        onSpeak(`${specialist.name}, oferta de RD$ ${price.toLocaleString()} pesos dominicanos. Llegada en ${specialist.etaMin} minutos.`);
                      }}
                      style={{
                        top: `${specialist.latOffset}%`,
                        left: `${specialist.lngOffset}%`
                      }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        isSelected ? "scale-125 z-30" : "hover:scale-110 opacity-90"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-full shadow-xl border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-amber-400 border-white text-slate-950 ring-4 ring-amber-400/40"
                            : idx === 0
                            ? "bg-emerald-500 border-white text-slate-950 font-black ring-2 ring-emerald-400"
                            : "bg-indigo-600 border-indigo-300 text-white"
                        }`}
                      >
                        {specialist.type === "profesional" ? (
                          <Sparkles className="w-3.5 h-3.5" />
                        ) : (
                          <Wrench className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div
                        className={`text-[8px] font-black px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap shadow-md flex items-center space-x-1 ${
                          isSelected
                            ? "bg-amber-400 text-slate-950 border border-amber-200"
                            : "bg-slate-900/90 text-slate-200 border border-slate-700"
                        }`}
                      >
                        <span>RD$ {price.toLocaleString()}</span>
                        <span className="text-[7px] text-amber-400">({specialist.etaMin}m)</span>
                      </div>
                    </div>
                  );
                })}

                {/* Radar Status Bottom Overlay */}
                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-xl flex items-center justify-between text-[9px] text-slate-300 z-10">
                  <span className="flex items-center space-x-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="font-bold text-white">Transmisión Satelital Activa</span>
                  </span>
                  <span className="text-amber-400 font-bold">Listado de propuestas abajo ↓</span>
                </div>
              </div>
            ) : (
              /* STANDARD COMPACT LIST VIEW HEADER */
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-3 rounded-2xl flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                    <List className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white">Vista de Lista Estándar</h5>
                    <p className="text-[10px] text-slate-400">
                      Comparativa directa de {biddingSpecialists.length} especialistas cercanos
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setRadarViewMode("radar");
                    onSpeak("Volviendo a la vista de radar interactivo.");
                  }}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold rounded-xl flex items-center space-x-1 cursor-pointer active:scale-95 transition-all"
                >
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>Ver Radar</span>
                </button>
              </div>
            )}

            {/* LIST OF CANDIDATE SPECIALISTS BELOW THE MAP FOR CLIENT TO CHOOSE THE BEST PRICE */}
            <div className="space-y-2.5">
              {/* Sort / Filter Options Bar */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h4 className="font-black text-xs text-white uppercase tracking-wider">
                    📋 Especialistas Disponibles para Elegir
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Compara sus propuestas, negocia el costo o elige el mejor precio.
                  </p>
                </div>

                {/* Sort Toggle Buttons */}
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-[9px]">
                  <button
                    onClick={() => {
                      setSortFilter("precio");
                      onSpeak("Ordenando por mejor precio en pesos dominicanos.");
                    }}
                    className={`px-2 py-1 rounded-lg font-extrabold cursor-pointer transition-all ${
                      sortFilter === "precio" ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    🏷️ Precio
                  </button>
                  <button
                    onClick={() => {
                      setSortFilter("rapido");
                      onSpeak("Ordenando por llegada más rápida.");
                    }}
                    className={`px-2 py-1 rounded-lg font-extrabold cursor-pointer transition-all ${
                      sortFilter === "rapido" ? "bg-amber-400 text-slate-950" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ⚡ Rápido
                  </button>
                  <button
                    onClick={() => {
                      setSortFilter("rating");
                      onSpeak("Ordenando por mejor calificación.");
                    }}
                    className={`px-2 py-1 rounded-lg font-extrabold cursor-pointer transition-all ${
                      sortFilter === "rating" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ⭐ Rating
                  </button>
                </div>
              </div>

              {/* Candidate Cards List */}
              <div className="space-y-2.5">
                {sortedBiddingSpecialists.map((specialist, index) => {
                  const currentPrice = specialist.negotiatedPrice || specialist.basePrice;
                  const isLowestPrice = index === 0 && sortFilter === "precio";
                  const isSelected = selectedSpecialist?.id === specialist.id;

                  return (
                    <div
                      key={specialist.id}
                      className={`bg-slate-800/95 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-md ${
                        isSelected
                          ? "border-amber-400 ring-2 ring-amber-400/30"
                          : isLowestPrice
                          ? "border-emerald-500/60 ring-1 ring-emerald-500/20"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {/* Top Header Row with Photo, Name and Price */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative">
                            <img
                              src={specialist.avatar}
                              alt={specialist.name}
                              className="w-11 h-11 rounded-2xl object-cover border-2 border-amber-400 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-[7px] text-slate-950 font-black">
                              ✓
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center space-x-1">
                              <h4 className="font-extrabold text-xs text-white">{specialist.name}</h4>
                              <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <span className="text-[10px] text-amber-300 font-semibold block">
                              {specialist.categoryLabel}
                            </span>
                            <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 mt-0.5">
                              <span className="flex items-center text-amber-400 font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />
                                {specialist.rating}
                              </span>
                              <span>•</span>
                              <span>{specialist.reviewsCount} reseñas</span>
                              <span>•</span>
                              <span className="text-emerald-300 font-bold">
                                🚗 {specialist.distanceKm} km ({specialist.etaMin} min)
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Price & Badge Container */}
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 block font-medium">Propuesta</span>
                          <div className="text-sm font-black text-emerald-400">RD$ {currentPrice.toLocaleString()}</div>
                          {specialist.priceNote && (
                            <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded block mt-0.5">
                              {specialist.priceNote}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Specialist Message / Photo Note */}
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1">
                        {specialist.photoEvaluationNote && (
                          <div className="text-emerald-400 font-semibold flex items-center space-x-1 text-[9px]">
                            <Camera className="w-3 h-3 text-emerald-400" />
                            <span>{specialist.photoEvaluationNote}</span>
                          </div>
                        )}
                        {specialist.quoteMessage && (
                          <div className="text-slate-200 italic flex items-start space-x-1">
                            <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                            <span>"{specialist.quoteMessage}"</span>
                          </div>
                        )}
                        <div className="text-slate-400 text-[9px]">
                          {specialist.specialty}
                        </div>
                      </div>

                      {/* Action Buttons: Negotiate / Call / Choose Specialist */}
                      <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                        <button
                          onClick={() => onSpeak(`Llamando a ${specialist.name} al ${specialist.phone}`)}
                          className="col-span-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                          title="Llamar"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenNegotiation(specialist)}
                          className="col-span-4 p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 font-extrabold text-[10px] flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        >
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span>Negociar</span>
                        </button>

                        <button
                          onClick={() => handleAssignSpecialistNow(specialist)}
                          className="col-span-6 p-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 font-black" />
                          <span>ELEGIR (RD$ {currentPrice.toLocaleString()})</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FLOATING ACTION BUTTON (FAB) FOR TOGGLING RADAR VIEW / LIST VIEW */}
            <div className="sticky bottom-3 right-0 flex justify-end z-30 pointer-events-none pr-1">
              <button
                onClick={() => {
                  const nextMode = radarViewMode === "radar" ? "list" : "radar";
                  setRadarViewMode(nextMode);
                  onSpeak(
                    nextMode === "list"
                      ? "Cambiando a vista de lista estándar de especialistas."
                      : "Cambiando a vista de radar satelital."
                  );
                }}
                className="pointer-events-auto flex items-center space-x-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-4 py-2.5 rounded-full shadow-2xl border-2 border-emerald-300/60 active:scale-95 transition-all cursor-pointer backdrop-blur-md ring-4 ring-emerald-500/20"
                title={radarViewMode === "radar" ? "Cambiar a vista de lista estándar" : "Cambiar a vista de radar interactivo"}
              >
                {radarViewMode === "radar" ? (
                  <>
                    <List className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">Vista Lista</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4 text-slate-950 stroke-[2.5] animate-pulse" />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">Vista Radar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* SCREEN: LIVE REQUESTS FEED (FOR TECHNICIANS & PROFESSIONALS) */}
        {isDemo && currentScreen === "requests_feed" && (
          <div className="space-y-3 animate-fadeIn">
            {/* Active Specialist Profile & Specialty Bar */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                    {AREA_TAXONOMIES[specialistActiveTrade]?.icon || "🛠️"}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black text-white">Tu Perfil Activo</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        Acreditado
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-400 font-bold">
                      {AREA_TAXONOMIES[specialistActiveTrade]?.name || "Especialidad"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {AREA_TAXONOMIES[specialistActiveTrade]?.credentialSample || specialistCredentialCode}
                  </span>
                  <span className="text-[8px] text-slate-500 block max-w-[140px] truncate">
                    {AREA_TAXONOMIES[specialistActiveTrade]?.requiredCredential || "Acreditación Oficial"}
                  </span>
                </div>
              </div>

              {/* Quick Trade Selector (Allows testing restrictions across different areas) */}
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-semibold">Cambiar tu especialidad para pruebas:</span>
                <select
                  value={specialistActiveTrade}
                  onChange={(e) => {
                    const newTrade = e.target.value as ServiceCategoryKey;
                    setSpecialistActiveTrade(newTrade);
                    const tax = AREA_TAXONOMIES[newTrade];
                    setSpecialistCredentialCode(tax?.credentialSample || "CERT-0001");
                    onSpeak(`Especialidad cambiada a ${tax?.name}. Ahora tienes credenciales de ${tax?.doctorOrLawyerTitle}.`);
                  }}
                  className="bg-slate-900 border border-slate-700 text-amber-300 text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="plomeria">🔧 Plomero (Técnico)</option>
                  <option value="electricidad">⚡ Electricista (Técnico)</option>
                  <option value="salud">🩺 Médico / Pediatra (CMD)</option>
                  <option value="legal">⚖️ Abogado / Notario (CARD)</option>
                  <option value="climatizacion">❄️ Climas & HVAC (Técnico)</option>
                  <option value="cerrajeria">🔐 Cerrajería (Técnico)</option>
                  <option value="ingenieria">🏗️ Ing. Estructural (CODIA)</option>
                  <option value="arquitectura">📐 Arquitecto DRO (CODIA)</option>
                  <option value="mecanica">🚗 Mecánica Automotriz</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] px-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>Filtrar por Área de Servicio:</span>
                <span className="text-amber-400 font-black">{filteredRequests.length} Solicitudes</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto py-1 scrollbar-none">
                {[
                  { id: "todas", label: "Todas" },
                  { id: "salud", label: "🩺 Salud" },
                  { id: "legal", label: "⚖️ Legal" },
                  { id: "plomeria", label: "🔧 Plomería" },
                  { id: "electricidad", label: "⚡ Electricidad" },
                  { id: "climatizacion", label: "❄️ Climas" },
                  { id: "cerrajeria", label: "🔐 Cerrajería" },
                  { id: "ingenieria", label: "🏗️ Ingeniería" },
                  { id: "arquitectura", label: "📐 Arquitectura" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setFeedCategoryFilter(cat.id);
                      if (cat.id !== "todas") {
                        onSpeak(`Filtrando solicitudes del área de ${cat.label}.`);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                      feedCategoryFilter === cat.id
                        ? "bg-amber-400 text-slate-950 shadow-md font-black"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Incoming Client Requests */}
            <div className="space-y-2.5">
              {filteredRequests.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-black text-slate-300">No hay solicitudes en esta categoría</div>
                  <p className="text-[10px] text-slate-400">
                    Cambia el filtro de categoría a "Todas" para explorar más trabajos disponibles.
                  </p>
                  <button
                    onClick={() => setFeedCategoryFilter("todas")}
                    className="mt-1 px-3 py-1.5 bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Ver Todas las Solicitudes
                  </button>
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const isAccepted = req.status === "aceptado";
                  const isTradeMismatch = req.category !== specialistActiveTrade;
                  const reqTaxonomy = AREA_TAXONOMIES[req.category] || detectAreaForQuery(req.serviceTitle || req.categoryLabel);

                  return (
                    <div
                      key={req.id}
                      className={`bg-slate-800/95 border rounded-2xl p-3.5 space-y-3 transition-all shadow-md ${
                        isAccepted
                          ? "border-emerald-500/60 ring-2 ring-emerald-500/30"
                          : isTradeMismatch
                          ? "border-slate-700 hover:border-amber-400/50"
                          : "border-emerald-500/40 ring-1 ring-emerald-500/20"
                      }`}
                    >
                      {/* Top Category Header Badge */}
                      <div className="flex items-center justify-between bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
                        <div className="flex items-center space-x-1.5 text-[10px]">
                          <span className="text-base">{reqTaxonomy.icon}</span>
                          <span className="font-extrabold text-white">{reqTaxonomy.name}</span>
                          <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono max-w-[110px] truncate">
                            {reqTaxonomy.requiredCredential}
                          </span>
                        </div>

                        {isTradeMismatch ? (
                          <span className="text-[9px] bg-amber-400/20 text-amber-300 font-extrabold px-2 py-0.5 rounded border border-amber-400/40 flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <span>Requiere Validación</span>
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center space-x-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Tu Especialidad</span>
                          </span>
                        )}
                      </div>

                      {/* Client Info & Price Strategy */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2.5">
                          <img
                            src={req.clientAvatar}
                            alt={req.clientName}
                            className="w-10 h-10 rounded-2xl object-cover border-2 border-amber-400 shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center space-x-1">
                              <h4 className="font-extrabold text-xs text-white">{req.clientName}</h4>
                              <span className="text-[9px] text-amber-400 flex items-center font-bold">
                                ★ {req.clientRating}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1.5">
                              <span className="text-indigo-300 font-medium">{req.clientServicesCount} servicios</span>
                              <span>•</span>
                              <span className="text-emerald-300 font-bold">A {req.distanceKm} km ({req.etaMin} min)</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {req.priceStrategy === "intemperie" ? (
                            <div>
                              <span className="text-[8px] bg-amber-400/20 text-amber-300 font-black px-2 py-0.5 rounded uppercase block">
                                🍃 A la intemperie
                              </span>
                              <span className="text-xs font-black text-emerald-400 mt-0.5 block">
                                Cotización Abierta
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[8px] text-slate-400 block font-medium">Presupuesto Base</span>
                              <span className="text-sm font-black text-emerald-400">RD$ {req.offeredBudget.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Job Details Box */}
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-amber-400">{req.serviceTitle}</span>
                          <span className="text-[9px] bg-red-500/20 text-red-300 font-extrabold px-1.5 py-0.5 rounded border border-red-500/30 uppercase">
                            {req.urgency}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 line-clamp-3">
                          {req.problemDetails || req.problemDescription}
                        </p>

                        {/* Credential requirement pill */}
                        <div className="flex items-center space-x-1.5 text-[9px] bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-slate-300">
                          <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Exclusivo para: <strong className="text-white">{req.requiredTradeLabel || reqTaxonomy.doctorOrLawyerTitle}</strong>
                          </span>
                        </div>

                        {/* Attached Job Photos Preview for Techs */}
                        {req.photos && req.photos.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-slate-800">
                            <span className="text-[9px] text-slate-400 font-bold flex items-center space-x-1">
                              <Camera className="w-3 h-3 text-amber-400" />
                              <span>Fotos adjuntas por el cliente ({req.photos.length}):</span>
                            </span>
                            <div className="flex gap-1.5 overflow-x-auto py-0.5">
                              {req.photos.map((photoUrl, pIdx) => (
                                <img
                                  key={pIdx}
                                  src={photoUrl}
                                  alt={`Foto trabajo ${pIdx + 1}`}
                                  onClick={() => setExpandedPhotoUrl(photoUrl)}
                                  className="w-14 h-14 rounded-lg object-cover border border-amber-400/70 cursor-pointer hover:opacity-80 transition-opacity"
                                  referrerPolicy="no-referrer"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 text-[9px] text-slate-400 pt-1 border-t border-slate-800/80">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{req.clientAddress}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Cotizar o Aceptar Directo con Validación Automática */}
                      <div className="grid grid-cols-12 gap-1.5 pt-0.5">
                        <button
                          onClick={() => {
                            setRequestsList((prev) => prev.filter((r) => r.id !== req.id));
                            onSpeak("Solicitud descartada.");
                          }}
                          className="col-span-2 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-300 font-bold text-[10px] rounded-xl transition-all cursor-pointer flex items-center justify-center"
                          title="Omitir"
                        >
                          ✕
                        </button>

                        <button
                          onClick={() => handleAttemptQuoteJob(req)}
                          className="col-span-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-xl flex items-center justify-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <DollarSign className="w-3 h-3 text-amber-300" />
                          <span>Cotizar</span>
                        </button>

                        <button
                          onClick={() => handleAttemptAcceptJob(req)}
                          className="col-span-6 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-300 text-slate-950 font-black text-[11px] rounded-xl flex items-center justify-center space-x-1 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-slate-950" />
                          <span>⚡ ACEPTAR SERVICIO</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SCREEN: TECHNICIAN GPS NAVIGATION & TURN-BY-TURN ROUTE TO CLIENT */}
        {isDemo && currentScreen === "tech_navigation" && activeAcceptedJob && (
          <div className="space-y-3 animate-fadeIn">
            {/* Top Navigation Step Bar */}
            <div className="bg-emerald-500 text-slate-950 p-3 rounded-2xl shadow-lg flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-emerald-400 flex items-center justify-center font-black">
                  <Navigation2 className="w-5 h-5 transform rotate-45" />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-950/20 px-1.5 py-0.5 rounded">
                    Ruta Activa • {jobStage === "en_camino" ? "En Camino" : "En Sitio"}
                  </span>
                  <div className="font-black text-xs leading-tight mt-0.5">
                    {turnInstruction}
                  </div>
                </div>
              </div>

              <div className="text-right pl-2 shrink-0">
                <div className="text-sm font-black">{navEtaMin} min</div>
                <div className="text-[9px] font-bold opacity-80">{activeAcceptedJob.distanceKm} km</div>
              </div>
            </div>

            {/* GPS ROUTE MAP SIMULATION */}
            <div className="h-64 sm:h-72 bg-slate-950 rounded-3xl border-2 border-indigo-500/50 relative overflow-hidden shadow-2xl">
              {/* City Grid Background */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] [background-size:24px_24px]"></div>

              {/* Road / Route Path Line Simulation */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M 60 210 Q 140 140 180 160 T 290 70"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="opacity-40"
                />
                <path
                  d="M 60 210 Q 140 140 180 160 T 290 70"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </svg>

              {/* Specialist / Technician Vehicle Marker Moving */}
              <div className="absolute bottom-12 left-10 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 animate-bounce">
                <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-xl ring-4 ring-indigo-500/40">
                  <Car className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-black bg-slate-900 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500 mt-1 shadow whitespace-nowrap">
                  Tu Vehículo (42 km/h)
                </span>
              </div>

              {/* Client Destination House Marker */}
              <div className="absolute top-12 right-10 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white text-slate-950 flex items-center justify-center shadow-xl ring-4 ring-emerald-500/40 animate-pulse">
                    <MapPin className="w-4 h-4 font-black" />
                  </div>
                </div>
                <span className="text-[8px] font-black bg-slate-900 text-emerald-300 px-1.5 py-0.5 rounded-full border border-emerald-500 mt-1 shadow whitespace-nowrap">
                  Casa de {activeAcceptedJob.clientName.split(" ")[0]}
                </span>
              </div>

              {/* Map Floating Control Overlay */}
              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-xl flex items-center justify-between text-[10px] text-slate-300 z-10">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-bold text-white">Navegación Satelital Diclik.com</span>
                </span>
                <button
                  onClick={() => {
                    setNavEtaMin(Math.max(1, navEtaMin - 2));
                    onSpeak("Actualizando tiempo estimado y tráfico en vivo.");
                  }}
                  className="text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  Recalcular Ruta
                </button>
              </div>
            </div>

            {/* Client Card with Direct Communication */}
            <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={activeAcceptedJob.clientAvatar}
                    alt={activeAcceptedJob.clientName}
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-emerald-400 shadow"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center space-x-1">
                      <h4 className="font-black text-xs text-white">{activeAcceptedJob.clientName}</h4>
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-amber-400 font-bold block">{activeAcceptedJob.serviceTitle}</span>
                    <span className="text-[9px] text-slate-400">{activeAcceptedJob.clientAddress}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400">Total a Cobrar</span>
                  <div className="text-sm font-black text-emerald-400">RD$ {activeAcceptedJob.offeredBudget.toLocaleString()}</div>
                </div>
              </div>

              {/* Quick Communication Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSpeak(`Llamando al cliente ${activeAcceptedJob.clientName} al ${activeAcceptedJob.clientPhone}`)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-amber-400 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </button>

                <button
                  onClick={() => onSpeak(`Abriendo chat con ${activeAcceptedJob.clientName}`)}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-emerald-400 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>

                <button
                  onClick={() => onSpeak("Abriendo coordenadas en Waze y Google Maps.")}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-sky-400 font-bold text-[11px] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Waze / Maps</span>
                </button>
              </div>

              {/* Arrival & Work Stage CTA */}
              {jobStage === "en_camino" ? (
                <button
                  onClick={handleMarkArrivalAtClient}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>📍 ¡He llegado al domicilio del cliente!</span>
                </button>
              ) : (
                /* Arrived: Show OTP Verification to release Escrow payment */
                <div className="p-3 bg-slate-900 rounded-xl border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-emerald-400 flex items-center space-x-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Liberación de Pago al Concluir</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Escrow Protegido</span>
                  </div>

                  <p className="text-[10px] text-slate-300">
                    Pide al cliente su <strong>Código OTP de 4 dígitos</strong> una vez que hayas terminado el trabajo para transferir los <strong>RD$ {activeAcceptedJob.offeredBudget.toLocaleString()}</strong> a tu cuenta.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="Ingresar 4 dígitos"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono font-bold text-sm text-white tracking-widest focus:outline-none focus:border-amber-400"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
                    >
                      Validar OTP
                    </button>
                  </div>

                  {isOtpVerified && (
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-center text-xs font-black flex items-center justify-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>¡Pago de RD$ {activeAcceptedJob.offeredBudget.toLocaleString()} liberado con éxito!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 3: VALIDACIÓN DE PAGO OTP (ESCRITORIO / VERIFICACIÓN) */}
        {isDemo && currentScreen === "otp" && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-3xl text-center space-y-3">
              <div className="w-12 h-12 bg-amber-400/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Código de Seguridad Escrow</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  El cliente proporciona este código al técnico SÓLO cuando el trabajo haya sido concluido a su entera satisfacción.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
                  Tu Código OTP de Liberación (Cliente)
                </div>
                <div className="text-3xl font-black text-amber-400 tracking-[0.3em]">
                  {otpCode}
                </div>
              </div>

              {/* Technician Input to Validate OTP */}
              <div className="pt-2 space-y-2 text-left">
                <label className="text-[11px] font-bold text-slate-300 block">
                  Técnico / Profesional: Ingresar OTP para liberar fondos
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Ingresa 4 dígitos"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center font-mono font-bold text-base text-white tracking-widest focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleVerifyOtp}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
                  >
                    Validar
                  </button>
                </div>
                {isOtpVerified && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-center text-xs font-bold flex items-center justify-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Fondos transferidos exitosamente a tu cuenta bancaria!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 4: RASTREO GPS EN VIVO (CLIENTE) */}
        {isDemo && currentScreen === "tracking" && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Active Assigned Specialist Header */}
            {activeRequestedSpecialist && (
              <div className="bg-slate-800 border border-slate-700 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-300">Orden Activa #DCL-849</span>
                  <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>En Camino ({etaMinutes} min)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <img
                      src={activeRequestedSpecialist.avatar}
                      alt={activeRequestedSpecialist.name}
                      className="w-10 h-10 rounded-2xl object-cover border-2 border-indigo-500 shadow"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-xs text-white">{activeRequestedSpecialist.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{activeRequestedSpecialist.rating} • {activeRequestedSpecialist.vehicle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => onSpeak(`Llamando a ${activeRequestedSpecialist.name}`)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-amber-400 transition-all cursor-pointer"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSpeak(`Abriendo chat con ${activeRequestedSpecialist.name}`)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-emerald-400 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Navigation Route Map */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Ruta Satelital en Tiempo Real</span>
                <span className="text-xs font-black text-amber-400">{etaMinutes} min restantes</span>
              </div>

              {/* Simulated Map Graphic */}
              <div className="h-44 bg-slate-950 rounded-2xl border border-slate-700/80 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Route Line Simulation */}
                <div className="absolute w-44 h-1 bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transform -rotate-12 rounded-full"></div>
                
                {/* Technician Marker Moving */}
                <div className="absolute top-8 left-10 flex flex-col items-center animate-bounce">
                  <div className="bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-indigo-400">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold bg-slate-900 px-1.5 rounded-full mt-0.5 border border-indigo-500">
                    {activeRequestedSpecialist?.name.split(" ")[0] || "Técnico"}
                  </span>
                </div>

                {/* Client Destination Marker */}
                <div className="absolute bottom-8 right-12 flex flex-col items-center">
                  <div className="bg-amber-400 text-slate-950 p-2 rounded-full shadow-lg border-2 border-amber-300">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold bg-slate-900 text-amber-400 px-1.5 rounded-full mt-0.5 border border-amber-400">
                    Tu Domicilio
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-slate-400">Velocidad: 42 km/h</span>
                <button
                  onClick={() => {
                    setEtaMinutes(Math.max(2, etaMinutes - 2));
                    onSpeak("Actualizando posición satelital del especialista.");
                  }}
                  className="text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  Actualizar GPS
                </button>
              </div>
            </div>

            {/* Client Release Code Quick Card */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                  Tu Código OTP de Liberación
                </span>
                <span className="text-lg font-black text-amber-400 tracking-widest">{otpCode}</span>
              </div>
              <button
                onClick={() => setCurrentScreen("otp")}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer"
              >
                Ver Validación
              </button>
            </div>
          </div>
        )}

        {/* SCREEN 5: PANEL DE PROFESIONALES */}
        {isDemo && currentScreen === "profesionales" && (
          <div className="space-y-3.5 animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-500 to-indigo-600 text-white p-3.5 rounded-2xl shadow-md">
              <span className="text-[9px] font-black uppercase tracking-wider bg-black/25 px-2 py-0.5 rounded">
                🎓 Panel Colegiado & Consultoría
              </span>
              <h3 className="text-xs font-black mt-1">Especialistas, Arquitectos e Ingenieros</h3>
              <p className="text-[10px] opacity-90 mt-0.5">
                Firma digital, dictámenes técnicos, planos y estimaciones de honorarios por m².
              </p>
            </div>

            <button
              onClick={() => {
                setMobileRole("profesional");
                setCurrentScreen("requests_feed");
                onSpeak("Mostrando proyectos y dictámenes solicitados por clientes.");
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md"
            >
              <Briefcase className="w-4 h-4 text-slate-950" />
              <span>Ver Proyectos de Clientes Solicitados</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleClientSearchAndRequest("Ingenieros y Peritos")}
              className="w-full bg-slate-800 hover:bg-slate-750 border border-emerald-500/40 text-emerald-300 font-bold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Ver Profesionales en el Radar Satelital</span>
            </button>

            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Proyectos y Dictámenes Activos
              </div>

              <div className="p-3 bg-slate-800/90 border border-slate-700/90 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">Cálculo Estructural Cimentación</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded">Firma Lista</span>
                </div>
                <p className="text-[10px] text-slate-300">Cliente: Residencia Los Cacicazgos • 450 m²</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                  <span>Honorarios: <strong className="text-white">RD$ 110,000</strong></span>
                  <button
                    onClick={() => onSpeak("Dictamen estructural emitido y firmado digitalmente con código QR de autenticidad.")}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer active:scale-95"
                  >
                    Emitir Dictamen QR
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-800/90 border border-slate-700/90 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300">Supervisión de Obra HVAC</span>
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">En Revisión</span>
                </div>
                <p className="text-[10px] text-slate-300">Torre Comercial Piantini • Nivel 4 a 8</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700">
                  <span>Honorarios: <strong className="text-white">RD$ 190,000</strong></span>
                  <button
                    onClick={() => onSpeak("Subiendo memoria de cálculo y especificaciones del sistema HVAC.")}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer active:scale-95"
                  >
                    Cargar Especificación
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DIRECT RECIPROCAL NEGOTIATION DIALOGUE MODAL */}
      {negotiatingSpecialist && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-end p-3 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl p-4 space-y-3 shadow-2xl max-h-[92%] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="relative">
                  <img
                    src={negotiatingSpecialist.avatar}
                    alt={negotiatingSpecialist.name}
                    className="w-10 h-10 rounded-2xl object-cover border-2 border-amber-400"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></span>
                </div>
                <div>
                  <div className="flex items-center space-x-1">
                    <h4 className="font-black text-xs text-white">{negotiatingSpecialist.name}</h4>
                    <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold block">
                    {negotiatingSpecialist.categoryLabel} • {negotiatingSpecialist.distanceKm} km
                  </span>
                </div>
              </div>
              <button
                onClick={() => setNegotiatingSpecialist(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Standing Offer Banner */}
            {negotiationStatus === "agreed" ? (
              <div className="p-3 bg-gradient-to-r from-emerald-950 to-slate-900 border-2 border-emerald-400 rounded-2xl text-center space-y-1 animate-pulse">
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center space-x-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>¡Trato Enlazado y Cerrado con Éxito!</span>
                </div>
                <div className="text-xl font-black text-white">
                  RD$ {agreedDealPrice?.toLocaleString()} Pesos Dominicanos
                </div>
                <p className="text-[10px] text-slate-300">
                  Ambas partes han aceptado. Los fondos están protegidos en Escrow hasta validar con tu OTP.
                </p>
              </div>
            ) : negotiationStatus === "rejected" ? (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span className="text-rose-200 font-bold text-[11px]">
                    Oferta de RD$ {standingOffer?.price.toLocaleString()} no aceptada.
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                  Proponer otra cantidad abajo
                </span>
              </div>
            ) : (
              <div className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    Oferta Actual sobre la Mesa
                  </span>
                  <div className="text-base font-black text-amber-400">
                    RD$ {standingOffer?.price.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block">Propuesta por:</span>
                  <span className="text-[10px] font-extrabold text-white bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                    {standingOffer?.proposedBy === "client" ? "👤 Cliente (Tú)" : `🛠️ ${negotiatingSpecialist.name}`}
                  </span>
                </div>
              </div>
            )}

            {/* Negotiation Dialogue Stream */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-1 pr-1 max-h-48">
              {negotiationTurns.map((turn) => {
                const isClient = turn.sender === "client";
                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${isClient ? "items-end" : "items-start"} space-y-0.5`}
                  >
                    <div className="flex items-center space-x-1 text-[9px] text-slate-400 px-1">
                      <span>{turn.senderName}</span>
                      <span>•</span>
                      <span>{turn.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[88%] p-3 rounded-2xl text-[11px] shadow-md ${
                        turn.actionType === "accept"
                          ? "bg-emerald-600 text-slate-950 font-black border-2 border-emerald-300"
                          : turn.actionType === "reject"
                          ? "bg-rose-950/80 text-rose-200 border border-rose-500/40"
                          : isClient
                          ? "bg-amber-400 text-slate-950 font-bold rounded-tr-none"
                          : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                      }`}
                    >
                      <p className="leading-relaxed">{turn.text}</p>
                      {turn.price && turn.actionType !== "reject" && (
                        <div
                          className={`mt-1 text-[10px] font-black inline-block px-2 py-0.5 rounded-md ${
                            isClient ? "bg-slate-950 text-amber-400" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          RD$ {turn.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MAPA SATELITAL INDICANDO EL LUGAR HACIA DONDE DEBE DIRIGIRSE */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-extrabold text-amber-400 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>Ruta Satelital & Lugar de Destino:</span>
                </span>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  🚗 {negotiatingSpecialist.distanceKm} km • ~{negotiatingSpecialist.etaMin} min
                </span>
              </div>

              {/* Graphical Route & Street View Map */}
              <div className="h-28 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:12px_12px]"></div>
                
                {/* Street lines simulation */}
                <div className="absolute inset-x-0 top-1/2 h-4 bg-slate-950/80 -translate-y-1/2 border-y border-slate-800"></div>
                <div className="absolute inset-y-0 left-1/3 w-4 bg-slate-950/80 border-x border-slate-800"></div>

                {/* Simulated GPS Trajectory Line */}
                <div className="absolute w-3/4 h-1.5 bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>

                {/* Specialist Origin Marker */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 border-2 border-indigo-400 text-white flex items-center justify-center shadow-lg text-[10px]">
                    🛠️
                  </div>
                  <span className="text-[7px] font-bold bg-slate-950 text-indigo-300 px-1 rounded mt-0.5 border border-indigo-500/40 whitespace-nowrap max-w-[70px] truncate">
                    {negotiatingSpecialist.name.split(" ")[0]}
                  </span>
                </div>

                {/* Pulse Moving Car / Specialist Indicator */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping absolute"></div>
                  <div className="w-4 h-4 rounded-full bg-amber-400 border border-slate-950 flex items-center justify-center text-[8px] shadow">
                    🚗
                  </div>
                </div>

                {/* Client Destination Marker */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-emerald-300 text-slate-950 flex items-center justify-center shadow-lg font-black text-xs animate-pulse">
                    📍
                  </div>
                  <span className="text-[7px] font-extrabold bg-slate-950 text-emerald-300 px-1 rounded mt-0.5 border border-emerald-500/40 whitespace-nowrap">
                    Destino
                  </span>
                </div>
              </div>

              {/* Exact Location & Direction Badge */}
              <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 text-[10px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Lugar hacia donde debe dirigirse:</span>
                  <span className="text-[9px] text-emerald-400 font-extrabold bg-emerald-400/10 px-1.5 py-0.2 rounded">
                    GPS Listo
                  </span>
                </div>
                <div className="font-extrabold text-white text-[11px] flex items-center space-x-1">
                  <span className="text-amber-400">📍</span>
                  <span className="truncate">{clientAddressInput || "Av. Winston Churchill #402, Piantini, Santo Domingo"}</span>
                </div>
              </div>
            </div>

            {/* ACTION PATHWAYS */}
            {negotiationStatus === "agreed" ? (
              /* Deal Agreed: Launch Specialist Directly */
              <div className="pt-1 space-y-2">
                <div className="p-2 bg-emerald-950/70 border border-emerald-400/50 rounded-xl text-[10px] text-emerald-300 flex items-center space-x-1.5 font-bold animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Oferta aceptada. El mapa y la ruta satelital hacia el lugar están listos.</span>
                </div>

                <button
                  onClick={handleFinalizeAndHireFromNegotiation}
                  className="w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400 hover:from-emerald-300 hover:to-emerald-300 text-slate-950 font-black text-xs py-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl active:scale-95 cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-slate-950 font-black" />
                  <span>DESPACHAR Y ABRIR NAVEGACIÓN SATELITAL (RD$ {agreedDealPrice?.toLocaleString()})</span>
                </button>

                <button
                  onClick={() => setNegotiatingSpecialist(null)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Volver al Radar
                </button>
              </div>
            ) : (
              /* Active Negotiation: 1. Aceptar, 2. Rechazar, 3. Otra Negociación (Espacio en Blanco) */
              <div className="space-y-2.5 pt-1 border-t border-slate-800">
                {/* 1 & 2: Primary Quick Action Row (Aceptar vs Rechazar) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAcceptStandingOffer("client")}
                    className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-4 h-4 font-black" />
                    <span>ACEPTAR (RD$ {standingOffer?.price.toLocaleString()})</span>
                  </button>

                  <button
                    onClick={() => handleRejectStandingOffer("client")}
                    className="py-2.5 px-3 bg-rose-900/60 hover:bg-rose-850 border border-rose-500/40 text-rose-200 font-bold text-xs rounded-2xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>NO ACEPTO</span>
                  </button>
                </div>

                {/* 3: OTRA NEGOCIACIÓN - ESPACIO EN BLANCO Y CONTRAOFERTA */}
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center space-x-1">
                      <DollarSign className="w-3 h-3 text-amber-400" />
                      <span>Otra Negociación (Espacio en Blanco):</span>
                    </span>
                    <span className="text-[9px] text-slate-400">Pesos Dominicanos</span>
                  </div>

                  {/* The Blank Space Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 font-black text-xs">
                        RD$
                      </span>
                      <input
                        type="number"
                        step={100}
                        value={customCounterAmount}
                        onChange={(e) => setCustomCounterAmount(e.target.value)}
                        placeholder="Ej. 2000 o 3500"
                        className="w-full bg-slate-900 border-2 border-amber-400/60 rounded-xl pl-11 pr-3 py-2 text-sm text-white font-black focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      onClick={() => handleSendCustomCounterOffer("client")}
                      className="px-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center space-x-1 cursor-pointer active:scale-95 shadow"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                      <span>Contraofertar</span>
                    </button>
                  </div>

                  {/* Quick Preset Buttons (e.g. 1500, 2000, 3500, 4000, -500, +500) */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[1500, 2000, 3500, 4000].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setCustomCounterAmount(preset.toString());
                          setCustomCounterReason(`Solo dispongo de RD$ ${preset.toLocaleString()} pesos.`);
                        }}
                        className={`text-[9px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          customCounterAmount === preset.toString()
                            ? "bg-amber-400 text-slate-950 border-amber-400"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700"
                        }`}
                      >
                        RD$ {preset.toLocaleString()}
                      </button>
                    ))}

                    <button
                      onClick={() => {
                        const cur = parseFloat(customCounterAmount) || 2000;
                        setCustomCounterAmount(Math.max(500, cur - 500).toString());
                      }}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      - RD$ 500
                    </button>

                    <button
                      onClick={() => {
                        const cur = parseFloat(customCounterAmount) || 2000;
                        setCustomCounterAmount((cur + 500).toString());
                      }}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      + RD$ 500
                    </button>
                  </div>

                  {/* Optional Custom Note */}
                  <input
                    type="text"
                    value={customCounterReason}
                    onChange={(e) => setCustomCounterReason(e.target.value)}
                    placeholder="Mensaje opcional (ej: solo puedo pagar 2,000 pesos)..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-amber-400 placeholder-slate-500"
                  />
                </div>

                {/* SIMULACIÓN DE RESPUESTA DEL TÉCNICO (Control de prueba interactivo) */}
                <div className="bg-slate-950/80 p-2 rounded-xl border border-indigo-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-extrabold text-indigo-300 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      <span>Simulador de Respuestas de {negotiatingSpecialist.name}:</span>
                    </span>
                    <span className="text-slate-500">Prueba instantánea</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[9px]">
                    <button
                      onClick={() => handleAcceptStandingOffer("tech")}
                      className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold rounded-lg transition-all cursor-pointer active:scale-95 text-center"
                    >
                      🟢 Aceptar Oferta
                    </button>

                    <button
                      onClick={() =>
                        handleSendCustomCounterOffer(
                          "tech",
                          3500,
                          "Te lo hago en 3,500 pesos y salgo ahora mismo con garantía."
                        )
                      }
                      className="p-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 font-bold rounded-lg transition-all cursor-pointer active:scale-95 text-center"
                    >
                      🟡 Contraofertar 3,500
                    </button>

                    <button
                      onClick={() => handleRejectStandingOffer("tech")}
                      className="p-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold rounded-lg transition-all cursor-pointer active:scale-95 text-center"
                    >
                      🔴 Rechazar Oferta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CAMERA VIEWFINDER SIMULATOR MODAL */}
      {isCameraActive && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 animate-fadeIn">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white pt-2">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>CAM 4K DICLIK.COM</span>
            </span>
            <button
              onClick={() => setIsCameraActive(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Viewfinder Frame */}
          <div className="flex-1 my-4 border border-dashed border-amber-400/40 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center bg-slate-900/60 p-4">
            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-r border-b border-white"></div>
              <div className="border-b border-white"></div>
              <div className="border-r border-white"></div>
              <div className="border-r border-white"></div>
              <div></div>
            </div>

            {/* Target Reticle */}
            <div className="w-28 h-28 border-2 border-amber-400 rounded-2xl flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
            </div>

            <div className="mt-4 text-center space-y-1">
              <p className="text-xs font-bold text-white">Enfoca el área de avería o proyecto</p>
              <p className="text-[10px] text-slate-400">Tuberías, cerraduras, equipos, techos o planos</p>
            </div>
          </div>

          {/* Shutter Controls */}
          <div className="flex items-center justify-around pb-4">
            <button
              onClick={() => {
                setIsCameraActive(false);
                setIsPresetPhotosModalOpen(true);
              }}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-slate-300 text-xs font-bold flex flex-col items-center cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 mb-1 text-amber-400" />
              <span>Muestras</span>
            </button>

            {/* Capture Trigger */}
            <button
              onClick={handleSimulatedCameraCapture}
              className="w-16 h-16 rounded-full bg-white p-1 shadow-2xl active:scale-90 transition-transform cursor-pointer flex items-center justify-center"
            >
              <div className="w-14 h-14 rounded-full border-4 border-slate-900 bg-amber-400 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-950" />
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-slate-300 text-xs font-bold flex flex-col items-center cursor-pointer"
            >
              <Upload className="w-5 h-5 mb-1 text-emerald-400" />
              <span>Galería</span>
            </button>
          </div>
        </div>
      )}

      {/* PRESET SAMPLES PHOTO PICKER MODAL */}
      {isPresetPhotosModalOpen && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex flex-col justify-end p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 space-y-3 shadow-2xl max-h-[85%] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <h4 className="font-extrabold text-xs text-white">Fotos de Averías de Referencia</h4>
              </div>
              <button
                onClick={() => setIsPresetPhotosModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Selecciona una imagen representativa para que los técnicos y peritos coticen con precisión:
            </p>

            <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-60 pr-1">
              {[
                {
                  label: "Tubería / Fuga de Agua",
                  url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80"
                },
                {
                  label: "Tablero Eléctrico / Breaker",
                  url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80"
                },
                {
                  label: "Aire Acondicionado / Split",
                  url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80"
                },
                {
                  label: "Cerradura / Puerta Trabada",
                  url: "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80"
                },
                {
                  label: "Techo / Filtración / Humedad",
                  url: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80"
                },
                {
                  label: "Plano Arquitectónico / DRO",
                  url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80"
                }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPresetPhoto(item.url)}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 text-left hover:border-amber-400 transition-all cursor-pointer"
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-2 bg-slate-900/90 text-[10px] font-bold text-slate-200">
                    {item.label}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsPresetPhotosModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* PHOTO ZOOM / PREVIEW MODAL */}
      {expandedPhotoUrl && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col justify-between p-4 animate-fadeIn">
          <div className="flex items-center justify-between text-white">
            <span className="text-xs font-bold text-amber-400">Inspección Detallada de Evidencia</span>
            <button
              onClick={() => setExpandedPhotoUrl(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl border border-slate-800">
            <img
              src={expandedPhotoUrl}
              alt="Foto ampliada del trabajo"
              className="max-h-full max-w-full object-contain rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <button
            onClick={() => setExpandedPhotoUrl(null)}
            className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-2xl cursor-pointer"
          >
            Volver
          </button>
        </div>
      )}

      {/* TECHNICIAN / PROFESSIONAL PROPOSAL & QUOTE SUBMISSION MODAL */}
      {proposingJob && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-end p-3 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl p-4 space-y-3 shadow-2xl max-h-[90%] flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  ⚡ Enviar Cotización al Cliente
                </span>
                <h4 className="font-black text-sm text-white mt-1">{proposingJob.serviceTitle}</h4>
              </div>
              <button
                onClick={() => setProposingJob(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Client Context & Photos */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Cliente: {proposingJob.clientName}</span>
                <span className="text-amber-400 font-bold text-[10px]">{proposingJob.distanceKm} km • {proposingJob.clientAddress.split(",")[0]}</span>
              </div>

              {proposingJob.problemDetails && (
                <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  "{proposingJob.problemDetails}"
                </p>
              )}

              {/* Photos Attached by Client */}
              {proposingJob.photos && proposingJob.photos.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-amber-400 block mb-1">
                    📷 Fotos del trabajo ({proposingJob.photos.length}):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {proposingJob.photos.map((photo, pIdx) => (
                      <img
                        key={pIdx}
                        src={photo}
                        alt="Evidencia"
                        onClick={() => setExpandedPhotoUrl(photo)}
                        className="w-14 h-14 object-cover rounded-xl border border-slate-700 hover:border-amber-400 cursor-pointer transition-all flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Price Strategy Note */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Modalidad del Cliente:</span>
                {proposingJob.priceStrategy === "intemperie" ? (
                  <span className="text-amber-400 font-extrabold bg-amber-400/10 px-2 py-0.5 rounded">
                    🌤️ A la Interperie (Tú pones el precio de negociación)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-extrabold bg-emerald-400/10 px-2 py-0.5 rounded">
                    🛡️ Mínimo Base: RD$ {proposingJob.offeredBudget?.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* MAPA INDICANDO EL LUGAR HACIA DONDE DEBE DIRIGIRSE EL PROFESIONAL */}
            <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-amber-400 font-extrabold flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                  <span>Destino del Servicio a Dirigirse:</span>
                </span>
                <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  📍 {proposingJob.distanceKm} km • ~{proposingJob.etaMin} min
                </span>
              </div>

              {/* Graphical Route Simulation */}
              <div className="h-20 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#4b5563_1px,transparent_1px)] [background-size:10px_10px]"></div>
                <div className="absolute inset-x-0 top-1/2 h-3 bg-slate-950/80 -translate-y-1/2 border-y border-slate-800"></div>
                <div className="absolute w-3/4 h-1 bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.6)]"></div>

                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[9px]">
                    🚗
                  </div>
                  <span className="text-[8px] font-bold bg-slate-950 text-amber-300 px-1 rounded border border-amber-400/30">
                    Tú
                  </span>
                </div>

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1 z-10">
                  <span className="text-[8px] font-extrabold bg-slate-950 text-emerald-300 px-1 rounded border border-emerald-500/40">
                    Cliente
                  </span>
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-[9px] animate-pulse">
                    📍
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-300 flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">Lugar:</span>
                <span className="font-extrabold text-white text-right truncate max-w-[230px]">
                  {proposingJob.clientAddress}
                </span>
              </div>
            </div>

            {/* Proposal Input Form */}
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-extrabold text-slate-200 block mb-1">
                  Tu Oferta de Cotización (en Pesos Dominicanos RD$):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 font-black text-sm">RD$</span>
                  <input
                    type="number"
                    step={100}
                    value={techQuotePrice}
                    onChange={(e) => setTechQuotePrice(e.target.value)}
                    placeholder="Ej. 2500"
                    className="w-full bg-slate-950 border-2 border-amber-400/60 rounded-2xl pl-12 pr-4 py-2.5 text-base font-black text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Mensaje / Garantía para el Cliente:
                </label>
                <textarea
                  rows={2}
                  value={techQuoteMessage}
                  onChange={(e) => setTechQuoteMessage(e.target.value)}
                  placeholder="Explica qué incluye tu precio (mano de obra, garantía, tiempo de llegada)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            {/* Submit Proposal CTA */}
            <div className="pt-1 space-y-2">
              <button
                onClick={handleSubmitTechProposal}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-3 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4 text-slate-950 font-black" />
                <span>ENVIAR COTIZACIÓN DE RD$ {parseFloat(techQuotePrice || "0").toLocaleString()} AL CLIENTE</span>
              </button>

              <button
                onClick={() => setProposingJob(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPECIALIST AREA & CREDENTIAL VERIFICATION MODAL */}
      {areaVerificationModal && areaVerificationModal.isOpen && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-4 w-full max-w-sm space-y-3.5 shadow-2xl animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-2xl shrink-0">
                {areaVerificationModal.requiredTaxonomy.icon}
              </div>
              <div>
                <span className="text-[9px] bg-amber-400/20 text-amber-300 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                  Validación de Área Requerida
                </span>
                <h3 className="font-black text-sm text-white leading-tight mt-0.5">
                  ¿Usted es {areaVerificationModal.requiredTaxonomy.doctorOrLawyerTitle}?
                </h3>
              </div>
            </div>

            {/* Regulatory Explanation Message */}
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
              <p className="leading-relaxed">
                Esta solicitud pertenece al <strong className="text-amber-400">{areaVerificationModal.requiredTaxonomy.name}</strong>. Para garantizar la seguridad del cliente y cumplir la normativa legal y técnica de Diclik.com, <strong className="text-white">solo especialistas certificados de esta área pueden responder</strong>.
              </p>

              <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Solicitud del Cliente:</span>
                  <span className="font-extrabold text-white">{areaVerificationModal.job.serviceTitle}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Tu Perfil Actual:</span>
                  <span className="text-rose-400 font-bold">
                    {AREA_TAXONOMIES[specialistActiveTrade]?.name || "Otra área"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Área Exclusiva:</span>
                  <span className="text-emerald-400 font-extrabold flex items-center space-x-1">
                    <span>{areaVerificationModal.requiredTaxonomy.icon}</span>
                    <span>{areaVerificationModal.requiredTaxonomy.name}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Credential Number / License Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                <span>Número de Colegiatura / Licencia ({areaVerificationModal.requiredTaxonomy.requiredCredential}):</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={areaVerificationModal.enteredCredential}
                  onChange={(e) =>
                    setAreaVerificationModal({
                      ...areaVerificationModal,
                      enteredCredential: e.target.value
                    })
                  }
                  placeholder={areaVerificationModal.requiredTaxonomy.credentialSample}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-[8px] text-slate-400 block">
                Al confirmar, tu perfil acreditará la competencia técnica requerida para esta solicitud.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleConfirmAreaVerification}
                className="w-full py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-lg active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4 font-black" />
                <span>SÍ, SOY {areaVerificationModal.requiredTaxonomy.doctorOrLawyerTitle.toUpperCase()} Y DESEO CONTINUAR</span>
              </button>

              <button
                onClick={handleCancelAreaVerification}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                No, cancelar y volver a mis solicitudes de {AREA_TAXONOMIES[specialistActiveTrade]?.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DICLIK ACCOUNT, AUTH, WALLET & CONTRACTS MODAL */}
      <DiclikAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={authUser}
        initialRole={mobileRole}
        onAuthChanged={(u) => setAuthUser(u)}
        onSpeak={onSpeak}
      />

      {/* Mobile Bottom Navigation Bar */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 grid grid-cols-5 gap-1 text-center text-[9px] sticky bottom-0 z-30">
        <button
          onClick={() => {
            if (mobileRole === "cliente" && (!authUser || authUser.role === "cliente")) {
              setCurrentScreen("home");
            } else {
              setCurrentScreen("requests_feed");
            }
          }}
          className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
            currentScreen === "home" || currentScreen === "requests_feed" ? "text-amber-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {mobileRole === "cliente" ? <Zap className="w-4 h-4 mb-0.5" /> : <Briefcase className="w-4 h-4 mb-0.5" />}
          <span>{mobileRole === "cliente" ? "Inicio" : "Solicitudes"}</span>
        </button>

        <button
          onClick={() => {
            setRadarFilter("todos");
            setCurrentScreen("radar");
          }}
          className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
            currentScreen === "radar" ? "text-emerald-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Navigation className="w-4 h-4 mb-0.5" />
          <span>Radar GPS</span>
        </button>

        {!isDemo ? (
          <button type="button" onClick={() => setCurrentScreen("chat")} className="p-1.5 rounded-xl flex flex-col items-center text-indigo-300">
            <MessageCircle className="w-4 h-4 mb-0.5" />
            <span>Chat</span>
          </button>
        ) : mobileRole !== "cliente" ? (
          <button
            onClick={() => {
              if (activeAcceptedJob) {
                setCurrentScreen("tech_navigation");
              } else {
                setCurrentScreen("requests_feed");
              }
            }}
            className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
              currentScreen === "tech_navigation" ? "text-sky-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Navigation2 className="w-4 h-4 mb-0.5" />
            <span>Navegación</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentScreen("profesionales")}
            className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
              currentScreen === "profesionales" ? "text-indigo-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>Pro</span>
          </button>
        )}

        <button
          onClick={() => setCurrentScreen("tracking")}
          className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
            currentScreen === "tracking" ? "text-amber-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <MapPin className="w-4 h-4 mb-0.5" />
          <span>{isDemo ? "Rastreo" : "Contratos"}</span>
        </button>

        <button
          onClick={() => setCurrentScreen(isDemo ? "otp" : "requests_feed")}
          className={`p-1.5 rounded-xl flex flex-col items-center cursor-pointer transition-all ${
            currentScreen === "otp" ? "text-sky-400 font-black scale-105" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <QrCode className="w-4 h-4 mb-0.5" />
          <span>{isDemo ? "OTP Escrow" : "Solicitudes"}</span>
        </button>
      </div>
    </div>
  );

  // If standalone (real phone browser or explicit mobile mode): render edge-to-edge native container
  if (standalone) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-start">
        <div className="w-full max-w-md min-h-screen bg-slate-900 flex flex-col justify-between shadow-2xl relative border-x border-slate-800">
          {renderMobileContent()}
        </div>
      </div>
    );
  }

  // Otherwise, render Desktop Simulator View
  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md min-h-[840px] bg-slate-900 flex flex-col justify-between rounded-[38px] overflow-hidden shadow-2xl border-4 border-slate-800">
        {renderMobileContent()}
      </div>
    </div>
  );
}
