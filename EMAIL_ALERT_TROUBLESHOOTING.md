# 📧 EMAIL ALERT TROUBLESHOOTING GUIDE

## Why You're Not Receiving Alert Emails

### Most Common Reasons:

1. **No Emergency Contacts Added** ⚠️
2. **Email Configuration Issue**
3. **Gmail App Password Incorrect**
4. **Firestore Query Failing**

---

## 🔍 STEP 1: Check If Emergency Contacts Exist

### Option A: Check in the App
1. Go to http://localhost:3000
2. Sign in
3. Click "Emergency Contacts" in the navigation
4. **Do you see any contacts listed?**
   - ✅ YES → Go to Step 2
   - ❌ NO → **Add a contact first!**

### Option B: Add Your First Emergency Contact
1. Go to "Emergency Contacts" page
2. Click "Add Emergency Contact"
3. Fill in the form:
   - **Name**: Your name or test contact
   - **Phone**: Your phone number
   - **Email**: **kanijayachandran25@gmail.com** (your email)
   - **Relationship**: Self/Test
4. Click "Save Contact"
5. **You should receive an email immediately** saying "Emergency Contact Added"

---

## 🔍 STEP 2: Verify Email Configuration

### Check Server .env File
The file `server/.env` should have:
```
EMAIL_USER=kanijayachandran25@gmail.com
EMAIL_PASS=yfocnapavbtumjkf
```

✅ **This is already configured correctly!**

### Test Gmail App Password
The app password `yfocnapavbtumjkf` should work. If not:
1. Go to https://myaccount.google.com/apppasswords
2. Generate a new app password for "Mail"
3. Update `EMAIL_PASS` in `server/.env`
4. Restart the server

---

## 🔍 STEP 3: Test Email Sending

### Send a Manual Alert
1. Go to Real Dashboard
2. Click "Send Manual Alert"
3. Check server console for logs:

**Expected Logs:**
```
=== EMERGENCY REPORT REQUEST START ===
User: [your_user_id] [your_email]
Manual alert: true
Writing emergency to Firestore...
Emergency saved with ID: xyz789
Sending emergency alerts with location...
Sending emergency alert for user: [your_user_id]
Sending emergency alerts to 2 recipients
Emergency alert sent to admin: kanijayachandran25@gmail.com
Emergency alert sent to emergency_contact: [contact_email]
```

**If you see:**
```
No emergency contacts found for user: [your_user_id]
```
→ **You need to add emergency contacts first!**

---

## 🔍 STEP 4: Check Email Delivery

### Where to Look:
1. **Inbox**: Check kanijayachandran25@gmail.com inbox
2. **Spam/Junk**: Check spam folder
3. **Promotions Tab**: Check Gmail tabs
4. **Search**: Search for "SilentSOS" in Gmail

### Email Subject Line:
```
🚨 URGENT: SilentSOS Emergency Detected
```

---

## 🛠️ QUICK FIX: Add Test Emergency Contact

Run this in your browser console (F12) while signed in:

```javascript
// Add yourself as an emergency contact
fetch('http://localhost:5000/api/emergency-contacts/add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
  },
  body: JSON.stringify({
    name: 'Test Contact',
    phone: '+1234567890',
    email: 'kanijayachandran25@gmail.com',
    relationship: 'Self'
  })
})
.then(r => r.json())
.then(data => console.log('Contact added:', data))
.catch(err => console.error('Error:', err));
```

---

## 📊 DEBUGGING CHECKLIST

### Server Side:
- [ ] Server is running on port 5000
- [ ] EMAIL_USER is set in .env
- [ ] EMAIL_PASS is set in .env
- [ ] Firebase is initialized
- [ ] Firestore is accessible

### Firestore:
- [ ] `emergency_contacts` collection exists
- [ ] At least one contact document exists
- [ ] Contact has `userId`, `name`, `email`, `phone` fields
- [ ] `userId` matches your authenticated user ID

### Email:
- [ ] Gmail account is kanijayachandran25@gmail.com
- [ ] App password is correct
- [ ] 2-Step Verification is enabled on Gmail
- [ ] "Less secure app access" is NOT needed (using app password)

### Manual Alert:
- [ ] User is authenticated
- [ ] Manual alert button clicked
- [ ] Server logs show "Sending emergency alerts..."
- [ ] No errors in server console
- [ ] Response shows success: true

---

## 🎯 MOST LIKELY ISSUE

**You haven't added any emergency contacts yet!**

### Solution:
1. Go to http://localhost:3000/contacts
2. Add yourself as a contact:
   - Name: Your Name
   - Phone: Your Phone
   - Email: kanijayachandran25@gmail.com
   - Relationship: Self/Test
3. Click "Save Contact"
4. **You should receive an email immediately**
5. Then try "Send Manual Alert" again

---

## 📧 EXPECTED EMAIL FLOW

### When You Add a Contact:
```
Subject: 🚨 SilentSOS Emergency Alert - Contact Added
To: kanijayachandran25@gmail.com (admin)
To: [contact_email] (the contact you added)
```

### When You Send Manual Alert:
```
Subject: 🚨 URGENT: SilentSOS Emergency Detected
To: kanijayachandran25@gmail.com (admin)
To: [all_emergency_contacts]
```

---

## 🔧 MANUAL TEST

### Test 1: Check Emergency Contacts in Firestore
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Look for `emergency_contacts` collection
4. **Do you see any documents?**
   - YES → Check if `email` field exists
   - NO → **Add a contact through the app first!**

### Test 2: Check Server Logs
After clicking "Send Manual Alert", check server console:

```bash
# Should see:
Sending emergency alert for user: [user_id]
Sending emergency alerts to X recipients
Emergency alert sent to admin: kanijayachandran25@gmail.com
```

### Test 3: Check Email Transporter
The server uses nodemailer with Gmail. If emails aren't sending:
1. Check Gmail security settings
2. Verify app password is correct
3. Check for Gmail blocks/warnings

---

## ✅ SOLUTION STEPS

1. **Add Emergency Contact**:
   - Go to Emergency Contacts page
   - Add yourself with email: kanijayachandran25@gmail.com
   - Save contact
   - **Check email** - you should receive "Contact Added" email

2. **Send Manual Alert**:
   - Go to Real Dashboard
   - Click "Send Manual Alert"
   - **Check email** - you should receive "Emergency Detected" email

3. **Check Server Logs**:
   - Look for "Emergency alert sent to..." messages
   - If you see "No emergency contacts found" → Add contacts first

4. **Check Spam Folder**:
   - Gmail might filter automated emails
   - Mark as "Not Spam" if found there

---

## 🚨 STILL NOT WORKING?

### Share These Logs:
1. **Server console output** after sending manual alert
2. **Browser console output** (F12) after sending manual alert
3. **Firestore screenshot** of emergency_contacts collection
4. **Any error messages** you see

### Common Errors:
- "No emergency contacts found" → Add contacts first
- "Authentication failed" → Check Gmail app password
- "EAUTH" error → Gmail credentials incorrect
- "ECONNREFUSED" → Check internet connection

---

## 📝 QUICK CHECKLIST

Before sending manual alert:
- [ ] At least one emergency contact added
- [ ] Contact has valid email address
- [ ] Server is running (check port 5000)
- [ ] User is signed in
- [ ] Check server logs for errors

After sending manual alert:
- [ ] Check inbox: kanijayachandran25@gmail.com
- [ ] Check spam folder
- [ ] Check server logs for "Emergency alert sent"
- [ ] Verify Firestore has emergency document

---

## 🎉 SUCCESS INDICATORS

You'll know it's working when:
1. ✅ Adding contact sends immediate email
2. ✅ Manual alert sends email to admin + contacts
3. ✅ Server logs show "Emergency alert sent to..."
4. ✅ Email appears in inbox (or spam)
5. ✅ Email contains location data (if available)

**Most likely you just need to add an emergency contact first!**