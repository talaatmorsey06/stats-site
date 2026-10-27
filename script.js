/* ===== إعدادات: غيّر القيم إلى true لإظهار الروابط ===== */
const CONFIG = { showResetLink: false, showSignupLink: false };
/* لإظهارهما مؤقتاً افتح الصفحة بالرابط ... ثم اضغط Shift+R لإظهار رابط إعادة كلمة المرور و Shift+N للحساب الجديد */

const $ = id => document.getElementById(id);
const mem = {};
const store = {
  get(k){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }catch(e){ return mem[k] ?? null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ mem[k] = v; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){ delete mem[k]; } }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

async function hash(s){
  try{
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
  }catch(e){ return btoa(unescape(encodeURIComponent(s))); }
}

let users = store.get('stat_users') || {};
let me = null, rows = [], chart = null;

async function init(){
  if(!Object.keys(users).length){
    users.admin = { pass: await hash('admin123'), word: await hash('admin') };
    store.set('stat_users', users);
  }
  const s = store.get('stat_session');
  if(s && users[s]) enter(s);
  applyLinks();
}

/* ===== إظهار/إخفاء روابط إعادة كلمة المرور والحساب الجديد ===== */
function applyLinks(){
  $('goReset').classList.toggle('hidden', !CONFIG.showResetLink);
  $('goSignup').classList.toggle('hidden', !CONFIG.showSignupLink);
}
document.addEventListener('keydown', e => {
  if(!e.shiftKey || ['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
  if(e.key === 'R'){ CONFIG.showResetLink = !CONFIG.showResetLink; applyLinks(); }
  if(e.key === 'N'){ CONFIG.showSignupLink = !CONFIG.showSignupLink; applyLinks(); }
});

function pane(name){
  ['login','reset','signup'].forEach(p => $(p+'Pane').classList.toggle('hidden', p !== name));
  $('authSub').textContent = {login:'سجّل الدخول للمتابعة', reset:'إعادة تعيين كلمة المرور', signup:'إنشاء حساب جديد'}[name];
  showMsg('authMsg');
}
$('goReset').onclick = () => pane('reset');
$('goSignup').onclick = () => pane('signup');
document.querySelectorAll('.backLogin').forEach(a => a.onclick = () => pane('login'));

function showMsg(id, text, type){
  const m = $(id); m.className = 'msg' + (text ? ' ' + type : ''); m.textContent = text || '';
}

$('loginPane').onsubmit = async e => {
  e.preventDefault();
  const u = $('lUser').value.trim();
  if(users[u] && users[u].pass === await hash($('lPass').value)){
    store.set('stat_session', u); enter(u);
  } else showMsg('authMsg', 'اسم المستخدم أو كلمة المرور غير صحيحة', 'err');
};

$('signupPane').onsubmit = async e => {
  e.preventDefault();
  const u = $('sUser').value.trim();
  if(users[u]) return showMsg('authMsg', 'اسم المستخدم مستخدم من قبل', 'err');
  users[u] = { pass: await hash($('sPass').value), word: await hash($('sWord').value.trim().toLowerCase()) };
  store.set('stat_users', users);
  e.target.reset(); pane('login');
  showMsg('authMsg', 'تم إنشاء الحساب، يمكنك تسجيل الدخول الآن', 'ok');
};

$('resetPane').onsubmit = async e => {
  e.preventDefault();
  const u = $('rUser').value.trim();
  if(!users[u] || users[u].word !== await hash($('rWord').value.trim().toLowerCase()))
    return showMsg('authMsg', 'بيانات الاسترجاع غير صحيحة', 'err');
  users[u].pass = await hash($('rPass').value);
  store.set('stat_users', users);
  e.target.reset(); pane('login');
  showMsg('authMsg', 'تم تغيير كلمة المرور بنجاح', 'ok');
};

/* ===== التطبيق ===== */
function enter(u){
  me = u; rows = store.get('stat_data_' + u) || [];
  $('authView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('whoami').textContent = '👤 ' + u;
  $('eDate').valueAsDate = new Date();
  render();
}
$('logoutBtn').onclick = () => {
  store.del('stat_session'); me = null;
  $('appView').classList.add('hidden'); $('authView').classList.remove('hidden');
  $('loginPane').reset(); pane('login');
};
const save = () => { store.set('stat_data_' + me, rows); render(); };

$('entryForm').onsubmit = e => {
  e.preventDefault();
  rows.push({ d:$('eDate').value, c:$('eCat').value.trim(), n:$('eName').value.trim(), v:parseFloat($('eVal').value) });
  $('eName').value = ''; $('eVal').value = ''; save();
};

const fmt = n => Number(n).toLocaleString('en-US', {maximumFractionDigits:2});

function render(){
  const q = $('search').value.trim();
  const list = rows.map((r,i) => ({...r,i})).filter(r => !q || (r.c+r.n+r.d).includes(q));
  $('tbody').innerHTML = list.map(r =>
    `<tr><td>${r.i+1}</td><td>${esc(r.d)}</td><td>${esc(r.c)}</td><td>${esc(r.n)}</td><td>${fmt(r.v)}</td>
     <td><button class="sec" onclick="delRow(${r.i})">حذف</button></td></tr>`).join('')
    || '<tr><td colspan="6" style="text-align:center;color:var(--mut)">لا توجد بيانات</td></tr>';
  const sum = rows.reduce((a,r) => a + r.v, 0);
  $('kCount').textContent = rows.length;
  $('kSum').textContent = fmt(sum);
  $('kAvg').textContent = rows.length ? fmt(sum/rows.length) : 0;
  $('kMax').textContent = rows.length ? fmt(Math.max(...rows.map(r => r.v))) : 0;
  const by = {}; rows.forEach(r => by[r.c] = (by[r.c]||0) + r.v);
  $('cats').innerHTML = Object.keys(by).map(c => `<option value="${esc(c)}">`).join('');
  if(chart) chart.destroy();
  chart = new Chart($('chart'), {
    type:'bar',
    data:{ labels:Object.keys(by), datasets:[{ label:'المجموع', data:Object.values(by), backgroundColor:'#2f6fed', borderRadius:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } } }
  });
}
window.delRow = i => { rows.splice(i,1); save(); };
$('search').oninput = render;
$('clearBtn').onclick = () => { if(rows.length && confirm('حذف كل السجلات؟')){ rows = []; save(); } };

/* ===== Excel ===== */
function toDate(v){
  if(typeof v === 'number'){ const p = XLSX.SSF.parse_date_code(v); if(p) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`; }
  const d = new Date(v); return isNaN(d) ? String(v||'') : d.toISOString().slice(0,10);
}
const pick = (o, keys) => { for(const k of keys){ if(o[k] !== undefined && o[k] !== '') return o[k]; } return ''; };

$('importBtn').onclick = () => {
  const f = $('xlsFile').files[0];
  if(!f) return showMsg('appMsg', 'اختر ملف Excel أولاً', 'err');
  const rd = new FileReader();
  rd.onload = ev => {
    try{
      const wb = XLSX.read(ev.target.result, {type:'array'});
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      let ok = 0;
      data.forEach(o => {
        const v = parseFloat(pick(o, ['القيمة','value','Value']));
        if(isNaN(v)) return;
        rows.push({ d:toDate(pick(o, ['التاريخ','date','Date'])), c:String(pick(o, ['التصنيف','category','Category']) || 'عام'),
                    n:String(pick(o, ['البيان','name','Name']) ), v });
        ok++;
      });
      save(); $('xlsFile').value = '';
      showMsg('appMsg', `تم استيراد ${ok} سجل من أصل ${data.length}`, ok ? 'ok' : 'err');
    }catch(err){ showMsg('appMsg', 'تعذر قراءة الملف', 'err'); }
  };
  rd.readAsArrayBuffer(f);
};

function download(wb, name){
  try{ XLSX.writeFile(wb, name); }
  catch(e){ showMsg('appMsg', 'التنزيل غير متاح داخل هذه الصفحة المنشورة، افتحها في نافذة مستقلة', 'err'); }
}
$('tplBtn').onclick = () => {
  const ws = XLSX.utils.aoa_to_sheet([['التاريخ','التصنيف','البيان','القيمة'],['2026-01-01','مبيعات','مثال',100]]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'بيانات'); download(wb, 'نموذج-الإحصائيات.xlsx');
};
$('expBtn').onclick = () => {
  const ws = XLSX.utils.json_to_sheet(rows.map(r => ({'التاريخ':r.d,'التصنيف':r.c,'البيان':r.n,'القيمة':r.v})));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'بيانات'); download(wb, 'الإحصائيات.xlsx');
};

init();