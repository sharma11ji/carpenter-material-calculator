import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
const firebaseReady = !Object.values(firebaseConfig).some(v => String(v).startsWith("YOUR_"));
let auth=null, db=null, currentUser=null;
if(firebaseReady){
  const app=initializeApp(firebaseConfig); auth=getAuth(app); db=getFirestore(app);
  getRedirectResult(auth).catch(()=>{});
  onAuthStateChanged(auth,u=>{currentUser=u;updateAccountUI();if(u)loadHistory();else renderHistory([]);});
}
const $=id=>document.getElementById(id);
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});
const num=id=>Number($(id).value||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",""":"&quot;","'":"&#39;"}[c]));
let roundMode="diameter", currentItems=[], historyData=[], editingHistoryId=null;

function toast(m){const e=$("toast");e.textContent=m;e.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove("show"),2500);}
function updateAccountUI(){
  const label=currentUser?(currentUser.displayName||currentUser.email||"Signed in"):"Not signed in";
  $("authBtn").textContent=currentUser?"Sign out":"Sign in";$("settingsAuthBtn").textContent=currentUser?"Sign out":"Sign in";$("accountStatus").textContent=label;
  $("setupNotice").classList.toggle("hidden",firebaseReady);
  if(!firebaseReady)$("setupNotice").innerHTML="<strong>Firebase setup needed.</strong><br>Add your Firebase Web App config in <code>app.js</code>. The calculator works, but cloud History needs Firebase.";
}
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));if(id==="billScreen")renderBill();window.scrollTo({top:0,behavior:"smooth"});}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showScreen(b.dataset.screen)));

function toInches(v,u){return u==="inch"?v:u==="feet"?v*12:u==="cm"?v/2.54:u==="mm"?v/25.4:u==="meter"?v*39.3700787:v;}
function toFeet(v,u){return u==="feet"?v:u==="inch"?v/12:u==="cm"?v/30.48:u==="mm"?v/304.8:u==="meter"?v*3.2808399:v;}
function calc(){
  const type=$("calcType").value,name=$("materialName").value.trim()||defaultName(type);
  let cft=0,sqft=0,rft=0,rate=0,total=0,measure=0,details={};
  if(type==="cut"){
    const L=toInches(num("length"),$("dimensionUnit").value),W=toInches(num("width"),$("dimensionUnit").value),T=toInches(num("thickness"),$("dimensionUnit").value),Q=Math.max(1,num("quantity"));
    cft=L*W*T*Q/1728;rate=num("rate");total=cft*rate;measure=cft;details={length:num("length"),width:num("width"),thickness:num("thickness"),quantity:Q,unit:$("dimensionUnit").value};
  }else if(type==="round"){
    const L=toFeet(num("roundLength"),$("roundUnit").value),S=toFeet(num("roundSize"),$("roundUnit").value),Q=Math.max(1,num("roundQuantity"));
    const diameter=roundMode==="diameter"?S:S/Math.PI;cft=Math.PI*Math.pow(diameter,2)/4*L*Q;rate=num("roundRate");total=cft*rate;measure=cft;details={length:num("roundLength"),size:num("roundSize"),quantity:Q,unit:$("roundUnit").value,roundMode};
  }else if(type==="sheet"){
    const L=toFeet(num("sheetLength"),$("sheetUnit").value),W=toFeet(num("sheetWidth"),$("sheetUnit").value),Q=Math.max(1,num("sheetQuantity"));
    sqft=L*W*Q;rate=num("sheetRate");total=sqft*rate;measure=sqft;details={length:num("sheetLength"),width:num("sheetWidth"),quantity:Q,unit:$("sheetUnit").value};
  }else{
    const L=toFeet(num("rfLength"),$("rfUnit").value),Q=Math.max(1,num("rfQuantity"));rft=L*Q;rate=num("rfRate");total=rft*rate;measure=rft;details={length:num("rfLength"),quantity:Q,unit:$("rfUnit").value};
  }
  $("totalCft").textContent=cft.toFixed(2);$("totalCost").textContent=money(total);
  $("resultMaterial").textContent=name;$("resultMeasure").textContent=(type==="cut"||type==="round"?cft:type==="sheet"?sqft:rft).toFixed(2)+" "+(type==="sheet"?"Sq Ft":type==="rft"?"RFT":"CFT");
  $("resultCft").textContent=cft.toFixed(2)+" CFT";$("resultRate").textContent=money(rate)+" / "+(type==="sheet"?"Sq Ft":type==="rft"?"RFT":"CFT");$("resultTotal").textContent=money(total);
  return {type,name,cft,sqft,rft,rate,total,measure,details};
}
function defaultName(t){return t==="cut"?"Cut Wood":t==="round"?"Round Wood":t==="sheet"?"Plywood / Flush Door":"Running Material";}
function switchFields(){
  const t=$("calcType").value;$("calculatorTitle").textContent=defaultName(t);
  [["cutFields","cut"],["roundFields","round"],["sheetFields","sheet"],["rftFields","rft"]].forEach(([id,v])=>$(id).classList.toggle("hidden",t!==v));calc();
}
$("calcType").addEventListener("change",switchFields);
document.querySelectorAll("input,select,textarea").forEach(e=>{if(!e.id||e.id==="calcType")return;e.addEventListener("input",()=>{if(["customerName","jobName","billNotes"].includes(e.id))return;calc();renderBill();});e.addEventListener("change",()=>{calc();renderBill();});});
document.querySelectorAll("[data-round-mode]").forEach(b=>b.addEventListener("click",()=>{roundMode=b.dataset.roundMode;document.querySelectorAll("[data-round-mode]").forEach(x=>x.classList.toggle("active",x===b));$("roundSizeLabel").firstChild.textContent=roundMode==="diameter"?"Diameter":"Girth / Circumference";calc();}));

function clearForm(){["materialName","length","width","thickness","rate","roundLength","roundSize","roundRate","sheetLength","sheetWidth","sheetRate","rfLength","rfRate"].forEach(id=>$(id).value="");["quantity","roundQuantity","sheetQuantity","rfQuantity"].forEach(id=>$(id).value="1");calc();toast("Calculator cleared");}
$("clearBtn").addEventListener("click",clearForm);

function addItem(){
  const x=calc();
  if(!x.cft&&!x.sqft&&!x.rft){toast("Enter measurements first");return;}
  currentItems.push({...x,id:crypto.randomUUID(),createdAt:new Date()});renderItems();toast("Item added");
}
$("addItemBtn").addEventListener("click",addItem);
function renderItems(){
  $("itemList").innerHTML=currentItems.length?currentItems.map(x=>`<article class="item-card"><div class="history-top"><div><strong>${esc(x.name)}</strong><div class="muted">${labelType(x.type)} • Qty ${x.details.quantity}</div></div><strong>${money(x.total)}</strong></div><div class="history-meta"><span>${x.cft.toFixed(2)} CFT</span><span>${x.sqft.toFixed(2)} Sq Ft</span><span>${money(x.rate)} / unit</span></div><button class="remove-item" data-id="${x.id}" type="button">Remove</button></article>`).join(""):'<div class="empty">No items added. Calculate a material and tap Add Item.</div>';
  const c=currentItems.reduce((a,x)=>a+x.cft,0),s=currentItems.reduce((a,x)=>a+x.sqft,0),t=currentItems.reduce((a,x)=>a+x.total,0);$("listCft").textContent=c.toFixed(2);$("listSqft").textContent=s.toFixed(2);$("listTotal").textContent=money(t);renderBill();
}
function labelType(t){return t==="cut"?"Cut Wood":t==="round"?"Round Wood":t==="sheet"?"Plywood / Flush Door":"Running Feet";}
$("itemList").addEventListener("click",e=>{const b=e.target.closest(".remove-item");if(!b)return;currentItems=currentItems.filter(x=>x.id!==b.dataset.id);renderItems();});
$("clearItemsBtn").addEventListener("click",()=>{currentItems=[];renderItems();toast("Item list cleared");});

async function signIn(){
  if(!firebaseReady){toast("Add Firebase config first");showScreen("settingsScreen");return;}
  try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){try{await signInWithRedirect(auth,new GoogleAuthProvider());}catch(err){toast(err.message||"Sign-in failed");}}
}
async function toggleAuth(){if(currentUser){await signOut(auth);toast("Signed out");}else await signIn();}
$("authBtn").addEventListener("click",toggleAuth);$("settingsAuthBtn").addEventListener("click",toggleAuth);

async function saveJob(){
  if(!currentItems.length){addItem();if(!currentItems.length)return;}
  if(!currentUser){toast("Sign in with Google to save cloud history");return;}
  const total=currentItems.reduce((a,x)=>a+x.total,0),cft=currentItems.reduce((a,x)=>a+x.cft,0),sqft=currentItems.reduce((a,x)=>a+x.sqft,0);
  const data={jobName:$("jobName").value.trim()||"Carpenter Job",customerName:$("customerName").value.trim()||"Walk-in Customer",notes:$("billNotes").value.trim(),items:currentItems.map(({id,createdAt,...x})=>x),total:Number(total.toFixed(2)),cft:Number(cft.toFixed(4)),sqft:Number(sqft.toFixed(4)),createdAt:serverTimestamp()};
  try{await addDoc(collection(db,"users",currentUser.uid,"calculations"),data);toast("Job saved to Firebase");await loadHistory();showScreen("historyScreen");}catch(e){console.error(e);toast("Save failed. Check Firestore rules.");}
}
$("saveJobBtn").addEventListener("click",saveJob);

function formatDate(ts){if(!ts)return"Just now";const d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
async function loadHistory(){
  if(!currentUser||!db)return;
  try{const snap=await getDocs(query(collection(db,"users",currentUser.uid,"calculations"),orderBy("createdAt","desc")));renderHistory(snap.docs.map(d=>({id:d.id,...d.data()})));}catch(e){console.error(e);renderHistory([]);toast("History could not load. Check Firestore rules.");}
}
function renderHistory(items){
  historyData=items;const q=$("historySearch").value.trim().toLowerCase();
  const f=items.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  $("historyList").innerHTML=f.length?f.map(x=>`<article class="history-card"><div class="history-top"><div><div class="history-title">${esc(x.jobName||x.material||"Calculation")}</div><div class="muted">${esc(x.customerName||"")} • ${formatDate(x.createdAt)}</div></div><strong>${money(x.total)}</strong></div><div class="history-value">${Number(x.cft||0).toFixed(2)} CFT</div><div class="history-meta"><span>${Number(x.sqft||0).toFixed(2)} Sq Ft</span><span>${x.items?.length||1} item(s)</span></div><div class="card-actions"><button data-action="view" data-id="${x.id}">View</button><button data-action="edit" data-id="${x.id}">Edit</button><button data-action="delete" data-id="${x.id}">Delete</button></div></article>`).join(""):'<div class="empty">No saved jobs yet.</div>';
}
$("refreshHistoryBtn").addEventListener("click",loadHistory);$("historySearch").addEventListener("input",()=>renderHistory(historyData));
$("historyList").addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;const item=historyData.find(x=>x.id===b.dataset.id);if(!item)return;
  if(b.dataset.action==="view"){currentItems=(item.items||[item]).map(x=>({...x,id:crypto.randomUUID()}));$("customerName").value=item.customerName||"";$("jobName").value=item.jobName||"";$("billNotes").value=item.notes||"";renderItems();renderBill();showScreen("billScreen");}
  if(b.dataset.action==="delete"){if(!confirm("Delete this saved job?"))return;try{await deleteDoc(doc(db,"users",currentUser.uid,"calculations",item.id));toast("Deleted");loadHistory();}catch(err){toast("Delete failed");}}
  if(b.dataset.action==="edit"){editingHistoryId=item.id;$("editId").value=item.id;$("editMaterial").value=item.jobName||item.material||"Job";$("editRate").value=item.items?.[0]?.rate||item.rate||0;$("editDialog").showModal();}
});
$("editSaveBtn").addEventListener("click",async e=>{e.preventDefault();if(!currentUser||!editingHistoryId)return;try{
    const ref=doc(db,"users",currentUser.uid,"calculations",editingHistoryId);
    const snap=historyData.find(x=>x.id===editingHistoryId);
    const newName=$("editMaterial").value.trim()||"Carpenter Job";
    const newRate=num("editRate");
    const updates={jobName:newName,updatedAt:serverTimestamp()};
    if(snap?.items?.length){
      const items=snap.items.map((item,i)=>i===0?{...item,rate:newRate,total:Number((item.cft||0)*newRate+(item.sqft||0)*newRate+(item.rft||0)*newRate)}:item);
      updates.items=items;
      updates.total=Number(items.reduce((a,x)=>a+Number(x.total||0),0).toFixed(2));
    }else{
      updates.rate=newRate;
      updates.total=Number(((snap?.cft||0)*newRate).toFixed(2));
    }
    await updateDoc(ref,updates);
    $("editDialog").close();toast("Updated");loadHistory();
  }catch(err){toast("Update failed");}});

function renderBill(){
  $("invoiceDate").textContent=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  $("invoiceCustomer").textContent=$("customerName").value.trim()||"Walk-in Customer";$("invoiceJob").textContent=$("jobName").value.trim()||"Carpenter Job";$("invoiceNotes").textContent=$("billNotes").value.trim();
  $("invoiceItems").innerHTML=currentItems.length?currentItems.map((x,i)=>`<div class="invoice-row"><span>${i+1}. ${esc(x.name)}</span><span>${x.cft?x.cft.toFixed(2)+" CFT":x.sqft?x.sqft.toFixed(2)+" Sq Ft":x.rft.toFixed(2)+" RFT"} × ${money(x.rate)}</span><strong>${money(x.total)}</strong></div>`).join(""):'<div class="empty">Add items from Calculator to build the bill.</div>';
  $("invoiceTotal").textContent=money(currentItems.reduce((a,x)=>a+x.total,0));
}
["customerName","jobName","billNotes"].forEach(id=>$(id).addEventListener("input",renderBill));
$("printBillBtn").addEventListener("click",()=>{renderBill();window.print();});
$("shareBillBtn").addEventListener("click",async()=>{
  renderBill();const text=`Carpenter Material Bill\nCustomer: ${$("invoiceCustomer").textContent}\nJob: ${$("invoiceJob").textContent}\nTotal: ${$("invoiceTotal").textContent}`;
  if(navigator.share){try{await navigator.share({title:"Carpenter Material Bill",text});}catch(e){}}else{await navigator.clipboard?.writeText(text);toast("Bill copied");}
});

switchFields();renderItems();renderBill();updateAccountUI();
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
