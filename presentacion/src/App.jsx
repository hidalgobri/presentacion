import { useState, useRef, useEffect } from "react";

const MODOS = {
  cuellos:     { icon: "🔍", nombre: "Cuellos de botella",  prompt: "Analiza el proceso e identifica cuellos de botella, esperas innecesarias, rework y fricciones. Estructura: ## Resumen ejecutivo, ## Cuellos de botella identificados (con causa raíz), ## Actividades con mayor espera, ## Recomendaciones inmediatas." },
  bpmn:        { icon: "📋", nombre: "Naming BPMN",         prompt: "Reescribe cada actividad del proceso en formato verbo infinitivo + objeto (ej: 'Verificar datos del cliente'). Incluye: ## Actividades renombradas, ## Por qué el nuevo nombre es mejor, ## Tipo de tarea BPMN sugerido (User Task, Service Task, etc.), ## Gateways sugeridos." },
  riesgos:     { icon: "🚨", nombre: "Riesgos operativos",  prompt: "Identifica riesgos de error humano, puntos sin control, riesgos de fraude e incumplimiento regulatorio. Incluye: ## Matriz de riesgos (Riesgo | Probabilidad | Impacto | Control), ## Puntos críticos de control, ## Recomendaciones de mitigación." },
  checklist:   { icon: "✅", nombre: "Checklist de mejora", prompt: "Crea un checklist accionable de mejoras organizado por: ## Mejoras rápidas (menos de 1 semana), ## Mejoras de mediano plazo (1-3 meses), ## Transformaciones estructurales (3-12 meses). Cada ítem: qué hacer, quién es responsable, beneficio esperado." },
  metricas:    { icon: "📊", nombre: "Métricas KPI",        prompt: "Define KPIs de eficiencia, calidad y experiencia del cliente para este proceso. Incluye: ## KPIs por dimensión, ## Cómo medirlos (fuente, frecuencia), ## Valores benchmark para banca latinoamericana, ## Cómo interpretar cada métrica." },
  automatizar: { icon: "⚡", nombre: "Automatización",      prompt: "Identifica: ## Actividades automatizables con RPA, ## Actividades automatizables con IA/ML, ## Actividades que deben permanecer humanas y por qué, ## Roadmap de automatización, ## Herramientas recomendadas (Bizagi, UiPath, etc.)." },
};

const EJEMPLOS = {
  tarjeta: `El cliente se acerca a ventanilla y solicita emisión de tarjeta de débito. El cajero solicita la cédula de identidad. El cajero verifica en el sistema core si el cliente tiene cuenta activa. Si la cuenta tiene observaciones, se le informa al cliente que debe pasar con un asesor. Si la cuenta está activa, el cajero llena el formulario de solicitud en papel. Luego ingresa los datos manualmente en el sistema de tarjetas. El sistema genera un número de tarjeta. El cajero imprime la tarjeta en la impresora de plásticos. Si la impresora falla, espera soporte técnico. Finalmente entrega la tarjeta al cliente y le explica cómo activarla por el APP. El proceso completo toma entre 15 y 45 minutos.`,
  avaluo: `El analista recibe la solicitud de avalúo por correo electrónico. Descarga los documentos adjuntos y los revisa manualmente. Verifica si el expediente está completo revisando una lista en papel. Si faltan documentos, contacta al solicitante por correo. Una vez completo, ingresa los datos en el sistema QUIPA manualmente. Un valuador externo es asignado por el analista según disponibilidad que conoce de memoria. El valuador realiza la visita al inmueble y envía el informe en PDF por correo. El analista ingresa los resultados en QUIPA. El jefe revisa y aprueba. Se genera el informe final y se archiva físicamente.`,
  credito: `El asesor comercial recibe la solicitud de crédito del cliente. Recopila los documentos: cédula, roles de pago, declaración de impuestos. Verifica manualmente en el buró de crédito. Llena la solicitud en papel y la entrega al área de análisis de crédito. El analista revisa los documentos y calcula el scoring manualmente en Excel. Si el score es mayor a 700, pre-aprueba. El comité de crédito se reúne los martes para aprobar formalmente. Si hay observaciones, se devuelve al asesor. Una vez aprobado, se notifica al cliente por llamada telefónica. El tiempo total del proceso es de 7 a 15 días hábiles.`,
  casos: `Cuando un cliente se acerca a la sucursal con un reclamo, el cajero anota el caso en un cuaderno de registro. Luego llama internamente al área de servicio al cliente. El especialista abre un ticket en el sistema, pero también lo anota en una hoja de cálculo compartida. El caso es asignado manualmente al área correspondiente por correo electrónico. El área resuelve y notifica por correo al especialista. Este llama al cliente para informar la resolución. Si el cliente no contesta, se intenta máximo 3 veces. El caso se cierra en el sistema pero el cuaderno físico de la sucursal no siempre se actualiza.`,
};

function renderMd(text) {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="color:#C9A84C;font-size:13px;margin:16px 0 6px;font-family:Inter,sans-serif;font-weight:700">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#00A855;font-size:15px;margin:20px 0 8px;font-family:Inter,sans-serif;font-weight:700;border-bottom:1px solid #2C2C2C;padding-bottom:6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#F7F8F6;font-size:18px;margin:20px 0 10px;font-family:Inter,sans-serif;font-weight:700">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#F7F8F6;font-family:Inter,sans-serif">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#C9A84C">$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#2C2C2C;border:1px solid #333;border-radius:4px;padding:1px 6px;font-size:12px;color:#00A855">$1</code>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #333;margin:16px 0">')
    .replace(/^\- (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#00A855;flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0"><span style="color:#C9A84C;flex-shrink:0;font-weight:700">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function App() {
  const [modo, setModo] = useState("cuellos");
  const [proceso, setProceso] = useState("");
  const [resultado, setResultado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Esperando proceso para analizar");
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const resultRef = useRef(null);
  const streamRef = useRef("");

  useEffect(() => {
    if (resultRef.current) resultRef.current.scrollTop = resultRef.current.scrollHeight;
  }, [resultado]);

  async function analizar() {
    if (!proceso.trim()) return;
    const m = MODOS[modo];
    setCargando(true);
    setResultado("");
    streamRef.current = "";
    setMostrarResultado(true);
    setStatusMsg(`Analizando con modo "${m.nombre}"...`);
    setProgreso(10);

    const systemPrompt = `Eres un experto en BPM, mejora de procesos y operaciones bancarias en Ecuador. ${m.prompt}\n\nResponde en español. Usa markdown con encabezados ##, negritas y listas. Al final incluye ## ✅ Próximos pasos con 3 acciones concretas para esta semana.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: `Proceso:\n\n${proceso}` }],
        }),
      });

      setProgreso(60);
      const data = await response.json();

      if (!response.ok) throw new Error(data?.error?.message || `Error ${response.status}`);

      const texto = data.content?.map(b => b.text || "").join("") || "";
      streamRef.current = texto;

      // Efecto typewriter
      let i = 0;
      setProgreso(80);
      const tick = setInterval(() => {
        i = Math.min(i + 20, texto.length);
        setResultado(texto.substring(0, i));
        if (i >= texto.length) {
          clearInterval(tick);
          setProgreso(100);
          setTimeout(() => setProgreso(0), 600);
          setStatusMsg(`✅ Análisis completado · ${texto.length} caracteres`);
          setCargando(false);
        }
      }, 12);

    } catch (err) {
      setResultado(`❌ Error: ${err.message}`);
      setStatusMsg("Error en el análisis");
      setCargando(false);
      setProgreso(0);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(streamRef.current);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const s = {
    wrap: { display:"flex", flexDirection:"column", height:"100vh", background:"#0D0D0D", color:"#F7F8F6", fontFamily:"Inter,sans-serif", overflow:"hidden" },
    header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:"1px solid #333", background:"#1A1A1A", flexShrink:0 },
    logoBadge: { background:"#00703C", color:"#fff", fontWeight:700, fontSize:12, letterSpacing:"0.06em", padding:"4px 9px", borderRadius:4 },
    logoArea: { display:"flex", alignItems:"center", gap:12 },
    headerTitle: { fontSize:14, fontWeight:600, letterSpacing:"-0.01em" },
    headerSub: { fontSize:10, color:"#888", marginTop:1 },
    pulseDot: { width:7, height:7, background:"#00A855", borderRadius:"50%", animation:"pulsar 1.8s ease-in-out infinite" },
    pulseWrap: { display:"flex", alignItems:"center", gap:7, fontSize:11, color:"#00A855", fontWeight:500 },
    progressBar: { height:2, background:"#1A1A1A", flexShrink:0 },
    progressFill: { height:"100%", background:"linear-gradient(90deg,#00703C,#00A855,#C9A84C)", transition:"width 0.4s ease", borderRadius:2 },
    body: { display:"grid", gridTemplateColumns:"380px 1fr", flex:1, overflow:"hidden" },
    leftPanel: { background:"#1A1A1A", borderRight:"1px solid #333", display:"flex", flexDirection:"column", overflow:"hidden" },
    sectionLabel: { fontSize:10, fontWeight:600, letterSpacing:"0.12em", color:"#666", textTransform:"uppercase", marginBottom:10 },
    modeGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 },
    modeBtn: (active) => ({ background: active?"#122b1c":"#2C2C2C", border:`1px solid ${active?"#00A855":"#333"}`, borderRadius:8, padding:"9px 10px", cursor:"pointer", textAlign:"left", color:"#F7F8F6", transition:"all 0.15s" }),
    modeIcon: { fontSize:16, marginBottom:3, display:"block" },
    modeName: { fontSize:11, fontWeight:600 },
    modeDesc: { fontSize:10, color:"#888", marginTop:2, lineHeight:1.3 },
    panelSection: { padding:"16px 18px", borderBottom:"1px solid #333" },
    inputWrap: { flex:1, display:"flex", flexDirection:"column", padding:"16px 18px", gap:10, overflow:"hidden" },
    textarea: { flex:1, background:"#2C2C2C", border:"1px solid #333", borderRadius:10, color:"#F7F8F6", fontFamily:"Inter,sans-serif", fontSize:12, lineHeight:1.6, padding:"12px 14px", resize:"none", outline:"none" },
    btnAnalizar: (dis) => ({ background: dis?"#1a3d28":"#00703C", color: dis?"#3a6b4a":"#fff", border:"none", borderRadius:10, padding:"12px", fontFamily:"Inter,sans-serif", fontSize:13, fontWeight:600, cursor: dis?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.15s" }),
    examplesBox: { padding:"12px 18px", borderTop:"1px solid #333", background:"#141414" },
    exLabel: { fontSize:10, fontWeight:600, letterSpacing:"0.1em", color:"#555", textTransform:"uppercase", marginBottom:7 },
    exItem: { fontSize:11, color:"#666", cursor:"pointer", padding:"4px 8px", borderRadius:5, display:"block", marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
    rightPanel: { display:"flex", flexDirection:"column", overflow:"hidden" },
    emptyState: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:18, padding:40, textAlign:"center" },
    emptyTitle: { fontSize:20, fontWeight:700, letterSpacing:"-0.02em" },
    emptySub: { fontSize:13, color:"#888", maxWidth:360, lineHeight:1.6 },
    chipsWrap: { display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", maxWidth:460 },
    chip: { background:"#2C2C2C", border:"1px solid #333", borderRadius:20, padding:"6px 14px", fontSize:12, color:"#E8EAE6", cursor:"pointer" },
    resultHeader: { padding:"14px 24px", borderBottom:"1px solid #333", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#1A1A1A", flexShrink:0 },
    resultIcon: { fontSize:18 },
    resultName: { fontSize:13, fontWeight:600 },
    resultSub: { fontSize:10, color:"#888", marginTop:1 },
    btnCopiar: { background:"transparent", border:"1px solid #333", color:"#888", borderRadius:7, padding:"6px 12px", fontFamily:"Inter,sans-serif", fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", gap:6 },
    streamArea: { flex:1, overflowY:"auto", padding:"24px 28px" },
    streamTxt: { fontFamily:"JetBrains Mono,monospace", fontSize:12, lineHeight:1.85, color:"#E8EAE6" },
    statusBar: { padding:"7px 24px", borderTop:"1px solid #333", display:"flex", alignItems:"center", gap:8, background:"#111", fontSize:11, color:"#888", flexShrink:0 },
    statusDot: (thinking) => ({ width:6, height:6, borderRadius:"50%", background: thinking?"#C9A84C":"#00A855", flexShrink:0, animation: thinking?"pulsar 0.8s ease-in-out infinite":"none" }),
  };

  return (
    <div style={s.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes pulsar { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes trazar { 0%{stroke-dashoffset:700;opacity:0.3} 50%{stroke-dashoffset:0;opacity:1} 100%{stroke-dashoffset:-700;opacity:0.3} }
        .ecg-path{fill:none;stroke:#00703C;stroke-width:2;stroke-dasharray:700;stroke-dashoffset:700;animation:trazar 3s ease-in-out infinite;opacity:0.7}
        .exItem:hover{color:#00A855!important;background:#122b1c!important}
        .chip:hover{border-color:#00A855!important;color:#00A855!important;background:#122b1c!important}
        .modeBtn:hover{border-color:#00703C!important;background:#1f2f25!important}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#2C2C2C;border-radius:10px}
        .cursor{display:inline-block;width:8px;height:15px;background:#00A855;vertical-align:middle;margin-left:2px;animation:pulsar 0.8s step-end infinite;border-radius:2px}
      `}</style>

      {/* HEADER */}
      <header style={s.header}>
        <div style={s.logoArea}>
          <span style={s.logoBadge}>PRODUBANCO</span>
          <div>
            <div style={s.headerTitle}>El Analista Aumentado</div>
            <div style={s.headerSub}>Transformación de Procesos · IA Aplicada</div>
          </div>
        </div>
        <div style={s.pulseWrap}>
          <div style={s.pulseDot}></div>
          IA Conectada
        </div>
      </header>

      {/* PROGRESS */}
      <div style={s.progressBar}>
        <div style={{ ...s.progressFill, width: `${progreso}%` }}></div>
      </div>

      {/* BODY */}
      <div style={s.body}>

        {/* PANEL IZQUIERDO */}
        <div style={s.leftPanel}>

          {/* MODOS */}
          <div style={s.panelSection}>
            <div style={s.sectionLabel}>¿Qué necesitas analizar?</div>
            <div style={s.modeGrid}>
              {Object.entries(MODOS).map(([key, m]) => (
                <button key={key} className="modeBtn" style={s.modeBtn(modo===key)} onClick={() => setModo(key)}>
                  <span style={s.modeIcon}>{m.icon}</span>
                  <div style={s.modeName}>{m.nombre}</div>
                  <div style={s.modeDesc}>{["Detecta esperas y rework","Verbo infinitivo + objeto","Identifica puntos de falla","Acciones por plazo","Indicadores de eficiencia","Qué y cómo automatizar"][Object.keys(MODOS).indexOf(key)]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* TEXTAREA */}
          <div style={s.inputWrap}>
            <div style={s.sectionLabel}>Describe tu proceso</div>
            <textarea
              style={s.textarea}
              value={proceso}
              onChange={e => setProceso(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey||e.metaKey) && e.key==="Enter") analizar(); }}
              placeholder={"Escribe aquí cómo funciona el proceso...\n\nEjemplo: El cliente solicita una tarjeta de débito en ventanilla. El cajero verifica los datos en el core bancario..."}
            />
            <button style={s.btnAnalizar(cargando)} onClick={analizar} disabled={cargando}>
              {cargando ? "⏳ Analizando..." : "⚡ Analizar con IA"}
            </button>
          </div>

          {/* EJEMPLOS */}
          <div style={s.examplesBox}>
            <div style={s.exLabel}>Ejemplos rápidos</div>
            {[["tarjeta","Emisión tarjeta de débito"],["avaluo","Avalúo de inmueble"],["credito","Aprobación de crédito"],["casos","Gestión de casos en sucursal"]].map(([k,label]) => (
              <span key={k} className="exItem" style={s.exItem} onClick={() => setProceso(EJEMPLOS[k])}>→ {label}</span>
            ))}
          </div>

        </div>

        {/* PANEL DERECHO */}
        <div style={s.rightPanel}>

          {!mostrarResultado ? (
            <div style={s.emptyState}>
              <svg width="260" height="55" viewBox="0 0 280 60">
                <path className="ecg-path" d="M0,30 L40,30 L55,10 L60,50 L65,15 L70,30 L100,30 L110,5 L115,55 L120,20 L125,30 L160,30 L170,18 L175,42 L180,30 L220,30 L230,8 L235,52 L240,22 L245,30 L280,30"/>
              </svg>
              <div style={s.emptyTitle}>Listo para analizar</div>
              <div style={s.emptySub}>Selecciona el tipo de análisis, describe tu proceso y obtén insights accionables en segundos.</div>
              <div style={s.chipsWrap}>
                {[["🔍 Analizar tarjeta","tarjeta","cuellos"],["🚨 Riesgos en avalúo","avaluo","riesgos"],["⚡ Automatizar casos","casos","automatizar"]].map(([label,ej,m]) => (
                  <span key={label} className="chip" style={s.chip} onClick={() => { setProceso(EJEMPLOS[ej]); setModo(m); }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={s.resultHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={s.resultIcon}>{MODOS[modo].icon}</span>
                  <div>
                    <div style={s.resultName}>{MODOS[modo].nombre}</div>
                    <div style={s.resultSub}>{proceso.substring(0,55)}{proceso.length>55?"...":""}</div>
                  </div>
                </div>
                <button style={s.btnCopiar} onClick={copiar}>
                  {copiado ? "✅ Copiado" : "📋 Copiar resultado"}
                </button>
              </div>

              <div style={s.streamArea} ref={resultRef}>
                <div
                  style={s.streamTxt}
                  dangerouslySetInnerHTML={{ __html: renderMd(resultado) + (cargando ? '<span class="cursor"></span>' : "") }}
                />
              </div>
            </>
          )}

          <div style={s.statusBar}>
            <div style={s.statusDot(cargando)}></div>
            <span>{statusMsg}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
