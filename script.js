// ====== DEFAULTS =======
const DEFAULT_SETTINGS = {
  sanc_load_default: 5,
  fixed_per_kw: 190,
  energy_mode: 'flat', // 'flat' or 'slab'
  flat_rate: 6.75,
  slab_rates: [4.15,5.60,7.15,8.20,9.10], // if slab mode
  slab_caps: [50,50,100,100,Infinity],
  fppca_rate: 0.36,
  pg_rate: 0.36,
  tax_percent: 9,
  warn_threshold_percent: 30
};

const SETTINGS_KEY = 'bescom_settings_v2';
const HISTORY_KEY = 'bescom_history_v2'; // store recent months of units/readings

// ====== STATE ======
let applianceCount = 0;
let pendingConfirm = null; // store {units, summaryHtml, proceedCallback}

// ====== ON LOAD ======
window.addEventListener('load', () => {
  loadSettingsToUI();
  switchMode();
  switchEnergyMode();
  renderHistory();
});

// ====== SETTINGS STORAGE ======
function loadSettingsToUI(){
  const stored = localStorage.getItem(SETTINGS_KEY);
  const s = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

  document.getElementById('sanc_load').value = s.sanc_load_default || DEFAULT_SETTINGS.sanc_load_default;
  document.getElementById('fixed').value = s.fixed_per_kw ?? DEFAULT_SETTINGS.fixed_per_kw;
  document.getElementById('duty').value = s.tax_percent ?? DEFAULT_SETTINGS.tax_percent;
  document.getElementById('fppca_rate').value = s.fppca_rate ?? DEFAULT_SETTINGS.fppca_rate;
  document.getElementById('pg_rate').value = s.pg_rate ?? DEFAULT_SETTINGS.pg_rate;
  document.getElementById('flat_rate').value = s.flat_rate ?? DEFAULT_SETTINGS.flat_rate;
  document.getElementById('energy_mode').value = s.energy_mode ?? DEFAULT_SETTINGS.energy_mode;

  // slab
  document.getElementById('slab1_rate').value = s.slab_rates[0] ?? DEFAULT_SETTINGS.slab_rates[0];
  document.getElementById('slab2_rate').value = s.slab_rates[1] ?? DEFAULT_SETTINGS.slab_rates[1];
  document.getElementById('slab3_rate').value = s.slab_rates[2] ?? DEFAULT_SETTINGS.slab_rates[2];
  document.getElementById('slab4_rate').value = s.slab_rates[3] ?? DEFAULT_SETTINGS.slab_rates[3];
  document.getElementById('slab5_rate').value = s.slab_rates[4] ?? DEFAULT_SETTINGS.slab_rates[4];

  document.getElementById('sanc_default').value = s.sanc_load_default ?? DEFAULT_SETTINGS.sanc_load_default;
  document.getElementById('warn_threshold').value = s.warn_threshold_percent ?? DEFAULT_SETTINGS.warn_threshold_percent;
}

function saveSettings(){
  const s = {
    sanc_load_default: parseFloat(document.getElementById('sanc_default').value) || DEFAULT_SETTINGS.sanc_load_default,
    fixed_per_kw: parseFloat(document.getElementById('fixed').value) || DEFAULT_SETTINGS.fixed_per_kw,
    energy_mode: document.getElementById('energy_mode').value || DEFAULT_SETTINGS.energy_mode,
    flat_rate: parseFloat(document.getElementById('flat_rate').value) || DEFAULT_SETTINGS.flat_rate,
    slab_rates: [
      parseFloat(document.getElementById('slab1_rate').value) || DEFAULT_SETTINGS.slab_rates[0],
      parseFloat(document.getElementById('slab2_rate').value) || DEFAULT_SETTINGS.slab_rates[1],
      parseFloat(document.getElementById('slab3_rate').value) || DEFAULT_SETTINGS.slab_rates[2],
      parseFloat(document.getElementById('slab4_rate').value) || DEFAULT_SETTINGS.slab_rates[3],
      parseFloat(document.getElementById('slab5_rate').value) || DEFAULT_SETTINGS.slab_rates[4],
    ],
    fppca_rate: parseFloat(document.getElementById('fppca_rate').value) || DEFAULT_SETTINGS.fppca_rate,
    pg_rate: parseFloat(document.getElementById('pg_rate').value) || DEFAULT_SETTINGS.pg_rate,
    tax_percent: parseFloat(document.getElementById('duty').value) || DEFAULT_SETTINGS.tax_percent,
    warn_threshold_percent: parseFloat(document.getElementById('warn_threshold').value) || DEFAULT_SETTINGS.warn_threshold_percent
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  alert('Settings saved to browser (localStorage).');
}

function resetSettings(){
  if(!confirm('Reset tariff settings to defaults?')) return;
  localStorage.removeItem(SETTINGS_KEY);
  loadSettingsToUI();
  alert('Settings reset to defaults.');
}

// export/import
function exportSettings(){
  const stored = localStorage.getItem(SETTINGS_KEY) || JSON.stringify(DEFAULT_SETTINGS);
  const blob = new Blob([stored], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bescom-settings.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importSettingsPrompt(){
  const str = prompt('Paste exported JSON here:');
  if(!str) return;
  try {
    const parsed = JSON.parse(str);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
    loadSettingsToUI();
    alert('Imported settings successfully.');
  } catch(e){
    alert('Invalid JSON.');
  }
}

// ====== HISTORY ======
function pushToHistory(prev, curr, units){
  const stored = localStorage.getItem(HISTORY_KEY);
  const arr = stored ? JSON.parse(stored) : [];
  // push {prev, curr, units, timestamp}
  arr.unshift({prev: prev, curr: curr, units: units, t: Date.now()});
  // keep max 12 months
  if(arr.length > 24) arr.splice(24);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
  renderHistory();
}
function renderHistory(){
  const list = document.getElementById('historyList');
  const stored = localStorage.getItem(HISTORY_KEY);
  if(!stored){ list.innerHTML = '<em>No saved readings yet.</em>'; return; }
  const arr = JSON.parse(stored);
  if(arr.length===0){ list.innerHTML = '<em>No saved readings yet.</em>'; return; }
  let html = '<ol>';
  arr.slice(0,12).forEach(item=>{
    const d = new Date(item.t);
    html += `<li>${d.toLocaleDateString()}: Prev ${item.prev} → Curr ${item.curr} → Units ${item.units.toFixed(2)}</li>`;
  });
  html += '</ol>';
  list.innerHTML = html;
}
function clearHistory(){
  if(!confirm('Clear saved meter history?')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

// ====== UI MODE SWITCH ======
function switchMode(){
  const mode = document.getElementById('mode').value;
  document.querySelectorAll('.mode-inputs').forEach(div=>div.style.display='none');
  if(mode==='kwh') document.getElementById('kwhInputs').style.display='block';
  else if(mode==='kvah') document.getElementById('kvahInputs').style.display='block';
  else if(mode==='appliances') document.getElementById('appliancesInputs').style.display='block';
}

function switchEnergyMode(){
  const em = document.getElementById('energy_mode').value;
  if(em === 'flat'){
    document.getElementById('flatRateBlock').style.display='block';
    document.getElementById('slabRateBlock').style.display='none';
  } else {
    document.getElementById('flatRateBlock').style.display='none';
    document.getElementById('slabRateBlock').style.display='block';
  }
}

// ====== APPLIANCES ======
function addAppliance(){
  applianceCount++;
  const list = document.getElementById('applianceList');
  const div = document.createElement('div');
  div.id = 'appliance' + applianceCount;
  div.style.marginTop = '8px';
  div.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <input type="text" class="appliance-name" placeholder="Name (optional)" style="flex:2;padding:6px;border-radius:6px;border:1px solid #ddd">
      <input type="number" class="watt" placeholder="W" style="width:80px;padding:6px;border-radius:6px;border:1px solid #ddd">
      <input type="number" class="hours" placeholder="hrs/day" style="width:90px;padding:6px;border-radius:6px;border:1px solid #ddd">
      <input type="number" class="days" placeholder="days/month" style="width:90px;padding:6px;border-radius:6px;border:1px solid #ddd">
      <button type="button" onclick="removeAppliance('${div.id}')" class="mini-btn">Remove</button>
    </div>
  `;
  list.appendChild(div);
}
function removeAppliance(id){
  const el = document.getElementById(id);
  if(el) el.remove();
}

// ====== CALCULATION ======
function calculateBill(){
  // load settings
  const stored = localStorage.getItem(SETTINGS_KEY);
  const s = stored ? JSON.parse(stored) : DEFAULT_SETTINGS;

  // current overrides
  const sanc_load = parseFloat(document.getElementById('sanc_load').value) || s.sanc_load_default;
  const fixed_per_kw = parseFloat(document.getElementById('fixed').value) || s.fixed_per_kw;
  const tax_percent = parseFloat(document.getElementById('duty').value) || s.tax_percent;

  const energy_mode = document.getElementById('energy_mode').value || s.energy_mode;
  const flat_rate = parseFloat(document.getElementById('flat_rate').value) || s.flat_rate;
  const slab_rates = [
    parseFloat(document.getElementById('slab1_rate').value) || s.slab_rates[0],
    parseFloat(document.getElementById('slab2_rate').value) || s.slab_rates[1],
    parseFloat(document.getElementById('slab3_rate').value) || s.slab_rates[2],
    parseFloat(document.getElementById('slab4_rate').value) || s.slab_rates[3],
    parseFloat(document.getElementById('slab5_rate').value) || s.slab_rates[4],
  ];
  const slab_caps = s.slab_caps;
  const fppca_rate = parseFloat(document.getElementById('fppca_rate').value) || s.fppca_rate;
  const pg_rate = parseFloat(document.getElementById('pg_rate').value) || s.pg_rate;
  const tax_base = document.getElementById('tax_base').value || 'energy';
  const warn_threshold = parseFloat(document.getElementById('warn_threshold').value) || s.warn_threshold_percent;

  // compute units based on mode
  const mode = document.getElementById('mode').value;
  let units = 0;
  let debugText = `Mode: ${mode}\n`;

  if(mode === 'kwh'){
    const prev = parseFloat(document.getElementById('prev').value);
    const curr = parseFloat(document.getElementById('curr').value);
    debugText += `Prev: ${prev} | Curr: ${curr}\n`;
    if(isNaN(prev) || isNaN(curr)){ showError('Enter valid meter readings.'); return; }
    if(curr < prev){ showError('Current reading must be greater than previous.'); return; }
    units = curr - prev;
  } else if(mode === 'kvah'){
    const kvah = parseFloat(document.getElementById('kvah').value);
    const pf = parseFloat(document.getElementById('pf').value) || 0.9;
    debugText += `kVAh: ${kvah} | PF: ${pf}\n`;
    if(isNaN(kvah)){ showError('Enter valid kVAh reading.'); return; }
    units = kvah * pf;
  } else if(mode === 'appliances'){
    const watts = document.querySelectorAll('.watt');
    const hours = document.querySelectorAll('.hours');
    const days = document.querySelectorAll('.days');
    if(watts.length === 0){ showError('Add at least one appliance.'); return; }
    for(let i=0;i<watts.length;i++){
      const w = parseFloat(watts[i].value) || 0;
      const h = parseFloat(hours[i].value) || 0;
      const d = parseFloat(days[i].value) || 0;
      units += (w * h * d) / 1000;
    }
    debugText += `Appliances used: ${watts.length}\n`;
  }

  // debug area
  document.getElementById('debug').innerText = debugText + `Computed units: ${units.toFixed(2)} kWh`;

  // compute expected average from history
  const avg = computeAverageUnits();
  const differencePercent = avg === 0 ? 0 : Math.abs((units - avg) / avg) * 100;

  // if difference is large, show confirm modal
  if(avg > 0 && differencePercent > warn_threshold){
    // show modal and wait for confirmation
    const text = `Your average monthly consumption (from saved history) is ${avg.toFixed(2)} units.\n` +
                 `This reading gives ${units.toFixed(2)} units — a ${differencePercent.toFixed(1)}% difference.\n\n` +
                 `Do you want to proceed with this reading?`;
    showConfirm(text, () => {
      // on confirm proceed
      finalizeCalculation(units, {sanc_load, fixed_per_kw, slab_caps, slab_rates, flat_rate, energy_mode, fppca_rate, pg_rate, tax_percent, tax_base});
      // save to history if kwh mode
      if(mode === 'kwh'){
        const prev = parseFloat(document.getElementById('prev').value);
        const curr = parseFloat(document.getElementById('curr').value);
        pushToHistory(prev, curr, units);
      }
    });
    return;
  }

  // otherwise proceed immediately
  finalizeCalculation(units, {sanc_load, fixed_per_kw, slab_caps, slab_rates, flat_rate, energy_mode, fppca_rate, pg_rate, tax_percent, tax_base});
  if(mode === 'kwh'){
    const prev = parseFloat(document.getElementById('prev').value);
    const curr = parseFloat(document.getElementById('curr').value);
    pushToHistory(prev, curr, units);
  }
}

// compute average units from history
function computeAverageUnits(){
  const stored = localStorage.getItem(HISTORY_KEY);
  if(!stored) return 0;
  const arr = JSON.parse(stored);
  if(arr.length === 0) return 0;
  const sum = arr.reduce((acc,it) => acc + (parseFloat(it.units)||0), 0);
  return sum / arr.length;
}

// finalize calculation & render
function finalizeCalculation(units, opts){
  const {sanc_load, fixed_per_kw, slab_caps, slab_rates, flat_rate, energy_mode, fppca_rate, pg_rate, tax_percent, tax_base} = opts;

  const fixed_charges = sanc_load * fixed_per_kw;

  // energy calculation
  let energy = 0;
  let breakdown = [];

  if(energy_mode === 'flat'){
    energy = units * flat_rate;
    breakdown.push({units: units, rate: flat_rate, charge: energy});
  } else {
    // slab-wise
    let remaining = units;
    for(let i=0;i<slab_caps.length;i++){
      const cap = slab_caps[i];
      const take = Math.min(remaining, cap);
      const rate = slab_rates[i] || DEFAULT_SETTINGS.slab_rates[i] || 0;
      const charge = take * rate;
      if(take > 0) breakdown.push({units: take, rate: rate, charge: charge});
      energy += charge;
      remaining -= take;
      if(remaining <= 0) break;
    }
  }

  const fppca = units * fppca_rate;
  const pg_surcharge = units * pg_rate;

  // tax base
  let tax = 0;
  if(tax_base === 'energy') tax = energy * (tax_percent/100);
  else if(tax_base === 'subtotal') tax = (fixed_charges + energy + fppca + pg_surcharge) * (tax_percent/100);
  else tax = 0;

  const subtotal = fixed_charges + energy + fppca + pg_surcharge;
  const total = subtotal + tax;
  const totalRounded = Math.round(total);

  // render
  let breakdownHTML = '<ul>';
  breakdown.forEach(s => breakdownHTML += `<li>${s.units.toFixed(2)} units × ₹${s.rate.toFixed(2)} = ₹${s.charge.toFixed(2)}</li>`);
  breakdownHTML += '</ul>';

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `
    ${units>1000 ? `<p style="color:red">⚠️ Very high consumption — check meter and readings.</p>` : ''}
    <p>Units Consumed: <strong>${units.toFixed(2)} kWh</strong></p>
    <p>Fixed Charges: <strong>₹${fixed_charges.toFixed(2)}</strong> (sanctioned load ${sanc_load} kW × ₹${fixed_per_kw}/kW)</p>
    <p>Energy Charge: <strong>₹${energy.toFixed(2)}</strong></p>
    <p>FPPCA (${fppca_rate}): <strong>₹${fppca.toFixed(2)}</strong></p>
    <p>P &amp; G Surcharge (${pg_rate}): <strong>₹${pg_surcharge.toFixed(2)}</strong></p>
    <p>Tax (${tax_percent}% on ${tax_base}): <strong>₹${tax.toFixed(2)}</strong></p>
    <p>Subtotal (before tax): <strong>₹${subtotal.toFixed(2)}</strong></p>
    <p class="total">Total Payable (exact): <strong>₹${total.toFixed(2)}</strong></p>
    <p class="total">Total Payable (rounded): <strong>₹${totalRounded}</strong></p>
    <hr>
    <p><strong>Slab-wise Breakdown:</strong></p>
    ${breakdownHTML}
  `;
}

// ====== CONFIRMATION MODAL ======
function showConfirm(text, onProceed){
  pendingConfirm = {text, onProceed};
  document.getElementById('confirmText').innerText = text;
  document.getElementById('confirmModal').style.display = 'flex';
}
function confirmProceed(){
  if(!pendingConfirm) return;
  const cb = pendingConfirm.onProceed;
  pendingConfirm = null;
  document.getElementById('confirmModal').style.display = 'none';
  cb();
}
function cancelProceed(){
  pendingConfirm = null;
  document.getElementById('confirmModal').style.display = 'none';
}

// ====== UTIL ======
function showError(msg){
  document.getElementById('result').innerHTML = `<p style="color:red">${msg}</p>`;
}
