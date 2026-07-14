import { useState, useEffect, useMemo } from "react";
import {
  FileText, Pill, History, BarChart3, Settings as SettingsIcon,
  Plus, Trash2, Printer, Search, X, ArrowLeft, Pencil, Check
} from "lucide-react";
import { supabase } from "./supabaseClient";

const DEFAULT_SETTINGS = {
  id: "main",
  clinic_name: "Your Clinic Name",
  doctor_name: "Dr. Full Name",
  credentials: "MD — Specialty",
  address: "Clinic address, City",
  phone: "+20 000 000 0000",
  clinic_name_ar: "",
  doctor_name_ar: "",
  address_ar: "",
  use_preprinted_paper: true,
  preprinted_header_mm: 40,
};

function uid(prefix) {
  return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthKey(dateStr) { return (dateStr || "").slice(0, 7); }
function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}
function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("new");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [meds, setMeds] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [toast, setToast] = useState("");
  const [printingRx, setPrintingRx] = useState(null);
  const [editingRx, setEditingRx] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setError("");
    try {
      const [{ data: s, error: sErr }, { data: m, error: mErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from("settings").select("*").eq("id", "main").maybeSingle(),
        supabase.from("meds").select("*").order("name"),
        supabase.from("prescriptions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      if (sErr || mErr || pErr) throw (sErr || mErr || pErr);
      setSettings(s || DEFAULT_SETTINGS);
      setMeds(m || []);
      setPrescriptions(p || []);
      setReady(true);
    } catch (e) {
      setError("Could not connect to the database. Check your Supabase setup in .env");
      setReady(true);
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function saveSettings(next) {
    const { error } = await supabase.from("settings").upsert({ ...next, id: "main" });
    if (error) { showToast("Could not save settings"); return; }
    setSettings(next);
    showToast("Settings saved");
  }

  async function addMed(med) {
    const { data, error } = await supabase.from("meds").insert(med).select().single();
    if (error) { showToast("Could not add medication"); return; }
    setMeds([...meds, data].sort((a, b) => a.name.localeCompare(b.name)));
  }
  async function editMed(id, patch) {
    const { data, error } = await supabase.from("meds").update(patch).eq("id", id).select().single();
    if (error) { showToast("Could not update medication"); return; }
    setMeds(meds.map((m) => (m.id === id ? data : m)));
  }
  async function deleteMed(id) {
    const { error } = await supabase.from("meds").delete().eq("id", id);
    if (error) { showToast("Could not delete medication"); return; }
    setMeds(meds.filter((m) => m.id !== id));
  }

  async function issuePrescription(rx) {
    const { data, error } = await supabase.from("prescriptions").insert(rx).select().single();
    if (error) { showToast("Could not save prescription"); return; }
    setPrescriptions([data, ...prescriptions]);
    setPrintingRx(data);
    showToast("Prescription issued");
  }
  async function deletePrescription(id) {
    const { error } = await supabase.from("prescriptions").delete().eq("id", id);
    if (error) { showToast("Could not delete prescription"); return; }
    setPrescriptions(prescriptions.filter((r) => r.id !== id));
    showToast("Prescription deleted");
  }
  async function updatePrescription(id, patch) {
    const { data, error } = await supabase.from("prescriptions").update(patch).eq("id", id).select().single();
    if (error) { showToast("Could not update prescription"); return; }
    setPrescriptions(prescriptions.map((r) => (r.id === id ? data : r)));
    setEditingRx(null);
    showToast("Prescription updated");
  }

  const navItems = [
    { id: "new", label: "New prescription", icon: FileText },
    { id: "history", label: "History", icon: History },
    { id: "meds", label: "Medications", icon: Pill },
    { id: "stats", label: "Statistics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="rxapp">
      <GlobalStyle />
      <div className="rx-sidebar no-print">
        <div className="rx-mark">℞</div>
        <div className="rx-sidebar-sub">{settings.clinic_name}</div>
        {navItems.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.id} className={"rx-navbtn" + (view === n.id ? " active" : "")} onClick={() => setView(n.id)}>
              <Icon size={15} /> {n.label}
            </button>
          );
        })}
      </div>

      <div className="rx-main no-print">
        {!ready ? (
          <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Loading…</div>
        ) : error ? (
          <div className="rx-card" style={{ borderColor: "var(--danger)", color: "var(--danger)", fontSize: 13 }}>{error}</div>
        ) : (
          <>
            {view === "new" && <NewPrescriptionView meds={meds} onIssue={issuePrescription} />}
            {view === "history" && (
              <HistoryView prescriptions={prescriptions} onReprint={(rx) => setPrintingRx(rx)} onDelete={deletePrescription} onEdit={(rx) => setEditingRx(rx)} />
            )}
            {view === "meds" && <MedsView meds={meds} onAdd={addMed} onEdit={editMed} onDelete={deleteMed} />}
            {view === "stats" && <StatsView prescriptions={prescriptions} />}
            {view === "settings" && <SettingsView settings={settings} onSave={saveSettings} />}
          </>
        )}
        {toast && <div className="rx-toast">{toast}</div>}
      </div>

      {printingRx && <PrintOverlay rx={printingRx} settings={settings} onClose={() => setPrintingRx(null)} />}
      {editingRx && (
        <EditPrescriptionModal
          rx={editingRx}
          meds={meds}
          onSave={(patch) => updatePrescription(editingRx.id, patch)}
          onClose={() => setEditingRx(null)}
        />
      )}
    </div>
  );
}

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Arabic:wght@400;500;600&display=swap');
      html, body, #root { height: 100%; }
      .rxapp {
        --paper: #F6F7F5; --panel: #FFFFFF; --ink: #16231F; --ink-soft: #4B5955;
        --teal: #0B5E56; --teal-deep: #073F3A; --amber: #A8791F; --line: #DDE3E0; --danger: #A23B2E;
        font-family: 'Inter', system-ui, sans-serif; color: var(--ink); background: var(--paper);
        display: flex; min-height: 100vh;
      }
      .rxapp * { box-sizing: border-box; }
      .rx-serif { font-family: 'Lora', serif; }
      .rx-mono { font-family: 'JetBrains Mono', monospace; }
      .rx-sidebar { width: 210px; background: var(--teal-deep); color: #E7F1EE; padding: 20px 14px; flex-shrink: 0; }
      .rx-mark { font-family: 'Lora', serif; font-style: italic; font-weight: 600; font-size: 26px; color: #E7F1EE; margin-bottom: 4px; }
      .rx-sidebar-sub { font-size: 11px; color: #9FC2BA; margin-bottom: 22px; letter-spacing: 0.02em; }
      .rx-navbtn { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 9px 10px; border-radius: 8px; border: none; background: transparent; color: #CFE3DE; font-size: 13.5px; font-family: 'Inter', sans-serif; cursor: pointer; margin-bottom: 2px; }
      .rx-navbtn:hover { background: rgba(255,255,255,0.06); }
      .rx-navbtn.active { background: var(--teal); color: #fff; }
      .rx-main { flex: 1; padding: 26px 30px; }
      .rx-h1 { font-family: 'Lora', serif; font-size: 21px; font-weight: 600; margin: 0 0 4px; }
      .rx-sub { color: var(--ink-soft); font-size: 13px; margin: 0 0 20px; }
      .rx-card { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 16px 18px; }
      .rx-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
      .rx-field label { font-size: 11.5px; color: var(--ink-soft); font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
      .rx-field input, .rx-field select, .rx-field textarea { font-family: 'Inter', sans-serif; font-size: 13.5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--ink); }
      .rx-field input:focus, .rx-field select:focus, .rx-field textarea:focus { outline: 2px solid var(--teal); outline-offset: 0; border-color: var(--teal); }
      .rx-btn { display: inline-flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 7px; border: 1px solid var(--line); background: #fff; color: var(--ink); cursor: pointer; }
      .rx-btn:hover { border-color: var(--teal); }
      .rx-btn.primary { background: var(--teal); color: #fff; border-color: var(--teal); }
      .rx-btn.primary:hover { background: var(--teal-deep); }
      .rx-btn.ghost { border-color: transparent; background: transparent; }
      .rx-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .rx-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: var(--ink-soft); padding: 8px 10px; border-bottom: 1px solid var(--line); }
      .rx-table td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
      .rx-toast { position: fixed; bottom: 16px; right: 16px; background: var(--ink); color: #fff; padding: 8px 14px; border-radius: 8px; font-size: 12.5px; z-index: 80; }
      .rx-bar-track { background: #ECEFED; border-radius: 4px; height: 8px; width: 100%; overflow: hidden; }
      .rx-bar-fill { background: var(--teal); height: 100%; border-radius: 4px; }
      .print-only { display: none; }
      @media print {
        body * { visibility: hidden !important; }
        .print-only, .print-only * { visibility: visible !important; }
        .print-only { display: block !important; position: absolute; top: 0; left: 0; width: 100%; }
        .no-print { display: none !important; }
      }
      @media (max-width: 720px) {
        .rxapp { flex-direction: column; }
        .rx-sidebar { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 14px; flex-wrap: wrap; }
        .rx-mark, .rx-sidebar-sub { display: none; }
        .rx-navbtn { width: auto; }
      }
    `}</style>
  );
}

function NewPrescriptionView({ meds, onIssue }) {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientId, setPatientId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  function addItem(item) { setItems([...items, { ...item, uid: uid("it") }]); setPickerOpen(false); }
  function updateItem(uidVal, patch) { setItems(items.map((it) => (it.uid === uidVal ? { ...it, ...patch } : it))); }
  function removeItem(uidVal) { setItems(items.filter((it) => it.uid !== uidVal)); }
  function reset() { setPatientName(""); setPatientAge(""); setPatientGender(""); setPatientId(""); setDiagnosis(""); setDate(todayISO()); setNotes(""); setItems([]); }

  const canIssue = patientName.trim().length > 0 && items.length > 0;

  return (
    <div>
      <h1 className="rx-h1">New prescription</h1>
      <p className="rx-sub">Fill in patient details and add medications, then issue and print.</p>

      <div className="rx-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12 }}>
          <div className="rx-field"><label>Patient name</label><input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" /></div>
          <div className="rx-field"><label>Age</label><input value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="e.g. 42" /></div>
          <div className="rx-field"><label>Gender</label>
            <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
              <option value="">—</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </div>
          <div className="rx-field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginTop: 4 }}>
          <div className="rx-field"><label>Patient ID (OpenEMR)</label><input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g. 10432" /></div>
          <div className="rx-field"><label>Diagnosis</label><input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Rheumatoid arthritis" /></div>
        </div>
      </div>

      <div className="rx-card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Medications</div>
          <button className="rx-btn" onClick={() => setPickerOpen(true)}><Plus size={14} /> Add medication</button>
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "14px 0" }}>No medications added yet.</div>
        ) : (
          items.map((it, idx) => (
            <div key={it.uid} style={{ borderTop: idx > 0 ? "1px solid var(--line)" : "none", paddingTop: idx > 0 ? 12 : 0, marginTop: idx > 0 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{idx + 1}. {it.name} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({it.strength})</span></div>
                <button className="rx-btn ghost" onClick={() => removeItem(it.uid)}><Trash2 size={14} color="var(--danger)" /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 8, marginTop: 6 }}>
                <input value={it.dose} onChange={(e) => updateItem(it.uid, { dose: e.target.value })} placeholder="Dose" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.frequency} onChange={(e) => updateItem(it.uid, { frequency: e.target.value })} placeholder="Frequency" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.duration} onChange={(e) => updateItem(it.uid, { duration: e.target.value })} placeholder="Duration" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.instructions || ""} onChange={(e) => updateItem(it.uid, { instructions: e.target.value })} placeholder="Special instructions (optional)" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
              </div>
              <div style={{ marginTop: 6 }}>
                <input dir="rtl" value={it.instructions_ar || ""} onChange={(e) => updateItem(it.uid, { instructions_ar: e.target.value })} placeholder="تعليمات بالعربي (اختياري)"
                  style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5, width: "100%" }} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rx-card" style={{ marginBottom: 16 }}>
        <div className="rx-field" style={{ marginBottom: 0 }}>
          <label>Notes for patient (optional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Follow up in 2 weeks" />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="rx-btn primary" disabled={!canIssue} style={{ opacity: canIssue ? 1 : 0.5, cursor: canIssue ? "pointer" : "not-allowed" }}
          onClick={() => {
            const rx = {
              date, patient_name: patientName.trim(), patient_age: patientAge, patient_gender: patientGender,
              patient_id: patientId, diagnosis,
              items: items.map(({ uid: _u, ...rest }) => rest), notes,
            };
            onIssue(rx);
            reset();
          }}>
          <Printer size={14} /> Issue &amp; print
        </button>
        <button className="rx-btn ghost" onClick={reset}>Clear form</button>
      </div>

      {pickerOpen && <MedPicker meds={meds} onPick={addItem} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function EditPrescriptionModal({ rx, meds, onSave, onClose }) {
  const [patientName, setPatientName] = useState(rx.patient_name || "");
  const [patientAge, setPatientAge] = useState(rx.patient_age || "");
  const [patientGender, setPatientGender] = useState(rx.patient_gender || "");
  const [patientId, setPatientId] = useState(rx.patient_id || "");
  const [diagnosis, setDiagnosis] = useState(rx.diagnosis || "");
  const [date, setDate] = useState(rx.date);
  const [notes, setNotes] = useState(rx.notes || "");
  const [items, setItems] = useState((rx.items || []).map((it) => ({ ...it, uid: uid("it") })));
  const [pickerOpen, setPickerOpen] = useState(false);

  function addItem(item) { setItems([...items, { ...item, uid: uid("it") }]); setPickerOpen(false); }
  function updateItem(uidVal, patch) { setItems(items.map((it) => (it.uid === uidVal ? { ...it, ...patch } : it))); }
  function removeItem(uidVal) { setItems(items.filter((it) => it.uid !== uidVal)); }

  const canSave = patientName.trim().length > 0 && items.length > 0;

  return (
    <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(22,35,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
      <div style={{ background: "#fff", width: 640, maxWidth: "92vw", maxHeight: "88vh", overflowY: "auto", borderRadius: 10, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 500, fontSize: 15 }}>Edit prescription</div>
          <button className="rx-btn ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div className="rx-field"><label>Patient name</label><input value={patientName} onChange={(e) => setPatientName(e.target.value)} /></div>
          <div className="rx-field"><label>Age</label><input value={patientAge} onChange={(e) => setPatientAge(e.target.value)} /></div>
          <div className="rx-field"><label>Gender</label>
            <select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
              <option value="">—</option><option value="Male">Male</option><option value="Female">Female</option>
            </select>
          </div>
          <div className="rx-field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 14 }}>
          <div className="rx-field"><label>Patient ID</label><input value={patientId} onChange={(e) => setPatientId(e.target.value)} /></div>
          <div className="rx-field"><label>Diagnosis</label><input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Medications</div>
          <button className="rx-btn" onClick={() => setPickerOpen(true)}><Plus size={14} /> Add medication</button>
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-soft)", padding: "10px 0" }}>No medications added yet.</div>
        ) : (
          items.map((it, idx) => (
            <div key={it.uid} style={{ borderTop: idx > 0 ? "1px solid var(--line)" : "none", paddingTop: idx > 0 ? 12 : 0, marginTop: idx > 0 ? 12 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{idx + 1}. {it.name} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>({it.strength})</span></div>
                <button className="rx-btn ghost" onClick={() => removeItem(it.uid)}><Trash2 size={14} color="var(--danger)" /></button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr", gap: 8, marginTop: 6 }}>
                <input value={it.dose} onChange={(e) => updateItem(it.uid, { dose: e.target.value })} placeholder="Dose" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.frequency} onChange={(e) => updateItem(it.uid, { frequency: e.target.value })} placeholder="Frequency" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.duration} onChange={(e) => updateItem(it.uid, { duration: e.target.value })} placeholder="Duration" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
                <input value={it.instructions || ""} onChange={(e) => updateItem(it.uid, { instructions: e.target.value })} placeholder="Special instructions (optional)" style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5 }} />
              </div>
              <div style={{ marginTop: 6 }}>
                <input dir="rtl" value={it.instructions_ar || ""} onChange={(e) => updateItem(it.uid, { instructions_ar: e.target.value })} placeholder="تعليمات بالعربي (اختياري)"
                  style={{ fontSize: 12.5, padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 5, width: "100%" }} />
              </div>
            </div>
          ))
        )}

        <div className="rx-field" style={{ marginTop: 14 }}>
          <label>Notes for patient (optional)</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            className="rx-btn primary"
            disabled={!canSave}
            style={{ opacity: canSave ? 1 : 0.5, cursor: canSave ? "pointer" : "not-allowed" }}
            onClick={() => onSave({
              date, patient_name: patientName.trim(), patient_age: patientAge, patient_gender: patientGender,
              patient_id: patientId, diagnosis, items: items.map(({ uid: _u, ...rest }) => rest), notes,
            })}
          >
            <Check size={14} /> Save changes
          </button>
          <button className="rx-btn ghost" onClick={onClose}>Cancel</button>
        </div>

        {pickerOpen && <MedPicker meds={meds} onPick={addItem} onClose={() => setPickerOpen(false)} />}
      </div>
    </div>
  );
}

function MedPicker({ meds, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customStrength, setCustomStrength] = useState("");
  const [customForm, setCustomForm] = useState("");
  const filtered = meds.filter((m) => (m.name + " " + (m.generic_name || "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,31,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div className="rx-card" style={{ width: 460, maxHeight: 480, overflowY: "auto", background: "#fff" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>Add medication</div>
          <button className="rx-btn ghost" onClick={onClose}><X size={15} /></button>
        </div>
        {!custom ? (
          <>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "var(--ink-soft)" }} />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medications…" style={{ width: "100%", padding: "8px 8px 8px 30px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
            </div>
            {filtered.map((m) => (
              <div key={m.id} onClick={() => onPick({ med_id: m.id, name: m.name, strength: m.strength, form: m.form, dose: m.dose, frequency: m.frequency, duration: m.duration, instructions: "", instructions_ar: "" })}
                style={{ padding: "8px 6px", borderBottom: "1px solid var(--line)", cursor: "pointer", fontSize: 13 }}>
                <div style={{ fontWeight: 500 }}>{m.name} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>{m.strength}</span></div>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{m.generic_name} · {m.dose}, {m.frequency}</div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ fontSize: 12.5, color: "var(--ink-soft)", padding: "10px 0" }}>No matches.</div>}
            <button className="rx-btn ghost" style={{ marginTop: 10 }} onClick={() => setCustom(true)}><Plus size={13} /> Add a one-off medication not in the list</button>
          </>
        ) : (
          <>
            <div className="rx-field"><label>Name</label><input value={customName} onChange={(e) => setCustomName(e.target.value)} /></div>
            <div className="rx-field"><label>Strength</label><input value={customStrength} onChange={(e) => setCustomStrength(e.target.value)} placeholder="e.g. 250 mg" /></div>
            <div className="rx-field"><label>Form</label><input value={customForm} onChange={(e) => setCustomForm(e.target.value)} placeholder="e.g. Tablet" /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="rx-btn primary" disabled={!customName.trim()} onClick={() => onPick({ med_id: null, name: customName.trim(), strength: customStrength, form: customForm, dose: "", frequency: "", duration: "", instructions: "", instructions_ar: "" })}>Add</button>
              <button className="rx-btn ghost" onClick={() => setCustom(false)}>Back to list</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HistoryView({ prescriptions, onReprint, onDelete, onEdit }) {
  const [q, setQ] = useState("");
  const filtered = prescriptions.filter((r) =>
    r.patient_name.toLowerCase().includes(q.toLowerCase()) || (r.patient_id || "").toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <h1 className="rx-h1">History</h1>
      <p className="rx-sub">All issued prescriptions, most recent first.</p>
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 320 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "var(--ink-soft)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by patient name or ID…" style={{ width: "100%", padding: "8px 8px 8px 30px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
      </div>
      {filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>No prescriptions found.</div>
      ) : (
        <table className="rx-table">
          <thead><tr><th>Date</th><th>Patient</th><th>ID</th><th>Medications</th><th></th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="rx-mono" style={{ whiteSpace: "nowrap" }}>{formatDate(r.date)}</td>
                <td>{r.patient_name}{r.patient_age ? <span style={{ color: "var(--ink-soft)" }}> · {r.patient_age}y</span> : ""}</td>
                <td className="rx-mono" style={{ color: "var(--ink-soft)" }}>{r.patient_id || "—"}</td>
                <td>{r.items.map((it) => it.name).join(", ")}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="rx-btn ghost" onClick={() => onEdit(r)}><Pencil size={13} /></button>
                  <button className="rx-btn ghost" onClick={() => onReprint(r)}><Printer size={13} /></button>
                  <button className="rx-btn ghost" onClick={() => { if (confirm("Delete this prescription record?")) onDelete(r.id); }}><Trash2 size={13} color="var(--danger)" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function MedsView({ meds, onAdd, onEdit, onDelete }) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const blank = { name: "", generic_name: "", form: "", strength: "", dose: "", frequency: "", duration: "" };
  const [draft, setDraft] = useState(blank);
  const filtered = meds.filter((m) => (m.name + " " + (m.generic_name || "")).toLowerCase().includes(q.toLowerCase()));

  function startEdit(m) { setEditingId(m.id); setDraft(m); setAdding(false); }
  function saveEdit() { const { id, ...patch } = draft; onEdit(editingId, patch); setEditingId(null); setDraft(blank); }
  function saveNew() { onAdd(draft); setAdding(false); setDraft(blank); }

  return (
    <div>
      <h1 className="rx-h1">Medications</h1>
      <p className="rx-sub">Your medication database. Edit defaults here — they're used to pre-fill new prescriptions.</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ position: "relative", maxWidth: 300, flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 9, top: 10, color: "var(--ink-soft)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medications…" style={{ width: "100%", padding: "8px 8px 8px 30px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 13 }} />
        </div>
        <button className="rx-btn" onClick={() => { setAdding(true); setEditingId(null); setDraft(blank); }}><Plus size={14} /> Add medication</button>
      </div>

      {adding && (
        <div className="rx-card" style={{ marginBottom: 14 }}>
          <MedForm draft={draft} setDraft={setDraft} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="rx-btn primary" disabled={!draft.name.trim()} onClick={saveNew}><Check size={13} /> Save</button>
            <button className="rx-btn ghost" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <table className="rx-table">
        <thead><tr><th>Name</th><th>Strength</th><th>Dose · frequency · duration</th><th></th></tr></thead>
        <tbody>
          {filtered.map((m) => (
            editingId === m.id ? (
              <tr key={m.id}><td colSpan={4}>
                <div className="rx-card" style={{ margin: "6px 0" }}>
                  <MedForm draft={draft} setDraft={setDraft} />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button className="rx-btn primary" onClick={saveEdit}><Check size={13} /> Save</button>
                    <button className="rx-btn ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              </td></tr>
            ) : (
              <tr key={m.id}>
                <td><div style={{ fontWeight: 500 }}>{m.name}</div><div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{m.generic_name}</div></td>
                <td>{m.strength}</td>
                <td style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{m.dose}, {m.frequency}, {m.duration}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="rx-btn ghost" onClick={() => startEdit(m)}><Pencil size={13} /></button>
                  <button className="rx-btn ghost" onClick={() => { if (confirm("Remove this medication from the database?")) onDelete(m.id); }}><Trash2 size={13} color="var(--danger)" /></button>
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MedForm({ draft, setDraft }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
      <div className="rx-field"><label>Name</label><input value={draft.name} onChange={set("name")} /></div>
      <div className="rx-field"><label>Generic name</label><input value={draft.generic_name} onChange={set("generic_name")} /></div>
      <div className="rx-field"><label>Form</label><input value={draft.form} onChange={set("form")} placeholder="Tablet, syrup…" /></div>
      <div className="rx-field"><label>Strength</label><input value={draft.strength} onChange={set("strength")} placeholder="e.g. 500 mg" /></div>
      <div className="rx-field"><label>Default dose</label><input value={draft.dose} onChange={set("dose")} /></div>
      <div className="rx-field"><label>Default frequency</label><input value={draft.frequency} onChange={set("frequency")} /></div>
      <div className="rx-field"><label>Default duration</label><input value={draft.duration} onChange={set("duration")} /></div>
    </div>
  );
}

function StatsView({ prescriptions }) {
  const months = useMemo(() => {
    const set = new Set(prescriptions.map((r) => monthKey(r.date)));
    set.add(monthKey(todayISO()));
    return Array.from(set).sort().reverse();
  }, [prescriptions]);
  const [month, setMonth] = useState(months[0] || monthKey(todayISO()));
  const [medQuery, setMedQuery] = useState("");

  const inMonth = prescriptions.filter((r) => monthKey(r.date) === month);
  const patientSet = new Set(inMonth.map((r) => r.patient_name.trim().toLowerCase()));
  const medCounts = {};
  inMonth.forEach((r) => r.items.forEach((it) => { medCounts[it.name] = (medCounts[it.name] || 0) + 1; }));
  const sortedMeds = Object.entries(medCounts)
    .filter(([name]) => name.toLowerCase().includes(medQuery.toLowerCase()))
    .sort((a, b) => b[1] - a[1]);
  const maxCount = sortedMeds.length ? sortedMeds[0][1] : 1;
  const totalItems = inMonth.reduce((s, r) => s + r.items.length, 0);

  return (
    <div>
      <h1 className="rx-h1">Statistics</h1>
      <p className="rx-sub">Monthly summary of prescriptions issued.</p>
      <div className="rx-field" style={{ maxWidth: 220, marginBottom: 18 }}>
        <label>Month</label>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="rx-card">
          <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Prescriptions issued</div>
          <div className="rx-serif" style={{ fontSize: 26, marginTop: 4 }}>{inMonth.length}</div>
        </div>
        <div className="rx-card">
          <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Unique patients</div>
          <div className="rx-serif" style={{ fontSize: 26, marginTop: 4 }}>{patientSet.size}</div>
        </div>
        <div className="rx-card">
          <div style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.03em" }}>Medication lines</div>
          <div className="rx-serif" style={{ fontSize: 26, marginTop: 4 }}>{totalItems}</div>
        </div>
      </div>
      <div className="rx-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Medications issued this month</div>
          <div style={{ position: "relative", maxWidth: 220, flex: 1 }}>
            <Search size={13} style={{ position: "absolute", left: 8, top: 8, color: "var(--ink-soft)" }} />
            <input value={medQuery} onChange={(e) => setMedQuery(e.target.value)} placeholder="Search medication…" style={{ width: "100%", padding: "6px 8px 6px 26px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 12.5 }} />
          </div>
        </div>
        {sortedMeds.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>No prescriptions recorded for this month.</div>
        ) : (
          sortedMeds.map(([name, count]) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                <span>{name}</span><span className="rx-mono" style={{ color: "var(--ink-soft)" }}>{count}</span>
              </div>
              <div className="rx-bar-track"><div className="rx-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave }) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const setNum = (k) => (e) => setDraft({ ...draft, [k]: Number(e.target.value) });
  const setBool = (k) => (e) => setDraft({ ...draft, [k]: e.target.checked });
  return (
    <div>
      <h1 className="rx-h1">Settings</h1>
      <p className="rx-sub">This information is used on printed prescriptions.</p>

      <div className="rx-card" style={{ maxWidth: 460 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Printing paper</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "10px 0" }}>
          <input type="checkbox" checked={!!draft.use_preprinted_paper} onChange={setBool("use_preprinted_paper")} />
          I print on paper with a pre-printed letterhead / logo
        </label>
        {draft.use_preprinted_paper ? (
          <div className="rx-field" style={{ maxWidth: 220 }}>
            <label>Blank space to leave at top (mm)</label>
            <input type="number" min="0" max="120" value={draft.preprinted_header_mm ?? 40} onChange={setNum("preprinted_header_mm")} />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            The clinic details below will be printed as a header at the top of every prescription.
          </div>
        )}
      </div>

      <div className="rx-card" style={{ maxWidth: 460, marginTop: 14, opacity: draft.use_preprinted_paper ? 0.55 : 1 }}>
        <div className="rx-field"><label>Clinic name</label><input value={draft.clinic_name} onChange={set("clinic_name")} /></div>
        <div className="rx-field"><label>Doctor name</label><input value={draft.doctor_name} onChange={set("doctor_name")} /></div>
        <div className="rx-field"><label>Credentials / specialty</label><input value={draft.credentials} onChange={set("credentials")} /></div>
        <div className="rx-field"><label>Address</label><input value={draft.address} onChange={set("address")} /></div>
        <div className="rx-field"><label>Phone</label><input value={draft.phone} onChange={set("phone")} /></div>
        {draft.use_preprinted_paper && (
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Not printed while pre-printed paper is on — kept here for your records.</div>
        )}
      </div>

      <div className="rx-card" style={{ maxWidth: 460, marginTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Arabic instructions (optional)</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Only used if your pre-printed paper doesn't already have an Arabic clinic name — appears next to the English clinic name if filled in.
        </div>
        <div className="rx-field"><label>Clinic name (Arabic)</label><input dir="rtl" value={draft.clinic_name_ar || ""} onChange={set("clinic_name_ar")} placeholder="اسم العيادة" /></div>
        <div className="rx-field"><label>Doctor name (Arabic)</label><input dir="rtl" value={draft.doctor_name_ar || ""} onChange={set("doctor_name_ar")} placeholder="اسم الطبيب" /></div>
        <div className="rx-field"><label>Address (Arabic)</label><input dir="rtl" value={draft.address_ar || ""} onChange={set("address_ar")} placeholder="العنوان" /></div>
      </div>

      <button className="rx-btn primary" style={{ marginTop: 14 }} onClick={() => onSave(draft)}><Check size={13} /> Save settings</button>
    </div>
  );
}

function PrintOverlay({ rx, settings, onClose }) {
  return (
    <>
      <div className="no-print" style={{ position: "fixed", inset: 0, background: "rgba(22,35,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
        <div style={{ background: "#fff", width: 620, maxWidth: "92vw", maxHeight: "85vh", overflowY: "auto", borderRadius: 10, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <button className="rx-btn ghost" onClick={onClose}><ArrowLeft size={14} /> Back</button>
            <button className="rx-btn primary" onClick={() => window.print()}><Printer size={14} /> Print</button>
          </div>
          <RxPad rx={rx} settings={settings} />
        </div>
      </div>
      <div className="print-only"><RxPad rx={rx} settings={settings} /></div>
    </>
  );
}

function BiLabel({ en, ar }) {
  return (
    <span>
      {en}
      {ar && (
        <>
          {" / "}
          <span dir="rtl" style={{ unicodeBidi: "isolate", fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>{ar}</span>
        </>
      )}
    </span>
  );
}

const NOTES_LINE_COUNT = 14;

function RxPad({ rx, settings }) {
  const hasArabic = !!(settings.clinic_name_ar || settings.doctor_name_ar || settings.address_ar);
  const usePreprinted = !!settings.use_preprinted_paper;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#16231F", padding: "20px 28px", position: "relative" }}>
      {usePreprinted ? (
        <div style={{ height: `${settings.preprinted_header_mm ?? 40}mm` }} />
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0B5E56", paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: 22, fontWeight: 600, color: "#073F3A" }}>{settings.clinic_name}</div>
            {settings.clinic_name_ar && (
              <div dir="rtl" style={{ fontFamily: "'Noto Sans Arabic', 'Lora', serif", fontSize: 18, fontWeight: 600, color: "#073F3A" }}>{settings.clinic_name_ar}</div>
            )}
            <div style={{ fontSize: 12.5, color: "#4B5955", marginTop: 2 }}>
              {settings.doctor_name} · {settings.credentials}
              {settings.doctor_name_ar && (
                <>
                  {" · "}
                  <span dir="rtl" style={{ unicodeBidi: "isolate", fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>{settings.doctor_name_ar}</span>
                </>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#4B5955", marginTop: 2 }}>
              {settings.address} · {settings.phone}
              {settings.address_ar && (
                <>
                  {" · "}
                  <span dir="rtl" style={{ unicodeBidi: "isolate", fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>{settings.address_ar}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontWeight: 600, fontSize: 34, color: "#0B5E56" }}>℞</div>
        </div>
      )}

      {usePreprinted && (settings.clinic_name_ar || settings.doctor_name_ar || settings.address_ar) && (
        <div dir="rtl" style={{ textAlign: "right", fontSize: 11, color: "#4B5955", marginBottom: 10, fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>
          {[settings.clinic_name_ar, settings.doctor_name_ar, settings.address_ar].filter(Boolean).join(" · ")}
        </div>
      )}

      <div style={{ position: "absolute", top: 14, insetInlineEnd: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontWeight: 600, fontSize: 16, color: "#0B5E56" }}>℞</span>
        {rx.patient_id && <span className="rx-mono" style={{ fontSize: 12, color: "#4B5955" }}>{rx.patient_id}</span>}
      </div>

      {rx.diagnosis && (
        <div style={{ fontSize: 13, marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #DDE3E0" }}>
          <strong><BiLabel en="Diagnosis" ar={hasArabic ? "التشخيص" : ""} />:</strong> {rx.diagnosis}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 0 }}>
        <div style={{ borderInlineEnd: "1px solid #16231F", paddingInlineEnd: 18 }}>
          {rx.items.map((it, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontWeight: 600, fontSize: 18, color: "#0B5E56" }}>℞</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {it.name}{it.strength ? ` ${it.strength}` : ""}{it.form ? ` (${it.form})` : ""}
                </span>
              </div>
              {(it.dose || it.frequency || it.duration || it.instructions) && (
                <div style={{ fontSize: 12, color: "#4B5955", marginInlineStart: 26, marginTop: 2 }}>
                  {[it.dose, it.frequency, it.duration].filter(Boolean).join(", ")}
                  {it.instructions ? ` — ${it.instructions}` : ""}
                </div>
              )}
              {it.instructions_ar && (
                <div dir="rtl" style={{ fontSize: 12, color: "#4B5955", marginInlineStart: 26, marginTop: 2, fontFamily: "'Noto Sans Arabic', 'Inter', sans-serif" }}>
                  {it.instructions_ar}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ paddingInlineStart: "calc(14px + 15mm)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.03em", color: "#4B5955", marginBottom: 8 }}>
            <BiLabel en="Notes" ar={hasArabic ? "ملاحظات" : ""} />
          </div>
          {rx.notes && <div style={{ fontSize: 11.5, marginBottom: 8, lineHeight: 1.5 }}>{rx.notes}</div>}
          {Array.from({ length: NOTES_LINE_COUNT }).map((_, i) => (
            <div key={i} style={{ borderBottom: "1px solid #DDE3E0", height: 20 }} />
          ))}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #16231F", width: 180, marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: "#4B5955" }}><BiLabel en="Doctor's signature" ar={hasArabic ? "توقيع الطبيب" : ""} /></div>
        </div>
      </div>
    </div>
  );
}
