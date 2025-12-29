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
qrCodeUrl: 'payment.jpg',
upiId:'yourname@paytm'
};

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
appState.qrCodeUrl=parsed.qrCodeUrl||appState.qrCodeUrl;
appState.upiId=parsed.upiId||appState.upiId;
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
<input type="tel" id="customerMobile" placeholder="10 digit correct mobile number" maxlength="10" required>
</div>

<div class="form-group">
<label>City *</label>
<input type="text" id="customerCity" placeholder="Enter your city" onblur="calculateDistanceFromDelhi(${product.price})" required>
</div>

<div class="form-group">
<label>State *</label>
<input type="text" id="customerState" placeholder="Enter your state" required>
</div>

<div class="form-group">
<label>Full Delivery Address *</label>
<textarea id="customerAddress" rows="3" placeholder="Enter complete delivery address.if its wrong you are the responsible" required></textarea>
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

function calculateDelivery(productPrice){
const distance=parseInt(getEl('distanceKm').value)||0;
let deliveryCharge=0;

if(distance>=100 && distance<=500){
deliveryCharge=90;
}else if(distance>500){
deliveryCharge=Math.floor(distance/100)*90;
}

getEl('deliveryCharge').textContent=`₹${deliveryCharge}`;
const total=productPrice+deliveryCharge;
getEl('totalAmount').textContent=`₹${total}`;
}

const cityDistances={
'mumbai':1400,'pune':1400,'nagpur':1100,'thane':1400,'nashik':1300,
'bangalore':2100,'mysore':2300,'mangalore':2400,'hubli':1900,
'hyderabad':1500,'secunderabad':1500,'warangal':1600,'vijayawada':1600,
'chennai':2200,'coimbatore':2400,'madurai':2500,'salem':2400,
'kolkata':1500,'howrah':1500,'durgapur':1400,'asansol':1400,
'ahmedabad':900,'surat':1200,'vadodara':1000,'rajkot':1100,
'jaipur':280,'jodhpur':600,'udaipur':650,'kota':500,
'lucknow':550,'kanpur':450,'agra':230,'varanasi':800,'allahabad':650,
'pune':1400,'indore':800,'bhopal':750,'gwalior':320,'jabalpur':950,
'chandigarh':250,'ludhiana':320,'amritsar':450,'jalandhar':370,
'patna':1000,'gaya':1100,'bhagalpur':1200,'muzaffarpur':1050,
'ranchi':1350,'jamshedpur':1450,'dhanbad':1300,
'raipur':1200,'bhilai':1200,'bilaspur':1350,
'guwahati':1900,'shillong':2000,'imphal':2400,
'bhubaneswar':1700,'cuttack':1750,'rourkela':1650,
'dehradun':250,'haridwar':220,'roorkee':180,'haldwani':280,
'shimla':350,'manali':550,'dharamshala':470,
'jammu':580,'srinagar':800,
'gurgaon':30,'noida':20,'ghaziabad':25,'faridabad':40,'greater noida':35,
'meerut':70,'moradabad':160,'saharanpur':170,'muzaffarnagar':130,
'aligarh':130,'mathura':150,'bareilly':250,'rampur':190,
'gorakhpur':850,'prayagraj':650,'mirzapur':750
};

function calculateDistanceFromDelhi(productPrice){
const city=getEl('customerCity').value.trim().toLowerCase();
if(!city)return;

let distance=cityDistances[city];
if(!distance){
distance=1000;
}

let deliveryCharge=0;
if(distance>=150 && distance<=200){
deliveryCharge=85;
}else if(distance>=201 && distance<=500){
deliveryCharge=99;
}else if(distance>=501 && distance<=1000){
deliveryCharge=135;
}else if(distance>=1001 && distance<=2000){
deliveryCharge=205;
}else if(distance>2000){
deliveryCharge=Math.floor(distance/1000)*205;
}else{
deliveryCharge=50;
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
totalAmount:total
};
}

function showReviewScreen(productId){
const product=appState.products.find(p=>p.id===productId);
if(!product)return;

const customerName=getEl('customerName').value.trim();
const customerMobile=getEl('customerMobile').value.trim();
const customerCity=getEl('customerCity').value.trim();
const customerState=getEl('customerState').value.trim();
const customerAddress=getEl('customerAddress').value.trim();

if(!customerName||!customerMobile||!customerCity||!customerState||!customerAddress){
alert('⚠️ Please fill all required fields!');
return;
}

if(customerMobile.length!==10||!/^\d+$/.test(customerMobile)){
alert('⚠️ Please enter a valid 10-digit mobile number!');
return;
}

if(!window.currentOrderData){
alert('⚠️ Please wait for delivery calculation!');
return;
}

window.orderCustomerData={
name:customerName,
mobile:customerMobile,
city:customerCity,
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
<p style="margin:0.5rem 0"><strong>City:</strong> ${customerCity}</p>
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
if(window.currentOrderData){
calculateDistanceFromDelhi(product.price);
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
<img src="${appState.qrCodeUrl}" class="qr-img" alt="Payment QR Code">
<div class="upi-id">
<span><strong>UPI ID:</strong> ${appState.upiId}</span>
<button class="copy-btn" onclick="copyUpiId()">Copy UPI ID</button>
</div>
</div>

<div class="form-group">
<label>Payment Transaction ID *</label>
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
alert('UPI ID copied to clipboard!');
}

function handleFileSelect(input){
if(input.files && input.files[0]){
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

if(!window.currentOrderData){
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
customerCity:window.orderCustomerData.city,
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
extraInfo=`<p style="font-size:0.85rem;color:#991b1b;margin-top:0.5rem">✗ Payment was rejected on ${rejectedDate.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} • This record will be removed in ${daysLeft} day${daysLeft>1?'s':''}</p><p style="font-size:0.85rem;color:#991b1b;margin-top:0.3rem">Please contact support if you believe this was an error.</p>`;
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
<p style="font-weight:600">${order.customerCity}, ${order.customerState}</p>
<p style="font-size:0.85rem;color:#6b7280">${order.distanceKm} km from Delhi</p>
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

if(username===a && password===b){
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

function loadAdminPanel(){
cleanOldOrders();
getEl('totalOrders').textContent=appState.orders.length;
getEl('pendingOrders').textContent=appState.orders.filter(o=>o.status==='pending').length;
getEl('totalProducts').textContent=appState.products.length;

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
📍 ${o.customerCity}, ${o.customerState}
</td>
<td>${o.productName}<br>₹${o.productPrice}</td>
<td>₹${o.totalAmount}<br><small>(Delivery: ₹${o.deliveryCharge})</small></td>
<td>${o.paymentId}</td>
<td><a href="${o.paymentScreenshot}" target="_blank" class="btn btn-small btn-secondary">View</a></td>
<td class="action-btns">
<button class="btn btn-small btn-success" onclick="confirmPayment('${o.orderId}')">Confirm Payment</button>
<button class="btn btn-small btn-danger" onclick="rejectPayment('${o.orderId}')">Reject Payment</button>
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
<td>${o.customerAddress}<br>${o.customerCity}, ${o.customerState}<br><small>${o.distanceKm} km from Delhi</small></td>
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
alert('❌ Payment rejected! Order removed from pending list.');
}
}

function markDelivered(orderId){
const order=appState.orders.find(o=>o.orderId===orderId);
if(!order)return;

if(confirm(`Mark as DELIVERED for:\n\n${order.customerName}\n${order.customerAddress}\n${order.customerCity}, ${order.customerState}\n\nOrder will be visible to user for 7 days, then auto-deleted.`)){
order.status='delivered';
order.deliveredAt=new Date().toISOString();
saveData();
loadAdminPanel();
alert('✅ Order marked as delivered! Will auto-delete after 7 days.');
}
}

function cleanOldOrders(){
const now=new Date();
const sevenDaysAgo=new Date(now.getTime()-(7*24*60*60*1000));
const beforeCount=appState.orders.length;
appState.orders=appState.orders.filter(o=>{
if(o.status==='delivered' && o.deliveredAt){
const deliveredDate=new Date(o.deliveredAt);
return deliveredDate>sevenDaysAgo;
}
if(o.status==='rejected' && o.rejectedAt){
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
if(e.ctrlKey && e.shiftKey && e.key==='A'){
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

loadData();
renderProducts();
cleanOldOrders();