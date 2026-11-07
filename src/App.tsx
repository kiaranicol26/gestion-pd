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


const PUBLIC_RANKS = [
  { code: "CMS", name: "Comisario" },
  { code: "INS", name: "Inspector" },
  { code: "CPT", name: "Capitán" },
  { code: "TTE", name: "Teniente" },
  { code: "SGT", name: "Sargento" },
  { code: "CBO", name: "Cabo" },
  { code: "OFC", name: "Oficial" },
  { code: "CDT", name: "Cadete" },
  { code: "ASP", name: "Aspirante" },
];

type PublicMember = {
  id: string;
  full_name: string;
  callsign: string | null;
  rank_code: string | null;
  rank_name: string | null;
  photo_url: string | null;
  division_1: boolean;
  division_2: boolean;
  division_3: boolean;
  is_instructor: boolean;
  discord_joined_at: string | null;
};

function PublicRoster() {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadRoster() {
      if (!supabase) {
        setError("El servicio de datos todavía no está configurado.");
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("public_pd_roster")
        .select("id,full_name,callsign,rank_code,rank_name,photo_url,division_1,division_2,division_3,is_instructor,discord_joined_at");
      if (!mounted) return;
      if (queryError) setError("No se pudo cargar el Registro PD. Intentá nuevamente más tarde.");
      else setMembers((data ?? []) as PublicMember[]);
      setLoading(false);
    }
    void loadRoster();
    return () => { mounted = false; };
  }, []);

  const rankGroups = PUBLIC_RANKS.map((rank) => ({
    ...rank,
    members: members
      .filter((member) => member.rank_code === rank.code || member.rank_name === rank.name)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, "es")),
  }));
  const unranked = members
    .filter((member) => !PUBLIC_RANKS.some((rank) => member.rank_code === rank.code || member.rank_name === rank.name))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));

  function seniority(joinedAt: string | null) {
    if (!joinedAt) return null;
    const days = Math.max(0, Math.floor((Date.now() - new Date(joinedAt).getTime()) / 86400000));
    return `${days} días en el departamento`;
  }

  function memberCard(member: PublicMember) {
    const divisions = [
      member.division_1 && "División 1",
      member.division_2 && "División 2",
      member.division_3 && "División 3",
    ].filter((value): value is string => Boolean(value));
    return (
      <article className="public-member" key={member.id}>
        {member.photo_url
          ? <img className="public-avatar" src={member.photo_url} alt={`Foto de ${member.full_name}`} loading="lazy" />
          : <div className="public-avatar public-avatar-fallback"><Users size={22} /></div>}
        <div className="public-member-info">
          <strong>{member.full_name}</strong>
          <span className="public-callsign">{member.callsign ? `Placa #${member.callsign}` : "Placa no asignada"}</span>
          <div className="public-tags">
            {divisions.map((division) => <span className="public-tag" key={division}>{division}</span>)}
            {member.is_instructor && <span className="public-tag instructor-tag">Instructor</span>}
            {!divisions.length && !member.is_instructor && <span className="public-no-extra">Sin divisiones asignadas</span>}
          </div>
          {seniority(member.discord_joined_at) && <small>{seniority(member.discord_joined_at)}</small>}
        </div>
      </article>
    );
  }

  return (
    <div className="public-roster-page">
      <header className="public-roster-header">
        <a className="public-brand" href="/"><span className="brand-mark"><Shield size={22} /></span><span><strong>GESTIÓN PD</strong><small>WESTZONE ROLEPLAY</small></span></a>
        <span className="public-readonly"><LockKeyhole size={14} /> REGISTRO PÚBLICO</span>
      </header>
      <main className="public-roster-main">
        <div className="eyebrow"><Users size={14} /> DEPARTAMENTO DE POLICÍA</div>
        <h1>Registro del personal</h1>
        <p className="public-roster-subtitle">Directorio oficial de miembros activos, organizado por jerarquía.</p>
        {loading ? <div className="public-state"><div className="spinner" /> Cargando personal...</div> : null}
        {!loading && error ? <div className="public-state public-error">{error}</div> : null}
        {!loading && !error && members.length === 0 ? <div className="public-state">Todavía no hay miembros activos registrados.</div> : null}
        {!loading && !error && rankGroups.map((group) => group.members.length > 0 && (
          <section className="public-rank-section" key={group.code}>
            <div className="public-rank-heading"><h2>{group.name}</h2><span>{group.members.length} {group.members.length === 1 ? "miembro" : "miembros"}</span></div>
            <div className="public-member-grid">{group.members.map(memberCard)}</div>
          </section>
        ))}
        {!loading && !error && unranked.length > 0 && (
          <section className="public-rank-section">
            <div className="public-rank-heading"><h2>Sin rango asignado</h2><span>{unranked.length} {unranked.length === 1 ? "miembro" : "miembros"}</span></div>
            <div className="public-member-grid">{unranked.map(memberCard)}</div>
          </section>
        )}
      </main>
      <footer className="public-roster-footer"><span>GESTIÓN PD · WESTZONE ROLEPLAY</span><a href="/">Acceso al sistema</a></footer>
    </div>
  );
}

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
  const [discordUsername, setDiscordUsername] = useState("");
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationSent, setRegistrationSent] = useState(false);

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
      if (!data?.token_hash) throw new Error("No se pudo validar la contraseña.");
      const { error: loginError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (loginError) throw loginError;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo iniciar sesión.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function requestRegistration() {
    if (!supabase || !discordUsername.trim()) return;
    setAuthError("");
    setRegistrationSent(false);
    setRegistrationLoading(true);
    try {
      const { error } = await supabase.functions.invoke("request-registration", {
        body: { username: discordUsername.trim() },
      });
      if (error) throw error;
      setRegistrationSent(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setRegistrationLoading(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSection("dashboard");
  }

  if (window.location.pathname.replace(/\/+$/, "") === "/registro") return <PublicRoster />;

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
              <p>Ingresá tu nombre de usuario original de Discord. El bot localizará tu cuenta en el servidor y te enviará una contraseña definitiva por MD.</p>
              <label className="auth-label" htmlFor="discord-username">Usuario de Discord</label>
              <div className="password-field">
                <input id="discord-username" type="text" value={discordUsername}
                  onChange={(event) => { setDiscordUsername(event.target.value); setRegistrationSent(false); }}
                  onKeyDown={(event) => { if (event.key === "Enter") void requestRegistration(); }}
                  placeholder="Ejemplo: pokaim" autoComplete="username" maxLength={32} />
              </div>
              <button className="discord-button" onClick={() => void requestRegistration()} disabled={discordUsername.trim().length < 2 || registrationLoading}>
                <MessageCircle size={17} /> {registrationLoading ? "Enviando solicitud..." : "Solicitar código"}
              </button>
              {registrationSent && <div className="auth-success">Solicitud recibida. Si encontramos ese usuario en el servidor, el bot le enviará un mensaje privado. Asegurate de permitir MD.</div>}
              {authError && <div className="auth-error">{authError}</div>}
              <button className="register-link" onClick={() => { setAuthError(""); setRegistrationSent(false); setShowRegistration(false); }}>Volver a iniciar sesión</button>
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
              <button className="register-link" onClick={() => { setAuthError(""); setRegistrationSent(false); setShowRegistration(true); }}>Registrarse</button>
            </>
          )}
          <div className="auth-notice"><LockKeyhole size={15} /> Acceso protegido mediante contraseña</div>
          <a className="auth-public-link" href="/registro">Consultar Registro PD público</a>
          <span className="version">ACCESO PROTEGIDO · GESTIÓN PD</span>
        </div>
      </div>
    );
  }

  const active = navigation.find((item) => item.id === section) ?? navigation[0];
  const displayName = session.user.user_metadata?.user_name ?? session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? "Usuario";

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
