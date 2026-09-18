import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

/*
  FIREBASE SETUP
  Replace the values below with your Firebase Web App configuration.
  Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup.
*/
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const firebaseReady = !Object.values(firebaseConfig).some(v => String(v).startsWith("YOUR_"));
let auth = null, db = null, currentUser = null;
if (firebaseReady) {
  const firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  getRedirectResult(auth).catch(()=>{});
  onAuthStateChanged(auth, user => {
    currentUser = user;
    updateAccountUI();
    if (user) { loadHistory(); loadEstimates(); }
    else { renderHistory([]); renderEstimates([]); }
  });
}

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN",{maximumFractionDigits:2});
const num = id => Number($(id).value || 0);
let lastCalculation = {cft:0, measure:0, rate:0, total:0, type:"cft"};
let historyData = [], estimateData = [];

function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove("show"),2500); }
function updateAccountUI(){
  const label = currentUser ? (currentUser.displayName || currentUser.email || "Signed in") : "Sign in";
  $("authBtn").textContent = currentUser ? "Sign out" : "Sign in";
  $("settingsAuthBtn").textContent = currentUser ? "Sign out" : "Sign in";
  $("accountStatus").textContent = currentUser ? label : "Not signed in";
  $("setupNotice").classList.toggle("hidden", firebaseReady);
  if (!firebaseReady) $("setupNotice").innerHTML = "<strong>Firebase setup needed.</strong><br>Add your Firebase Web App config in <code>app.js</code>. Calculator works now, but cloud history needs Firebase sign-in.";
}

function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));

$("calcType").addEventListener("change", e=>{
  const type=e.target.value;
  $("calculatorTitle").textContent=type==="cft"?"Wood CFT":type==="sqft"?"Square Feet":"Running Feet";
  $("cftForm").classList.toggle("hidden",type!=="cft");
  $("sqftForm").classList.toggle("hidden",type!=="sqft");
  $("rftForm").classList.toggle("hidden",type!=="rft");
  calculate();
});

function toFeet(value,unit){ return unit==="feet"?value:unit==="inch"?value/12:unit==="cm"?value/30.48:value/304.8; }
function toInches(value,unit){ return unit==="inch"?value:unit==="feet"?value*12:unit==="cm"?value/2.54:value/25.4; }

function calculate(){
  const type=$("calcType").value;
  let cft=0,measure=0,rate=0,total=0;
  if(type==="cft"){
    const L=num("length"),W=num("width"),T=num("thickness"),Q=Math.max(1,num("quantity")),unit=$("dimensionUnit").value;
    const li=toInches(L,unit),wi=toInches(W,unit),ti=toInches(T,unit);
    cft=li*wi*ti*Q/1728; rate=num("rate"); total=cft*rate; measure=cft;
  } else if(type==="sqft"){
    const L=toFeet(num("sqLength"),$("sqUnit").value),W=toFeet(num("sqWidth"),$("sqUnit").value),Q=Math.max(1,num("sqQuantity"));
    measure=L*W*Q; rate=0; total=0; cft=0;
  } else {
    const L=toFeet(num("rfLength"),$("rfUnit").value),Q=Math.max(1,num("rfQuantity"));
    measure=L*Q; rate=num("rfRate"); total=measure*rate;
  }
  lastCalculation={cft,measure,rate,total,type};
  $("totalCft").textContent=cft.toFixed(2);
  $("totalCost").textContent=money(total);
  $("resultMaterial").textContent=type==="cft"?"Wood":type==="sqft"?"Sheet / Surface":"Linear Material";
  $("resultMeasure").textContent=(type==="cft"?cft:measure).toFixed(2)+(type==="cft"?" CFT":type==="sqft"?" Sq Ft":" RFT");
  $("resultCft").textContent=cft.toFixed(2)+" CFT";
  $("resultRate").textContent=money(rate)+(type==="rft"?" / RFT":type==="cft"?" / CFT":"");
  $("resultTotal").textContent=money(total);
  return lastCalculation;
}

["length","width","thickness","quantity","rate","sqLength","sqWidth","sqQuantity","rfLength","rfQuantity","rfRate"].forEach(id=>$(id).addEventListener("input",calculate));
$("dimensionUnit").addEventListener("change",calculate); $("sqUnit").addEventListener("change",calculate); $("rfUnit").addEventListener("change",calculate);
$("calculateBtn").addEventListener("click",()=>{calculate();toast("Calculation updated");});

function clearCalculator(){
  ["length","width","thickness","rate","sqLength","sqWidth","rfLength","rfRate"].forEach(id=>$(id).value="");
  ["quantity","sqQuantity","rfQuantity"].forEach(id=>$(id).value="1");
  calculate(); toast("Calculator cleared");
}
$("clearBtn").addEventListener("click",clearCalculator);

async function signIn(){
  if(!firebaseReady){toast("Add Firebase config in app.js first");showScreen("settingsScreen");return;}
  const provider=new GoogleAuthProvider();
  try{await signInWithPopup(auth,provider);}
  catch(e){try{await signInWithRedirect(auth,provider);}catch(err){toast(err.message||"Sign-in failed");}}
}
async function toggleAuth(){
  if(currentUser){await signOut(auth);toast("Signed out");}
  else await signIn();
}
$("authBtn").addEventListener("click",toggleAuth); $("settingsAuthBtn").addEventListener("click",toggleAuth);

async function saveCalculation(){
  const calc=calculate();
  if(!currentUser){toast("Sign in with Google to save cloud history");return;}
  const data={type:calc.type,cft:Number(calc.cft.toFixed(4)),measure:Number(calc.measure.toFixed(4)),rate:calc.rate,total:Number(calc.total.toFixed(2)),material:calc.type==="cft"?"Wood":calc.type==="sqft"?"Sheet / Surface":"Linear Material",createdAt:serverTimestamp()};
  try{await addDoc(collection(db,"users",currentUser.uid,"calculations"),data);toast("Saved to Firebase");await loadHistory();}
  catch(e){console.error(e);toast("Could not save. Check Firestore rules.");}
}
$("saveBtn").addEventListener("click",saveCalculation);

function formatDate(ts){if(!ts)return "Just now";const d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function renderHistory(items){
  historyData=items;
  const q=$("historySearch").value.trim().toLowerCase();
  const filtered=items.filter(x=>(x.material+" "+x.type).toLowerCase().includes(q));
  $("historyList").innerHTML=filtered.length?filtered.map(x=>`<article class="history-card">
    <div class="history-top"><div><div class="history-title">${escapeHtml(x.material)}</div><div class="muted">${formatDate(x.createdAt)}</div></div><strong>${money(x.total)}</strong></div>
    <div class="history-value">${Number(x.cft||0).toFixed(2)} CFT</div>
    <div class="history-meta"><span>Rate: ${money(x.rate)}</span><span>Measure: ${Number(x.measure||0).toFixed(2)}</span></div>
    <div class="card-actions"><button data-action="view" data-id="${x.id}">View</button><button data-action="edit" data-id="${x.id}">Edit</button><button data-action="delete" data-id="${x.id}">Delete</button></div>
  </article>`).join(""):'<div class="empty">No saved calculations yet.</div>';
}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadHistory(){
  if(!currentUser||!db)return;
  try{const snap=await getDocs(query(collection(db,"users",currentUser.uid,"calculations"),orderBy("createdAt","desc")));renderHistory(snap.docs.map(d=>({id:d.id,...d.data()})));}
  catch(e){console.error(e);renderHistory([]);toast("History needs a Firestore index/rules check");}
}
$("refreshHistoryBtn").addEventListener("click",loadHistory); $("historySearch").addEventListener("input",()=>renderHistory(historyData));

$("historyList").addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;const item=historyData.find(x=>x.id===b.dataset.id);if(!item)return;
  if(b.dataset.action==="view"){toast(`${Number(item.cft||0).toFixed(2)} CFT • ${money(item.total)}`);}
  if(b.dataset.action==="delete"){if(!confirm("Delete this calculation?"))return;try{await deleteDoc(doc(db,"users",currentUser.uid,"calculations",item.id));toast("Deleted");loadHistory();}catch(err){toast("Delete failed");}}
  if(b.dataset.action==="edit"){$("editId").value=item.id;$("editMaterial").value=item.material||"Wood";$("editRate").value=item.rate||0;$("editDialog").showModal();}
});
$("editSaveBtn").addEventListener("click",async e=>{e.preventDefault();if(!currentUser)return;try{await updateDoc(doc(db,"users",currentUser.uid,"calculations",$("editId").value),{material:$("editMaterial").value.trim()||"Wood",rate:num("editRate"),updatedAt:serverTimestamp()});$("editDialog").close();toast("Updated");loadHistory();}catch(err){toast("Update failed");}});

function estimateTotal(){const t=num("estimateCft")*num("estimateRate");$("estimateTotal").textContent=money(t);return t}
["estimateCft","estimateRate"].forEach(id=>$(id).addEventListener("input",estimateTotal));
async function saveEstimate(){
  if(!currentUser){toast("Sign in with Google to save estimates");return;}
  const data={customerName:$("customerName").value.trim(),jobName:$("jobName").value.trim()||"Estimate",notes:$("estimateNotes").value.trim(),cft:num("estimateCft"),rate:num("estimateRate"),total:estimateTotal(),createdAt:serverTimestamp()};
  try{await addDoc(collection(db,"users",currentUser.uid,"estimates"),data);toast("Estimate saved");await loadEstimates();}catch(e){toast("Could not save estimate");}
}
$("saveEstimateBtn").addEventListener("click",saveEstimate);
$("clearEstimateBtn").addEventListener("click",()=>{["customerName","jobName","estimateNotes","estimateCft","estimateRate"].forEach(id=>$(id).value="");estimateTotal();});
async function loadEstimates(){
  if(!currentUser||!db)return;
  try{const snap=await getDocs(query(collection(db,"users",currentUser.uid,"estimates"),orderBy("createdAt","desc")));renderEstimates(snap.docs.map(d=>({id:d.id,...d.data()})));}
  catch(e){renderEstimates([]);}
}
function renderEstimates(items){
  estimateData=items;
  $("estimateList").innerHTML=items.length?items.map(x=>`<article class="history-card"><div class="history-top"><div><div class="history-title">${escapeHtml(x.jobName)}</div><div class="muted">${escapeHtml(x.customerName||"No customer")} • ${formatDate(x.createdAt)}</div></div><strong>${money(x.total)}</strong></div><div class="history-meta"><span>${Number(x.cft||0).toFixed(2)} CFT</span><span>${money(x.rate)} / CFT</span></div><p class="muted" style="margin-top:9px">${escapeHtml(x.notes||"")}</p></article>`).join(""):'<div class="empty">No estimates yet.</div>';
}

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
updateAccountUI(); calculate(); estimateTotal();