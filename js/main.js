// ═══ Supabase ═══
const _sb = supabase.createClient(
  'https://mzabpomdobkeuhwcjyvs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16YWJwb21kb2JrZXVod2NqeXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNTYzMzAsImV4cCI6MjA5NjgzMjMzMH0.bb4q28cVQiNfwIhEeqJpuJgP2Ro0FUdMe7AeSG-i0ak'
);

// ═══ Resend email ═══
async function sendWelcomeEmail(name, toEmail) {
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:40px 20px;background:#0c0b09;font-family:Arial,sans-serif">
  <div style="max-width:540px;margin:0 auto;background:#161410;border:1px solid #2c2820;border-radius:16px;overflow:hidden">
    <div style="padding:28px 36px;border-bottom:1px solid #2c2820">
      <span style="display:inline-flex;align-items:center;gap:8px;font-family:monospace;font-size:15px;font-weight:600;letter-spacing:.12em;color:#ede8dc">
        <span style="width:8px;height:8px;border-radius:50%;background:#b89a5a;display:inline-block"></span>PAWGATE
      </span>
    </div>
    <div style="padding:36px">
      <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ede8dc">Hei ${name}!</h2>
      <p style="margin:0 0 20px;color:#8a8070;line-height:1.7;font-size:15px">Takk for at du registrerte deg hos PawGate. Du er nå på listen og vil få beskjed så snart appen er klar for nedlasting.</p>
      <div style="background:#1e1c16;border:1px solid #2c2820;border-radius:12px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;color:#b89a5a;font-family:monospace;letter-spacing:.12em;margin-bottom:8px;text-transform:uppercase">Hva skjer nå?</div>
        <p style="margin:0;font-size:14px;color:#ede8dc;line-height:1.65">Vi jobber med å ferdigstille PawGate — smart kennelstyring for seriøse kenneleiere. Du hører fra oss!</p>
      </div>
      <p style="margin:0;font-size:13px;color:#6a6458;line-height:1.6">Spørsmål? Ta kontakt på <a href="mailto:hei@pawgate.no" style="color:#b89a5a;text-decoration:none">hei@pawgate.no</a></p>
    </div>
    <div style="padding:18px 36px;border-top:1px solid #2c2820;font-size:11px;color:#6a6458;font-family:monospace">© 2026 PawGate · Fra Norge 🇳🇴</div>
  </div></body></html>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer re_Nx2ZtM9o_7R9nv7mCiwxrqMTJ26nPAKhx', 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'PawGate <hei@pawgate.no>', to: toEmail, subject: 'Velkommen til PawGate! 🐾', html })
    });
  } catch(e) { console.error('Email send failed:', e); }
}

async function sbLoadUsers() {
  const { data, error } = await _sb.from('registrations').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Supabase load error:', error); return []; }
  return data.map(r => ({ name: r.name, email: r.email, date: r.created_at.slice(0,10), nl: r.newsletter, launch: r.launch_notify }));
}

async function sbSaveUser(u) {
  const { error } = await _sb.from('registrations').insert({
    name: u.name, email: u.email, newsletter: u.nl, launch_notify: u.launch
  });
  if (error) throw error;
}

// ═══ Data ═══
let users = [];
let files = [
  {name:'Interaktiv prototype', type:'Proto', cat:'app', url:'kennel-app-prototype.html', meta:'HTML · v0.9 beta', status:'available'},
  {name:'3D-modell hundeluke',  type:'3D',    cat:'doc', url:'pawgate-door-3d.html',      meta:'HTML · Interaktiv', status:'available'},
  {name:'Teknisk skisse',       type:'Skisse',cat:'doc', url:'pawgate-handskisse.html',   meta:'HTML · Handskisse', status:'available'},
  {name:'PawGate for iPhone',   type:'iOS',   cat:'app', url:'',                          meta:'iOS 16+ · App Store', status:'coming'},
  {name:'PawGate for Android',  type:'Andr.', cat:'app', url:'',                          meta:'Android 10+', status:'coming'},
  {name:'ESP32 Firmware',       type:'ESP FW',cat:'doc', url:'',                          meta:'v1.0.0 · .bin', status:'coming'},
];
let featData = [
  {title:'Automatiske hundeluker', body:'Sett timere for hver binge — luken åpner og lukker seg selv. Styr manuelt fra hvor som helst i verden.'},
  {title:'Automatisk spyling', body:'Automatisk spyling på faste tider. Se siste spyling og start manuelt på sekundet om noe kommer opp.'},
  {title:'Live kamera', body:'Se live-bilder fra alle binger direkte i appen. Støtter RTSP, ONVIF, WiFi og PawGate eget kamera.'},
  {title:'Flerbruker med roller', body:'Inviter ansatte med nøyaktig de tilgangene de skal ha. Eier, administrator, ansatt eller leser — eller lag egne roller.'},
  {title:'Smarte varsler', body:'Varsel hvis temperaturen er feil, spyling ikke er gjort, kamera mister signal, eller en luke ikke svarer.'},
  {title:'Oppgavekalender', body:'Planlegg og fordel daglig arbeid — vaksinering, veterinærtime, rengjøring og alt annet. Med egne kategorier og farger.'},
];

// ═══ Auth state & nav ═══
function getInitials(name) {
  if(!name) return '?';
  const parts = name.trim().split(/\s+/);
  if(parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

function updateNavAuth(user) {
  const loginBtn = document.getElementById('nav-login');
  const avatarBtn = document.getElementById('nav-avatar');
  if(!loginBtn || !avatarBtn) return;
  if(user) {
    const name = user.user_metadata?.name || user.email;
    const initials = getInitials(name);
    loginBtn.style.display = 'none';
    avatarBtn.style.display = 'flex';
    avatarBtn.textContent = initials;
  } else {
    loginBtn.style.display = '';
    avatarBtn.style.display = 'none';
  }
}

async function openProfile() {
  const { data: { user } } = await _sb.auth.getUser();
  if(!user) return;
  const meta = user.user_metadata || {};
  document.getElementById('profile-title').textContent = meta.name || 'Min profil';
  document.getElementById('profile-email-sub').textContent = user.email;
  document.getElementById('profile-av-big').textContent = getInitials(meta.name || user.email);
  document.getElementById('p-name').value = meta.name || '';
  document.getElementById('p-location').value = meta.location || '';
  document.getElementById('p-phone').value = meta.phone || '';
  document.getElementById('p-email').value = user.email;
  document.getElementById('p-pass').value = '';
  document.getElementById('p-pass2').value = '';
  openOv('profile-ov');
}

async function saveProfile() {
  const name = document.getElementById('p-name').value.trim();
  const location = document.getElementById('p-location').value.trim();
  const phone = document.getElementById('p-phone').value.trim();
  const { data, error } = await _sb.auth.updateUser({ data: { name, location, phone } });
  if(error) { alert('Kunne ikke lagre. Prøv igjen.'); return; }
  updateNavAuth(data.user);
  document.getElementById('profile-title').textContent = name || 'Min profil';
  document.getElementById('profile-av-big').textContent = getInitials(name || data.user.email);
  showOk('Lagret!', 'Profilen din er oppdatert.', '✅');
  closeOv('profile-ov');
}

async function updateProfileEmail() {
  const email = document.getElementById('p-email').value.trim();
  if(!email) { alert('Skriv inn ny e-post.'); return; }
  const { error } = await _sb.auth.updateUser({ email });
  if(error) { alert('Kunne ikke oppdatere e-post. Prøv igjen.'); return; }
  showOk('Bekreft ny e-post', 'Vi har sendt en bekreftelseslenke til den nye e-postadressen din.', '📧');
  closeOv('profile-ov');
}

async function updateProfilePassword() {
  const p = document.getElementById('p-pass').value;
  const p2 = document.getElementById('p-pass2').value;
  if(!p || !p2) { alert('Fyll ut begge passordfelter.'); return; }
  if(p !== p2) { alert('Passordene stemmer ikke overens.'); return; }
  if(p.length < 8) { alert('Passordet må være minst 8 tegn.'); return; }
  const { error } = await _sb.auth.updateUser({ password: p });
  if(error) { alert('Kunne ikke oppdatere passord. Prøv igjen.'); return; }
  showOk('Passord oppdatert!', 'Ditt nye passord er aktivt.', '✅');
  closeOv('profile-ov');
}

async function doLogout() {
  await _sb.auth.signOut();
  updateNavAuth(null);
  closeOv('profile-ov');
  showOk('Logget ut', 'Du er nå logget ut av PawGate.', '👋');
}

// ═══ Overlay utils ═══
function openOv(id){ document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeOv(id){ document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
document.addEventListener('keydown', e=>{ if(e.key==='Escape')['auth-ov','dl-ov','ok-ov'].forEach(closeOv); });

// ═══ Auth ═══
function openAuth(){ swTab('login'); openOv('auth-ov'); }
function openDownloadModal(){ renderDLModal(); openOv('dl-ov'); }

function swTab(t){
  ['login','reg','admin','forgot'].forEach(id=>{
    document.getElementById('t-'+id)?.classList.toggle('active',id===t);
    document.getElementById('p-'+id)?.classList.toggle('active',id===t);
  });
  const titles={'login':'Logg inn','reg':'Registrer deg','admin':'Admin','forgot':'Glemt passord'};
  const subs={'login':'Velkommen til PawGate','reg':'Opprett konto','admin':'Kun for PawGate-ansatte','forgot':'Vi sender deg en tilbakestillingslenke'};
  document.querySelector('#auth-ov .mtitle').textContent = titles[t]||titles.login;
  document.querySelector('#auth-ov .msub').textContent = subs[t]||subs.login;
}

async function doLogin(){
  const e=document.getElementById('l-email').value.trim();
  const p=document.getElementById('l-pass').value;
  if(!e||!p){ alert('Fyll ut alle feltene'); return; }
  const { data, error } = await _sb.auth.signInWithPassword({ email: e, password: p });
  if(error){ alert('Feil e-post eller passord. Prøv igjen.'); return; }
  updateNavAuth(data.user);
  const name = data.user.user_metadata?.name || e;
  closeOv('auth-ov');
  showOk('Innlogget!', `Velkommen tilbake, ${name.split(' ')[0]}!`, '👋');
}

async function doReg(){
  const n=document.getElementById('r-name').value.trim();
  const e=document.getElementById('r-email').value.trim();
  const p=document.getElementById('r-pass').value;
  if(!n||!e||!p){ alert('Fyll ut alle feltene'); return; }
  if(p.length<8){ alert('Passordet må være minst 8 tegn.'); return; }
  const nl=document.getElementById('r-nl').checked;
  const launch=document.getElementById('r-launch').checked;
  const { error: authErr } = await _sb.auth.signUp({
    email: e, password: p,
    options: { data: { name: n } }
  });
  if(authErr){
    if(authErr.message.includes('already registered')){ alert('Denne e-posten er allerede registrert.'); return; }
    alert('Noe gikk galt. Prøv igjen.'); console.error(authErr); return;
  }
  const u={name:n,email:e,date:new Date().toISOString().slice(0,10),nl,launch};
  try { await sbSaveUser(u); users.push(u); } catch(err){ console.error(err); }
  sendWelcomeEmail(n, e);
  closeOv('auth-ov');
  showOk('Registrert! 🐾','Vi har sendt deg en velkomst-e-post fra PawGate. Sjekk innboksen din — og husk å se i søppelpost/spam om du ikke finner den.','🎉');
  updateStats();
}

function doAdminLogin(){
  const e=document.getElementById('a-email').value.trim();
  const p=document.getElementById('a-pass').value;
  if(e==='admin@pawgate.no'&&p==='PawG8!Admin#2026'){ closeOv('auth-ov'); openAdmin(); }
  else alert('Feil e-post eller passord');
}

async function doResetPassword(){
  const p=document.getElementById('rp-pass').value;
  const p2=document.getElementById('rp-pass2').value;
  if(!p||!p2){ alert('Fyll ut begge feltene.'); return; }
  if(p!==p2){ alert('Passordene stemmer ikke overens.'); return; }
  if(p.length<8){ alert('Passordet må være minst 8 tegn.'); return; }
  const { error } = await _sb.auth.updateUser({ password: p });
  if(error){ alert('Noe gikk galt. Prøv å be om en ny tilbakestillingslenke.'); return; }
  document.getElementById('reset-ov').classList.remove('open');
  showOk('Passord oppdatert!','Du kan nå logge inn med ditt nye passord.','✅');
}

async function doForgot(){
  const e=document.getElementById('f-email').value.trim();
  if(!e){ alert('Skriv inn e-postadressen din.'); return; }
  const { error } = await _sb.auth.resetPasswordForEmail(e, { redirectTo: 'https://pawgate.no' });
  if(error){ alert('Noe gikk galt. Prøv igjen.'); return; }
  closeOv('auth-ov');
  showOk('E-post sendt!','Sjekk innboksen din for en lenke for å tilbakestille passordet.','📧');
}

function showOk(title,body,icon='🎉'){
  document.getElementById('ok-icon').textContent=icon;
  document.getElementById('ok-title').textContent=title;
  document.getElementById('ok-body').textContent=body;
  openOv('ok-ov');
}

// ═══ Download modal ═══
function renderDLModal(){
  const c=document.getElementById('dl-list');
  const dlSvg='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const cats=[{id:'app',lbl:'Mobilapp'},{id:'doc',lbl:'Dokumenter og skisser'}];
  c.innerHTML='';
  cats.forEach(function(cat){
    var catFiles=files.filter(function(f){return f.cat===cat.id;});
    if(!catFiles.length) return;
    var lbl=document.createElement('div');
    lbl.style.cssText='font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;margin-top:4px';
    lbl.textContent=cat.lbl;
    c.appendChild(lbl);
    catFiles.forEach(function(f){
      var el=document.createElement('div');
      el.style.cssText='display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:12px;margin-bottom:8px';
      var typeDiv='<div style="width:44px;height:44px;border-radius:12px;background:var(--surface2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:\'IBM Plex Mono\',monospace;font-size:9px;font-weight:600;color:var(--accent);flex-shrink:0;text-align:center;line-height:1.3">'+f.type+'</div>';
      var infoDiv='<div style="flex:1"><div style="font-size:14px;font-weight:600;margin-bottom:2px">'+f.name+'</div><div style="font-size:11px;color:var(--muted);font-family:\'IBM Plex Mono\',monospace">'+f.meta+'</div></div>';
      var action;
      if(f.status==='available'){
        action='<a href="'+f.url+'" download style="padding:9px 18px;border-radius:9px;background:var(--accent);color:#0c0b09;font-family:\'IBM Plex Sans\',sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:6px;flex-shrink:0">'+dlSvg+'Last ned</a>';
      } else {
        action='<span style="font-size:10px;padding:4px 10px;border-radius:6px;background:var(--surface2);color:var(--muted);border:1px solid var(--border2);font-family:\'IBM Plex Mono\',monospace;white-space:nowrap">Kommer snart</span>';
      }
      el.innerHTML=typeDiv+infoDiv+action;
      c.appendChild(el);
    });
  });
}


// ═══ Admin ═══
function openAdmin(){
  renderAdmin();
  document.getElementById('admin-shell').classList.add('open');
}
function closeAdmin(){
  document.getElementById('admin-shell').classList.remove('open');
}

function showAP(id,el){
  document.querySelectorAll('.apage').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.anav').forEach(n=>n.classList.remove('on'));
  document.getElementById('ap-'+id).classList.add('on');
  el.classList.add('on');
  if(id==='users') sbLoadUsers().then(u=>{users=u;renderUsersTable();});
  if(id==='nl') sbLoadUsers().then(u=>{users=u;renderNLTable();});
  if(id==='files') renderFilesTable();
  if(id==='feat') renderFeatAdmin();
  if(id==='price') renderPriceAdmin();
}

async function renderAdmin(){
  users = await sbLoadUsers();
  updateStats();
  renderFilesTable();
  renderUsersTable();
  renderNLTable();
  renderFeatAdmin();
  renderPriceAdmin();
}

function updateStats(){
  const n=users.length, nl=users.filter(u=>u.nl).length, av=files.filter(f=>f.status==='available').length;
  ['sn-users','sn-nl','sn-files'].forEach((id,i)=>{ const el=document.getElementById(id); if(el)el.textContent=[n,nl,av][i]; });
  const su=document.getElementById('users-sub'); if(su)su.textContent=n+' registrerte';
  const nln=document.getElementById('nl-n'); if(nln)nln.textContent=nl;
  // dash table
  const dt=document.getElementById('dash-users'); if(!dt)return;
  dt.innerHTML='';
  [...users].reverse().slice(0,5).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${u.name}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">\${u.email}</td><td style="color:var(--muted);font-size:12px">\${u.date}</td><td><span class="badge \${u.nl?'bg':'bm'}">\${u.nl?'Ja':'Nei'}</span></td>`;
    dt.appendChild(tr);
  });
}

function renderFilesTable(){
  const t=document.getElementById('files-tbody'); if(!t)return;
  t.innerHTML='';
  files.forEach((f,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${f.name}</strong></td><td><span class="badge bm">\${f.cat==='app'?'App':'Dok.'}</span></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${f.url||'—'}</td><td><span class="badge \${f.status==='available'?'bg':'bm'}">\${f.status==='available'?'Tilgjengelig':'Snart'}</span></td><td style="display:flex;gap:6px"><button class="btn btn-ghost" style="padding:5px 10px;font-size:11px" onclick="editFile(\${i})">Rediger</button><button class="btn" style="padding:5px 10px;font-size:11px;background:rgba(184,90,74,.1);border-color:rgba(184,90,74,.2);color:#e07060" onclick="delFile(\${i})">Slett</button></td>`;
    t.appendChild(tr);
  });
}

function showAddFile(){ document.getElementById('add-file-card').style.display='block'; document.getElementById('nf-name').focus(); }
function addFile(){
  const n=document.getElementById('nf-name').value.trim();
  if(!n){ alert('Navn er påkrevd'); return; }
  const tp=document.getElementById('nf-type').value.trim()||'FIL';
  files.push({name:n,type:tp,cat:document.getElementById('nf-cat').value,url:document.getElementById('nf-url').value.trim(),meta:document.getElementById('nf-meta').value.trim(),status:document.getElementById('nf-status').value});
  document.getElementById('add-file-card').style.display='none';
  ['nf-name','nf-type','nf-url','nf-meta'].forEach(id=>document.getElementById(id).value='');
  renderFilesTable(); updateStats();
  alert(`"\${n}" lagt til!`);
}
function delFile(i){ if(!confirm(`Slett "\${files[i].name}"?`))return; files.splice(i,1); renderFilesTable(); updateStats(); }
function editFile(i){
  const f=files[i];
  const u=prompt('Ny nedlastingslenke:',f.url);
  if(u===null)return;
  files[i].url=u; files[i].status=u?'available':'coming';
  renderFilesTable(); alert('Oppdatert!');
}

function renderUsersTable(){
  const t=document.getElementById('users-tbody'); if(!t)return;
  t.innerHTML='';
  users.forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><strong>\${u.name}</strong></td><td style="font-family:'IBM Plex Mono',monospace;font-size:11px">\${u.email}</td><td style="color:var(--muted);font-size:12px">\${u.date}</td><td><span class="badge \${u.nl?'bg':'bm'}">\${u.nl?'Ja':'Nei'}</span></td><td><span class="badge \${u.launch?'bgo':'bm'}">\${u.launch?'Ja':'Nei'}</span></td>`;
    t.appendChild(tr);
  });
  const su=document.getElementById('users-sub'); if(su)su.textContent=users.length+' registrerte';
}

function renderNLTable(){
  const t=document.getElementById('nl-tbody'); if(!t)return;
  t.innerHTML='';
  users.filter(u=>u.nl).forEach(u=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td style="font-family:'IBM Plex Mono',monospace;font-size:12px">\${u.email}</td><td><span class="badge \${u.launch?'bgo':'bm'}">\${u.launch?'Ja':'Nei'}</span></td><td style="color:var(--muted);font-size:12px">\${u.date}</td>`;
    t.appendChild(tr);
  });
  const nln=document.getElementById('nl-n'); if(nln)nln.textContent=users.filter(u=>u.nl).length;
}

function renderFeatAdmin(){
  const c=document.getElementById('feat-admin'); if(!c)return;
  c.innerHTML='';
  featData.forEach((f,i)=>{
    const div=document.createElement('div');
    div.className='acard'; div.style.marginBottom='16px';
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">Funksjon \${i+1}</div><button class="btn btn-primary" style="padding:6px 14px;font-size:12px" onclick="saveFeat(\${i})">Lagre</button></div><div class="acard-body"><div class="arow"><div class="field"><label>Tittel</label><input type="text" class="inp" id="ft-t-\${i}" value="\${f.title}"></div><div class="field"><label>Beskrivelse</label><input type="text" class="inp" id="ft-b-\${i}" value="\${f.body}"></div></div></div>`;
    c.appendChild(div);
  });
}
function saveFeat(i){
  featData[i].title=document.getElementById(`ft-t-\${i}`).value;
  featData[i].body=document.getElementById(`ft-b-\${i}`).value;
  const cards=document.querySelectorAll('.feature-card');
  if(cards[i]){ cards[i].querySelector('.feature-title').textContent=featData[i].title; cards[i].querySelector('.feature-body').textContent=featData[i].body; }
  alert('Oppdatert!');
}

function renderPriceAdmin(){
  const c=document.getElementById('price-admin'); if(!c)return;
  const plans=[{n:'Basis',p:'Gratis',per:'Prøv uten kredittkort'},{n:'Pro',p:'399 kr',per:'per mnd · ingen binding'},{n:'Complete',p:'fra 15 000 kr',per:'engangskostnad + 399 kr/mnd'}];
  c.innerHTML='';
  plans.forEach((p,i)=>{
    const div=document.createElement('div');
    div.className='acard';
    div.innerHTML=`<div class="acard-hdr"><div class="acard-title">\${p.n}</div><button class="btn btn-primary" style="padding:5px 12px;font-size:11px" onclick="alert('Lagret!')">Lagre</button></div><div class="acard-body" style="display:flex;flex-direction:column;gap:10px"><div class="field"><label>Pris</label><input type="text" class="inp" value="\${p.p}"></div><div class="field"><label>Periode</label><input type="text" class="inp" value="\${p.per}"></div></div>`;
    c.appendChild(div);
  });
}

function saveHero(){
  const t1=document.getElementById('h-t1').value, t2=document.getElementById('h-t2').value, t3=document.getElementById('h-t3').value, body=document.getElementById('h-body').value;
  const te=document.querySelector('.hero-title'); if(te)te.innerHTML=`\${t1}<br><em>\${t2}</em><br>\${t3}`;
  const be=document.querySelector('.hero-body'); if(be)be.textContent=body;
  alert('Hero oppdatert!');
}
function saveHW(){
  const title=document.getElementById('hw-t').value, desc=document.getElementById('hw-d').value, img=document.getElementById('hw-img').value;
  const te=document.getElementById('hw-title'); if(te)te.textContent=title;
  const de=document.getElementById('hw-desc'); if(de)de.textContent=desc;
  if(img){ const ve=document.getElementById('hw-visual'); if(ve)ve.innerHTML=`<img src="\${img}" style="max-width:100%;max-height:100%;border-radius:12px;object-fit:contain">`; }
  alert('Hardware-seksjon oppdatert!');
}
function prevHWImg(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{ document.getElementById('hw-prev').style.display='block'; document.getElementById('hw-prev-img').src=e.target.result; };
  reader.readAsDataURL(file);
}

// ═══ Theme ═══
function toggleTheme(){
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('pg-theme', next);
  updateNavBg();
}

(function handleAuthRedirect(){
  _sb.auth.onAuthStateChange((event, session) => {
    if(event === 'PASSWORD_RECOVERY'){
      document.getElementById('reset-ov').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    if(event === 'SIGNED_IN' || event === 'INITIAL_SESSION'){
      updateNavAuth(session?.user || null);
    }
    if(event === 'SIGNED_OUT'){
      updateNavAuth(null);
    }
  });
})();

(function initTheme(){
  const saved = localStorage.getItem('pg-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  if(theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

// Nav scroll
function updateNavBg(){
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const nav = document.querySelector('nav');
  if(isLight){
    nav.style.background = window.scrollY > 40 ? 'rgba(250,249,245,.98)' : 'rgba(250,249,245,.92)';
  } else {
    nav.style.background = window.scrollY > 40 ? 'rgba(12,11,9,.97)' : 'rgba(12,11,9,.88)';
  }
}
window.addEventListener('scroll', updateNavBg);