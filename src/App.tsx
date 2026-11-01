import { useState } from "react";
import {
  Activity, BadgeDollarSign, BookOpenCheck, ChevronDown, ClipboardList,
  LayoutDashboard, LockKeyhole, LogIn, Menu, Settings, Shield, Users,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";

type Section = "dashboard" | "registro" | "salarios" | "capacitaciones" | "administracion";

const navigation = [
  { id: "dashboard" as const, label: "Inicio", icon: LayoutDashboard },
  { id: "registro" as const, label: "Registro PD", icon: Users },
  { id: "salarios" as const, label: "Salarios", icon: BadgeDollarSign },
  { id: "capacitaciones" as const, label: "Capacitaciones", icon: BookOpenCheck },
  { id: "administracion" as const, label: "Administración", icon: Settings },
];

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  async function signInWithDiscord() {
    if (!supabase) return;
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo, scopes: "identify email guilds" },
    });
    if (error) console.error("No se pudo iniciar sesión con Discord:", error.message);
  }

  const active = navigation.find((item) => item.id === section) ?? navigation[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Shield size={22} /></div>
          <div><strong>GESTIÓN PD</strong><span>POLICE DEPARTMENT</span></div>
        </div>
        <div className="nav-caption">PLATAFORMA</div>
        <nav>
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${section === id ? "active" : ""}`}
              onClick={() => { setSection(id); setMenuOpen(false); }}>
              <Icon size={18} /><span>{label}</span>
              {section === id && <span className="active-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection"><span className={isSupabaseConfigured ? "dot online" : "dot"} />
            {isSupabaseConfigured ? "Configuración Supabase detectada" : "Pendiente de conectar Supabase"}
          </div>
          <span className="version">GESTIÓN PD · v0.1.0</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú"><Menu /></button>
          <div className="breadcrumb">Gestión PD <span>/</span> {active.label}</div>
          <div className="topbar-right"><span className="environment"><span /> ENTORNO DE DESARROLLO</span></div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><Activity size={14} /> SISTEMA DE ADMINISTRACIÓN</div>
              <h1>{section === "dashboard" ? "Centro de operaciones" : active.label}</h1>
              <p className="subtitle">Administración centralizada de agentes, instructores y salarios.</p>
            </div>
            <div className="secure-label"><LockKeyhole size={15} /> Acceso protegido por Discord</div>
          </div>

          {section === "dashboard" ? (
            <>
              <div className="stat-grid">
                <article className="stat-card"><div className="stat-icon"><Users /></div><span>AGENTES REGISTRADOS</span><strong>—</strong><small>Se mostrará al conectar la base de datos</small></article>
                <article className="stat-card"><div className="stat-icon"><BadgeDollarSign /></div><span>PERÍODO SALARIAL</span><strong>—</strong><small>Los períodos se crean manualmente</small></article>
                <article className="stat-card"><div className="stat-icon"><BookOpenCheck /></div><span>CAPACITACIONES</span><strong>4</strong><small>M4 · EDC · MARY · AIR (iniciales)</small></article>
              </div>
              <div className="content-card setup-card">
                <div className="setup-icon"><ClipboardList size={22} /></div>
                <div className="setup-copy"><h2>La plataforma ya tiene su estructura inicial</h2>
                  <p>El siguiente paso es conectar Supabase, configurar Discord OAuth2 y aplicar las migraciones de seguridad antes de habilitar el acceso real.</p>
                  <div className="setup-status"><span className={isSupabaseConfigured ? "dot online" : "dot"} /> {isSupabaseConfigured ? "Variables de Supabase configuradas" : "Esperando credenciales de Supabase"}</div>
                </div>
              </div>
              <div className="content-card checklist">
                <h2>Próximas etapas</h2>
                <div><span className="step-number done">01</span><span>Crear repositorio y estructura de aplicación</span><b>LISTO</b></div>
                <div><span className="step-number">02</span><span>Crear base de datos y políticas de acceso</span><b>PENDIENTE</b></div>
                <div><span className="step-number">03</span><span>Configurar inicio de sesión con Discord</span><b>PENDIENTE</b></div>
                <div><span className="step-number">04</span><span>Desarrollar Registro PD y salarios</span><b>PENDIENTE</b></div>
              </div>
            </>
          ) : (
            <div className="content-card placeholder">
              <div className="placeholder-icon"><active.icon size={26} /></div>
              <h2>{active.label}</h2>
              <p>Este módulo se desarrollará en la siguiente etapa, conectado a la base de datos y protegido por permisos del servidor.</p>
              <span className="coming-soon"><ChevronDown size={14} /> EN DESARROLLO</span>
            </div>
          )}

          <footer><span>GESTIÓN PD</span><span>Plataforma independiente · {new Date().getFullYear()}</span></footer>
        </section>
      </main>

      {!isSupabaseConfigured && (
        <div className="dev-banner"><LockKeyhole size={15} /> Vista preliminar: autenticación y datos todavía no están habilitados.</div>
      )}
    </div>
  );
}
