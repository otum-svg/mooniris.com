const getEl=id=>document.getElementById(id);
const ADMIN_HASH='2b94e4d8a';

let appState={
products:[
{id:1,name:'Crystal Earrings',price:599,desc:'Elegant crystal drop earrings perfect for any occasion',img:'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&h=500&fit=crop'},
{id:2,name:'Pearl Necklace',price:1299,desc:'Classic pearl strand necklace with premium quality',img:'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop'},
{id:3,name:'Designer Bracelet',price:799,desc:'Handcrafted designer bracelet with unique patterns',img:'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500&h=500&fit=crop'},
{id:4,name:'Statement Ring',price:499,desc:'Bold statement cocktail ring for special events',img:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop'},
{id:5,name:'Gold Anklet',price:899,desc:'Delicate gold-plated anklet with charms',img:'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop'},
{id:6,name:'Hair Accessories',price:399,desc:'Beautiful hair clips and pins set',img:'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&h=500&fit=crop'}
],
orders:[],
users:[],
usedPaymentIds:new Set(),
adminAuth:false,
currentUser:null,

};

let pincodeData=[];
let pincodeMap=new Map();

const DELHI_LAT=28.6139;
const DELHI_LNG=77.2090;

async function loadPincodeData(){
try{
const response=await fetch('pincode.csv');
if(!response.ok){
throw new Error('CSV file not found! Status: '+response.status);
}

const csvText=await response.text();
console.log('✅ CSV file loaded, size:',csvText.length,'bytes');

const lines=csvText.trim().split('\n');
console.log('📊 Total lines:',lines.length);

const originalHeaders=lines[0].split(';');
const headers=originalHeaders.map(h=>h.toLowerCase().trim());
console.log('📋 Headers:',headers);

let pincodeIdx=-1;
let districtIdx=-1;
let stateIdx=-1;
let latIdx=-1;
let lngIdx=-1;

headers.forEach((h,idx)=>{
if(h.includes('pincode'))pincodeIdx=idx;
if(h.includes('district'))districtIdx=idx;
if(h.includes('state'))stateIdx=idx;
if(h.includes('latitude'))latIdx=idx;
if(h.includes('longitude'))lngIdx=idx;
});

console.log('🔍 Column Indices:',{pincodeIdx,districtIdx,stateIdx,latIdx,lngIdx});

if(pincodeIdx===-1||latIdx===-1||lngIdx===-1){
throw new Error('Required columns not found!');
}

let loadedCount=0;
let skippedCount=0;

for(let i=1;i<lines.length;i++){
if(!lines[i].trim())continue;

const values=lines[i].split(';');

if(values.length>Math.max(pincodeIdx,latIdx,lngIdx)){
const pincode=values[pincodeIdx]?.trim();
const lat=values[latIdx]?.trim();
const lng=values[lngIdx]?.trim();

if(pincode&&lat&&lng&&lat!=='NA'&&lng!=='NA'&&lat!==''&&lng!==''){
const latNum=parseFloat(lat);
const lngNum=parseFloat(lng);

if(!isNaN(latNum)&&!isNaN(lngNum)){
const data={
pincode:pincode,
district:values[districtIdx]?.trim()||'',
state:values[stateIdx]?.trim()||'',
lat:latNum,
lng:lngNum
};

if(!pincodeMap.has(pincode)){
pincodeMap.set(pincode,data);
loadedCount++;
}
}else{
skippedCount++;
}
}else{
skippedCount++;
}
}
}

console.log(`✅ Successfully loaded ${loadedCount} pincodes!`);
console.log(`⚠️ Skipped ${skippedCount} invalid entries`);

}catch(e){
console.error('❌ CSV load error:',e);
alert('⚠️ Failed to load pincode database: '+e.message);
}
}

function calculateDistance(lat1,lon1,lat2,lon2){
const R=6371;
const dLat=(lat2-lat1)*Math.PI/180;
const dLon=(lon2-lon1)*Math.PI/180;

const a=Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2);

const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
const straightDistance=R*c;

return Math.round(straightDistance*1.25);
}

function getDistanceFromPincode(pincode){
const data=pincodeMap.get(pincode);
if(data){
const distance=calculateDistance(DELHI_LAT,DELHI_LNG,data.lat,data.lng);
return{
distance:distance,
district:data.district,
state:data.state,
found:true
};
}
return{found:false};
}

function simpleHash(str){
let hash=0;
for(let i=0;i<str.length;i++){
const char=str.charCodeAt(i);
hash=((hash<<5)-hash)+char;
hash=hash&hash;
}
return Math.abs(hash).toString(36).substring(0,9);
}

function loadData(){
try{
const saved=localStorage.getItem('glamourShopData');
if(saved){
const parsed=JSON.parse(saved);
appState.products=parsed.products||appState.products;
appState.orders=parsed.orders||[];
appState.users=parsed.users||[];
appState.usedPaymentIds=new Set(parsed.usedPaymentIds||[]);
appState.qrCodeUrl=parsed.qrCodeUrl||'payment.jpg';
appState.upiId=parsed.upiId||'im.sweety@fam';
}
const savedUser=localStorage.getItem('currentUser');
if(savedUser){
appState.currentUser=JSON.parse(savedUser);
updateUserUI();
}
}catch(e){
console.error('Error loading data');
}
}

function saveData(){
try{
const toSave={
products:appState.products,
orders:appState.orders,
users:appState.users,
usedPaymentIds:Array.from(appState.usedPaymentIds),
qrCodeUrl:appState.qrCodeUrl,
upiId:appState.upiId
};
localStorage.setItem('glamourShopData',JSON.stringify(toSave));
}catch(e){
console.error('Error saving data');
}
}

function renderProducts(){
const grid=getEl('productsGrid');
if(!grid)return;
grid.innerHTML=appState.products.map(product=>`
<div class="product-card" onclick="openOrderModal(${product.id})">
<img src="${product.img}" class="product-img" alt="${product.name}" onerror="this.src='https://via.placeholder.com/500x500/d946ef/ffffff?text=Product+Image'">
<div class="product-info">
<div class="product-name">${product.name}</div>
<div class="product-price">₹${product.price}</div>
<div class="product-desc">${product.desc}</div>
<button class="btn">Order Now</button>
</div>
</div>
`).join('');
}

function openOrderModal(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const formHtml=`
<div class="order-summary">
<h3>${product.name}</h3>
<div class="summary-row">
<span>Product Price:</span>
<span id="productPrice">₹${product.price}</span>
</div>
<div class="summary-row">
<span>Delivery Charges:</span>
<span id="deliveryCharge">₹0</span>
</div>
<div class="summary-row total">
<span>Total Amount:</span>
<span id="totalAmount">₹${product.price}</span>
</div>
</div>

<div class="form-group">
<label>Full Name *</label>
<input type="text" id="customerName" placeholder="Enter your full name" required>
</div>

<div class="form-group">
<label>Mobile Number *</label>
<input type="tel" id="customerMobile" placeholder="10 digit mobile number" maxlength="10" required>
</div>

<div class="form-group">
<label>Pincode *</label>
<input type="text" id="customerPincode" placeholder="Enter 6-digit pincode" maxlength="6" oninput="validatePincode(${product.price})" required>
<p id="pincodeError" style="color:#dc2626;font-size:0.85rem;margin-top:0.3rem;display:none"></p>
</div>

<div id="locationInfo" style="display:none;background:var(--light);padding:1rem;border-radius:10px;margin:1rem 0;border:2px solid #10b981">
<p style="margin:0;color:var(--dark);font-weight:600">📍 Location: <span id="locationDisplay"></span></p>
</div>

<div class="form-group">
<label>State *</label>
<input type="text" id="customerState" placeholder="State (auto-filled)" readonly style="background:#f3f4f6">
</div>

<div class="form-group">
<label>Full Delivery Address *</label>
<textarea id="customerAddress" rows="3" placeholder="House no., Street, Landmark etc." required></textarea>
</div>

<div id="deliveryInfo" style="display:none;background:var(--light);padding:1rem;border-radius:10px;margin:1rem 0;border:2px solid var(--primary)">
<p style="margin:0;color:var(--dark);font-weight:600">📍 Distance from Delhi: <span id="distanceDisplay"></span> km</p>
<p style="margin:0.5rem 0 0 0;color:var(--primary);font-weight:600">💰 Delivery Charge: ₹<span id="deliveryChargeDisplay"></span></p>
</div>

<button class="btn" style="width:100%;margin-top:1rem" onclick="showReviewScreen(${product.id})">
Continue to Review
</button>
`;

getEl('orderFormContent').innerHTML=formHtml;
getEl('orderModal').style.display='block';
}

function validatePincode(productPrice){
const pincodeInput=getEl('customerPincode');
const pincode=pincodeInput.value.trim();
const errorEl=getEl('pincodeError');

getEl('deliveryInfo').style.display='none';
getEl('locationInfo').style.display='none';
getEl('customerState').value='';
window.currentOrderData=null;

if(pincode.length!==6){
if(pincode.length>0){
errorEl.textContent='⚠️ Pincode must be 6 digits';
errorEl.style.display='block';
}else{
errorEl.style.display='none';
}
return;
}

if(!/^\d+$/.test(pincode)){
errorEl.textContent='⚠️ Pincode must contain only numbers';
errorEl.style.display='block';
return;
}

const result=getDistanceFromPincode(pincode);

if(!result.found){
errorEl.textContent='❌ Pincode not found in database. Please check and try again.';
errorEl.style.display='block';
return;
}

errorEl.style.display='none';

getEl('locationDisplay').textContent=`${result.district}, ${result.state}`;
getEl('locationInfo').style.display='block';
getEl('customerState').value=result.state;

const distance=result.distance;
let deliveryCharge=0;

if(distance<150){
deliveryCharge=50;
}else if(distance>=150&&distance<=200){
deliveryCharge=85;
}else if(distance>=201&&distance<=500){
deliveryCharge=99;
}else if(distance>=501&&distance<=1000){
deliveryCharge=135;
}else if(distance>=1001&&distance<=2000){
deliveryCharge=205;
}else{
deliveryCharge=Math.floor(distance/1000)*205;
}

getEl('deliveryInfo').style.display='block';
getEl('distanceDisplay').textContent=distance;
getEl('deliveryChargeDisplay').textContent=deliveryCharge;
getEl('deliveryCharge').textContent=`₹${deliveryCharge}`;

const total=productPrice+deliveryCharge;
getEl('totalAmount').textContent=`₹${total}`;

window.currentOrderData={
distance:distance,
deliveryCharge:deliveryCharge,
totalAmount:total,
district:result.district,
state:result.state
};
}

function showReviewScreen(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const customerName=getEl('customerName').value.trim();
const customerMobile=getEl('customerMobile').value.trim();
const customerPincode=getEl('customerPincode').value.trim();
const customerState=getEl('customerState').value.trim();
const customerAddress=getEl('customerAddress').value.trim();

if(!customerName||!customerMobile||!customerPincode||!customerState||!customerAddress){
alert('⚠️ Please fill all required fields!');
return;
}

if(customerMobile.length!==10||!/^\d+$/.test(customerMobile)){
alert('⚠️ Please enter a valid 10-digit mobile number!');
return;
}

if(customerPincode.length!==6||!/^\d+$/.test(customerPincode)){
alert('⚠️ Please enter a valid 6-digit pincode!');
return;
}

if(!window.currentOrderData){
alert('⚠️ Please wait for delivery calculation or check pincode!');
return;
}

window.orderCustomerData={
name:customerName,
mobile:customerMobile,
pincode:customerPincode,
state:customerState,
address:customerAddress
};

const reviewHtml=`
<h2 style="color:var(--dark);margin-bottom:1.5rem">📋 Review Your Order</h2>

<div style="background:var(--light);padding:1.5rem;border-radius:15px;margin-bottom:1.5rem">
<h3 style="color:var(--primary);margin-bottom:1rem">Product Details</h3>
<p style="margin:0.5rem 0"><strong>Product:</strong> ${product.name}</p>
<p style="margin:0.5rem 0"><strong>Price:</strong> ₹${product.price}</p>
<p style="margin:0.5rem 0"><strong>Description:</strong> ${product.desc}</p>
</div>

<div style="background:var(--light);padding:1.5rem;border-radius:15px;margin-bottom:1.5rem">
<h3 style="color:var(--primary);margin-bottom:1rem">Delivery Details</h3>
<p style="margin:0.5rem 0"><strong>Name:</strong> ${customerName}</p>
<p style="margin:0.5rem 0"><strong>Mobile:</strong> ${customerMobile}</p>
<p style="margin:0.5rem 0"><strong>Pincode:</strong> ${customerPincode}</p>
<p style="margin:0.5rem 0"><strong>City/District:</strong> ${window.currentOrderData.district}</p>
<p style="margin:0.5rem 0"><strong>State:</strong> ${customerState}</p>
<p style="margin:0.5rem 0"><strong>Address:</strong> ${customerAddress}</p>
<p style="margin:0.5rem 0"><strong>Distance from Delhi:</strong> ${window.currentOrderData.distance} km</p>
<p style="margin:0.5rem 0"><strong>Delivery Charges:</strong> ₹${window.currentOrderData.deliveryCharge}</p>
</div>

<div style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;padding:1.5rem;border-radius:15px;margin-bottom:1.5rem;text-align:center">
<h3 style="margin-bottom:0.5rem">Total Amount to Pay</h3>
<p style="font-size:2.5rem;font-weight:700;margin:0">₹${window.currentOrderData.totalAmount}</p>
</div>

<div style="display:flex;gap:1rem;margin-bottom:1rem">
<button class="btn btn-secondary" style="flex:1" onclick="goBackToEdit(${product.id})">← Edit Details</button>
<button class="btn" style="flex:1" onclick="proceedToPayment(${product.id})">Proceed to Payment →</button>
</div>
`;

getEl('orderFormContent').innerHTML=reviewHtml;
}

function goBackToEdit(productId){
openOrderModal(productId);
setTimeout(()=>{
const product=appState.products.find(p=>p.id===productId);
if(window.orderCustomerData){
getEl('customerName').value=window.orderCustomerData.name;
getEl('customerMobile').value=window.orderCustomerData.mobile;
getEl('customerPincode').value=window.orderCustomerData.pincode;
getEl('customerAddress').value=window.orderCustomerData.address;
validatePincode(product.price);
}
},100);
}

function proceedToPayment(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const paymentHtml=`
<h2 style="color:var(--dark);margin-bottom:1.5rem">💳 Payment</h2>

<div style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:white;padding:1.5rem;border-radius:15px;margin-bottom:1.5rem;text-align:center">
<h3 style="margin-bottom:0.5rem">Amount to Pay</h3>
<p style="font-size:2.5rem;font-weight:700;margin:0">₹${window.currentOrderData.totalAmount}</p>
</div>

<div class="qr-container">
<h3 style="margin-bottom:1rem">Scan QR Code to Pay</h3>
<img src="payment.jpg" class="qr-img" alt="Payment QR Code" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
<div style="display:none;padding:2rem;background:#fef2f2;border-radius:10px;color:#991b1b;text-align:center">
<p>⚠️ QR Code image not found!</p>
<p style="font-size:0.9rem;margin-top:0.5rem">Please use the UPI ID below to make payment</p>
</div>
<div class="upi-id">
<span><strong>UPI ID:</strong> im.sweety@fam</span>
<button class="copy-btn" onclick="copyUpiId()">Copy UPI ID</button>
</div>
</div>

<div class="form-group">
<label>Payment Transaction ID NAME *</label>
<input type="text" id="paymentTransactionId" placeholder="Enter UPI transaction ID" required>
</div>

<div class="form-group">
<label>Upload Payment Screenshot *</label>
<div class="file-upload" onclick="getEl('paymentScreenshot').click()">
<input type="file" id="paymentScreenshot" accept="image/*" onchange="handleFileSelect(this)" required>
<p>📷 Click to upload payment screenshot</p>
<p id="selectedFileName" style="margin-top:0.5rem;color:var(--primary);font-weight:600"></p>
</div>
</div>

<button class="btn" style="width:100%;margin-top:1.5rem" onclick="submitOrder(${product.id})">
Submit Order
</button>
`;

getEl('orderFormContent').innerHTML=paymentHtml;
}

function copyUpiId(){
const textArea=document.createElement('textarea');
textArea.value=appState.upiId;
document.body.appendChild(textArea);
textArea.select();
document.execCommand('copy');
document.body.removeChild(textArea);
alert('✅ UPI ID copied to clipboard!');
}

function handleFileSelect(input){
if(input.files&&input.files[0]){
getEl('selectedFileName').textContent=`Selected: ${input.files[0].name}`;
}
}

function submitOrder(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const paymentId=getEl('paymentTransactionId').value.trim();
const screenshotFile=getEl('paymentScreenshot').files[0];

if(!paymentId||!screenshotFile){
alert('⚠️ Please fill all payment fields!');
return;
}

if(appState.usedPaymentIds.has(paymentId)){
alert('⚠️ This payment transaction ID has already been used! Please enter a unique transaction ID.');
return;
}

if(!window.currentOrderData||!window.orderCustomerData){
alert('⚠️ Order data not found. Please start again.');
return;
}

const reader=new FileReader();
reader.onload=function(e){
const order={
orderId:'ORD'+Date.now()+Math.random().toString(36).substring(2,9).toUpperCase(),
productId:product.id,
productName:product.name,
productPrice:product.price,
customerName:window.orderCustomerData.name,
customerMobile:window.orderCustomerData.mobile,
customerPincode:window.orderCustomerData.pincode,
customerCity:window.currentOrderData.district,
customerDistrict:window.currentOrderData.district,
customerState:window.orderCustomerData.state,
customerAddress:window.orderCustomerData.address,
distanceKm:window.currentOrderData.distance,
deliveryCharge:window.currentOrderData.deliveryCharge,
totalAmount:window.currentOrderData.totalAmount,
paymentId:paymentId,
paymentScreenshot:e.target.result,
status:'pending',
userMobile:appState.currentUser?appState.currentUser.mobile:'',
timestamp:new Date().toISOString()
};

appState.orders.push(order);
appState.usedPaymentIds.add(paymentId);
saveData();

alert(`✅ Order placed successfully!\n\nYour Order ID: ${order.orderId}\n\nTotal Amount: ₹${order.totalAmount}\n\nWe will confirm your payment shortly.${appState.currentUser?'\n\nCheck your order status in "My Orders" section.':''}`);
closeOrderModal();
window.currentOrderData=null;
window.orderCustomerData=null;
};
reader.readAsDataURL(screenshotFile);
}

function showUserLogin(){
getEl('userLoginModal').style.display='block';
getEl('userMobile').value='';
getEl('userPassword').value='';
getEl('userLoginError').classList.add('hidden');
}

function showUserRegister(){
getEl('userLoginModal').style.display='none';
getEl('userRegisterModal').style.display='block';
getEl('regName').value='';
getEl('regMobile').value='';
getEl('regEmail').value='';
getEl('regPassword').value='';
getEl('regConfirmPassword').value='';
getEl('userRegisterError').classList.add('hidden');
}

function backToUserLogin(){
getEl('userRegisterModal').style.display='none';
showUserLogin();
}

function userRegister(){
const name=getEl('regName').value.trim();
const mobile=getEl('regMobile').value.trim();
const email=getEl('regEmail').value.trim();
const password=getEl('regPassword').value;
const confirmPassword=getEl('regConfirmPassword').value;

if(!name||!mobile||!password||!confirmPassword){
getEl('userRegisterError').textContent='⚠️ Please fill all required fields!';
getEl('userRegisterError').classList.remove('hidden');
return;
}

if(mobile.length!==10||!/^\d+$/.test(mobile)){
getEl('userRegisterError').textContent='⚠️ Please enter a valid 10-digit mobile number!';
getEl('userRegisterError').classList.remove('hidden');
return;
}

if(password.length<6){
getEl('userRegisterError').textContent='⚠️ Password must be at least 6 characters!';
getEl('userRegisterError').classList.remove('hidden');
return;
}

if(password!==confirmPassword){
getEl('userRegisterError').textContent='⚠️ Passwords do not match!';
getEl('userRegisterError').classList.remove('hidden');
return;
}

const existingUser=appState.users.find(u=>u.mobile===mobile);
if(existingUser){
getEl('userRegisterError').textContent='⚠️ Mobile number already registered! Please login.';
getEl('userRegisterError').classList.remove('hidden');
return;
}

const newUser={
name:name,
mobile:mobile,
email:email,
password:simpleHash(password),
registeredAt:new Date().toISOString()
};

appState.users.push(newUser);
saveData();

alert('✅ Registration successful! Please login with your credentials.');
backToUserLogin();
}

function userLogin(){
const mobile=getEl('userMobile').value.trim();
const password=getEl('userPassword').value;

if(!mobile||!password){
getEl('userLoginError').textContent='⚠️ Please enter mobile number and password!';
getEl('userLoginError').classList.remove('hidden');
return;
}

const user=appState.users.find(u=>u.mobile===mobile);
if(!user){
getEl('userLoginError').textContent='❌ User not found! Please register first.';
getEl('userLoginError').classList.remove('hidden');
return;
}

const hashedPassword=simpleHash(password);
if(user.password!==hashedPassword){
getEl('userLoginError').textContent='❌ Invalid password!';
getEl('userLoginError').classList.remove('hidden');
return;
}

appState.currentUser={name:user.name,mobile:user.mobile,email:user.email};
localStorage.setItem('currentUser',JSON.stringify(appState.currentUser));
getEl('userLoginModal').style.display='none';
updateUserUI();
alert(`✅ Welcome back, ${user.name}!`);
}

function updateUserUI(){
if(appState.currentUser){
getEl('userLoginBtn').style.display='none';
getEl('userProfileBtn').style.display='block';
getEl('userLogoutBtn').style.display='block';
}else{
getEl('userLoginBtn').style.display='block';
getEl('userProfileBtn').style.display='none';
getEl('userLogoutBtn').style.display='none';
}
}

function userLogout(){
if(confirm('Are you sure you want to logout?')){
appState.currentUser=null;
localStorage.removeItem('currentUser');
updateUserUI();
if(getEl('mainContent').style.display==='none'){
showHome();
}
alert('✅ Logged out successfully!');
}
}

function showUserProfile(){
if(!appState.currentUser){
showUserLogin();
return;
}

cleanOldOrders();

const userOrders=appState.orders.filter(o=>o.userMobile===appState.currentUser.mobile);

const profileHtml=`
<div class="user-profile">
<div class="profile-header">
<h1>👤 My Profile</h1>
<h2>${appState.currentUser.name}</h2>
<p style="margin-top:0.5rem">📱 ${appState.currentUser.mobile}</p>
${appState.currentUser.email?`<p>📧 ${appState.currentUser.email}</p>`:''}
</div>

<h2 style="margin-bottom:1.5rem;color:var(--dark)">📦 My Orders (${userOrders.length})</h2>

${userOrders.length===0?`
<div style="text-align:center;padding:3rem;background:var(--light);border-radius:15px">
<p style="font-size:1.2rem;color:#6b7280">No orders yet!</p>
<p style="margin-top:1rem;color:#6b7280">Start shopping and your orders will appear here.</p>
<button class="btn" style="margin-top:1.5rem" onclick="showProducts()">Browse Products</button>
</div>
`:userOrders.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).map(order=>{
let statusText='PENDING PAYMENT VERIFICATION';
let statusClass='status-pending';
let extraInfo='';
if(order.status==='confirmed'){
statusText='PAYMENT CONFIRMED - PREPARING FOR DELIVERY';
statusClass='status-confirmed';
extraInfo='<p style="font-size:0.9rem;color:#059669;margin-top:0.5rem">✓ Your order is being prepared and will be delivered soon!</p>';
}else if(order.status==='delivered'){
statusText='DELIVERED SUCCESSFULLY ✓';
statusClass='status-delivered';
if(order.deliveredAt){
const deliveredDate=new Date(order.deliveredAt);
const deleteDate=new Date(deliveredDate.getTime()+(7*24*60*60*1000));
const daysLeft=Math.ceil((deleteDate-new Date())/(24*60*60*1000));
extraInfo=`<p style="font-size:0.85rem;color:#059669;margin-top:0.5rem">✓ Delivered on ${deliveredDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} • Order history will be removed in ${daysLeft} day${daysLeft>1?'s':''}</p>`;
}
}else if(order.status==='rejected'){
statusText='PAYMENT REJECTED ✗';
statusClass='status-rejected';
if(order.rejectedAt){
const rejectedDate=new Date(order.rejectedAt);
const deleteDate=new Date(rejectedDate.getTime()+(7*24*60*60*1000));
const daysLeft=Math.ceil((deleteDate-new Date())/(24*60*60*1000));
extraInfo=`<p style="font-size:0.85rem;color:#991b1b;margin-top:0.5rem">✗ Payment was rejected on ${rejectedDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} • This record will be removed in ${daysLeft} day${daysLeft>1?'s':''}</p>`;
}
}
return `
<div class="order-card">
<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem;flex-wrap:wrap;gap:1rem">
<div style="flex:1">
<h3 style="color:var(--primary);margin-bottom:0.5rem">Order #${order.orderId}</h3>
<p style="color:#6b7280;font-size:0.9rem">${new Date(order.timestamp).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
</div>
<div style="text-align:right">
<span class="order-status ${statusClass}">${statusText}</span>
${extraInfo}
</div>
</div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-top:1rem">
<div>
<p style="color:#6b7280;font-size:0.9rem">Product</p>
<p style="font-weight:600">${order.productName}</p>
</div>
<div>
<p style="color:#6b7280;font-size:0.9rem">Amount</p>
<p style="font-weight:600;color:var(--primary)">₹${order.totalAmount}</p>
<p style="font-size:0.85rem;color:#6b7280">(Product: ₹${order.productPrice} + Delivery: ₹${order.deliveryCharge})</p>
</div>
<div>
<p style="color:#6b7280;font-size:0.9rem">Delivery Address</p>
<p style="font-weight:600">📮 PIN: ${order.customerPincode}</p>
<p style="font-size:0.9rem;color:var(--dark)">🏙️ ${order.customerCity||order.customerDistrict}</p>
<p style="font-size:0.85rem;color:#6b7280">📍 ${order.customerState} • ${order.distanceKm} km from Delhi</p>
</div>
<div>
<p style="color:#6b7280;font-size:0.9rem">Payment ID</p>
<p style="font-weight:600;font-size:0.9rem">${order.paymentId}</p>
</div>
</div>
</div>
`;}).join('')}
</div>
`;

getEl('productsGrid').style.display='none';
getEl('contactSection').classList.add('hidden');
const existing=document.querySelector('.user-profile');
if(existing)existing.remove();
getEl('mainContent').insertAdjacentHTML('beforeend',profileHtml);
window.scrollTo({top:0,behavior:'smooth'});
}

function closeOrderModal(){
getEl('orderModal').style.display='none';
}

function showAdminLogin(){
getEl('adminLoginModal').style.display='block';
getEl('adminUser').value='';
getEl('adminPass').value='';
getEl('loginError').classList.add('hidden');
}

function adminLogin(){
const username=getEl('adminUser').value;
const password=getEl('adminPass').value;
const a=String.fromCharCode(115,119,101,101,116,105,101);
const b=String.fromCharCode(115,119,101,101,116,121,64,49,56,48,53);

if(username===a&&password===b){
appState.adminAuth=true;
getEl('adminLoginModal').style.display='none';
getEl('mainContent').style.display='none';
getEl('adminPanel').style.display='block';
loadAdminPanel();
}else{
getEl('loginError').textContent='❌ Invalid username or password!';
getEl('loginError').classList.remove('hidden');
}
}

function logoutAdmin(){
appState.adminAuth=false;
getEl('adminPanel').style.display='none';
getEl('mainContent').style.display='block';
}

function showPaymentSettings(){
const settingsHtml=`
<div style="background:white;padding:2rem;border-radius:15px;box-shadow:0 4px 6px rgba(0,0,0,0.1);margin-bottom:2rem">
<h2 style="color:var(--primary);margin-bottom:1.5rem">💳 Payment Settings</h2>

<div style="margin-bottom:1.5rem">
<label style="display:block;margin-bottom:0.5rem;font-weight:600">Current QR Code:</label>
<img src="${appState.qrCodeUrl}" style="max-width:300px;border:2px solid #e5e7eb;border-radius:10px;padding:10px;background:white" onerror="this.src='https://via.placeholder.com/300x300/d946ef/ffffff?text=QR+Code+Not+Found';this.style.border='2px solid #fca5a5'">
<p style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">Current file: ${appState.qrCodeUrl}</p>
</div>

<div style="margin-bottom:1.5rem">
<label style="display:block;margin-bottom:0.5rem;font-weight:600">Upload New QR Code Image:</label>
<input type="file" id="qrCodeFile" accept="image/*" style="padding:0.5rem;border:2px solid #e5e7eb;border-radius:8px;width:100%;margin-bottom:0.5rem">
<button class="btn" onclick="uploadQRCode()">📤 Upload QR Code</button>
<p style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem">💡 Tip: Upload a clear image of your payment QR code</p>
</div>

<div style="margin-bottom:1.5rem;padding-top:1.5rem;border-top:2px solid #e5e7eb">
<label style="display:block;margin-bottom:0.5rem;font-weight:600">UPI ID:</label>
<input type="text" id="newUpiId" value="${appState.upiId}" placeholder="yourname@paytm" style="width:100%;padding:0.75rem;border:2px solid #e5e7eb;border-radius:8px;font-size:1rem;margin-bottom:0.5rem">
<p style="font-size:0.85rem;color:#6b7280">This UPI ID will be shown to customers for payment</p>
</div>

<div style="display:flex;gap:1rem;padding-top:1rem;border-top:2px solid #e5e7eb">
<button class="btn" onclick="updatePaymentSettings()">💾 Save All Settings</button>
<button class="btn btn-secondary" onclick="loadAdminPanel()">← Back to Dashboard</button>
</div>
</div>
`;

getEl('adminContent').innerHTML=settingsHtml;
}

function uploadQRCode(){
const fileInput=getEl('qrCodeFile');
const file=fileInput.files[0];

if(!file){
alert('⚠️ Please select a QR code image first!');
return;
}

if(!file.type.startsWith('image/')){
alert('⚠️ Please select a valid image file!');
return;
}

const reader=new FileReader();
reader.onload=function(e){
appState.qrCodeUrl=e.target.result;
saveData();
alert('✅ QR Code uploaded successfully!');
showPaymentSettings();
};
reader.readAsDataURL(file);
}

function updatePaymentSettings(){
const newUpiId=getEl('newUpiId').value.trim();

if(!newUpiId){
alert('⚠️ Please enter a valid UPI ID!');
return;
}

if(!newUpiId.includes('@')){
alert('⚠️ UPI ID must contain @ symbol (e.g., yourname@paytm)');
return;
}

appState.upiId=newUpiId;
saveData();
alert('✅ Payment settings updated successfully!');
}

function loadAdminPanel(){
cleanOldOrders();

const dashboardHtml=`
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.5rem;margin-bottom:2rem">
<div style="background:linear-gradient(135deg,#ec4899,#d946ef);color:white;padding:1.5rem;border-radius:15px;text-align:center">
<h3 style="margin-bottom:0.5rem;font-size:2rem">${appState.orders.length}</h3>
<p>Total Orders</p>
</div>
<div style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;padding:1.5rem;border-radius:15px;text-align:center">
<h3 style="margin-bottom:0.5rem;font-size:2rem">${appState.orders.filter(o=>o.status==='pending').length}</h3>
<p>Pending Orders</p>
</div>
<div style="background:linear-gradient(135deg,#8b5cf6,#6366f1);color:white;padding:1.5rem;border-radius:15px;text-align:center">
<h3 style="margin-bottom:0.5rem;font-size:2rem">${appState.products.length}</h3>
<p>Total Products</p>
</div>
<div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:1.5rem;border-radius:15px;text-align:center;cursor:pointer" onclick="showPaymentSettings()">
<h3 style="margin-bottom:0.5rem;font-size:1.5rem">💳</h3>
<p>Payment Settings</p>
</div>
</div>

<div style="background:white;padding:2rem;border-radius:15px;box-shadow:0 4px 6px rgba(0,0,0,0.1);margin-bottom:2rem">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
<h2 style="color:var(--primary)">📦 Products Management</h2>
<button class="btn" onclick="showAddProduct()">+ Add Product</button>
</div>
<div id="addProductForm" class="hidden" style="background:var(--light);padding:1.5rem;border-radius:10px;margin-bottom:1.5rem">
<h3 style="margin-bottom:1rem">Add New Product</h3>
<input type="text" id="prodName" placeholder="Product Name" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;border:2px solid #e5e7eb;border-radius:8px">
<input type="number" id="prodPrice" placeholder="Price (₹)" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;border:2px solid #e5e7eb;border-radius:8px">
<textarea id="prodDesc" placeholder="Description" rows="3" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;border:2px solid #e5e7eb;border-radius:8px"></textarea>
<input type="text" id="prodImg" placeholder="Image URL" style="width:100%;padding:0.75rem;margin-bottom:0.75rem;border:2px solid #e5e7eb;border-radius:8px">
<button class="btn" onclick="addProduct()">Add Product</button>
<button class="btn btn-secondary" onclick="cancelAddProduct()" style="margin-left:0.5rem">Cancel</button>
</div>
<div style="overflow-x:auto">
<table style="width:100%;border-collapse:collapse">
<thead>
<tr style="background:var(--light)">
<th style="padding:1rem;text-align:left">ID</th>
<th style="padding:1rem;text-align:left">Name</th>
<th style="padding:1rem;text-align:left">Price</th>
<th style="padding:1rem;text-align:left">Description</th>
<th style="padding:1rem;text-align:center">Actions</th>
</tr>
</thead>
<tbody id="productsTable"></tbody>
</table>
</div>
</div>

<div style="background:white;padding:2rem;border-radius:15px;box-shadow:0 4px 6px rgba(0,0,0,0.1);margin-bottom:2rem">
<h2 style="color:var(--primary);margin-bottom:1rem">⏳ Pending Payment Verification</h2>
<div style="overflow-x:auto">
<table style="width:100%;border-collapse:collapse">
<thead>
<tr style="background:var(--light)">
<th style="padding:1rem;text-align:left">Order ID</th>
<th style="padding:1rem;text-align:left">Customer</th>
<th style="padding:1rem;text-align:left">Product</th>
<th style="padding:1rem;text-align:left">Amount</th>
<th style="padding:1rem;text-align:left">Payment ID</th>
<th style="padding:1rem;text-align:center">Screenshot</th>
<th style="padding:1rem;text-align:center">Actions</th>
</tr>
</thead>
<tbody id="ordersTable"></tbody>
</table>
</div>
</div>

<div style="background:white;padding:2rem;border-radius:15px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
<h2 style="color:var(--primary);margin-bottom:1rem">✅ Ready to Deliver</h2>
<div style="overflow-x:auto">
<table style="width:100%;border-collapse:collapse">
<thead>
<tr style="background:var(--light)">
<th style="padding:1rem;text-align:left">Order ID</th>
<th style="padding:1rem;text-align:left">Customer</th>
<th style="padding:1rem;text-align:left">Product</th>
<th style="padding:1rem;text-align:left">Amount</th>
<th style="padding:1rem;text-align:left">Delivery Address</th>
<th style="padding:1rem;text-align:center">Actions</th>
</tr>
</thead>
<tbody id="confirmedOrdersTable"></tbody>
</table>
</div>
</div>
`;

getEl('adminContent').innerHTML=dashboardHtml;

const productsTable=getEl('productsTable');
productsTable.innerHTML=appState.products.map(p=>`
<tr>
<td>${p.id}</td>
<td>${p.name}</td>
<td>₹${p.price}</td>
<td>${p.desc}</td>
<td class="action-btns">
<button class="btn btn-small btn-warning" onclick="editProduct(${p.id})">Edit</button>
<button class="btn btn-small btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
</td>
</tr>
`).join('');

const ordersTable=getEl('ordersTable');
const pendingOrders=appState.orders.filter(o=>o.status==='pending');
ordersTable.innerHTML=pendingOrders.length>0?pendingOrders.map(o=>`
<tr>
<td>${o.orderId}</td>
<td>
<strong>${o.customerName}</strong><br>
📱 ${o.customerMobile}<br>
📍 PIN: ${o.customerPincode}<br>
🏙️ ${o.customerCity||o.customerDistrict}, ${o.customerState}
</td>
<td>${o.productName}<br>₹${o.productPrice}</td>
<td>₹${o.totalAmount}<br><small>(Delivery: ₹${o.deliveryCharge})<br>${o.distanceKm} km</small></td>
<td>${o.paymentId}</td>
<td><a href="${o.paymentScreenshot}" target="_blank" class="btn btn-small btn-secondary">View</a></td>
<td class="action-btns">
<button class="btn btn-small btn-success" onclick="confirmPayment('${o.orderId}')">Confirm</button>
<button class="btn btn-small btn-danger" onclick="rejectPayment('${o.orderId}')">Reject</button>
</td>
</tr>
`).join(''):'<tr><td colspan="7" style="text-align:center;padding:2rem;color:#6b7280">No pending orders</td></tr>';

const confirmedTable=getEl('confirmedOrdersTable');
const confirmedOrders=appState.orders.filter(o=>o.status==='confirmed');
if(confirmedTable){
confirmedTable.innerHTML=confirmedOrders.length>0?confirmedOrders.map(o=>`
<tr>
<td>${o.orderId}</td>
<td>
<strong>${o.customerName}</strong><br>
📱 ${o.customerMobile}
</td>
<td>${o.productName}<br>₹${o.productPrice}</td>
<td>₹${o.totalAmount}</td>
<td>
${o.customerAddress}<br>
<strong>PIN: ${o.customerPincode}</strong><br>
🏙️ City: ${o.customerCity||o.customerDistrict}<br>
📍 District: ${o.customerDistrict}<br>
🗺️ State: ${o.customerState}<br>
<small>📏 ${o.distanceKm} km from Delhi</small>
</td>
<td class="action-btns">
<button class="btn btn-small btn-success" onclick="markDelivered('${o.orderId}')">Mark Delivered</button>
</td>
</tr>
`).join(''):'<tr><td colspan="6" style="text-align:center;padding:2rem;color:#6b7280">No confirmed orders</td></tr>';
}
}

function showAddProduct(){
getEl('addProductForm').classList.remove('hidden');
}

function cancelAddProduct(){
getEl('addProductForm').classList.add('hidden');
getEl('prodName').value='';
getEl('prodPrice').value='';
getEl('prodDesc').value='';
getEl('prodImg').value='';
}

function addProduct(){
const name=getEl('prodName').value.trim();
const price=parseInt(getEl('prodPrice').value);
const desc=getEl('prodDesc').value.trim();
const img=getEl('prodImg').value.trim();

if(!name||!price||!desc||!img){
alert('⚠️ Please fill all product fields!');
return;
}

const newProduct={
id:Date.now(),
name:name,
price:price,
desc:desc,
img:img
};

appState.products.push(newProduct);
saveData();
renderProducts();
loadAdminPanel();
cancelAddProduct();
alert('✅ Product added successfully!');
}

function editProduct(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const newName=prompt('Product Name:',product.name);
if(!newName)return;

const newPrice=prompt('Price (₹):',product.price);
if(!newPrice)return;

const newDesc=prompt('Description:',product.desc);
if(!newDesc)return;

const newImg=prompt('Image URL:',product.img);
if(!newImg)return;

product.name=newName.trim();
product.price=parseInt(newPrice);
product.desc=newDesc.trim();
product.img=newImg.trim();

saveData();
renderProducts();
loadAdminPanel();
alert('✅ Product updated successfully!');
}

function deleteProduct(productId){
if(!confirm('Are you sure you want to delete this product?'))return;

appState.products=appState.products.filter(p=>p.id!==productId);
saveData();
renderProducts();
loadAdminPanel();
alert('✅ Product deleted successfully!');
}

function confirmPayment(orderId){
const order=appState.orders.find(o=>o.orderId===orderId);
if(!order)return;

if(confirm(`Confirm payment for:\n\n${order.customerName}\nAmount: ₹${order.totalAmount}\nPayment ID: ${order.paymentId}\n\nThis will mark the order as CONFIRMED.`)){
order.status='confirmed';
saveData();
loadAdminPanel();
alert('✅ Payment confirmed! Order moved to "Ready to Deliver" section.');
}
}

function rejectPayment(orderId){
const order=appState.orders.find(o=>o.orderId===orderId);
if(!order)return;

if(confirm(`Reject payment for:\n\n${order.customerName}\nPayment ID: ${order.paymentId}\n\nThis will mark the order as REJECTED.`)){
order.status='rejected';
order.rejectedAt=new Date().toISOString();
saveData();
loadAdminPanel();
alert('❌ Payment rejected!');
}
}

function markDelivered(orderId){
const order=appState.orders.find(o=>o.orderId===orderId);
if(!order)return;

if(confirm(`Mark as DELIVERED for:\n\n${order.customerName}\n${order.customerAddress}\nPIN: ${order.customerPincode}\nCity: ${order.customerCity||order.customerDistrict}\n${order.customerState}\n\nOrder will be visible to user for 7 days, then auto-deleted.`)){
order.status='delivered';
order.deliveredAt=new Date().toISOString();
saveData();
loadAdminPanel();
alert('✅ Order marked as delivered!');
}
}

function cleanOldOrders(){
const now=new Date();
const sevenDaysAgo=new Date(now.getTime()-(7*24*60*60*1000));
const beforeCount=appState.orders.length;
appState.orders=appState.orders.filter(o=>{
if(o.status==='delivered'&&o.deliveredAt){
const deliveredDate=new Date(o.deliveredAt);
return deliveredDate>sevenDaysAgo;
}
if(o.status==='rejected'&&o.rejectedAt){
const rejectedDate=new Date(o.rejectedAt);
return rejectedDate>sevenDaysAgo;
}
return true;
});
if(beforeCount!==appState.orders.length){
saveData();
}
}

function showAbout(){
if(appState.adminAuth){
logoutAdmin();
}
alert('✨ Glamour Accessories\n\nYour trusted destination for premium female accessories.\n\nWe offer:\n• Handcrafted, high-quality products\n• Secure UPI payment system\n• Reliable delivery across India\n• Excellent customer service\n\nContact us for any queries!');
}

function showContact(){
if(appState.adminAuth){
logoutAdmin();
}
getEl('productsGrid').style.display='none';
getEl('contactSection').classList.remove('hidden');
window.scrollTo({top:0,behavior:'smooth'});
}

function showProducts(){
if(appState.adminAuth){
logoutAdmin();
}
getEl('productsGrid').style.display='grid';
getEl('contactSection').classList.add('hidden');
const grid=getEl('productsGrid');
if(grid){
grid.scrollIntoView({behavior:'smooth'});
}
}

function showHome(){
if(appState.adminAuth){
logoutAdmin();
}
getEl('productsGrid').style.display='grid';
getEl('contactSection').classList.add('hidden');
window.scrollTo({top:0,behavior:'smooth'});
}

window.onclick=function(event){
const orderModal=getEl('orderModal');
const adminModal=getEl('adminLoginModal');
const userLoginModal=getEl('userLoginModal');
const userRegisterModal=getEl('userRegisterModal');
if(event.target===orderModal){
closeOrderModal();
}
if(event.target===adminModal){
getEl('adminLoginModal').style.display='none';
}
if(event.target===userLoginModal){
getEl('userLoginModal').style.display='none';
}
if(event.target===userRegisterModal){
getEl('userRegisterModal').style.display='none';
}
};

window.addEventListener('keydown',function(e){
if(e.ctrlKey&&e.shiftKey&&e.key==='A'){
e.preventDefault();
showAdminLogin();
}
});

let logoClickCount=0;
let logoClickTimer=null;
getEl('logoClick').addEventListener('click',function(){
logoClickCount++;
if(logoClickCount===1){
logoClickTimer=setTimeout(function(){
logoClickCount=0;
},2000);
}
if(logoClickCount===5){
clearTimeout(logoClickTimer);
logoClickCount=0;
showAdminLogin();
}
});

async function initializeApp(){
loadData();
await loadPincodeData();
renderProducts();
cleanOldOrders();
updateUserUI();
}

initializeApp();
