# Firebase Testing & Troubleshooting Guide

## Quick Start: Verify Firebase is Working

### Step 1: Open Browser Console
1. Open your app in browser
2. Press **F12** to open Developer Tools
3. Click on the **Console** tab

### Step 2: Run Diagnostic
Copy and paste this command:
```javascript
runFirebaseDiagnostics()
```

Expected output:
- ✅ All Systems Operational (or warnings only)
- Firebase initialized
- Firestore accessible
- Auth functions present

### Step 3: Quick Test
Run a quick functionality test:
```javascript
quickTest()
```

Expected output:
- Test 1: Check Firebase Ready ✅ PASS
- Test 2: Get Users Collection ✅ PASS
- Test 3: Get Items Collection ✅ PASS

---

## Testing Firebase Functions

### Test Authentication

**Test Login:**
```javascript
await testLogin('test@example.com', 'password123')
```

**Test Signup:**
```javascript
await testSignup('John Doe', 'john@campus.edu', '+639123456789', 'password123')
```

**Check Current User:**
```javascript
firebaseGetCurrentUser()
```

### Test Database Operations

**Get All Users:**
```javascript
await firebaseGetCollection('users')
```

**Get All Items:**
```javascript
await firebaseGetCollection('items')
```

**Add a Test Item:**
```javascript
await firebaseAddDocument('items', {
    title: 'Test Item',
    description: 'This is a test',
    category: 'electronics',
    location: 'Library',
    status: 'lost'
})
```

**Search Items:**
```javascript
const { where } = await getFirestoreHelpers()
await firebaseQuery('items', [where('status', '==', 'lost')])
```

---

## Troubleshooting Guide

### Problem 1: "Firebase not initialized"

**Causes:**
- firebase-init.js didn't load
- Network issue preventing module imports
- Script loading order incorrect

**Solutions:**
1. Reload page completely (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Check network tab for failed requests
3. Verify script order in index.html
4. Check that firebase-init.js exists at `/js/firebase-init.js`

**Verify:**
```javascript
isFirebaseReady()  // Should be true
```

---

### Problem 2: "Permission denied" errors from Firestore

**Causes:**
- Security rules not set correctly
- User not authenticated
- Database not created

**Solutions:**
1. Go to Firebase Console → Your Project → Firestore
2. Click "Security Rules"
3. Replace with these rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read items
    match /items/{document=**} {
      allow read: if true;
    }
    
    // Users can read/write their own data
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    
    // Messages are private
    match /messages/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Everything else requires authentication
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Verify:**
```javascript
const result = await firebaseGetCollection('items')
console.log(result)  // Should show success: true
```

---

### Problem 3: Images not uploading

**Causes:**
- Cloud Storage not enabled
- Storage rules too restrictive
- File too large

**Solutions:**
1. Go to Firebase Console → Storage
2. Create a bucket (if not exists)
3. Update Storage Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow anyone to read
    match /{allPaths=**} {
      allow read;
    }
    
    // Authenticated users can write to their folders
    match /users/{uid}/{allPaths=**} {
      allow write: if request.auth.uid == uid;
    }
    
    // Items folder
    match /items/{document=**} {
      allow write: if request.auth != null;
    }
  }
}
```

**Verify:**
```javascript
// Test upload (create a test file first)
const canvas = document.createElement('canvas')
canvas.toBlob(blob => {
    firebaseUploadFile('test/image.png', blob)
        .then(result => console.log('Upload:', result))
})
```

---

### Problem 4: Login not working

**Causes:**
- User account doesn't exist
- Wrong email/password
- Auth module not initialized

**Solutions:**
1. Verify user exists in Firebase Console → Authentication
2. Check password is at least 6 characters
3. Try creating new account with signup first
4. Check console for specific error message

**Debug:**
```javascript
// Check if Auth is ready
firebaseGetCurrentUser()  // Should return null if not logged in

// Try test signup first
await testSignup('Test User', 'test@example.com', '+639123456789', 'password123')
```

---

### Problem 5: "MISSING_OR_INVALID_FIRESTORE_TARGET"

**Causes:**
- Firestore database not created
- Project ID mismatch

**Solutions:**
1. Go to Firebase Console
2. Select project: pcdscampuslostandfound
3. Click Firestore Database (or Build → Firestore)
4. Click "Create Database"
5. Choose region (default is fine)
6. Click "Start in production mode"
7. Click "Create" and wait for setup

**Verify:**
```javascript
const result = await firebaseGetCollection('users')
console.log(result)  // Should work now
```

---

### Problem 6: App shows login but won't authenticate

**Causes:**
- Mock data being used instead of Firebase
- Event listeners not set up
- Forms not wired to handlers

**Solutions:**
1. Verify authentication works:
```javascript
// Should be true
isFirebaseReady()

// Should have these functions
typeof firebaseLogin === 'function'
typeof firebaseSignup === 'function'
```

2. Check forms are connected:
```javascript
// Should find the elements
document.getElementById('loginForm')
document.getElementById('signupForm')
```

3. Test manually:
```javascript
// Direct test
await testSignup('New User', 'newuser@test.com', '+639123456789', 'password123')
```

---

### Problem 7: "Failed to instantiate Auth provider"

**Causes:**
- Firebase Config incorrect
- Auth API not enabled

**Solutions:**
1. Verify config in firebase-init.js:
```javascript
// Check these match Firebase Console
console.log(firebaseConfig.projectId)
console.log(firebaseConfig.apiKey)
```

2. Go to Firebase Console → Authentication
3. Click "Get Started"
4. Click "Email/Password"
5. Enable it and click Save

**Verify:**
```javascript
firebaseGetCurrentUser()  // Should work
```

---

### Problem 8: Real-time updates not working

**Causes:**
- Real-time listeners not set up
- Firestore rules blocking reads

**Solutions:**
1. Set up a listener:
```javascript
firebaseListenToCollection('items', (result) => {
    if (result.success) {
        console.log('Items updated:', result.data)
    }
})
```

2. Add an item and watch it appear:
```javascript
await firebaseAddDocument('items', {
    title: 'New Item',
    status: 'lost'
})
// Should see it logged in the listener above
```

---

## Advanced Diagnostics

### Check Module Imports
```javascript
// Check if modules are available
console.log(firebaseApp)      // Should exist
console.log(firebaseAuth)     // Should exist
console.log(firebaseDB)       // Should exist
console.log(firebaseStorage)  // Should exist
```

### Monitor Performance
```javascript
// See initialization time
getPerformanceReport()
```

### Check Network
1. Open Network tab (F12 → Network)
2. Reload page
3. Look for:
   - ✅ firebase-init.js (loaded)
   - ✅ firebase-*.js files
   - ❌ Any red "failed" requests

### Verify Configuration
```javascript
// Should show your Firebase config
console.log(firebaseConfig)

// Should match your Firebase project
console.log(firebaseConfig.projectId)  
// Should be: pcdscampuslostandfound
```

---

## Common Configuration Issues

### Wrong Project ID
**Fix:**
1. Go to console.firebase.google.com
2. Find your project: `pcdscampuslostandfound`
3. Click Project Settings (gear icon)
4. Copy values to firebase-init.js

### API Key Restrictions
**Fix:**
1. Go to Google Cloud Console
2. Select your project
3. Go to APIs & Services → Credentials
4. Find your API Key
5. Edit it → Remove restrictions OR
6. Add restrictions but enable Firestore, Auth, Storage

### Storage Bucket Not Found
**Fix:**
1. Go to Firebase Console → Storage
2. Click "Get Started" or "Create bucket"
3. Choose your project as default
4. Click "Done"

---

## Getting Help

### Step 1: Get Diagnostic Report
```javascript
runFirebaseDiagnostics()
// Take a screenshot of the output
```

### Step 2: Check Firebase Console
- Go to console.firebase.google.com
- Select project: pcdscampuslostandfound
- Check:
  - ✅ Authentication enabled
  - ✅ Firestore created
  - ✅ Storage bucket exists
  - ✅ Security rules updated

### Step 3: Check Browser Console
- F12 → Console
- Look for error messages
- Note the error code

### Step 4: Review Logs
- Firebase Console → All products
- Check recent activity
- Look for quota issues

---

## Success Indicators

✅ **Everything Working:**
- `runFirebaseDiagnostics()` shows green checkmarks
- `quickTest()` shows all PASS
- Can login with test account
- Can post items with images
- Items appear instantly for other users

✅ **Firebase Ready:**
- Browser console shows no errors
- `isFirebaseReady()` returns true
- All auth functions are defined
- Firestore responds to queries

✅ **Production Ready:**
- Signup works reliably
- Login works with correct credentials
- Images upload correctly
- Real-time updates work
- No console errors

---

## Quick Reference

| Action | Command |
|--------|---------|
| Full diagnostic | `runFirebaseDiagnostics()` |
| Quick test | `quickTest()` |
| Check if ready | `isFirebaseReady()` |
| Get current user | `firebaseGetCurrentUser()` |
| Get users | `await firebaseGetCollection('users')` |
| Get items | `await firebaseGetCollection('items')` |
| Test login | `await testLogin(email, pass)` |
| Test signup | `await testSignup(name, email, phone, pass)` |

---

**Last Updated**: April 28, 2026
**Version**: Firebase SDK 12.12.1
**Status**: Production Ready ✅
