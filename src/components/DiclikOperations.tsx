import { FormEvent, useEffect, useState } from "react";
import { api } from "../services/api";
import type { AuthUserSummary } from "./DiclikAccountModal";

type Role = "cliente" | "tecnico" | "profesional";
type View = "requests" | "radar" | "contracts" | "chat";
type RequestRow = { id: string; title: string; description: string; status: string; address?: string; photos?: string[] };
type Offer = { id: string; pro_name: string; professional_id: string; price: number; counter_price?: number; counter_proposed_by?: string; message: string; status: string };
type Contract = { id: string; request_title: string; status: string; address: string; otp_code?: string; professional_id: string; client_id: string };
type Conversation = { id: string; request_title: string; client_name: string; pro_name: string };
type Message = { id: string; sender_name: string; content: string };
type Specialist = { id: string; name: string; trade: string; distanceKm: number };
type GPS = { lat: number; lng: number; updated_at?: string };

const card = "rounded-2xl border border-slate-700 bg-slate-800/80 p-3 space-y-2";
const button = "rounded-lg border border-amber-400/50 px-2.5 py-1.5 text-amber-200 font-bold disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-1.5 text-white";
const active = ["held_in_escrow", "active_in_transit", "in_progress"];
const statusLabel: Record<string, string> = {
  open: "Abierta", negotiating: "En negociación", held_in_escrow: "Fondos retenidos",
  active_in_transit: "En camino", in_progress: "En curso", completed: "Completada",
  cancelled: "Cancelada", disputed: "En disputa", pending: "Pendiente", countered: "Contraoferta",
  accepted: "Aceptada", rejected: "Rechazada",
};

function position(): Promise<GPS> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("El dispositivo no tiene geolocalización disponible."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      ({ message }) => reject(new Error(message || "No fue posible obtener la ubicación.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 },
    );
  });
}

function AmountForm({ label, onSubmit, disabled }: {
  label: string; onSubmit: (amount: number) => void; disabled: boolean;
}) {
  const [amount, setAmount] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(Number(amount));
  };
  return <form className="flex gap-2" onSubmit={submit}>
    <input className={input} aria-label={label + " en pesos"} type="number" min="1" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
    <button className={button} disabled={disabled}>{label}</button>
  </form>;
}

export function DiclikOperations({ view, user, role, onSignIn, initialRequest }: {
  view: View; user: AuthUserSummary | null; role: Role; onSignIn: () => void; initialRequest?: string;
}) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selection, setSelection] = useState(initialRequest || "");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [gps, setGps] = useState<Record<string, GPS | null>>({});
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scanned, setScanned] = useState(false);
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string; role: string; status: string }[]>([]);
  const [disputes, setDisputes] = useState<{ id: string; reason: string; status: string }[]>([]);
  const isClient = user?.role === "cliente";
  const isAdmin = user?.role === "admin";

  async function refresh() {
    if (isAdmin && view === "requests") {
      const [users, claims] = await Promise.all([api.admin.getUsers(), api.admin.getDisputes()]);
      setAdminUsers(Array.isArray(users) ? users : users.users || []);
      setDisputes(Array.isArray(claims) ? claims : []);
    } else if (view === "requests") {
      const rows: RequestRow[] = await api.services.list(isClient && user ? { clientId: user.id } : { targetRole: role });
      setRequests(isClient ? rows : rows.filter(row => ["open", "negotiating"].includes(row.status)));
      if (selection && user) setOffers(await api.services.getOffers(selection));
    } else if (view === "contracts" && user) {
      setContracts(await api.services.listContracts());
    } else if (view === "chat" && user) {
      setConversations(await api.chat.getConversations());
      if (selection) setMessages(await api.chat.getMessages(selection));
    }
  }

  useEffect(() => {
    refresh().catch(error => setNotice(error.message));
  }, [view, user?.id, role, selection]);

  async function run(task: () => Promise<void>, success?: string) {
    setBusy(true);
    setNotice("");
    try {
      await task();
      if (success) setNotice(success);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }

  const list = view === "requests" && (
    <>
      <h2 className="font-bold text-amber-300">{isAdmin ? "Administración" : isClient ? "Mis solicitudes y ofertas" : "Solicitudes disponibles"}</h2>
      {isAdmin ? <>
        <h3 className="font-bold">Usuarios</h3>
        {adminUsers.map(item => <div className={card} key={item.id}>
          <p>{item.email} · {item.role} · {item.status}</p>
          {item.role !== "admin" && <div className="flex flex-wrap gap-2">
            <button className={button} disabled={busy} onClick={() => run(async () => {
              await api.admin.updateUserStatus(item.id, item.status === "active" ? "suspended" : "active");
              await refresh();
            }, "Estado actualizado.")}>{item.status === "active" ? "Suspender" : "Activar"}</button>
            {["tecnico", "profesional"].includes(item.role) && <button className={button} disabled={busy} onClick={() => run(async () => {
              await api.admin.verifyProfessional(item.id, true);
            }, "Acreditación aprobada.")}>Verificar especialista</button>}
          </div>}
        </div>)}
        <h3 className="font-bold">Disputas</h3>
        {disputes.map(item => <div className={card} key={item.id}>
          <p>{item.reason} · {item.status}</p>
          {["open", "under_review"].includes(item.status) && <div className="flex flex-wrap gap-2">
            {(["refund_client", "release_pro"] as const).map(decision => <button key={decision} className={button} disabled={busy} onClick={() => run(async () => {
              await api.admin.resolveDispute(item.id, decision);
              await refresh();
            }, "Disputa resuelta.")}>{decision === "refund_client" ? "Reembolsar al cliente" : "Liberar al especialista"}</button>)}
          </div>}
        </div>)}
      </> : requests.length ? requests.map(row => <article key={row.id} className={card}>
        <h3 className="font-bold">{row.title}</h3>
        <p>{row.description}</p>
        <p className="text-slate-300">{statusLabel[row.status] || row.status}</p>
        <button className={button} onClick={() => { setOffers([]); setSelection(id => id === row.id ? "" : row.id); }}>Ver ofertas</button>
        {selection === row.id && <>
          {row.photos?.filter(url => /^(https:\/\/|data:image\/(jpeg|png|webp|gif);base64,)/.test(url)).map((url, index) =>
            <img key={index} src={url} alt={`Foto de la solicitud ${index + 1}`} className="max-h-32 rounded-lg object-contain" />
          )}
          {offers.filter(offer => isClient || offer.professional_id === user?.id).map(offer => <div key={offer.id} className={card}>
            <p>{offer.pro_name} · RD$ {offer.counter_price || offer.price} · {statusLabel[offer.status] || offer.status}</p>
            <p>{offer.message}</p>
            {["pending", "countered"].includes(offer.status) && <>
              <AmountForm label="Contraofertar" disabled={busy} onSubmit={amount => run(async () => {
                await api.services.counterOffer(offer.id, amount); await refresh();
              }, "Contraoferta enviada. Si la otra parte acepta, se formalizará el contrato.")} />
              {(isClient ? offer.counter_proposed_by !== user?.id : Boolean(offer.counter_proposed_by && offer.counter_proposed_by !== user?.id)) && <button className={button} disabled={busy} onClick={() => run(async () => {
                await api.services.acceptOffer(offer.id); await refresh();
              }, "Contratación confirmada.")}>Contratar</button>}
              <button className={button} disabled={busy} onClick={() => run(async () => {
                await api.services.rejectOffer(offer.id); await refresh();
              }, "Oferta rechazada.")}>Rechazar</button>
            </>}
          </div>)}
          {user && !isClient && <AmountForm label="Enviar cotización" disabled={busy} onSubmit={amount => run(async () => {
            await api.services.submitOffer(row.id, amount, 15); await refresh();
          }, "Cotización enviada.")} />}
          {isClient && ["open", "negotiating"].includes(row.status) && <button className={button} disabled={busy} onClick={() => run(async () => {
            await api.services.remove(row.id); await refresh();
          }, "Solicitud cancelada.")}>Cancelar solicitud</button>}
        </>}
      </article>) : <p>No hay solicitudes para mostrar.</p>}
    </>
  );

  return <section className="space-y-3 text-sm">
    {notice && <p role="status" className={card}>{notice}</p>}
    {!user && view !== "radar" && <button className={button} onClick={onSignIn}>Inicia sesión para continuar</button>}
    {view !== "radar" && <button className={button} disabled={busy} onClick={() => run(refresh)}>Actualizar</button>}
    {list}
    {view === "radar" && <>
      <h2 className="font-bold text-emerald-300">Radar GPS</h2>
      <button className={button} disabled={busy} onClick={() => run(async () => {
        setSpecialists(await api.radar.scan({ ...await position(), radius: 15 }));
        setScanned(true);
      })}>Buscar cerca de mi ubicación</button>
      {scanned && !specialists.length && <p>No hay especialistas disponibles en el radio consultado.</p>}
      {specialists.map(item => <div className={card} key={item.id}><strong>{item.name}</strong><p>{item.trade} · {item.distanceKm} km aprox.</p></div>)}
    </>}
    {view === "contracts" && <>
      <h2 className="font-bold text-amber-300">Contratos y rastreo</h2>
      {user && !contracts.length && <p>No hay contratos para mostrar.</p>}
      {contracts.map(item => <article className={card} key={item.id}>
        <h3 className="font-bold">{item.request_title}</h3>
        <p>{statusLabel[item.status] || item.status}</p>
        {item.otp_code && active.includes(item.status) && <p>Código OTP: <strong>{item.otp_code}</strong></p>}
        {item.professional_id === user?.id && active.includes(item.status) && <>
          {item.address && <a className={button} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address)}`}>Abrir ruta</a>}
          {item.status !== "in_progress" && <button className={button} disabled={busy} onClick={() => run(async () => {
            await api.services.updateContractStatus(item.id, item.status === "held_in_escrow" ? "active_in_transit" : "in_progress"); await refresh();
          }, "Estado actualizado.")}>{item.status === "held_in_escrow" ? "Iniciar trayecto" : "Marcar llegada"}</button>}
          <button className={button} disabled={busy} onClick={() => run(async () => {
            await api.services.shareContractLocation(item.id, await position());
          }, "Ubicación compartida con el cliente.")}>Compartir ubicación</button>
          <form className="flex gap-2" onSubmit={event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            run(async () => { await api.services.verifyOtp(item.id, String(data.get("otp"))); await refresh(); }, "Servicio completado y fondos liberados.");
          }}>
            <input className={input} aria-label="Código OTP del cliente" name="otp" pattern="[0-9]{4}" maxLength={4} inputMode="numeric" required />
            <button className={button} disabled={busy}>Validar OTP</button>
          </form>
        </>}
        {item.client_id === user?.id && active.includes(item.status) && <>
          <button className={button} disabled={busy} onClick={() => run(async () => {
            const location = await api.services.getContractLocation(item.id);
            setGps(old => ({ ...old, [item.id]: location }));
          })}>Actualizar GPS</button>
          {gps[item.id] ? <a className={button} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${gps[item.id]?.lat},${gps[item.id]?.lng}`}>Ver ubicación compartida</a> : gps[item.id] === null && <p>El especialista aún no ha compartido su ubicación.</p>}
        </>}
      </article>)}
    </>}
    {view === "chat" && <>
      <h2 className="font-bold text-indigo-300">Chat</h2>
      {user && !conversations.length && <p>Las conversaciones aparecen al contratar un servicio.</p>}
      {conversations.map(item => <button className={button} key={item.id} onClick={() => { setMessages([]); setSelection(item.id); }}>{item.request_title} · {isClient ? item.pro_name : item.client_name}</button>)}
      {selection && <>
        {messages.map(item => <div className={card} key={item.id}><strong>{item.sender_name}</strong><p>{item.content}</p></div>)}
        <form className="flex gap-2" onSubmit={event => {
          event.preventDefault();
          run(async () => { await api.chat.sendMessage(selection, message.trim()); setMessage(""); await refresh(); });
        }}>
          <input className={input} aria-label="Mensaje" required value={message} onChange={event => setMessage(event.target.value)} />
          <button className={button} disabled={busy || !message.trim()}>Enviar</button>
        </form>
      </>}
    </>}
  </section>;
}
