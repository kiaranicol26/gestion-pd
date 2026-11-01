import { useEffect, useState } from "react";
import {
  Activity, BadgeDollarSign, BookOpenCheck, ChevronDown, ClipboardList,
  LayoutDashboard, LockKeyhole, LogIn, LogOut, Menu, MessageCircle, Settings, Shield, Users,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
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
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authError, setAuthError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCheckingSession(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithPassword() {
    if (!supabase || !password.trim()) return;
    setAuthError("");
    setAuthLoading(true);
    try {
      // The Edge Function resolves the password to its internal Auth identity.
      const { data, error } = await supabase.functions.invoke("resolve-password-login", {
        body: { password },
      });
      if (error) throw error;
      if (!data?.email) throw new Error("No se pudo validar la contraseña.");
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (loginError) throw loginError;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSection("dashboard");
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark auth-mark"><Shield size={25} /></div>
          <div className="eyebrow">POLICE DEPARTMENT MANAGEMENT</div>
          <h1>GESTIÓN PD</h1>
          <p>La plataforma está preparada. Para habilitar el acceso seguro, primero hay que conectar el proyecto Supabase y desplegar las funciones de autenticación.</p>
          <div className="auth-notice"><LockKeyhole size={16} /> Autenticación todavía no configurada</div>
          <span className="version">VERSIÓN 0.1.0 · ENTORNO INICIAL</span>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return <div className="auth-screen"><div className="auth-card"><div className="spinner" /><p>Verificando sesión segura…</p></div></div>;
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark auth-mark"><Shield size={25} /></div>
          <div className="eyebrow">POLICE DEPARTMENT MANAGEMENT</div>
          <h1>GESTIÓN PD</h1>
          {showRegistration ? (
            <>
              <p>Para crear tu acceso, solicitá tu contraseña definitiva al bot oficial desde nuestro servidor de Discord.</p>
              <div className="registration-steps">
                <strong>¿Cómo registrarte?</strong>
                <span>1. Entrá al servidor oficial de Discord.</span>
                <span>2. Ejecutá el comando <b>/registrarse</b>.</span>
                <span>3. El bot verificará tu cuenta y te enviará tu contraseña por MD.</span>
                <span>4. Volvé aquí e ingresá esa contraseña.</span>
              </div>
              <button className="discord-button" onClick={() => setShowRegistration(false)}>Volver a iniciar sesión</button>
            </>
          ) : (
            <>
              <p>Ingresá con la contraseña definitiva que recibiste por mensaje privado del bot de Gestión PD.</p>
              <label className="auth-label" htmlFor="access-password">Contraseña de acceso</label>
              <div className="password-field">
                <input id="access-password" type={showPassword ? "text" : "password"} value={password}
                  onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void signInWithPassword(); }}
                  placeholder="Ingresá tu contraseña" autoComplete="current-password" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? "Ocultar" : "Ver"}</button>
              </div>
              <button className="discord-button" onClick={() => void signInWithPassword()} disabled={!password.trim() || authLoading}>
                <LockKeyhole size={17} /> {authLoading ? "Verificando..." : "Iniciar sesión"} <LogIn size={17} />
              </button>
              {authError && <div className="auth-error">{authError}</div>}
              <button className="register-link" onClick={() => { setAuthError(""); setShowRegistration(true); }}>Registrarse</button>
            </>
          )}
          <div className="auth-notice"><LockKeyhole size={15} /> Acceso protegido mediante contraseña</div>
          <span className="version">ACCESO PROTEGIDO · GESTIÓN PD</span>
        </div>
      </div>
    );
  }

  const active = navigation.find((item) => item.id === section) ?? navigation[0];
  const displayName = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? session.user.email ?? "Usuario";

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
          <div className="connection"><span className="dot online" /> Sesión protegida activa</div>
          <span className="version">GESTIÓN PD · v0.1.0</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú"><Menu /></button>
          <div className="breadcrumb">Gestión PD <span>/</span> {active.label}</div>
          <div className="topbar-right user-area"><span>{displayName}</span><button className="icon-button" onClick={signOut} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={17}/></button></div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow"><Activity size={14} /> SISTEMA DE ADMINISTRACIÓN</div>
              <h1>{section === "dashboard" ? "Centro de operaciones" : active.label}</h1>
              <p className="subtitle">Administración centralizada de agentes, instructores y salarios.</p>
            </div>
            <div className="secure-label"><LockKeyhole size={15} /> Sesión autenticada</div>
          </div>

          {section === "dashboard" ? (
            <>
              <div className="stat-grid">
                <article className="stat-card"><div className="stat-icon"><Users /></div><span>AGENTES REGISTRADOS</span><strong>—</strong><small>Se mostrará al conectar los datos</small></article>
                <article className="stat-card"><div className="stat-icon"><BadgeDollarSign /></div><span>PERÍODO SALARIAL</span><strong>—</strong><small>Los períodos se crean manualmente</small></article>
                <article className="stat-card"><div className="stat-icon"><BookOpenCheck /></div><span>CAPACITACIONES</span><strong>4</strong><small>M4 · EDC · MARY · AIR (iniciales)</small></article>
              </div>
              <div className="content-card setup-card">
                <div className="setup-icon"><ClipboardList size={22} /></div>
                <div className="setup-copy"><h2>Bienvenido a Gestión PD</h2>
                  <p>La estructura inicial está creada. Estamos preparando la base de datos, los permisos y los módulos operativos.</p>
                  <div className="setup-status"><span className="dot online" /> Autenticación protegida · Datos todavía en preparación</div>
                </div>
              </div>
              <div className="content-card checklist">
                <h2>Plan de desarrollo</h2>
                <div><span className="step-number done">01</span><span>Crear repositorio y estructura de aplicación</span><b>LISTO</b></div>
                <div><span className="step-number">02</span><span>Configurar Supabase y políticas de seguridad</span><b>PENDIENTE</b></div>
                <div><span className="step-number">03</span><span>Integrar bot de Discord y entrega de contraseñas</span><b>EN DESARROLLO</b></div>
                <div><span className="step-number">04</span><span>Desarrollar Registro PD, salarios y administración</span><b>PENDIENTE</b></div>
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
    </div>
  );
}
