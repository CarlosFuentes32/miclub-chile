import { FormEvent, useState } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Brand } from "../components/Brand";
import { formatearTelefonoChile,soloNombre,telefonoLocal } from "@miclub/shared";

const whatsappUrl =
  "https://wa.me/56995026368?text=Hola%2C%20quiero%20cotizar%20MiClub%20Chile%20para%20mi%20comercio.";

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [name,setName]=useState(''),[phone,setPhone]=useState('');
  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="container-page flex h-20 items-center justify-between">
        <Brand />
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-bold text-slate-600"
        >
          <ArrowLeft size={18} /> Volver
        </Link>
      </header>
      <main className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_.8fr] lg:py-16">
        <section className="rounded-[2rem] bg-white p-7 shadow-sm md:p-10">
          <p className="eyebrow">Hablemos de tu comercio</p>
          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Solicitar acceso
          </h1>
          <p className="mt-4 max-w-xl text-slate-500">
            Cuéntanos qué necesitas. El formulario queda preparado para la
            futura conexión con CRM o correo.
          </p>
          <form onSubmit={submit} className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-bold">
              Nombre
              <input className="input mt-1" name="name" value={name} onChange={e=>setName(soloNombre(e.target.value))} required />
            </label>
            <label className="block text-sm font-bold">
              Teléfono
              <span className="phone-field"><b>+569</b><input
                className="input mt-1"
                name="phone"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{8}" maxLength={8} value={telefonoLocal(phone)} onChange={e=>setPhone(formatearTelefonoChile(e.target.value))}
                required
              /></span>
            </label>
            <label className="block text-sm font-bold">
              Comercio
              <input className="input mt-1" name="business" required />
            </label>
            <label className="block text-sm font-bold">
              Rubro
              <input className="input mt-1" name="industry" required />
            </label>
            <label className="block text-sm font-bold md:col-span-2">
              Mensaje
              <textarea
                className="input mt-1 min-h-32 resize-y"
                name="message"
                required
              />
            </label>
            {sent && (
              <p
                role="status"
                className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 md:col-span-2"
              >
                Solicitud preparada. Mientras conectamos el envío automático,
                puedes continuar por WhatsApp.
              </p>
            )}
            <button className="button-primary md:col-span-2" type="submit">
              <Send size={18} /> Enviar solicitud
            </button>
          </form>
        </section>
        <aside className="rounded-[2rem] bg-slate-950 p-7 text-white md:p-10">
          <MessageCircle className="text-emerald-300" size={42} />
          <h2 className="mt-5 text-3xl font-black">¿Prefieres WhatsApp?</h2>
          <p className="mt-3 leading-relaxed text-slate-300">
            Abre una conversación con el mensaje listo para cotizar MiClub
            Chile.
          </p>
          <a
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 font-black text-slate-950"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={20} /> Cotizar por WhatsApp
          </a>
        </aside>
      </main>
    </div>
  );
}
