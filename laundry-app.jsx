import { useState, useEffect, useRef } from "react";

const MACHINES = [
  { id: "W1", type: "Washer", location: "Ground Floor", status: "available", duration: 45 },
  { id: "W2", type: "Washer", location: "Ground Floor", status: "in-use", timeLeft: 18, duration: 45 },
  { id: "W3", type: "Washer", location: "Ground Floor", status: "available", duration: 45 },
  { id: "W4", type: "Washer", location: "Level 1",      status: "in-use", timeLeft: 32, duration: 45 },
  { id: "W5", type: "Washer", location: "Level 1",      status: "available", duration: 45 },
  { id: "W6", type: "Washer", location: "Level 2",      status: "maintenance", duration: 45 },
  { id: "D1", type: "Dryer",  location: "Ground Floor", status: "available", duration: 60 },
  { id: "D2", type: "Dryer",  location: "Ground Floor", status: "in-use", timeLeft: 7,  duration: 60 },
  { id: "D3", type: "Dryer",  location: "Level 1",      status: "available", duration: 60 },
  { id: "D4", type: "Dryer",  location: "Level 1",      status: "in-use", timeLeft: 44, duration: 60 },
  { id: "D5", type: "Dryer",  location: "Level 2",      status: "available", duration: 60 },
  { id: "D6", type: "Dryer",  location: "Level 2",      status: "available", duration: 60 },
];

const GRACE_MINS = 10;

const WashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
    <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
    <path d="M8 8c1-1 2.5-1.5 4-1"/>
  </svg>
);
const DryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
    <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/>
    <circle cx="6.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
);
const BellIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const InstaIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>;
const SMSIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const CheckIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>;
const XIcon     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

function ProgressRing({ pct, size=48, stroke=3, color="#7FFFD4" }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 1s linear" }}/>
    </svg>
  );
}

function GraceRing({ secsLeft, total }) {
  const pct = (secsLeft/total)*100;
  const color = secsLeft<120?"#ff6464":secsLeft<300?"#FFB347":"#7FFFD4";
  const mins = Math.floor(secsLeft/60), secs = secsLeft%60;
  return (
    <div style={{ position:"relative", width:64, height:64, flexShrink:0 }}>
      <ProgressRing pct={pct} size={64} stroke={4} color={color}/>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:500, color, lineHeight:1 }}>
          {mins}:{String(secs).padStart(2,"0")}
        </span>
      </div>
    </div>
  );
}

const Toast = ({ msg, type="ok", onClose }) => (
  <div style={{
    position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)",
    background:"#1a2235", border:`1px solid ${type==="warn"?"rgba(255,100,100,0.4)":"rgba(127,255,212,0.3)"}`,
    color:"#e0f7f1", padding:"12px 20px", borderRadius:12, fontSize:13,
    fontFamily:"'Space Grotesk',sans-serif", display:"flex", alignItems:"center", gap:10,
    zIndex:999, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", animation:"slideUp 0.3s ease", maxWidth:"90vw",
  }}>
    <span style={{ color:type==="warn"?"#ff6464":"#7FFFD4" }}>{type==="warn"?<XIcon/>:<CheckIcon/>}</span>
    <span>{msg}</span>
    <button onClick={onClose} style={{ background:"none", border:"none", color:"#7FFFD4", cursor:"pointer", marginLeft:6 }}><XIcon/></button>
  </div>
);

export default function LaundryApp() {
  const [machines, setMachines]     = useState(MACHINES.map(m=>({...m,timeLeft:m.timeLeft||null,bookedBy:null})));
  const [filter, setFilter]         = useState("All");
  const [selectedMachine, setSelected] = useState(null);
  const [step, setStep]             = useState("list");
  const [form, setForm]             = useState({ name:"", phone:"", insta:"", smsAlert:true, instaAlert:false });
  const [payMethod, setPayMethod]   = useState(null);
  const [payProcessing, setPaying]  = useState(false);
  const [myBookings, setMyBookings] = useState([]);
  const [toast, setToast]           = useState(null);
  const [activeTab, setActiveTab]   = useState("machines");
  const graceTimers = useRef({});

  useEffect(() => {
    const t = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status==="in-use" && m.timeLeft>0) {
          const n = m.timeLeft - 1/60;
          return n<=0 ? {...m, timeLeft:0, status:"available"} : {...m, timeLeft:n};
        }
        return m;
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const startGraceTimer = (bookingId, machineId, paidWith) => {
    let secsLeft = GRACE_MINS*60;
    const interval = setInterval(() => {
      secsLeft -= 1;
      setMyBookings(prev => prev.map(b => b.id===bookingId ? {...b, graceSecsLeft:secsLeft} : b));
      if (secsLeft<=0) {
        clearInterval(interval);
        delete graceTimers.current[bookingId];
        setMachines(prev => prev.map(m => m.id===machineId ? {...m, status:"available", timeLeft:null, bookedBy:null} : m));
        setMyBookings(prev => prev.map(b => b.id===bookingId ? {...b, status:"expired", graceSecsLeft:0} : b));
        const refundNote = paidWith==="machine" ? "Machine is now free." : `$2.00 refunded to your ${paidWith==="apple"?"Apple Pay":paidWith==="google"?"Google Pay":"card"}.`;
        showToast(`⏰ Booking for ${machineId} expired — ${refundNote}`, "warn");
      }
    }, 1000);
    graceTimers.current[bookingId] = interval;
  };

  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),5000); };

  const confirmLoaded = (bookingId) => {
    const booking = myBookings.find(b=>b.id===bookingId);
    if (!booking) return;
    clearInterval(graceTimers.current[bookingId]);
    delete graceTimers.current[bookingId];
    setMachines(prev => prev.map(m => m.id===booking.machineId ? {...m, status:"in-use", timeLeft:m.duration, bookedBy:booking.name} : m));
    setMyBookings(prev => prev.map(b => b.id===bookingId ? {...b, status:"running", graceSecsLeft:null} : b));
    showToast(`${booking.machineId} started! Cycle running ✅`);
  };

  const cancelBooking = (bookingId) => {
    const b = myBookings.find(x=>x.id===bookingId);
    if (!b) return;
    clearInterval(graceTimers.current[bookingId]);
    delete graceTimers.current[bookingId];
    setMachines(prev => prev.map(m => m.id===b.machineId ? {...m, status:"available", timeLeft:null, bookedBy:null} : m));
    setMyBookings(prev => prev.map(x => x.id===bookingId ? {...x, status:"cancelled"} : x));
    const refund = b.paidWith&&b.paidWith!=="machine" ? ` $2.00 refunded to your ${payLabel(b.paidWith)}.` : "";
    showToast(`Booking for ${b.machineId} cancelled.${refund}`, "warn");
  };

  const handleBook = () => {
    if (!form.name.trim())                     { showToast("Please enter your name","warn"); return; }
    if (form.smsAlert&&!form.phone.trim())     { showToast("Enter a phone number for SMS alerts","warn"); return; }
    if (form.instaAlert&&!form.insta.trim())   { showToast("Enter your Instagram handle","warn"); return; }
    setPayMethod(null); setStep("pay");
  };

  const handlePay = (method) => {
    if (method!=="machine") {
      setPayMethod(method); setPaying(true);
      setTimeout(()=>{ setPaying(false); finaliseBooking(method); }, 1600);
    } else {
      finaliseBooking("machine");
    }
  };

  const finaliseBooking = (method) => {
    const booking = {
      id: Date.now(),
      machineId: selectedMachine.id,
      machineType: selectedMachine.type,
      location: selectedMachine.location,
      name: form.name, phone: form.phone, insta: form.insta,
      smsAlert: form.smsAlert, instaAlert: form.instaAlert,
      startTime: new Date(), duration: selectedMachine.duration,
      status: "grace", paidWith: method, graceSecsLeft: GRACE_MINS*60,
    };
    setMachines(prev => prev.map(m => m.id===selectedMachine.id ? {...m, status:"reserved", bookedBy:form.name} : m));
    setMyBookings(prev=>[...prev, booking]);
    setPayMethod(method); setStep("booked");
    setTimeout(()=>startGraceTimer(booking.id, booking.machineId, method), 50);
  };

  const payLabel = p => p==="apple"?"Apple Pay":p==="google"?"Google Pay":p==="machine"?"Pay at Machine":"Card";

  const filtered = machines.filter(m => {
    if (filter==="Washers")   return m.type==="Washer";
    if (filter==="Dryers")    return m.type==="Dryer";
    if (filter==="Available") return m.status==="available";
    return true;
  });
  const availCount = machines.filter(m=>m.status==="available").length;
  const inUseCount = machines.filter(m=>m.status==="in-use").length;
  const statusColor = s => s==="available"?"#7FFFD4":s==="in-use"?"#FFB347":s==="reserved"?"#a78bfa":"#555";
  const statusLabel = s => s==="available"?"Free":s==="in-use"?"In use":s==="reserved"?"Reserved":"Offline";
  const formatMins = v => { if(!v||v<=0) return "Done"; const m=Math.floor(v),s=Math.round((v-m)*60); return `${m}:${String(s).padStart(2,"0")}`; };

  const graceCount   = myBookings.filter(b=>b.status==="grace").length;
  const runningCount = myBookings.filter(b=>b.status==="running").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{background:#0a0f1e;}
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes urgentPulse{0%,100%{border-color:rgba(255,100,100,.35)}50%{border-color:rgba(255,100,100,.8)}}
        .machine-card{animation:fadeIn .3s ease both;transition:transform .2s;}
        .machine-card:hover{transform:translateY(-2px);}
        input:focus{outline:none;border-color:rgba(127,255,212,.5)!important;}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(127,255,212,.2);border-radius:2px}
      `}</style>

      <div style={{ minHeight:"100vh", background:"#0a0f1e", fontFamily:"'Space Grotesk',sans-serif", color:"#e0eaf5", paddingBottom:40 }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(180deg,#0d1530 0%,#0a0f1e 100%)", borderBottom:"1px solid rgba(127,255,212,.1)", padding:"20px 20px 0" }}>
          <div style={{ maxWidth:520, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#7FFFD4", boxShadow:"0 0 8px #7FFFD4", animation:"pulse 2s infinite" }}/>
                  <span style={{ fontSize:11, color:"#7FFFD4", fontFamily:"'DM Mono',monospace", letterSpacing:2, textTransform:"uppercase" }}>Live</span>
                </div>
                <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:-.5, lineHeight:1.1 }}>Campus<br/><span style={{ color:"#7FFFD4" }}>Laundry</span></h1>
              </div>
              <div style={{ display:"flex", gap:10, textAlign:"center" }}>
                <div style={{ background:"rgba(127,255,212,.08)", border:"1px solid rgba(127,255,212,.15)", borderRadius:10, padding:"8px 12px" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:"#7FFFD4", fontFamily:"'DM Mono',monospace" }}>{availCount}</div>
                  <div style={{ fontSize:10, color:"#8899aa", textTransform:"uppercase", letterSpacing:1 }}>Free</div>
                </div>
                <div style={{ background:"rgba(255,179,71,.08)", border:"1px solid rgba(255,179,71,.15)", borderRadius:10, padding:"8px 12px" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:"#FFB347", fontFamily:"'DM Mono',monospace" }}>{inUseCount}</div>
                  <div style={{ fontSize:10, color:"#8899aa", textTransform:"uppercase", letterSpacing:1 }}>In Use</div>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", borderBottom:"2px solid rgba(255,255,255,.06)" }}>
              {["machines","bookings"].map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                  background:"none", border:"none", cursor:"pointer", padding:"10px 18px",
                  fontSize:13, fontWeight:500, fontFamily:"'Space Grotesk',sans-serif",
                  color:activeTab===tab?"#7FFFD4":"#5a6a80",
                  borderBottom:activeTab===tab?"2px solid #7FFFD4":"2px solid transparent",
                  marginBottom:-2, transition:"all .2s", textTransform:"capitalize", letterSpacing:.3,
                }}>
                  {tab}
                  {tab==="bookings" && graceCount>0 && <span style={{ background:"#ff6464", color:"#fff", borderRadius:99, padding:"1px 6px", fontSize:10, fontWeight:700, marginLeft:5 }}>{graceCount}</span>}
                  {tab==="bookings" && runningCount>0 && <span style={{ background:"#FFB347", color:"#0a0f1e", borderRadius:99, padding:"1px 6px", fontSize:10, fontWeight:700, marginLeft:4 }}>{runningCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ maxWidth:520, margin:"0 auto", padding:"0 16px" }}>

          {/* MACHINES LIST */}
          {activeTab==="machines" && step==="list" && (<>
            <div style={{ display:"flex", gap:8, padding:"16px 0 12px", overflowX:"auto" }}>
              {["All","Available","Washers","Dryers"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{
                  background:filter===f?"#7FFFD4":"rgba(255,255,255,.04)",
                  color:filter===f?"#0a0f1e":"#8899aa",
                  border:filter===f?"none":"1px solid rgba(255,255,255,.1)",
                  borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:600,
                  cursor:"pointer", whiteSpace:"nowrap", transition:"all .2s", fontFamily:"'Space Grotesk',sans-serif",
                }}>{f}</button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {filtered.map((m,i)=>{
                const pct = m.status==="in-use"?Math.round(((m.duration-m.timeLeft)/m.duration)*100):0;
                const isReserved = m.status==="reserved";
                return (
                  <div key={m.id} className="machine-card" style={{
                    animationDelay:`${i*.04}s`,
                    background:m.status==="available"?"rgba(127,255,212,.04)":isReserved?"rgba(167,139,250,.05)":"rgba(255,255,255,.03)",
                    border:m.status==="available"?"1px solid rgba(127,255,212,.18)":isReserved?"1px solid rgba(167,139,250,.2)":"1px solid rgba(255,255,255,.08)",
                    borderRadius:14, padding:14,
                    cursor:m.status==="available"?"pointer":"default",
                    opacity:m.status==="maintenance"?.5:1,
                  }} onClick={()=>{ if(m.status==="available"){ setSelected(m); setStep("book"); setForm({name:"",phone:"",insta:"",smsAlert:true,instaAlert:false}); }}}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                      <div style={{ color:statusColor(m.status) }}>{m.type==="Washer"?<WashIcon/>:<DryIcon/>}</div>
                      {m.status==="in-use" && <ProgressRing pct={pct} size={36} stroke={3} color="#FFB347"/>}
                      {m.status==="available" && <div style={{ width:8, height:8, borderRadius:"50%", background:"#7FFFD4", boxShadow:"0 0 6px #7FFFD4", marginTop:4 }}/>}
                      {isReserved && <div style={{ width:8, height:8, borderRadius:"50%", background:"#a78bfa", boxShadow:"0 0 6px #a78bfa", marginTop:4, animation:"pulse 1.5s infinite" }}/>}
                    </div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:500, marginBottom:2 }}>{m.id}</div>
                    <div style={{ fontSize:11, color:"#5a6a80", marginBottom:6 }}>{m.location}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1, color:statusColor(m.status) }}>{statusLabel(m.status)}</span>
                      {m.status==="in-use"&&m.timeLeft!=null && <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#FFB347" }}>{formatMins(m.timeLeft)}</span>}
                      {m.status==="available" && <span style={{ fontSize:10, color:"#5a6a80" }}>{m.duration}min</span>}
                    </div>
                    {m.bookedBy && <div style={{ fontSize:10, color:"#5a6a80", marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>@ {m.bookedBy}</div>}
                  </div>
                );
              })}
            </div>
          </>)}

          {/* BOOKING FORM */}
          {activeTab==="machines" && step==="book" && selectedMachine && (
            <div style={{ paddingTop:20, animation:"fadeIn .3s ease" }}>
              <button onClick={()=>setStep("list")} style={{ background:"none", border:"none", color:"#5a6a80", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, marginBottom:20, fontFamily:"'Space Grotesk',sans-serif", padding:0 }}>← Back</button>
              <div style={{ background:"rgba(127,255,212,.06)", border:"1px solid rgba(127,255,212,.2)", borderRadius:16, padding:18, marginBottom:20, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ color:"#7FFFD4" }}>{selectedMachine.type==="Washer"?<WashIcon/>:<DryIcon/>}</div>
                <div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:20, fontWeight:500 }}>{selectedMachine.id}</div>
                  <div style={{ fontSize:12, color:"#8899aa" }}>{selectedMachine.location} · {selectedMachine.duration} min cycle</div>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ fontSize:11, color:"#5a6a80", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Your Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Alex Chen"
                    style={{ width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"12px 14px", color:"#e0eaf5", fontSize:14, fontFamily:"'Space Grotesk',sans-serif" }}/>
                </div>
                <div style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", fontSize:11, color:"#5a6a80", letterSpacing:1, textTransform:"uppercase" }}>Alert me when done</div>
                  <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:14, borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                    <div style={{ color:form.smsAlert?"#7FFFD4":"#5a6a80" }}><SMSIcon/></div>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>SMS Text</div><div style={{ fontSize:11, color:"#5a6a80" }}>Get a text when done</div></div>
                    <div onClick={()=>setForm(f=>({...f,smsAlert:!f.smsAlert}))} style={{ width:42, height:24, borderRadius:99, cursor:"pointer", transition:"all .2s", background:form.smsAlert?"#7FFFD4":"rgba(255,255,255,.1)", position:"relative" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:form.smsAlert?"#0a0f1e":"#5a6a80", position:"absolute", top:3, left:form.smsAlert?21:3, transition:"all .2s" }}/>
                    </div>
                  </div>
                  {form.smsAlert && (
                    <div style={{ padding:"0 16px 14px" }}>
                      <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+61 4XX XXX XXX" type="tel"
                        style={{ width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 14px", color:"#e0eaf5", fontSize:14, fontFamily:"'Space Grotesk',sans-serif" }}/>
                    </div>
                  )}
                  <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", gap:14 }}>
                    <div style={{ color:form.instaAlert?"#E1306C":"#5a6a80" }}><InstaIcon/></div>
                    <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>Instagram DM</div><div style={{ fontSize:11, color:"#5a6a80" }}>Receive a DM</div></div>
                    <div onClick={()=>setForm(f=>({...f,instaAlert:!f.instaAlert}))} style={{ width:42, height:24, borderRadius:99, cursor:"pointer", transition:"all .2s", background:form.instaAlert?"#E1306C":"rgba(255,255,255,.1)", position:"relative" }}>
                      <div style={{ width:18, height:18, borderRadius:"50%", background:form.instaAlert?"#fff":"#5a6a80", position:"absolute", top:3, left:form.instaAlert?21:3, transition:"all .2s" }}/>
                    </div>
                  </div>
                  {form.instaAlert && (
                    <div style={{ padding:"0 16px 14px" }}>
                      <input value={form.insta} onChange={e=>setForm(f=>({...f,insta:e.target.value}))} placeholder="@yourhandle"
                        style={{ width:"100%", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, padding:"10px 14px", color:"#e0eaf5", fontSize:14, fontFamily:"'Space Grotesk',sans-serif" }}/>
                      <div style={{ fontSize:11, color:"#5a6a80", marginTop:6, lineHeight:1.5 }}>ⓘ Requires Campus Laundry bot connected via university portal.</div>
                    </div>
                  )}
                </div>
                <button onClick={handleBook} style={{ background:"linear-gradient(135deg,#7FFFD4,#5de8b8)", border:"none", borderRadius:12, padding:14, color:"#0a0f1e", fontSize:15, fontWeight:700, cursor:"pointer", width:"100%", fontFamily:"'Space Grotesk',sans-serif" }}>
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          {activeTab==="machines" && step==="pay" && selectedMachine && (
            <div style={{ paddingTop:20, animation:"fadeIn .3s ease" }}>
              <button onClick={()=>setStep("book")} style={{ background:"none", border:"none", color:"#5a6a80", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:6, marginBottom:20, fontFamily:"'Space Grotesk',sans-serif", padding:0 }}>← Back</button>
              <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.08)", borderRadius:16, padding:18, marginBottom:20 }}>
                <div style={{ fontSize:11, color:"#5a6a80", textTransform:"uppercase", letterSpacing:1, marginBottom:14 }}>Order Summary</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ fontSize:13, color:"#8899aa" }}>{selectedMachine.type} · {selectedMachine.id}</span><span style={{ fontSize:13 }}>{selectedMachine.location}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ fontSize:13, color:"#8899aa" }}>Cycle</span><span style={{ fontSize:13 }}>{selectedMachine.duration} min</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}><span style={{ fontSize:13, color:"#8899aa" }}>Grace period</span><span style={{ fontSize:13, color:"#a78bfa" }}>⏱ {GRACE_MINS} min to load clothes</span></div>
                <div style={{ height:1, background:"rgba(255,255,255,.07)", margin:"12px 0" }}/>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:15, fontWeight:600 }}>Total</span>
                  <span style={{ fontSize:22, fontWeight:700, fontFamily:"'DM Mono',monospace", color:"#7FFFD4" }}>$2.00</span>
                </div>
              </div>
              <div style={{ fontSize:11, color:"#5a6a80", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Pay with</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                {[
                  { id:"apple",   label:"Apple Pay",           sub:"Touch ID or Face ID",       icon:"🍎" },
                  { id:"google",  label:"Google Pay",          sub:"Quick & contactless",        icon:"G", iStyle:{ fontWeight:700, fontSize:15, color:"#4285F4", fontFamily:"sans-serif" } },
                  { id:"card",    label:"Credit / Debit Card", sub:"Visa, Mastercard, EFTPOS",   icon:"💳" },
                  { id:"machine", label:"Pay at Machine",      sub:"Tap card or coin on arrival",icon:"🏧", accent:true },
                ].map(opt=>(
                  <button key={opt.id} onClick={()=>!payProcessing&&handlePay(opt.id)} style={{
                    background: opt.accent?"rgba(167,139,250,.06)":payMethod===opt.id?"rgba(127,255,212,.08)":"rgba(255,255,255,.03)",
                    border: opt.accent?"1px solid rgba(167,139,250,.3)":payMethod===opt.id?"1px solid rgba(127,255,212,.3)":"1px solid rgba(255,255,255,.09)",
                    borderRadius:14, padding:"14px 16px", cursor:payProcessing?"default":"pointer",
                    display:"flex", alignItems:"center", gap:14, width:"100%",
                    fontFamily:"'Space Grotesk',sans-serif", transition:"all .2s",
                    opacity:payProcessing&&payMethod!==opt.id?.4:1,
                  }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                      {opt.iStyle ? <span style={opt.iStyle}>{opt.icon}</span> : opt.icon}
                    </div>
                    <div style={{ textAlign:"left", flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:500, color:opt.accent?"#c4b5fd":"#e0eaf5" }}>{opt.label}</div>
                      <div style={{ fontSize:11, color:"#5a6a80" }}>{opt.sub}</div>
                    </div>
                    {payProcessing&&payMethod===opt.id
                      ? <div style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(127,255,212,.2)", borderTop:"2px solid #7FFFD4", animation:"spin .7s linear infinite" }}/>
                      : <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${opt.accent?"rgba(167,139,250,.3)":"rgba(255,255,255,.15)"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                          {payMethod===opt.id && <div style={{ width:10, height:10, borderRadius:"50%", background:opt.accent?"#a78bfa":"#7FFFD4" }}/>}
                        </div>
                    }
                  </button>
                ))}
              </div>
              <div style={{ fontSize:11, color:"#5a6a80", textAlign:"center", lineHeight:1.6 }}>🔒 Payments processed securely via TangerPay</div>
            </div>
          )}

          {/* BOOKING CONFIRMED */}
          {activeTab==="machines" && step==="booked" && (
            <div style={{ paddingTop:32, textAlign:"center", animation:"fadeIn .4s ease" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(127,255,212,.1)", border:"2px solid rgba(127,255,212,.4)", margin:"0 auto 20px", display:"flex", alignItems:"center", justifyContent:"center", color:"#7FFFD4" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>{payMethod==="machine"?"Machine reserved!":"Paid & booked!"}</h2>
              <p style={{ color:"#5a6a80", fontSize:14, marginBottom:20, lineHeight:1.7 }}>
                {selectedMachine?.id} is held for you.<br/>
                {payMethod==="machine"
                  ? <span style={{ color:"#a78bfa" }}>Pay $2.00 at the machine when you arrive.</span>
                  : <span>$2.00 charged to {payLabel(payMethod)}.</span>
                }<br/>
                {form.smsAlert && <span>SMS → <b style={{color:"#e0eaf5"}}>{form.phone}</b><br/></span>}
                {form.instaAlert && <span>Instagram DM → <b style={{color:"#e0eaf5"}}>@{form.insta}</b></span>}
              </p>
              <div style={{ background:"rgba(255,200,50,.06)", border:"1px solid rgba(255,200,50,.2)", borderRadius:14, padding:"14px 16px", marginBottom:20, textAlign:"left" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:18 }}>⏱</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#ffd666" }}>You have {GRACE_MINS} minutes to load your clothes</span>
                </div>
                <p style={{ fontSize:12, color:"#8899aa", lineHeight:1.6 }}>
                  Head to {selectedMachine?.location} and load {selectedMachine?.id}. Tap <b style={{color:"#e0eaf5"}}>"I've loaded my clothes"</b> in My Bookings to start the cycle.
                  {payMethod!=="machine" && " If not started in time, your booking expires and $2.00 is refunded automatically."}
                </p>
              </div>
              <button onClick={()=>{ setStep("list"); setSelected(null); setActiveTab("bookings"); }} style={{
                background:"linear-gradient(135deg,#7FFFD4,#5de8b8)", border:"none", borderRadius:12, padding:14,
                color:"#0a0f1e", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif", width:"100%",
              }}>Go to My Bookings →</button>
            </div>
          )}

          {/* BOOKINGS TAB */}
          {activeTab==="bookings" && (
            <div style={{ paddingTop:20 }}>
              {myBookings.length===0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#5a6a80" }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>🧺</div>
                  <div style={{ fontSize:16, fontWeight:500, marginBottom:6, color:"#8899aa" }}>No bookings yet</div>
                  <div style={{ fontSize:13 }}>Head to Machines to book a washer or dryer</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {[...myBookings].reverse().map(b=>{
                    const machine = machines.find(m=>m.id===b.machineId);
                    const timeLeft = machine?.timeLeft;
                    const pct = machine?Math.round(((machine.duration-(timeLeft||0))/machine.duration)*100):100;
                    const isGrace   = b.status==="grace";
                    const isRunning = b.status==="running";
                    const isExpired = b.status==="expired";
                    const isDone    = isRunning && machine?.status==="available";
                    const urgent    = isGrace && b.graceSecsLeft<120;

                    return (
                      <div key={b.id} style={{
                        background:isGrace?"rgba(255,200,50,.04)":"rgba(255,255,255,.03)",
                        border:isGrace?`1px solid ${urgent?"rgba(255,100,100,.5)":"rgba(255,200,50,.25)"}`:"1px solid rgba(255,255,255,.08)",
                        borderRadius:14, padding:16,
                        opacity:(b.status==="cancelled"||isExpired)?.5:1,
                        animation: urgent?"urgentPulse 1.2s infinite":"fadeIn .3s ease",
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:500 }}>{b.machineId}</span>
                              <span style={{
                                fontSize:10, fontWeight:600, textTransform:"uppercase", letterSpacing:1, padding:"2px 8px", borderRadius:99,
                                background:isGrace?"rgba(255,200,50,.12)":isExpired?"rgba(255,100,100,.1)":isDone?"rgba(127,255,212,.1)":isRunning?"rgba(255,179,71,.1)":"rgba(255,255,255,.05)",
                                color:isGrace?(urgent?"#ff6464":"#ffd666"):isExpired?"#ff6464":isDone?"#7FFFD4":isRunning?"#FFB347":"#5a6a80",
                              }}>
                                {isGrace?"Loading…":isExpired?"Expired":isDone?"Complete":isRunning?"Running":b.status==="cancelled"?"Cancelled":"—"}
                              </span>
                            </div>
                            <div style={{ fontSize:12, color:"#5a6a80" }}>{b.location} · {b.machineType}</div>
                          </div>
                          {isGrace&&b.graceSecsLeft!=null && <GraceRing secsLeft={b.graceSecsLeft} total={GRACE_MINS*60}/>}
                          {isRunning&&!isDone && <ProgressRing pct={pct} size={40} stroke={3} color="#FFB347"/>}
                        </div>

                        {isGrace && (
                          <div style={{ background:urgent?"rgba(255,100,100,.08)":"rgba(255,200,50,.06)", border:`1px solid ${urgent?"rgba(255,100,100,.25)":"rgba(255,200,50,.2)"}`, borderRadius:10, padding:"10px 14px", marginBottom:12 }}>
                            <div style={{ fontSize:12, color:urgent?"#ff9494":"#ffd666", fontWeight:600, marginBottom:4 }}>
                              {urgent?"⚠️ Hurry! Almost out of time":"⏱ Head to the machine now"}
                            </div>
                            <div style={{ fontSize:12, color:"#8899aa", lineHeight:1.5 }}>
                              Load your clothes into <b style={{color:"#e0eaf5"}}>{b.machineId}</b> at {b.location}, then tap below.
                              {b.paidWith!=="machine" && " Machine releases and $2.00 is refunded if not started in time."}
                            </div>
                          </div>
                        )}

                        {isRunning&&!isDone&&timeLeft!=null && (
                          <div style={{ background:"rgba(255,179,71,.05)", border:"1px solid rgba(255,179,71,.15)", borderRadius:8, padding:"8px 12px", marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <span style={{ fontSize:12, color:"#8899aa" }}>Time remaining</span>
                            <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, color:"#FFB347" }}>{formatMins(timeLeft)}</span>
                          </div>
                        )}

                        {isDone && (
                          <div style={{ background:"rgba(127,255,212,.05)", border:"1px solid rgba(127,255,212,.15)", borderRadius:8, padding:"8px 12px", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ color:"#7FFFD4" }}><BellIcon/></span>
                            <span style={{ fontSize:12, color:"#7FFFD4" }}>Your laundry is ready to collect! 🎉</span>
                          </div>
                        )}

                        {isExpired && (
                          <div style={{ background:"rgba(255,100,100,.05)", border:"1px solid rgba(255,100,100,.15)", borderRadius:8, padding:"8px 12px", marginBottom:12 }}>
                            <span style={{ fontSize:12, color:"#ff9494" }}>
                              Booking expired.{b.paidWith!=="machine"?` $2.00 refunded to your ${payLabel(b.paidWith)}.`:""}
                            </span>
                          </div>
                        )}

                        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:(isGrace||isRunning)?12:0 }}>
                          {b.paidWith && <div style={{ fontSize:11, color:"#5a6a80", background:"rgba(255,255,255,.03)", padding:"4px 10px", borderRadius:99, border:"1px solid rgba(255,255,255,.06)" }}>{b.paidWith==="machine"?"🏧 Pay at machine":`💳 ${payLabel(b.paidWith)}`}</div>}
                          {b.smsAlert   && <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#5a6a80", background:"rgba(255,255,255,.03)", padding:"4px 10px", borderRadius:99, border:"1px solid rgba(255,255,255,.06)" }}><SMSIcon/>{b.phone}</div>}
                          {b.instaAlert && <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#5a6a80", background:"rgba(255,255,255,.03)", padding:"4px 10px", borderRadius:99, border:"1px solid rgba(255,255,255,.06)" }}><InstaIcon/>@{b.insta}</div>}
                        </div>

                        {isGrace && (
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={()=>confirmLoaded(b.id)} style={{ flex:2, background:"linear-gradient(135deg,#7FFFD4,#5de8b8)", border:"none", borderRadius:10, padding:"11px 14px", color:"#0a0f1e", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif" }}>
                              ✅ I've loaded my clothes
                            </button>
                            <button onClick={()=>cancelBooking(b.id)} style={{ flex:1, background:"none", border:"1px solid rgba(255,100,100,.2)", borderRadius:10, padding:"11px 10px", color:"rgba(255,100,100,.7)", fontSize:12, cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif" }}>
                              Cancel
                            </button>
                          </div>
                        )}
                        {isRunning&&!isDone && (
                          <button onClick={()=>cancelBooking(b.id)} style={{ background:"none", border:"1px solid rgba(255,100,100,.2)", borderRadius:8, color:"rgba(255,100,100,.7)", fontSize:12, padding:"7px 14px", cursor:"pointer", fontFamily:"'Space Grotesk',sans-serif", width:"100%" }}>
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
