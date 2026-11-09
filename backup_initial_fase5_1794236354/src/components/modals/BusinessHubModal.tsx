import React, { useState } from 'react';
import {
  X,
  Briefcase,
  Store,
  Clock,
  MapPin,
  Globe,
  Mail,
  ShieldCheck,
  Tag,
  Zap,
  BarChart3,
  Plus,
  Send,
  CheckCircle2,
  Package,
  Check,
  ChevronRight,
  Sparkles,
  Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BusinessProduct, ChatLabelType, QuickReply } from '../../types';
import { OFFICIAL_CATALOG, QUICK_REPLIES, BUSINESS_LABELS } from '../../data/mockData';

interface BusinessHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'catalog' | 'profile' | 'replies' | 'labels' | 'analytics';
  onSendProductToChat?: (product: BusinessProduct) => void;
  activeConversationId?: string | null;
}

export const BusinessHubModal: React.FC<BusinessHubModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'catalog',
  onSendProductToChat,
  activeConversationId
}) => {
  const { theme, conversations } = useApp();
  const [activeTab, setActiveTab] = useState<'catalog' | 'profile' | 'replies' | 'labels' | 'analytics'>(initialTab);
  const [catalog, setCatalog] = useState<BusinessProduct[]>(OFFICIAL_CATALOG);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(QUICK_REPLIES);
  const [newShortcut, setNewShortcut] = useState('');
  const [newReplyText, setNewReplyText] = useState('');
  const [showAddReply, setShowAddReply] = useState(false);
  const [productSentToast, setProductSentToast] = useState<string | null>(null);

  // Business profile state
  const [businessName, setBusinessName] = useState('NAKEIC Store & Soluciones Oficial');
  const [category, setCategory] = useState('Tecnología, Dispositivos & Software');
  const [hours, setHours] = useState('Lun - Sáb: 9:00 AM - 8:00 PM');
  const [address, setAddress] = useState('Paseo de la Reforma 222, Piso 18, CDMX');
  const [website, setWebsite] = useState('https://nakeic.com');
  const [email, setEmail] = useState('ventas@nakeic.com');
  const [isSavedToast, setIsSavedToast] = useState(false);

  const isDark = theme.mode === 'dark' || (theme.mode === 'system' && true);

  if (!isOpen) return null;

  const handleSendProduct = (product: BusinessProduct) => {
    if (onSendProductToChat) {
      onSendProductToChat(product);
      setProductSentToast(product.title);
      setTimeout(() => setProductSentToast(null), 2500);
    }
  };

  const handleAddQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newReplyText.trim()) return;
    const formattedShortcut = newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`;
    setQuickReplies(prev => [
      ...prev,
      { shortcut: formattedShortcut, title: newShortcut.replace('/', ''), text: newReplyText }
    ]);
    setNewShortcut('');
    setNewReplyText('');
    setShowAddReply(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
          color: isDark ? '#FFFFFF' : '#0F172A'
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between shrink-0"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold tracking-tight">Herramientas de Empresa</h2>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Business + Telegram
                </span>
              </div>
              <p className="text-xs text-slate-400">WhatsApp Business & Telegram Power Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex items-center gap-1 px-3 py-2 border-b overflow-x-auto no-scrollbar shrink-0 text-xs font-bold"
          style={{
            backgroundColor: isDark ? '#090D1A' : '#F1F5F9',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
          }}
        >
          {[
            { id: 'catalog', label: 'Catálogo', icon: Store },
            { id: 'profile', label: 'Perfil Empresa', icon: Briefcase },
            { id: 'replies', label: 'Respuestas Rápidas', icon: Zap },
            { id: 'labels', label: 'Etiquetas', icon: Tag },
            { id: 'analytics', label: 'Estadísticas', icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Success Toast */}
        {productSentToast && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>«{productSentToast}» enviado al chat con éxito</span>
          </div>
        )}

        {isSavedToast && (
          <div className="mx-4 mt-3 px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Perfil comercial guardado correctamente</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PRODUCT CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Catálogo Oficial de Productos</h3>
                  <p className="text-xs text-slate-400">Muestra artículos con precio y envíalos directo a clientes</p>
                </div>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {catalog.length} artículos
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catalog.map(prod => (
                  <div
                    key={prod.id}
                    className="rounded-2xl border p-3 flex flex-col justify-between transition-all hover:border-emerald-500/40"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'
                    }}
                  >
                    <div>
                      <div className="relative w-full h-32 rounded-xl overflow-hidden mb-2.5 bg-black/30">
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-xs text-emerald-400 text-[11px] font-black">
                          {prod.price}
                        </span>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-slate-900/80 text-[10px] font-bold text-slate-300">
                          {prod.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold line-clamp-1">{prod.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> En stock
                      </span>
                      <button
                        onClick={() => handleSendProduct(prod)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        <span>Compartir al Chat</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                  ✅
                </div>
                <div>
                  <span className="font-extrabold text-sm block text-emerald-400">
                    Cuenta Comercial Verificada
                  </span>
                  <p className="text-[11px] text-slate-300">
                    NAKEIC valida tu empresa para generar máxima confianza en tus clientes.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Categoría Comercial</label>
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Horario de Atención</span>
                </label>
                <input
                  type="text"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-bold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dirección Comercial</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sitio Web</span>
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Email Comercial</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none text-white font-medium"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSavedToast(true);
                  setTimeout(() => setIsSavedToast(false), 2000);
                }}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Guardar Perfil de Empresa
              </button>
            </div>
          )}

          {/* TAB 3: QUICK REPLIES */}
          {activeTab === 'replies' && (
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Respuestas Rápidas (Atajos con /)</h3>
                  <p className="text-xs text-slate-400">Escribe «/» en el chat para insertar respuestas frecuentes</p>
                </div>
                <button
                  onClick={() => setShowAddReply(!showAddReply)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva</span>
                </button>
              </div>

              {showAddReply && (
                <form
                  onSubmit={handleAddQuickReply}
                  className="p-3.5 rounded-2xl bg-black/30 border border-cyan-500/30 space-y-2.5 animate-in fade-in"
                >
                  <span className="font-bold text-cyan-400 block">Agregar Atajo Rápido</span>
                  <input
                    type="text"
                    placeholder="Atajo (ej: /promocion)"
                    value={newShortcut}
                    onChange={e => setNewShortcut(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none text-white"
                  />
                  <textarea
                    placeholder="Texto completo que se enviará al cliente..."
                    value={newReplyText}
                    onChange={e => setNewReplyText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 outline-none text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddReply(false)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-black cursor-pointer shadow"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {quickReplies.map(qr => (
                  <div
                    key={qr.shortcut}
                    className="p-3 rounded-2xl border flex items-start justify-between gap-3 transition-colors hover:bg-white/5"
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'
                    }}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px] border border-emerald-500/30">
                          {qr.shortcut}
                        </span>
                        <span className="font-bold text-slate-200">{qr.title}</span>
                      </div>
                      <p className="text-slate-400 text-[11.5px] leading-relaxed">{qr.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CHAT LABELS */}
          {activeTab === 'labels' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <h3 className="text-sm font-bold">Etiquetas para Clientes y Conversaciones</h3>
                <p className="text-xs text-slate-400">Organiza tus pedidos y clasifica a tus clientes como en WhatsApp Business</p>
              </div>

              <div className="space-y-2.5">
                {Object.values(BUSINESS_LABELS).map(label => {
                  const matchingCount = conversations.filter(c => c.label === label.id).length;
                  return (
                    <div
                      key={label.id}
                      className="p-3.5 rounded-2xl border flex items-center justify-between transition-colors"
                      style={{
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: label.color }}
                        />
                        <div>
                          <span className="font-bold text-sm block" style={{ color: label.color }}>
                            {label.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {matchingCount} {matchingCount === 1 ? 'chat asignado' : 'chats asignados'}
                          </span>
                        </div>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                        style={{
                          backgroundColor: label.bgHex,
                          color: label.color,
                          borderColor: label.color + '40'
                        }}
                      >
                        {matchingCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-3.5 text-xs">
              <div>
                <h3 className="text-sm font-bold">Estadísticas Comerciales</h3>
                <p className="text-xs text-slate-400">Rendimiento en tiempo real de tu canal de ventas</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-slate-400 block mb-1">Mensajes Totales</span>
                  <span className="text-xl font-black text-cyan-400">1,248</span>
                  <span className="text-[10px] text-cyan-300 block mt-0.5">↑ 18% esta semana</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-slate-400 block mb-1">Tasa de Entrega</span>
                  <span className="text-xl font-black text-emerald-400">99.8%</span>
                  <span className="text-[10px] text-emerald-300 block mt-0.5">Cifrado E2EE nativo</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-slate-400 block mb-1">Vistas de Catálogo</span>
                  <span className="text-xl font-black text-purple-400">482</span>
                  <span className="text-[10px] text-purple-300 block mt-0.5">38 pedidos generados</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-slate-400 block mb-1">Nuevos Clientes</span>
                  <span className="text-xl font-black text-amber-400">64</span>
                  <span className="text-[10px] text-amber-300 block mt-0.5">Etiquetados automáticamente</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
