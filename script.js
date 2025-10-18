let applianceCount = 0;

// BESCOM slabs
const slabs = [
  { cap:50, rate:4.15 },
  { cap:50, rate:5.60 },
  { cap:100, rate:7.15 },
  { cap:100, rate:8.20 },
  { cap:Infinity, rate:9.10 }
];
const SCAM_THRESHOLD = 1000;

function switchMode() {
  const mode = document.getElementById("mode").value;
  document.querySelectorAll(".mode-inputs").forEach(div => div.style.display="none");
  if(mode==="kwh") document.getElementById("kwhInputs").style.display="block";
  else if(mode==="kvah") document.getElementById("kvahInputs").style.display="block";
  else if(mode==="appliances") document.getElementById("appliancesInputs").style.display="block";
}

function addAppliance() {
  applianceCount++;
  const list = document.getElementById("applianceList");
  const div = document.createElement("div");
  div.id = `appliance${applianceCount}`;
  div.innerHTML = `
    <h4>Appliance ${applianceCount}</h4>
    <label>Wattage (W):</label><input type="number" class="watt" placeholder="e.g. 100">
    <label>Hours/day:</label><input type="number" class="hours" placeholder="e.g. 5">
    <label>Days/month:</label><input type="number" class="days" placeholder="e.g. 30">
    <button type="button" onclick="removeAppliance('${div.id}')">Remove</button>
    <hr>`;
  list.appendChild(div);
}

function removeAppliance(id){ document.getElementById(id).remove(); }

function calculateBill(){
  const mode = document.getElementById("mode").value;
  const fixed = parseFloat(document.getElementById("fixed").value)||100;
  const duty = parseFloat(document.getElementById("duty").value)||9;
  let units = 0;

  if(mode==="kwh"){
    const prev = parseFloat(document.getElementById("prev").value);
    const curr = parseFloat(document.getElementById("curr").value);
    if(curr<prev){ document.getElementById("result").innerHTML="<p style='color:red'>Current reading must be greater than previous!</p>"; return; }
    units = curr-prev;
  } else if(mode==="kvah"){
    const kvah = parseFloat(document.getElementById("kvah").value);
    const pf = parseFloat(document.getElementById("pf").value)||0.9;
    units = kvah*pf;
  } else if(mode==="appliances"){
    const watts = document.querySelectorAll(".watt");
    const hours = document.querySelectorAll(".hours");
    const days = document.querySelectorAll(".days");
    for(let i=0;i<watts.length;i++){
      units += watts[i].value*hours[i].value*days[i].value/1000;
    }
  }

  let scam_alert = units>SCAM_THRESHOLD ? "⚠️ Warning: Units unusually high!" : "";

  // Slab calculation
  let energy=0, remaining=units;
  let breakdownHTML="<ul>";
  for(let slab of slabs){
    let take = Math.min(remaining, slab.cap);
    energy += take*slab.rate;
    breakdownHTML += `<li>${take.toFixed(2)} units × ₹${slab.rate} = ₹${(take*slab.rate).toFixed(2)}</li>`;
    remaining -= take;
    if(remaining<=0) break;
  }
  breakdownHTML+="</ul>";

  const subtotal = energy+fixed;
  const total = subtotal*(1+duty/100);

  document.getElementById("result").innerHTML = `
    ${scam_alert ? `<p style="color:red">${scam_alert}</p>` : ""}
    <p>Units Consumed: <strong>${units.toFixed(2)} kWh</strong></p>
    <p>Energy Charge: <strong>₹${energy.toFixed(2)}</strong></p>
    <p>Fixed Charge: <strong>₹${fixed.toFixed(2)}</strong></p>
    <p>Electricity Duty: <strong>${duty}%</strong></p>
    <p>Slab-wise Breakdown:</p>
    ${breakdownHTML}
    <p class="total">Total Bill: <strong>₹${total.toFixed(2)}</strong></p>
  `;
}
