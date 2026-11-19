import React, { useState, useEffect } from "react";
import {
  Wrench,
  Key,
  Zap,
  Car,
  Sparkles,
  Truck,
  Wifi,
  Wind,
  MapPin,
  Clock,
  DollarSign,
  ShieldCheck,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  Phone,
  Search,
  CheckCircle,
  Navigation,
  Lock,
  Wallet,
  MessageSquare,
  Award,
  ChevronRight,
  UserCheck,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  FileCheck,
  LayoutDashboard,
  ShieldAlert,
  Users,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  Activity
} from "lucide-react";
import {
  INITIAL_CATEGORIES,
  INITIAL_REQUESTS,
  INITIAL_OFFERS,
  INITIAL_TRANSACTIONS
} from "../data";
import { ServiceRequest, Offer, WalletTransaction } from "../types";

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<any>> = {
  plomeria: Wrench,
  cerrajeria: Key,
  electricidad: Zap,
  mecanica: Car,
  limpieza: Sparkles,
  fletes: Truck,
  tecnologia: Wifi,
  climatizacion: Wind
};

interface DirectoMarketplaceProps {
  onSpeak: (text: string) => void;
  speakingText: string | null;
  isListening: boolean;
  onToggleListening: () => void;
}

export default function DirectoMarketplace({
  onSpeak,
  speakingText,
  isListening,
  onToggleListening
}: DirectoMarketplaceProps) {
  // User Mode: 'cliente', 'profesional', or 'admin'
  const [userRole, setUserRole] = useState<"cliente" | "profesional" | "admin">("cliente");

  // Marketplace Sub-Tab: 'feed' | 'create' | 'negotiate' | 'tracking' | 'wallet' | 'admin'
  const [subTab, setSubTab] = useState<"feed" | "create" | "negotiate" | "tracking" | "wallet" | "admin">("feed");

  // Categories & Filtering
  const [categories] = useState(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Requests state
  const [requests, setRequests] = useState<ServiceRequest[]>(INITIAL_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("req_01");

  // Offers state
  const [offers, setOffers] = useState<Offer[]>(INITIAL_OFFERS);

  // Wallet State
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [availableBalance, setAvailableBalance] = useState<number>(120.0);
  const [escrowLockedBalance, setEscrowLockedBalance] = useState<number>(45.0);
  const [noticeBanner, setNoticeBanner] = useState<{ type: "ok" | "warn"; msg: string } | null>(null);

  // New Request Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("plomeria");
  const [newDescription, setNewDescription] = useState("");
  const [newAddress, setNewAddress] = useState("Av. Reforma 402, Col. Juárez");
  const [newUrgency, setNewUrgency] = useState<"Inmediata" | "Agendada">("Inmediata");
  const [newTargetPrice, setNewTargetPrice] = useState<number>(40);
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80");

  // Counter offer state
  const [counterPriceInput, setCounterPriceInput] = useState<number>(42);

  // Pro New Bid Form state (when in Mode Profesional)
  const [proBidPrice, setProBidPrice] = useState<number>(45);
  const [proBidTime, setProBidTime] = useState<number>(15);
  const [proBidMessage, setProBidMessage] = useState<string>("Hola! Puedo realizar el trabajo de forma inmediata con herramientas profesionales.");

  // Live GPS Tracking Simulation
  const selectedRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];
  const activeOffers = offers.filter((o) => o.requestId === selectedRequest?.id);

  const [gpsSimulating, setGpsSimulating] = useState<boolean>(true);
  const [gpsProgress, setGpsProgress] = useState<number>(35); // 0 to 100%

  // Animate GPS marker approach
  useEffect(() => {
    if (!gpsSimulating || selectedRequest?.status !== "negotiating") return;
    const interval = setInterval(() => {
      setGpsProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 5;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [gpsSimulating, selectedRequest]);

  // Handle Creating a new Job Request
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const createdReq: ServiceRequest = {
      id: `req_${Date.now()}`,
      title: newTitle,
      category: newCategory,
      description: newDescription || "Servicio solicitado directamente con presupuesto asignado por el cliente.",
      address: newAddress,
      urgency: newUrgency,
      targetPrice: Number(newTargetPrice) || 35,
      clientName: "Tú (Cliente Registrado)",
      clientAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&h=256&q=80",
      clientPhone: "+52 55 9821 0044",
      createdAt: "Hace un momento",
      status: "open",
      photoUrl: newPhotoUrl,
      locationCoords: { lat: 19.4326, lng: -99.1332 },
      releaseCode: Math.floor(1000 + Math.random() * 9000).toString()
    };

    setRequests([createdReq, ...requests]);
    setSelectedRequestId(createdReq.id);
    setSubTab("negotiate");
    
    // Announce via speech
    onSpeak(`Tu solicitud "${newTitle}" se ha publicado con éxito. Los profesionales cercanos ya están recibiendo la alerta en tiempo real.`);

    // Reset Form
    setNewTitle("");
    setNewDescription("");
  };

  // Handle Professional Submitting an Offer (Bidding)
  const handleProSubmitBid = () => {
    if (!selectedRequest) return;
    const newOffer: Offer = {
      id: `off_${Date.now()}`,
      requestId: selectedRequest.id,
      proId: "pro_you",
      proName: "Tu Perfil Profesional (Verificado)",
      proAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      proRole: "Técnico Especialista Matriculado",
      proRating: 5.0,
      proReviews: 48,
      badges: ["KYC Biométrico", "Garantía $10k", "Socio Diclik.com"],
      price: proBidPrice,
      estimatedArrivalMin: proBidTime,
      message: proBidMessage,
      status: "pending",
      createdAt: "Hace un momento"
    };

    setOffers([newOffer, ...offers]);
    onSpeak(`Has enviado tu propuesta de $${proBidPrice} USD a ${selectedRequest.clientName}.`);
  };

  // Accept Offer (Lock Escrow)
  const handleAcceptOffer = (offer: Offer) => {
    if (!selectedRequest) return;

    // Strict balance enforcement (no simulated credit bypass)
    if (availableBalance < offer.price) {
      setNoticeBanner({
        type: "warn",
        msg: `Saldo disponible insuficiente ($${availableBalance.toFixed(2)} USD) para bloquear $${offer.price.toFixed(2)} USD en Escrow. Recarga tu billetera mediante pasarela autorizada.`
      });
      onSpeak("Saldo insuficiente para bloquear la custodia Escrow de esta oferta.");
      return;
    }

    // Deduct available, add to escrow
    setAvailableBalance((prev) => prev - offer.price);
    setEscrowLockedBalance((prev) => prev + offer.price);
    setNoticeBanner({
      type: "ok",
      msg: `Custodia Escrow bloqueada por $${offer.price.toFixed(2)} USD para ${offer.proName}.`
    });

    // Update Offer Status
    setOffers(
      offers.map((o) => {
        if (o.id === offer.id) return { ...o, status: "accepted" };
        if (o.requestId === offer.requestId) return { ...o, status: "rejected" };
        return o;
      })
    );

    // Update Request Status to negotiating/in_progress
    setRequests(
      requests.map((r) => {
        if (r.id === selectedRequest.id) {
          return {
            ...r,
            status: "negotiating",
            acceptedOfferId: offer.id,
            escrowLockedAmount: offer.price,
            releaseCode: r.releaseCode || "9482"
          };
        }
        return r;
      })
    );

    // Add Escrow Transaction
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: "escrow_hold",
      amount: offer.price,
      title: `Depósito en Custodia Escrow: ${selectedRequest.title}`,
      date: "Ahora",
      status: "completed",
      referenceId: selectedRequest.id
    };
    setTransactions([newTx, ...transactions]);

    setSubTab("tracking");
    onSpeak(`¡Oferta aceptada! Se han bloqueado $${offer.price} USD en la Billetera Escrow de Diclik.com. ${offer.proName} ha iniciado su ruta a tu ubicación.`);
  };

  // Release Escrow Payment (Client completes job)
  const handleReleasePayment = () => {
    if (!selectedRequest || !selectedRequest.escrowLockedAmount) return;
    const amount = selectedRequest.escrowLockedAmount;

    setEscrowLockedBalance((prev) => Math.max(0, prev - amount));

    // Add release transaction
    const newTx: WalletTransaction = {
      id: `tx_${Date.now()}`,
      type: "escrow_release",
      amount: amount,
      title: `Pago liberado al profesional: ${selectedRequest.title}`,
      date: "Ahora",
      status: "completed",
      referenceId: selectedRequest.id
    };
    setTransactions([newTx, ...transactions]);

    // Update request to completed
    setRequests(
      requests.map((r) => {
        if (r.id === selectedRequest.id) return { ...r, status: "completed" };
        return r;
      })
    );

    onSpeak(`¡Servicio completado! Se ha liberado el código de pago de $${amount} USD al profesional. Gracias por usar Diclik.com.`);
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchCat = selectedCategory === "todos" || r.category === selectedCategory;
    const matchSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.address.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="bg-slate-50 min-h-screen text-slate-900 pb-12">
      {/* DIRECTO HEADER & ROLE BAR */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white shadow-xl border-b border-indigo-800/40 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3">
            <img
              src="/assets/brand/diclik-header.png"
              alt="Diclik.com - Un clic, miles de soluciones"
              className="w-11 h-11 rounded-xl object-cover shadow-lg border border-amber-400/50 shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">Diclik.com</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Mercado en Vivo</span>
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium">
                Un clic, miles de soluciones • Contratación Segura Diclik.com
              </p>
            </div>
          </div>

          {/* Unified Role Selector (Cliente <-> Profesional <-> Panel Admin) */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-indigo-500/30">
            <button
              onClick={() => {
                setUserRole("cliente");
                if (subTab === "admin") setSubTab("feed");
                onSpeak("Modo Cliente activado. Puedes solicitar servicios, recibir ofertas en tiempo real y negociar precios.");
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                userRole === "cliente"
                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Cliente</span>
            </button>

            <button
              onClick={() => {
                setUserRole("profesional");
                if (subTab === "admin") setSubTab("feed");
                onSpeak("Modo Profesional activado. Puedes ver solicitudes cercanas, enviar cotizaciones directas y gestionar tu billetera.");
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                userRole === "profesional"
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Profesional / Socio</span>
            </button>

            <button
              onClick={() => {
                setUserRole("admin");
                setSubTab("admin");
                onSpeak("Panel Administrativo de Control Activado. Monitorea transacciones, disputas, aprobaciones KYC y métricas de plataforma.");
              }}
              className={`flex items-center space-x-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                userRole === "admin"
                  ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Panel Administrativo</span>
            </button>
          </div>

          {/* Wallet Summary Button */}
          <button
            onClick={() => setSubTab("wallet")}
            className="flex items-center space-x-3 bg-slate-800/60 hover:bg-slate-800 border border-indigo-400/30 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <span className="text-[10px] text-slate-400 block font-medium">Billetera Escrow</span>
              <span className="font-bold text-white text-xs">${availableBalance.toFixed(2)} USD</span>
              {escrowLockedBalance > 0 && (
                <span className="text-[9px] text-amber-300 ml-1.5">(${escrowLockedBalance.toFixed(2)} en custodia)</span>
              )}
            </div>
          </button>
        </div>

        {/* SUB-NAVIGATION BAR */}
        <div className="bg-slate-950/60 border-t border-indigo-900/40 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center space-x-1 sm:space-x-3 overflow-x-auto py-2 text-xs">
            <button
              onClick={() => setSubTab("feed")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                subTab === "feed"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{userRole === "cliente" ? "Explorar Servicios" : "Solicitudes Cercanas"}</span>
            </button>

            {userRole === "cliente" && (
              <button
                onClick={() => setSubTab("create")}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                  subTab === "create"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Publicar Trabajo</span>
              </button>
            )}

            <button
              onClick={() => setSubTab("negotiate")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                subTab === "negotiate"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Subasta & Ofertas ({activeOffers.length})</span>
            </button>

            <button
              onClick={() => setSubTab("tracking")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                subTab === "tracking"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span>Ruta GPS & Trabajo ({selectedRequest?.status === "negotiating" ? "En Camino" : "Listo"})</span>
            </button>

            <button
              onClick={() => setSubTab("wallet")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                subTab === "wallet"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Garantía Escrow Billetera</span>
            </button>

            <button
              onClick={() => {
                setSubTab("admin");
                setUserRole("admin");
              }}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                subTab === "admin"
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-amber-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-300" />
              <span>Panel Admin Operaciones</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {noticeBanner && (
          <div
            className={`mb-4 rounded-2xl p-3.5 text-xs font-bold flex items-center justify-between border ${
              noticeBanner.type === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-300 text-amber-900"
            }`}
          >
            <span>{noticeBanner.msg}</span>
            <button onClick={() => setNoticeBanner(null)} className="ml-3 underline cursor-pointer">
              Cerrar
            </button>
          </div>
        )}

        {/* VOICE ASSISTANT BANNER */}
        <div className="mb-6 bg-gradient-to-r from-indigo-50 via-amber-50 to-indigo-50 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Asistente de Voz Inteligente de Diclik.com
              </h4>
              <p className="text-xs text-slate-600">
                Escucha resúmenes de ofertas, notificaciones de ruta o dicta tu presupuesto con tu voz.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() =>
                onSpeak(
                  `Bienvenido a Diclik.com. Estás navegando como ${userRole}. Hay ${requests.length} solicitudes de servicio activas en tu zona con ofertas de profesionales verificados por biometría.`
                )
              }
              className="bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              {speakingText ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
              <span>Escuchar Resumen de Mercado</span>
            </button>

            <button
              onClick={onToggleListening}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer border ${
                isListening
                  ? "bg-red-500 text-white border-red-600 animate-pulse"
                  : "bg-amber-400 hover:bg-amber-500 text-slate-950 border-amber-500"
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? "Detener Dictado" : "Dictar por Voz"}</span>
            </button>
          </div>
        </div>

        {/* SUB-TAB 1: FEED & EXPLORE */}
        {subTab === "feed" && (
          <div className="space-y-6">
            
            {/* Category Cards Bar */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  <span>Categorías de Servicio Diclik.com</span>
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {categories.length} Especialidades Disponibles
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <button
                  onClick={() => setSelectedCategory("todos")}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedCategory === "todos"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center font-bold mb-1.5 text-xs">
                    *
                  </div>
                  <span className="text-xs font-bold block truncate">Todos</span>
                  <span className="text-[10px] opacity-75">{requests.length} Trabajos</span>
                </button>

                {categories.map((cat) => {
                  const IconComp = CATEGORY_ICON_MAP[cat.id] || Wrench;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-1.5 ${
                          isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold block truncate">{cat.name.split(" ")[0]}</span>
                      <span className="text-[10px] opacity-75">{cat.averagePrice}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search & Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar problema o dirección (Ej: Fuga lavaplatos, Cerrajería, Reforma...)"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              {userRole === "cliente" ? (
                <button
                  onClick={() => setSubTab("create")}
                  className="w-full md:w-auto bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-400/20 transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar Necesidad con Presupuesto</span>
                </button>
              ) : (
                <span className="text-xs font-medium text-slate-500 flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Modo Socio: Selecciona una orden para ofertar</span>
                </span>
              )}
            </div>

            {/* Feed List of Active Requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRequests.map((req) => {
                const isSelected = req.id === selectedRequestId;
                const reqOffers = offers.filter((o) => o.requestId === req.id);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                      isSelected ? "border-indigo-600 ring-2 ring-indigo-100" : "border-slate-200"
                    }`}
                  >
                    <div>
                      {/* Top Meta Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            req.urgency === "Inmediata"
                              ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                              : "bg-indigo-50 text-indigo-600 border border-indigo-200"
                          }`}
                        >
                          Urgencia: {req.urgency}
                        </span>

                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          ${req.targetPrice} USD
                        </span>
                      </div>

                      {/* Request Title & Photo */}
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug mb-2">
                        {req.title}
                      </h4>

                      {req.photoUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden h-32 bg-slate-100 border border-slate-200">
                          <img
                            src={req.photoUrl}
                            alt={req.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                        "{req.description}"
                      </p>

                      {/* Location & Client Details */}
                      <div className="space-y-1.5 text-xs text-slate-500 pt-3 border-t border-slate-100">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{req.address}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.createdAt} por {req.clientName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-xs text-indigo-600 font-bold">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{reqOffers.length} Ofertas de Pros</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedRequestId(req.id);
                          setSubTab("negotiate");
                          onSpeak(
                            `Abriendo subasta para ${req.title}. Presupuesto del cliente: $${req.targetPrice} USD.`
                          );
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                      >
                        <span>{userRole === "cliente" ? "Ver Ofertas" : "Cotizar Trabajo"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: CREATE REQUEST (CLIENT MODE) */}
        {subTab === "create" && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold">
                +
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">Publicar Nueva Solicitud de Servicio</h3>
                <p className="text-xs text-slate-500">
                  Establece tu presupuesto objetivo. Los profesionales matriculados responderán con ofertas en minutos.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Título del Trabajo / Incidencia *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Fuga de agua debajo del fregadero de la cocina"
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Categoría de Especialista
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.averagePrice})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Urgencia del Trabajo
                  </label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as "Inmediata" | "Agendada")}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none"
                  >
                    <option value="Inmediata">Inmediata (Atención en &lt; 30 min)</option>
                    <option value="Agendada">Agendada (Para hoy o mañana)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Presupuesto Objetivo Sugerido ($ USD)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    value={newTargetPrice}
                    onChange={(e) => setNewTargetPrice(Number(e.target.value))}
                    className="w-full pl-9 pr-4 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none font-bold text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Podrás recibir y negociar ofertas por encima o por debajo de esta cifra en el panel de subasta abierta.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Dirección o Punto de Encuentro GPS
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-indigo-500" />
                  <input
                    type="text"
                    required
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full pl-9 pr-4 p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Descripción Detallada del Problema
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalla qué repuestos o herramientas se requieren..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publicar e Iniciar Subasta de Profesionales</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SUB-TAB 3: AUCTION & NEGOTIATION (INDRIVE STYLE) */}
        {subTab === "negotiate" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Job Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">
                  Detalle de la Solicitud
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full">
                  Objetivo: ${selectedRequest.targetPrice} USD
                </span>
              </div>

              <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                {selectedRequest.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                "{selectedRequest.description}"
              </p>

              {selectedRequest.photoUrl && (
                <div className="rounded-xl overflow-hidden h-40 bg-slate-100 border border-slate-200">
                  <img src={selectedRequest.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-medium">{selectedRequest.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Cliente: {selectedRequest.clientName}</span>
                </div>
              </div>

              {/* Mode Professional: Bid Submission Form */}
              {userRole === "profesional" && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 mt-4 space-y-3">
                  <h4 className="text-xs font-extrabold text-indigo-900 uppercase">
                    Enviar Tu Oferta como Profesional
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Tu Precio ($ USD)
                      </label>
                      <input
                        type="number"
                        value={proBidPrice}
                        onChange={(e) => setProBidPrice(Number(e.target.value))}
                        className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Llegada (Minutos)
                      </label>
                      <input
                        type="number"
                        value={proBidTime}
                        onChange={(e) => setProBidTime(Number(e.target.value))}
                        className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Mensaje de Presentación
                    </label>
                    <input
                      type="text"
                      value={proBidMessage}
                      onChange={(e) => setProBidMessage(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-indigo-200 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={handleProSubmitBid}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md cursor-pointer transition-all"
                  >
                    Enviar Propuesta
                  </button>
                </div>
              )}
            </div>

            {/* Middle & Right: InDrive Open Auction Bids Stream */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>Ofertas de Profesionales Verificados en Tiempo Real</span>
                </h3>
                <span className="text-xs text-slate-500 font-bold">
                  {activeOffers.length} Propuestas
                </span>
              </div>

              {activeOffers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto animate-spin" />
                  <h4 className="font-extrabold text-slate-800 text-sm">Buscando profesionales cercanos...</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Los técnicos verificados están revisando tu solicitud. Recibirás contraofertas y tiempo estimado en segundos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOffers.map((offer) => {
                    return (
                      <div
                        key={offer.id}
                        className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                          offer.status === "accepted"
                            ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                          
                          {/* Pro Profile Header */}
                          <div className="flex items-center space-x-3">
                            <img
                              src={offer.proAvatar}
                              alt={offer.proName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-extrabold text-slate-900 text-sm">{offer.proName}</h4>
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                                  <span>★ {offer.proRating}</span>
                                  <span className="text-amber-700">({offer.proReviews})</span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{offer.proRole}</p>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {offer.badges.map((badge, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold px-2 py-0.2 rounded"
                                  >
                                    ✓ {badge}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Price & ETA */}
                          <div className="text-right sm:text-right">
                            <div className="text-lg font-black text-emerald-600">
                              ${offer.price} USD
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold flex items-center justify-end space-x-1 mt-0.5">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span>Llegada en ~{offer.estimatedArrivalMin} min</span>
                            </span>
                          </div>
                        </div>

                        {/* Pro Message */}
                        <div className="py-3 text-xs text-slate-700 leading-relaxed italic bg-slate-50/70 p-3 rounded-xl border border-slate-100 my-3">
                          "{offer.message}"
                        </div>

                        {/* Negotiation Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <button
                            onClick={() =>
                              onSpeak(
                                `Oferta de ${offer.proName}: $${offer.price} USD. Llama al profesional o acepta para bloquear custodia Escrow.`
                              )
                            }
                            className="text-xs text-indigo-600 font-bold flex items-center space-x-1 hover:underline"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Escuchar Detalle</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            {/* Counter Offer Controls */}
                            {userRole === "cliente" && (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  value={counterPriceInput}
                                  onChange={(e) => setCounterPriceInput(Number(e.target.value))}
                                  className="w-16 p-1.5 text-xs border border-slate-300 rounded-lg font-bold text-center"
                                />
                                <button
                                  onClick={() => {
                                    setOffers((prev) =>
                                      prev.map((o) =>
                                        o.id === offer.id ? { ...o, price: Number(counterPriceInput) || o.price } : o
                                      )
                                    );
                                    setNoticeBanner({
                                      type: "ok",
                                      msg: `Contraoferta enviada a ${offer.proName} por $${counterPriceInput} USD.`
                                    });
                                    onSpeak(`Has contraofertado $${counterPriceInput} USD a ${offer.proName}.`);
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                  Contraofertar
                                </button>
                              </div>
                            )}

                            {/* Accept Offer & Lock Escrow */}
                            {offer.status === "accepted" ? (
                              <span className="text-xs bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl flex items-center space-x-1.5">
                                <CheckCircle className="w-4 h-4" />
                                <span>Aceptada & Escrow Bloqueado</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAcceptOffer(offer)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Aceptar y Bloquear Escrow</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUB-TAB 4: GPS TRACKING & JOB IN-PROGRESS */}
        {subTab === "tracking" && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Seguimiento de GPS en Tiempo Real
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                  {selectedRequest.title}
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Código de Liberación</span>
                  <span className="text-lg font-black tracking-widest text-indigo-600 font-mono">
                    {selectedRequest.releaseCode || "9482"}
                  </span>
                </div>

                <button
                  onClick={() =>
                    onSpeak(
                      `Código de seguridad de 4 dígitos: ${selectedRequest.releaseCode || "9482"}. Entrega este código al profesional cuando el trabajo haya sido verificado a tu entera satisfacción.`
                    )
                  }
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all cursor-pointer"
                  title="Escuchar código de liberación"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive Vector GPS Map Simulation */}
            <div className="relative h-80 rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-900 shadow-inner p-4 text-white flex flex-col justify-between">
              
              {/* Top Map Overlay Stats */}
              <div className="flex items-center justify-between bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-indigo-500/30">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                  <div>
                    <span className="text-[10px] text-indigo-300 font-bold block">PROFESIONAL EN RUTA</span>
                    <span className="text-xs font-bold text-white">Ing. Esteban Morales</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Velocidad</span>
                    <span className="font-bold text-emerald-400">28 km/h</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Distancia</span>
                    <span className="font-bold text-amber-400">
                      {(1.5 * (1 - gpsProgress / 100)).toFixed(1)} km
                    </span>
                  </div>
                </div>
              </div>

              {/* Vector Map Path Graphic */}
              <div className="relative my-auto flex items-center justify-between px-8">
                {/* Pro Marker */}
                <div
                  className="flex flex-col items-center transition-all duration-1000"
                  style={{ marginLeft: `${gpsProgress * 0.7}%` }}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-400 border-2 border-white shadow-lg shadow-amber-400/50 flex items-center justify-center text-slate-950 font-black">
                    <Car className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] bg-slate-900 text-amber-300 font-bold px-2 py-0.5 rounded mt-1 border border-amber-400/40">
                    En Ruta GPS
                  </span>
                </div>

                {/* Dotted Route Line */}
                <div className="flex-1 border-t-2 border-dashed border-indigo-500/60 mx-4"></div>

                {/* Destination Marker */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-black">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] bg-slate-900 text-indigo-200 font-bold px-2 py-0.5 rounded mt-1 border border-indigo-400/40">
                    Tu Domicilio
                  </span>
                </div>
              </div>

              {/* Bottom Progress Bar */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30 flex items-center space-x-3">
                <span className="text-xs font-bold text-indigo-200">Avance: {gpsProgress}%</span>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${gpsProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Release Payment Action Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-md">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase">
                    Liberación de Pago con Garantía Escrow
                  </h4>
                  <p className="text-xs text-slate-600">
                    Monto bloqueado en custodia: <strong className="text-emerald-700">${selectedRequest.escrowLockedAmount || 45} USD</strong>. Al concluir el servicio, presiona este botón para transferir los fondos.
                  </p>
                </div>
              </div>

              <button
                onClick={handleReleasePayment}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-all shrink-0 flex items-center justify-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Trabajo y Liberar Fondos</span>
              </button>
            </div>
          </div>
        )}

        {/* SUB-TAB 5: WALLET & ESCROW LEDGER */}
        {subTab === "wallet" && (
          <div className="space-y-6">
            
            {/* Wallet Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-indigo-800/50">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block mb-1">
                  Saldo Disponible en Billetera
                </span>
                <div className="text-3xl font-black text-white mb-2">
                  ${availableBalance.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-indigo-200/80">
                  Listo para contrataciones directas instantáneas o retiros bancarios.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-1">
                  En Custodia Escrow (Garantía Diclik.com)
                </span>
                <div className="text-3xl font-black text-amber-600 mb-2">
                  ${escrowLockedBalance.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-slate-500">
                  Protegido en contrato inteligente hasta que el cliente confirme código de satisfacción.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mb-1">
                  Estructura de Comisión Diclik.com
                </span>
                <div className="text-3xl font-black text-slate-900 mb-2">
                  8.0 %
                </div>
                <p className="text-[11px] text-slate-500">
                  Transparente: 92% neto para el socio profesional, 8% para seguros y plataforma.
                </p>
              </div>
            </div>

            {/* Wallet Transactions Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                  <span>Historial de Movimientos de Billetera</span>
                </h3>

                <button
                  onClick={() => {
                    setAvailableBalance((prev) => prev + 50);
                    onSpeak("Has recargado $50 USD a tu Billetera Diclik.com para pruebas.");
                  }}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  + Cargar $50 USD
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {tx.type === "escrow_hold" ? "🔒" : tx.type === "income" ? "↓" : "↑"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{tx.title}</h4>
                        <span className="text-[10px] text-slate-400">{tx.date}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-xs block ${
                          tx.type === "income" || tx.type === "topup"
                            ? "text-emerald-600"
                            : "text-slate-800"
                        }`}
                      >
                        {tx.type === "payout" ? "-" : "+"}${tx.amount.toFixed(2)} USD
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded uppercase font-bold">
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: PANEL ADMINISTRATIVO Y GESTIÓN OPERATIVA */}
        {subTab === "admin" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
            {/* Header & Status Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3 mr-1" />
                      <span>Acceso Administrador Principal</span>
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Sistema Operativo 100% Online
                    </span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                    <LayoutDashboard className="w-6 h-6 text-amber-400" />
                    <span>Panel de Administración Central - Diclik.com</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    Centro de mando administrativo para supervisar transacciones en escrow, auditoría de profesionales, resolución de disputas de clientes, liberación de pagos y configuración global.
                  </p>
                </div>

                <div className="flex items-center space-x-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 shrink-0">
                  <Activity className="w-8 h-8 text-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Volumen Operado</div>
                    <div className="text-lg font-black text-amber-400">$18,450.00 USD</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Solicitudes Activas</span>
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                    <FileCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{requests.length}</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center space-x-1">
                  <span>↑ 12% vs semana anterior</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Custodia Escrow Bloqueada</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">${escrowLockedBalance.toFixed(2)} USD</div>
                <div className="text-[11px] text-slate-500 mt-1">Protegido en contratos seguros</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Profesionales Verificados</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">142 Socios</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-1">3 solicitudes de aprobación pendientes</div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Comisión Generada (8%)</span>
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">$1,476.00 USD</div>
                <div className="text-[11px] text-indigo-600 font-bold mt-1">A cuenta corporativa Diclik.com</div>
              </div>
            </div>

            {/* Admin Management Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Requests Management & Disputes */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Requests Control Table */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
                      <FileCheck className="w-4 h-4 text-indigo-600" />
                      <span>Gestión de Solicitudes y Trabajos en Curso</span>
                    </h3>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
                      {requests.length} Registros
                    </span>
                  </div>

                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div key={req.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <img src={req.photoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-slate-900 text-sm">{req.title}</h4>
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                req.status === "open" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {req.status === "open" ? "Abierta" : "En Negociación"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{req.address} • Presupuesto Target: ${req.targetPrice} USD</p>
                            <span className="text-[10px] text-slate-400">Cliente: {req.clientName}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setSelectedRequestId(req.id);
                              setSubTab("negotiate");
                            }}
                            className="text-xs bg-white border border-slate-200 hover:border-slate-300 font-bold px-3 py-1.5 rounded-xl text-slate-700 transition-all cursor-pointer"
                          >
                            Ver Subasta
                          </button>
                          <button
                            onClick={() => {
                              onSpeak(`Iniciando auditoría administrativa de la solicitud: ${req.title}`);
                            }}
                            className="text-xs bg-slate-900 hover:bg-slate-800 font-bold px-3 py-1.5 rounded-xl text-white transition-all cursor-pointer"
                          >
                            Auditar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispute Resolution Module */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Centro de Mediación y Disputas Escrow</span>
                    </h3>
                    <span className="text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-lg border border-amber-200">
                      0 Disputas Abiertas
                    </span>
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center space-x-3 text-emerald-900 text-xs">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Sistema de Mediación sin Conflictos</span>
                      <span>Todas las transacciones recientes se han completado satisfactoriamente mediante el código OTP de 4 dígitos.</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Pro KYC & System Controls */}
              <div className="space-y-6">
                
                {/* Pending KYC Approvals */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Verificación de Identidad (KYC)</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Ing. Carlos Mendoza</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Pendiente</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Especialidad: Plomería e Instalaciones de Gas</p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => onSpeak("Documentos de Carlos Mendoza aprobados correctamente.")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Aprobar Socio
                        </button>
                        <button
                          onClick={() => onSpeak("Verificación solicitada de nuevo.")}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Revisar
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">Téc. Valeria Gómez</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Pendiente</span>
                      </div>
                      <p className="text-[11px] text-slate-500">Especialidad: Electricidad Industrial y Climatización</p>
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => onSpeak("Documentos de Valeria Gómez aprobados correctamente.")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Aprobar Socio
                        </button>
                        <button
                          onClick={() => onSpeak("Verificación solicitada de nuevo.")}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer"
                        >
                          Revisar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Global Settings & Commission Toggle */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-indigo-600" />
                    <span>Configuración Global de Red</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-slate-700">Comisión de Plataforma</span>
                      <span className="font-black text-slate-900">8.0 %</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-slate-700">Tiempo Límite Subastas</span>
                      <span className="font-black text-slate-900">15 min</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-slate-700">Seguro contra Daños</span>
                      <span className="font-bold text-emerald-600">Activo ($10,000 USD)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
