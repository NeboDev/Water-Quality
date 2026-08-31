import { Link } from "react-router-dom";
import BlueprintCard from "../components/landing/BlueprintCard";
import PhSparkline from "../components/landing/PhSparkline";
import CampusMiniMap from "../components/landing/CampusMiniMap";
import IncidentHeatmap from "../components/landing/IncidentHeatmap";
import gotaAguaImg from "../assets/images/gota-agua-landing.png";
import logoBuapImg from "../assets/images/logo-buap-landing.png";
import logoIcuapImg from "../assets/images/logo-icuap-landing.png";

const OK = "#4f7f5b";

// Vista de referencia con datos de ejemplo — la telemetría real vive detras del login.
const PARAMS = [
  { name: "pH", value: "7.4", unit: "", limit: "6.5 – 8.5", pos: "52%" },
  {
    name: "Temperatura",
    value: "21.8",
    unit: "°C",
    limit: "registro",
    pos: "44%",
  },
  {
    name: "Conductividad",
    value: "412",
    unit: "µS/cm",
    limit: "ref. sales",
    pos: "38%",
  },
  { name: "Turbidez", value: "0.6", unit: "UTN", limit: "≤ 5", pos: "18%" },
  { name: "TDS", value: "268", unit: "mg/L", limit: "≤ 1000", pos: "29%" },
];

const STATS = [
  { value: "14", label: "Nodos en CU" },
  { value: "5", label: "Parámetros" },
  { value: "60 s", label: "Intervalo de lectura" },
  { value: "24/7", label: "Vigilancia activa" },
];

const STEPS = [
  {
    n: "01",
    title: "Se mide en el bebedero",
    desc: "Una sonda instalada en el punto de consumo toma los cinco parámetros directo del chorro que bebe la comunidad.",
  },
  {
    n: "02",
    title: "Viaja al instante",
    desc: "Cada lectura se envía por la red del campus a los servidores universitarios, cifrada y sin pasar por terceros.",
  },
  {
    n: "03",
    title: "Se contrasta con la norma",
    desc: "El sistema compara el valor con los límites de la NOM-127-SSA1-2021 y lo clasifica: óptimo, en observación o fuera de norma.",
  },
  {
    n: "04",
    title: "Avisa y queda registrado",
    desc: "Si algo se sale del rango, el tablero lo marca y notifica al personal responsable. Todo el histórico queda disponible.",
  },
];

const NOM_ROWS = [
  {
    n: "01",
    param: "pH",
    limite: "6.5 – 8.5",
    why: "Agua muy ácida o alcalina corroe tuberías y cambia el sabor.",
  },
  {
    n: "02",
    param: "Temperatura",
    limite: "Registro continuo",
    why: "El calor favorece el crecimiento microbiano en la red.",
  },
  {
    n: "03",
    param: "Conductividad",
    limite: "Indicador de sales",
    why: "Un salto repentino delata una entrada anómala al sistema.",
  },
  {
    n: "04",
    param: "Turbidez",
    limite: "≤ 5 UTN",
    why: "Partículas en suspensión pueden proteger microorganismos.",
  },
  {
    n: "05",
    param: "TDS",
    limite: "≤ 1000 mg/L",
    why: "Sólidos disueltos totales: mineralización y sabor del agua.",
  },
];

const RESPALDO = [
  {
    alt: "Logo BUAP",
    src: logoBuapImg,
    desc: "Benemérita Universidad Autónoma de Puebla",
  },
  {
    alt: "Logo ICUAP",
    src: logoIcuapImg,
    desc: "Centro de Investigaciones en Ciencias Microbiológicas · ICUAP",
  },
];

function Eyebrow({ children }) {
  return (
    <>
      <span className="block text-[13px] uppercase tracking-wide font-semibold text-kanan-700 mb-3">
        {children}
      </span>
      <hr className="border-0 h-px bg-black/15 mb-3.5" />
    </>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-[72px]">
        {/* Nav */}
        <nav className="flex items-center gap-5 flex-wrap py-4">
          <span className="font-semibold text-[22px] tracking-wide uppercase mr-auto flex items-baseline gap-2.5">
            Kanan
            <span className="font-normal text-[11px] tracking-wide text-black/55 normal-case">
              BUAP · CU
            </span>
          </span>
          <a
            href="#como"
            className="text-sm no-underline text-inherit hover:text-kanan-700"
          >
            Cómo funciona
          </a>
          <a
            href="#tablero"
            className="text-sm no-underline text-inherit hover:text-kanan-700"
          >
            Tablero
          </a>
          <a
            href="#norma"
            className="text-sm no-underline text-inherit hover:text-kanan-700"
          >
            Norma
          </a>
          <a
            href="#respaldo"
            className="text-sm no-underline text-inherit hover:text-kanan-700"
          >
            Respaldo
          </a>
          <Link
            to="/login"
            className="text-[13px] font-medium border border-black/25 rounded-none px-4 py-2 hover:border-kanan-700 hover:text-kanan-700 transition-colors"
          >
            Iniciar sesión
          </Link>
        </nav>
        <hr className="border-0 h-px bg-black/15" />

        {/* Hero */}
        <section className="py-10 sm:py-16 lg:py-24">
          <div className="flex flex-wrap-reverse gap-10 lg:gap-16 items-end justify-between">
            <div className="flex-1 min-w-[300px] basis-[420px]">
              <span className="block text-[13px] uppercase tracking-wide font-semibold text-kanan-700 mb-3">
                Monitoreo continuo · Ciudad Universitaria
              </span>
              <hr className="border-0 h-px bg-black/15 mb-6" />
              <h1 className="font-semibold uppercase leading-[1.04] tracking-wide text-[40px] sm:text-[56px] lg:text-[80px] max-w-[20ch] -ml-0.5">
                <span className="block">El agua de los</span>
                <span className="block">depósitos, medida</span>
                <span className="block">a cada minuto.</span>
              </h1>
              <p className="text-base sm:text-lg leading-relaxed max-w-[58ch] mt-7 text-black/80">
                Kanan —<em>guardián</em> en maya— es una red de sensores en los
                depósitos de agua de CU que reporta pH, temperatura,
                conductividad, turbidez y TDS en tiempo real, y compara cada
                lectura con la norma <strong>NOM-127-SSA1-2021</strong>. Lo que
                antes se sabía por muestreo, ahora se ve al instante.
              </p>
              <div className="flex gap-3 flex-wrap mt-7 items-center">
                <a
                  href="#tablero"
                  className="text-[15px] px-[22px] py-2.5 bg-kanan-700 text-white font-medium hover:bg-kanan-800 transition-colors"
                >
                  Ver el sistema
                </a>
                <a
                  href="#como"
                  className="text-[15px] px-[22px] py-2.5 border border-black/25 font-medium hover:border-kanan-700 hover:text-kanan-700 transition-colors"
                >
                  Recorrido de demostración
                </a>
                <span className="text-[13px] text-black/60">
                  Acceso abierto a la vista pública · sin cuenta
                </span>
              </div>
            </div>

            <img
              src={gotaAguaImg}
              alt="Kanan: gota de agua, emblema del sistema"
              className="flex-none self-center mx-auto w-[220px] sm:w-[280px] md:w-[340px] aspect-square object-contain block"
            />
          </div>

          <div
            className="grid gap-px bg-black/15 border border-black/15 mt-10 sm:mt-14"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="bg-white px-5 py-4.5">
                <div className="font-semibold text-[34px] leading-none tabular-nums">
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-wide mt-2 text-black/65">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 01 Cómo funciona */}
        <section id="como" className="py-8 sm:py-14 scroll-mt-4">
          <Eyebrow>01 · Cómo funciona</Eyebrow>
          <p className="text-base leading-relaxed max-w-[52ch] mb-10 text-black/80">
            Del bebedero a tu pantalla en cuatro pasos. Sin intervención manual
            en ninguno de ellos.
          </p>
          <div
            className="grid gap-7 sm:gap-10"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            }}
          >
            {STEPS.map((s) => (
              <BlueprintCard key={s.n} className="p-6">
                <div className="text-[13px] font-semibold tracking-wide text-kanan-700 tabular-nums">
                  PASO {s.n}
                </div>
                <h2 className="font-semibold text-xl uppercase tracking-wide mt-3.5">
                  {s.title}
                </h2>
                <p className="text-[15px] leading-relaxed mt-3 text-black/80">
                  {s.desc}
                </p>
              </BlueprintCard>
            ))}
          </div>
        </section>

        {/* 02 El tablero */}
        <section id="tablero" className="py-8 sm:py-14 scroll-mt-4">
          <Eyebrow>02 · El tablero</Eyebrow>
          <h2 className="font-semibold uppercase tracking-wide text-[28px] sm:text-[36px] leading-tight max-w-[24ch]">
            Así se ve la telemetría en vivo
          </h2>
          <p className="text-base leading-relaxed max-w-[54ch] mt-4 mb-9 text-black/80">
            Semáforo por parámetro, tendencia de las últimas horas y estado de
            cada nodo del campus. Vista de referencia con datos de ejemplo.
          </p>

          <BlueprintCard className="bg-slate-50">
            {/* Padding perimetral: en el mockup original este bloque tiene padding:0 y el header/las
                celdas de los extremos quedan a ras del borde, chocando con las esquinas decorativas.
                Este wrapper le da aire al borde exterior sin separar los divisores internos. */}
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3.5 flex-wrap pb-3.5 border-b border-black/15">
                <span className="font-semibold text-base uppercase tracking-wide">
                  Kanan · Telemetría
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-black/65">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                    style={{ background: OK }}
                  />
                  En vivo
                </span>
                <span className="ml-auto text-xs tabular-nums text-black/60">
                  Nodo BEB-07 · Facultad de Ingeniería · act. hace 12 s
                </span>
              </div>

              <div
                className="grid gap-px bg-black/15 border-b border-black/15"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                }}
              >
                {PARAMS.map((p) => (
                  <div
                    key={p.name}
                    className="bg-slate-50 px-3.5 py-4 first:pl-0 last:pr-0 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs tracking-wide text-black/65">
                        {p.name}
                      </span>
                      <span className="w-2 h-2" style={{ background: OK }} />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-semibold text-[28px] leading-none tabular-nums">
                        {p.value}
                      </span>
                      <span className="text-xs text-black/60">{p.unit}</span>
                    </div>
                    <div className="h-1 bg-black/10 relative">
                      <span
                        className="absolute -top-[3px] -bottom-[3px] w-0.5 bg-black"
                        style={{ left: p.pos }}
                      />
                    </div>
                    <div
                      className="text-[11px] tracking-wide uppercase"
                      style={{ color: OK }}
                    >
                      Óptimo
                    </div>
                    <div className="text-[11px] text-black/55 tabular-nums">
                      NOM-127: {p.limit}
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="grid gap-px bg-black/15"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                }}
              >
                <div className="bg-slate-50 pt-4 pr-0 sm:pr-3.5">
                  <PhSparkline />
                </div>
                <div className="bg-slate-50 pt-4 pl-0 sm:pl-3.5">
                  <CampusMiniMap />
                </div>
              </div>
            </div>
          </BlueprintCard>
          <p className="text-xs leading-relaxed mt-3.5 text-black/60">
            Vista ilustrativa. El tablero completo, el histórico y las alertas
            requieren cuenta universitaria.
          </p>

          <div className="mt-10 sm:mt-14">
            <span className="block text-[13px] uppercase tracking-wide font-semibold text-kanan-700 mb-3">
              Historial de incidencias · 18 semanas
            </span>
            <hr className="border-0 h-px bg-black/15 mb-5" />
            <BlueprintCard className="p-5">
              <IncidentHeatmap />
            </BlueprintCard>
          </div>
        </section>

        {/* 03 Lo que se mide */}
        <section id="norma" className="py-8 sm:py-14 scroll-mt-4">
          <Eyebrow>03 · Lo que se mide</Eyebrow>
          <BlueprintCard>
            <header className="flex flex-wrap items-stretch border-b border-black/15 text-[13px] uppercase tracking-wide font-semibold">
              <span className="flex-1 min-w-[16ch] px-5 py-3">
                Parámetros y límites de referencia
              </span>
              <span className="border-l border-black/15 px-5 py-3 whitespace-nowrap text-black/70">
                NOM-127-SSA1-2021
              </span>
              <span className="border-l border-black/15 px-5 py-3 whitespace-nowrap text-black/70">
                Hoja 01 de 01
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="px-5 py-3 font-semibold">Núm.</th>
                    <th className="px-5 py-3 font-semibold">Parámetro</th>
                    <th className="px-5 py-3 font-semibold">Límite de norma</th>
                    <th className="px-5 py-3 font-semibold">Por qué importa</th>
                  </tr>
                </thead>
                <tbody>
                  {NOM_ROWS.map((r) => (
                    <tr key={r.n} className="border-t border-black/15">
                      <td className="px-5 py-3.5 text-[13px] font-semibold text-kanan-700 tabular-nums">
                        {r.n}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-xl tracking-wide">
                        {r.param}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums whitespace-nowrap">
                        {r.limite}
                      </td>
                      <td className="px-5 py-3.5 text-black/80">{r.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="m-0 px-5 py-3 border-t border-black/15 text-[13px] leading-relaxed text-black/70">
              Kanan complementa el muestreo periódico oficial del ICUAP; no lo
              sustituye. El dictamen sanitario sigue siendo responsabilidad del
              laboratorio.
            </p>
          </BlueprintCard>
        </section>

        {/* 04 Respaldo institucional */}
        <section id="respaldo" className="py-8 sm:py-14 scroll-mt-4">
          <Eyebrow>04 · Respaldo institucional</Eyebrow>
          <div
            className="grid gap-7 sm:gap-10 items-start"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            }}
          >
            <div>
              <h2 className="font-semibold uppercase tracking-wide text-[26px] sm:text-[32px] leading-tight max-w-[22ch]">
                Universidad pública, dato público
              </h2>
              <p className="text-base leading-relaxed mt-4 max-w-[46ch] text-black/80">
                Kanan se desarrolla dentro de la BUAP: la validación científica
                la aporta el CICM-ICUAP.
              </p>
              <div className="flex gap-2 flex-wrap mt-5">
                <span className="text-xs uppercase tracking-wide border border-black/25 px-2.5 py-1">
                  Datos en campus
                </span>
                <span className="text-xs uppercase tracking-wide bg-kanan-100 text-kanan-800 px-2.5 py-1">
                  Validación NOM-127
                </span>
              </div>
            </div>
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              }}
            >
              {RESPALDO.map((r) => (
                <BlueprintCard
                  key={r.alt}
                  className="p-4 min-h-[112px] flex flex-col justify-between"
                >
                  <img
                    src={r.src}
                    alt={r.alt}
                    className="h-[34px] w-auto max-w-full object-contain object-left"
                  />
                  <div className="text-xs leading-snug text-black/70">
                    {r.desc}
                  </div>
                </BlueprintCard>
              ))}
              <BlueprintCard className="p-4 min-h-[112px] flex flex-col justify-between">
                <div className="font-semibold text-lg uppercase tracking-wide leading-tight">
                  NOM-127
                  <br />
                  SSA1-2021
                </div>
                <div className="text-xs leading-snug text-black/70">
                  Norma de referencia para agua de uso y consumo humano
                </div>
              </BlueprintCard>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-7 sm:py-14">
          <div className="flex flex-wrap gap-5 items-center justify-between border-y border-black/15 py-6 sm:py-10">
            <div>
              <h3 className="font-semibold uppercase tracking-wide text-[22px] sm:text-[28px]">
                ¿Ya tienes cuenta?
              </h3>
              <p className="text-[15px] leading-relaxed mt-2.5 max-w-[48ch] text-black/80">
                Entra al tablero completo: histórico por nodo, exportación de
                datos y configuración de alertas.
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                to="/login"
                className="text-[15px] px-[22px] py-2.5 bg-kanan-700 text-white font-medium hover:bg-kanan-800 transition-colors"
              >
                Iniciar sesión
              </Link>
              <a
                href="#tablero"
                className="text-[15px] px-[22px] py-2.5 border border-black/25 font-medium hover:border-kanan-700 hover:text-kanan-700 transition-colors"
              >
                Ver el sistema
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="py-8 sm:py-12 grid gap-6 text-[13px] leading-relaxed text-black/70"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <div>
            <div className="font-semibold text-lg uppercase tracking-wide text-black">
              Kanan
            </div>
            <p className="mt-2">
              Monitoreo de calidad del agua · Ciudad Universitaria, BUAP.{" "}
              <em>Kanan</em>: guardián, en maya.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-black">
              Contacto
            </div>
            <p className="mt-2">
              marvic.osoriob@alumno.buap.mx jesus.aguilarq@alumno.buap.mx
              <br />
              Facultad de Ciencias de la computacion
              <br />
              Ciudad Universitaria, Puebla
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-black">
              El proyecto
            </div>
            <p className="mt-2">
              <a href="#como" className="text-inherit hover:text-kanan-700">
                Cómo funciona
              </a>
              <br />
              <a href="#norma" className="text-inherit hover:text-kanan-700">
                Parámetros y norma
              </a>
              <br />
              <a href="#respaldo" className="text-inherit hover:text-kanan-700">
                Respaldo institucional
              </a>
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-black">
              Créditos
            </div>
            <p className="mt-2">
              Desarrollado por estudiantes de la BUAP, con CICM-ICUAP. Los datos
              son informativos y complementan el muestreo oficial del ICUAP.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
