// Proteksi dasar - ini CUMA nge-deterrent orang awam, bukan proteksi absolut.
// Source tetep bisa diambil lewat DevTools/Network tab oleh yang paham teknis.
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'f12') e.preventDefault();
  if (e.ctrlKey && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) e.preventDefault();
  if (e.ctrlKey && k === 'u') e.preventDefault();
});

const $ = id => document.getElementById(id);

// ================= Server Backend =================
// Ganti URL di bawah ini langsung di kode kalau backend (Termux/Cloudflare Tunnel/dst)
// kamu pindah domain. Kosongin '' kalau compiler.html ini di-host BARENG backend-nya
// (satu domain yang sama, misal Netlify Functions).
// Sekarang backend (Netlify Functions) satu domain sama frontend ini,
// jadi CONST_SERVER_URL dikosongin aja, gak perlu isi domain tunnel lagi.
const CONST_SERVER_URL = '';

const API_BASE = CONST_SERVER_URL.replace(/\/$/, '') + '/api';

function apiHeaders(extra={}){
  return extra;
}

// load saved app name/package/versi
['appName','pkgName','appVersion'].forEach(id=>{
  const v = localStorage.getItem(id);
  if(v) $(id).value = v;
});
if(!$('appVersion').value) $('appVersion').value = '1.0';

// ====== Daftar izin android yang bisa dipilih ======
const PERMISSIONS = [
  { manifest:'android.permission.INTERNET', label:'Internet', desc:'Akses ke internet' },
  { manifest:'android.permission.ACCESS_NETWORK_STATE', label:'Status Jaringan', desc:'Cek koneksi internet aktif/tidak' },
  { manifest:'android.permission.CAMERA', label:'Kamera / Senter', desc:'Akses kamera, termasuk nyalain senter (flash)' },
  { manifest:'android.permission.RECORD_AUDIO', label:'Mikrofon', desc:'Rekam suara / akses mikrofon' },
  { manifest:'android.permission.ACCESS_COARSE_LOCATION', label:'Lokasi (Perkiraan)', desc:'Lokasi perkiraan berbasis jaringan' },
  { manifest:'android.permission.ACCESS_FINE_LOCATION', label:'Lokasi (Presisi)', desc:'Lokasi presisi berbasis GPS' },
  { manifest:'android.permission.ACCESS_BACKGROUND_LOCATION', label:'Lokasi Latar Belakang', desc:'Akses lokasi walau app ditutup' },
  { manifest:'android.permission.READ_EXTERNAL_STORAGE', label:'Baca Penyimpanan', desc:'Baca file di penyimpanan device' },
  { manifest:'android.permission.WRITE_EXTERNAL_STORAGE', label:'Tulis Penyimpanan', desc:'Simpan file ke penyimpanan device' },
  { manifest:'android.permission.READ_MEDIA_IMAGES', label:'Baca Foto/Gambar', desc:'Akses galeri foto (Android 13+)' },
  { manifest:'android.permission.READ_MEDIA_VIDEO', label:'Baca Video', desc:'Akses galeri video (Android 13+)' },
  { manifest:'android.permission.READ_CONTACTS', label:'Baca Kontak', desc:'Akses daftar kontak' },
  { manifest:'android.permission.WRITE_CONTACTS', label:'Tulis Kontak', desc:'Tambah/ubah kontak' },
  { manifest:'android.permission.READ_CALENDAR', label:'Baca Kalender', desc:'Akses event kalender' },
  { manifest:'android.permission.WRITE_CALENDAR', label:'Tulis Kalender', desc:'Tambah/ubah event kalender' },
  { manifest:'android.permission.SEND_SMS', label:'Kirim SMS', desc:'Kirim pesan SMS' },
  { manifest:'android.permission.READ_SMS', label:'Baca SMS', desc:'Baca pesan SMS masuk' },
  { manifest:'android.permission.CALL_PHONE', label:'Panggil Telepon', desc:'Lakukan panggilan telepon langsung' },
  { manifest:'android.permission.READ_PHONE_STATE', label:'Status Telepon', desc:'Baca status & info nomor telepon' },
  { manifest:'android.permission.READ_CALL_LOG', label:'Riwayat Panggilan', desc:'Baca log panggilan masuk/keluar' },
  { manifest:'android.permission.POST_NOTIFICATIONS', label:'Notifikasi', desc:'Kirim notifikasi ke user (Android 13+)' },
  { manifest:'android.permission.SYSTEM_ALERT_WINDOW', label:'Tampil di Atas Aplikasi Lain', desc:'Overlay / alert window (floating widget)' },
  { manifest:'android.permission.VIBRATE', label:'Getar', desc:'Aktifkan getar device' },
  { manifest:'android.permission.BLUETOOTH_CONNECT', label:'Bluetooth Connect', desc:'Sambung ke perangkat bluetooth' },
  { manifest:'android.permission.BLUETOOTH_SCAN', label:'Bluetooth Scan', desc:'Cari perangkat bluetooth sekitar' },
  { manifest:'android.permission.ACCESS_WIFI_STATE', label:'Status Wi-Fi', desc:'Cek status koneksi Wi-Fi' },
  { manifest:'android.permission.CHANGE_WIFI_STATE', label:'Ubah Wi-Fi', desc:'Nyalain/matiin atau ubah koneksi Wi-Fi' },
  { manifest:'android.permission.RECEIVE_BOOT_COMPLETED', label:'Auto-start Saat Boot', desc:'Jalan otomatis pas device baru nyala' },
  { manifest:'android.permission.WAKE_LOCK', label:'Wake Lock', desc:'Cegah device tidur/layar mati' },
  { manifest:'android.permission.USE_BIOMETRIC', label:'Biometrik / Fingerprint', desc:'Autentikasi sidik jari / wajah' },
  { manifest:'android.permission.BODY_SENSORS', label:'Sensor Tubuh', desc:'Akses sensor detak jantung dll' },
  { manifest:'android.permission.NFC', label:'NFC', desc:'Akses fitur NFC' },
  { manifest:'android.permission.FOREGROUND_SERVICE', label:'Foreground Service', desc:'Jalanin proses/layanan di background terus' },
];

let selectedPermissions = JSON.parse(localStorage.getItem('selectedPermissions') || '[]');

function isPermSelected(m){ return selectedPermissions.includes(m); }

function renderPermList(filter=''){
  const box = $('permList');
  const f = filter.trim().toLowerCase();
  const items = PERMISSIONS.filter(p => !f || p.label.toLowerCase().includes(f) || p.desc.toLowerCase().includes(f) || p.manifest.toLowerCase().includes(f));
  if(items.length === 0){
    box.innerHTML = '<div class="perm-empty">Izin gak ketemu.</div>';
    return;
  }
  box.innerHTML = items.map(p => {
    const checked = isPermSelected(p.manifest) ? 'checked' : '';
    return '<label class="perm-item">' +
      '<input type="checkbox" data-perm="' + p.manifest + '" ' + checked + '>' +
      '<div><div class="perm-name">' + p.label + '</div><div class="perm-desc">' + p.desc + '</div></div>' +
    '</label>';
  }).join('');
  box.querySelectorAll('input[type=checkbox]').forEach(cb => {
    cb.onchange = () => {
      const m = cb.dataset.perm;
      if(cb.checked){ if(!selectedPermissions.includes(m)) selectedPermissions.push(m); }
      else { selectedPermissions = selectedPermissions.filter(x => x !== m); }
      localStorage.setItem('selectedPermissions', JSON.stringify(selectedPermissions));
      renderPermSelected();
    };
  });
}

function renderPermSelected(){
  const box = $('permSelected');
  if(selectedPermissions.length === 0){ box.innerHTML = ''; return; }
  box.innerHTML = selectedPermissions.map(m => {
    const meta = PERMISSIONS.find(p => p.manifest === m);
    const label = meta ? meta.label : m;
    return '<span class="perm-chip">' + label + '<button data-perm="' + m + '">&times;</button></span>';
  }).join('');
  box.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const m = btn.dataset.perm;
      selectedPermissions = selectedPermissions.filter(x => x !== m);
      localStorage.setItem('selectedPermissions', JSON.stringify(selectedPermissions));
      renderPermSelected();
      renderPermList($('permSearch').value);
    };
  });
}

$('permSearch').oninput = (e) => renderPermList(e.target.value);
renderPermList();
renderPermSelected();

// ====== Batas compile harian ======
const DAILY_LIMIT = 3;
function getTodayKey(){ return new Date().toISOString().slice(0,10); }
function getLimitData(){
  let data;
  try{ data = JSON.parse(localStorage.getItem('compileLimit') || '{}'); }
  catch(e){ data = {}; }
  if(data.date !== getTodayKey()) data = { date: getTodayKey(), count: 0 };
  return data;
}
function getCompileCountToday(){ return getLimitData().count; }
function incCompileCountToday(){
  const data = getLimitData();
  data.count++;
  localStorage.setItem('compileLimit', JSON.stringify(data));
  renderLimitBar();
}
function renderLimitBar(){
  const count = getCompileCountToday();
  const pct = Math.min(100, (count / DAILY_LIMIT) * 100);
  const fill = $('limitBarFill');
  fill.style.width = pct + '%';
  fill.classList.toggle('full', count >= DAILY_LIMIT);
  $('limitCountLabel').textContent = count + '/' + DAILY_LIMIT;
  $('compileBtn').disabled = count >= DAILY_LIMIT;
}
renderLimitBar();

// ====== Progress bar compile ======
function setCompileProgress(pct, stage){
  $('compileBarFill').style.width = Math.min(100, Math.max(0, pct)) + '%';
  $('progressPercent').textContent = Math.round(Math.min(100, Math.max(0, pct))) + '%';
  if(stage) $('progressStage').textContent = stage;
}

// ====== Modal info APK ======
function formatBytes(bytes){
  if(!bytes && bytes !== 0) return '-';
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(2) + ' MB';
}
function openInfoModal(entry){
  $('modalAppName').textContent = entry.appName;
  const iconWrap = $('modalIconWrap');
  if(entry.iconThumb){
    iconWrap.innerHTML = '<img src="' + entry.iconThumb + '">';
  } else {
    iconWrap.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  }
  const rows = [
    ['Nama APK', entry.appName],
    ['Package', entry.pkgName || '-'],
    ['Versi', entry.version || '-'],
    ['Ukuran', formatBytes(entry.sizeBytes)],
    ['Dibuat', entry.date],
    ['Sumber', entry.mode === 'url' ? 'Link Web' : 'File HTML'],
    ['Status', entry.status === 'success' ? 'Sukses' : 'Gagal']
  ];
  $('modalBody').innerHTML = rows.map(r =>
    '<div class="info-row"><span class="k">' + r[0] + '</span><span class="v">' + String(r[1]).replace(/</g,'&lt;') + '</span></div>'
  ).join('');
  $('infoModal').classList.add('show');
}
$('modalCloseBtn').onclick = () => $('infoModal').classList.remove('show');
$('infoModal').onclick = (e) => { if(e.target.id === 'infoModal') $('infoModal').classList.remove('show'); };

// ====== Download ulang dari riwayat ======
async function redownloadEntry(entry){
  if(!entry.runId){ log('Data run build lama gak ada, gak bisa download ulang.', 'err'); return; }
  log('Ambil ulang APK "' + entry.appName + '" dari server...', 'info');
  try{
    const zipRes = await apiFetch('/download-artifact?runId=' + entry.runId);
    if(!zipRes.ok){ log('Artifact udah gak ada (mungkin expired).', 'err'); return; }
    const zipBlob = await zipRes.blob();
    const zip = await JSZip.loadAsync(zipBlob);
    const apkFileName = Object.keys(zip.files).find(n => n.endsWith('.apk'));
    if(!apkFileName){ log('File .apk gak ketemu di artifact.', 'err'); return; }
    const apkBlob = await zip.files[apkFileName].async('blob');
    const url = URL.createObjectURL(apkBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = entry.appName + '.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
    log('Download ulang berhasil.', 'ok');
  }catch(e){
    log('Gagal download ulang: ' + e.message, 'err');
  }
}

// tab switching
let currentMode = 'url';
document.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.mode-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    currentMode = tab.dataset.mode;
    $('panel-'+currentMode).classList.add('active');
  };
});

$('fileBtnLabel').onclick = () => $('htmlFile').click();
$('htmlFile').onchange = (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => { $('htmlInput').value = reader.result; };
  reader.readAsText(f);
};

// icon upload - resize jadi 192x192 PNG base64 lewat canvas
let iconBase64 = null;
$('iconBtnLabel').onclick = () => $('iconFile').click();
$('iconFile').onchange = (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const img = new Image();
  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      const size = 192;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/png');
      iconBase64 = dataUrl.split(',')[1];
      $('iconPreview').innerHTML = '<img src="' + dataUrl + '">';
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
};

function log(msg, cls, iconSvg){
  $('logCard').style.display = 'block';
  const d = document.createElement('div');
  if(cls) d.className = cls;
  const icons = {
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    err: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };
  d.innerHTML = (icons[cls] || icons.info) + '<span>' + msg.replace(/</g,'&lt;') + '</span>';
  $('logBox').appendChild(d);
  $('logBox').scrollTop = $('logBox').scrollHeight;
}

function b64EncodeUnicode(str){
  return btoa(unescape(encodeURIComponent(str)));
}

async function apiFetch(path, opts={}){
  const res = await fetch(API_BASE + path, { ...opts, headers: apiHeaders(opts.headers || {}) });
  return res;
}

// riwayat compile - disimpan di localStorage
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem('compileHistory') || '[]'); }
  catch(e){ return []; }
}
function saveHistoryEntry(entry){
  const hist = loadHistory();
  hist.unshift(entry);
  while(hist.length > 20) hist.pop();
  localStorage.setItem('compileHistory', JSON.stringify(hist));
  renderHistory();
}
function renderHistory(){
  const hist = loadHistory();
  const box = $('historyList');
  if(hist.length === 0){
    box.innerHTML = '<div class="h-empty">Belum ada riwayat compile.</div>';
    return;
  }
  box.innerHTML = hist.map((h, i) => {
    const okIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    const errIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
    const infoIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
    const dlIcon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 12l5 5 5-5"/><path d="M5 21h14"/></svg>';
    const statusCls = h.status === 'success' ? 'ok' : 'err';
    const modeLabel = h.mode === 'url' ? 'Link' : 'HTML';
    const canRedownload = h.status === 'success' && h.runId;
    return '<div class="history-item">' +
      '<div class="h-status ' + statusCls + '">' + (h.status === 'success' ? okIcon : errIcon) + '</div>' +
      '<div class="h-body">' +
        '<div class="h-name">' + h.appName.replace(/</g,'&lt;') + '</div>' +
        '<div class="h-meta"><span>' + modeLabel + '</span><span>' + h.date + '</span></div>' +
      '</div>' +
      '<div class="h-actions">' +
        '<div class="h-btn" data-info="' + i + '" title="Info APK">' + infoIcon + '</div>' +
        (canRedownload ? '<div class="h-btn" data-redownload="' + i + '" title="Download ulang">' + dlIcon + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  box.querySelectorAll('[data-info]').forEach(btn => {
    btn.onclick = () => openInfoModal(hist[Number(btn.dataset.info)]);
  });
  box.querySelectorAll('[data-redownload]').forEach(btn => {
    btn.onclick = () => redownloadEntry(hist[Number(btn.dataset.redownload)]);
  });
}
renderHistory();

$('compileBtn').onclick = async () => {
  if(getCompileCountToday() >= DAILY_LIMIT){
    log('Kuota compile hari ini udah habis (maks ' + DAILY_LIMIT + 'x). Coba lagi besok.', 'err');
    return;
  }

  const appName = $('appName').value.trim() || 'MyApp';
  const pkgName = $('pkgName').value.trim() || 'com.abidstudio.myapp';
  const version = $('appVersion').value.trim() || '1.0';

  localStorage.setItem('appName', appName);
  localStorage.setItem('pkgName', pkgName);
  localStorage.setItem('appVersion', version);

  let mode, content;
  if(currentMode === 'url'){
    mode = 'url';
    content = $('urlInput').value.trim();
    if(!content){ log('Isi dulu URL-nya.', 'err'); return; }
  } else {
    mode = 'html';
    const raw = $('htmlInput').value;
    if(!raw.trim()){ log('Tempel/upload HTML dulu.', 'err'); return; }
    content = b64EncodeUnicode(raw);
  }

  $('compileBtn').disabled = true;
  $('logBox').innerHTML = '';
  $('dlBox').style.display = 'none';
  setCompileProgress(5, 'Mengirim trigger build...');
  log('Mengirim trigger build ke GitHub Actions...', 'info');

  const triggerTime = new Date();
  const dateLabel = triggerTime.toLocaleString('id-ID', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});

  let historySaved = false;
  function finishHistory(status, extra={}){
    if(historySaved) return;
    historySaved = true;
    saveHistoryEntry({
      appName, pkgName, version, mode, date: dateLabel, status,
      iconThumb: iconBase64 ? ('data:image/png;base64,' + iconBase64) : null,
      ...extra
    });
  }

  try{
    const payload = { app_name: appName, package_name: pkgName, version, mode, content, permissions: selectedPermissions };
    if(iconBase64) payload.icon_b64 = iconBase64;

    const dispatchRes = await apiFetch('/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if(!dispatchRes.ok){
      let errMsg = 'HTTP ' + dispatchRes.status;
      try {
        const errData = await dispatchRes.json();
        if(errData.error) errMsg = errData.error;
      } catch(e) {
        errMsg = await dispatchRes.text();
      }
      log('Gagal trigger: ' + errMsg, 'err');
      setCompileProgress(100, 'Gagal');
      finishHistory('failure');
      $('compileBtn').disabled = false;
      return;
    }

    setCompileProgress(15, 'Nunggu workflow mulai...');
    log('Build dipicu. Nunggu workflow mulai jalan...', 'ok');
    incCompileCountToday(); // server udah makan kuota di titik ini, samain di client

    let runId = null;
    for(let i=0; i<15 && !runId; i++){
      setCompileProgress(15 + (i/15)*20, 'Nunggu workflow mulai... (' + (i+1) + '/15)');
      await new Promise(r=>setTimeout(r, 4000));
      const runsRes = await apiFetch('/find-run?since=' + encodeURIComponent(triggerTime.toISOString()));
      const runsData = await runsRes.json();
      if(runsData.runId) runId = runsData.runId;
    }

    if(!runId){
      log('Belum ketemu run-nya. Cek manual di tab Actions repo kamu.', 'err');
      setCompileProgress(100, 'Gagal');
      finishHistory('failure');
      $('compileBtn').disabled = false;
      return;
    }

    setCompileProgress(35, 'Build jalan (run #' + runId + ')...');
    log('Ketemu run #' + runId + '. Nunggu proses build selesai...', 'info');

    let done = false, conclusion = null, pollCount = 0;
    while(!done){
      pollCount++;
      setCompileProgress(Math.min(90, 35 + pollCount*3), 'Nge-build APK...');
      await new Promise(r=>setTimeout(r, 8000));
      const runRes = await apiFetch('/run-status?id=' + runId);
      const runData = await runRes.json();
      log('Status: ' + runData.status + (runData.conclusion ? ' / ' + runData.conclusion : ''), 'info');
      if(runData.status === 'completed'){
        done = true;
        conclusion = runData.conclusion;
      }
    }

    if(conclusion !== 'success'){
      log('Build gagal (' + conclusion + '). Cek log di tab Actions repo kamu.', 'err');
      setCompileProgress(100, 'Gagal');
      finishHistory('failure', { runId });
      $('compileBtn').disabled = false;
      return;
    }

    setCompileProgress(92, 'Build sukses, ambil APK...');
    log('Build sukses! Ambil APK...', 'ok');

    const zipRes = await apiFetch('/download-artifact?runId=' + runId);
    if(!zipRes.ok){
      log('Artifact APK tidak ketemu.', 'err');
      setCompileProgress(100, 'Gagal');
      finishHistory('failure', { runId });
      $('compileBtn').disabled = false;
      return;
    }
    const zipBlob = await zipRes.blob();
    const zip = await JSZip.loadAsync(zipBlob);
    const apkFileName = Object.keys(zip.files).find(n => n.endsWith('.apk'));
    if(!apkFileName){
      log('Gak nemu file .apk di dalam artifact.', 'err');
      setCompileProgress(100, 'Gagal');
      finishHistory('failure', { runId });
      $('compileBtn').disabled = false;
      return;
    }
    const apkBlob = await zip.files[apkFileName].async('blob');
    const url = URL.createObjectURL(apkBlob);
    $('dlLink').href = url;
    $('dlLink').download = appName + '.apk';
    $('dlBox').style.display = 'block';
    setCompileProgress(100, 'Selesai!');
    log('Selesai! Klik tombol download di atas.', 'ok');
    finishHistory('success', { runId, sizeBytes: apkBlob.size });

  }catch(e){
    log('Error: ' + e.message, 'err');
    setCompileProgress(100, 'Gagal');
    finishHistory('failure');
  }

  $('compileBtn').disabled = false;
  renderLimitBar();
};
