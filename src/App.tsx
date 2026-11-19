import React, { useState } from "react";
import { DirectoMobileApp } from "./components/DirectoMobileApp";

type Portal = "cliente" | "profesional" | "tecnico";
const categories = [
  {name:"Hogar",symbol:"🛠️",color:"#1768e8"},
  {name:"Transporte",symbol:"🚗",color:"#12a94c"},
  {name:"Compras",symbol:"🛒",color:"#f59e0b"},
  {name:"Educación",symbol:"🎓",color:"#9333ea"},
  {name:"Salud",symbol:"♥",color:"#ef244d"},
  {name:"Empleo",symbol:"💼",color:"#009ed4"},
];
const roles: {id:Portal; name:string;description:string;color:string;symbol:string}[] = [
  {id:"cliente",name:"Cliente",description:"Contrata servicios de forma rápida, segura y confiable.",color:"#086cf2",symbol:"👥"},
  {id:"profesional",name:"Profesional",description:"Ofrece tus servicios, consigue más clientes y haz crecer tu negocio.",color:"#ff8b05",symbol:"👔"},
  {id:"tecnico",name:"Técnico",description:"Conecta tu talento técnico con oportunidades de trabajo.",color:"#08a84c",symbol:"🛠"},
];

export default function App() {
  const [portal,setPortal] = useState<Portal|null>(null);
  const handleSpeak = (text:string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-DO";
    window.speechSynthesis.speak(utterance);
  };
  if (portal) return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <button type="button" onClick={()=>setPortal(null)} className="fixed z-[100] top-3 left-3 rounded-full bg-slate-950/90 border border-amber-400/50 px-4 py-2 text-white text-sm shadow-xl" aria-label="Volver a elegir rol">← Cambiar rol</button>
      <DirectoMobileApp standalone={true} onSpeak={handleSpeak} initialRole={portal}/>
    </div>
  );
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#031334] text-white flex items-center justify-center px-4 py-8 sm:py-12" style={{backgroundImage:"radial-gradient(ellipse at 50% 0%,#0c53a5 0%,#05265a 38%,#03102e 75%)"}}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.13]">
        <img src="/assets/brand/diclik-official-watermark.png" alt="" className="w-[1100px] max-w-none object-contain" />
      </div>
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
        <img src="/assets/brand/diclik-official-watermark.png" alt="Diclik.com. Un clic, miles de soluciones" className="w-full max-w-[520px] max-h-[350px] object-contain rounded-2xl" />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-5 mt-4 mb-8 w-full max-w-3xl">
          {categories.map(c=><div key={c.name} className="flex flex-col items-center gap-2"><div className="h-12 w-12 sm:h-16 sm:w-16 rounded-2xl shadow-lg border border-white/20 flex items-center justify-center text-2xl sm:text-3xl" style={{background:c.color}}>{c.symbol}</div><span className="text-xs sm:text-sm font-semibold">{c.name}</span></div>)}
        </div>
        <h1 className="text-xl sm:text-3xl font-bold text-center mb-7 drop-shadow">Selecciona tu rol para continuar</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full">
          {roles.map(r=><section key={r.id} className="rounded-[26px] bg-white text-[#0b2450] border-2 overflow-hidden shadow-2xl" style={{borderColor:r.color}}>
            <div className="h-16 flex justify-center items-center text-4xl text-white" style={{background:r.color}} aria-hidden="true">{r.symbol}</div>
            <div className="p-5 flex flex-col items-center text-center gap-3 min-h-[230px]">
              <h2 className="text-2xl font-extrabold">{r.name}</h2>
              <p className="text-sm flex-1">{r.description}</p>
              <button type="button" onClick={()=>setPortal(r.id)} className="rounded-full w-full px-3 py-3 text-white font-bold shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2" style={{background:r.color}}>Entrar como {r.name} →</button>
            </div>
          </section>)}
        </div>
        <p className="mt-8 text-sm text-slate-300 text-center">¿Ya tienes una cuenta? Selecciona tu rol para iniciar sesión o registrarte.</p>
      </div>
    </main>
  );
}
