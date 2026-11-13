// HYFIT Firebase client with owner phone/password sign-in and SMS OTP password recovery.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signInWithPhoneNumber,
  EmailAuthProvider, linkWithCredential, updatePassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { decideAccess } from "./auth-policy.js";

const firebaseConfig = window.PGM_FIREBASE_CONFIG;
const OWNER_UID = window.PGM_OWNER_UID;
const OWNER_PHONES = new Set(["+918606369000", "+918606369444", "+918157995527", "+917736359894"]);
if (!firebaseConfig || !OWNER_UID) throw new Error("Firebase configuration is not installed.");

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);\nlet ownerOtpCompleting = false;

export function normalizeOwnerPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.length === 10 ? "+91" + digits
    : digits.length === 12 && digits.startsWith("91") ? "+" + digits
    : raw.startsWith("+") ? raw : "";
  return OWNER_PHONES.has(normalized) ? normalized : "";
}
function ownerAlias(phone) {
  return "owner." + phone.replace(/\D/g, "") + "@hyfit-a6f68.firebaseapp.com";
}

export async function resolveRole(user) {
  if (!user) return decideAccess(null, OWNER_UID);
  if (user.uid === OWNER_UID || normalizeOwnerPhone(user.phoneNumber)) return decideAccess(user, OWNER_UID);
  const profile = await getDoc(doc(db, "users", user.uid));
  return decideAccess(user, OWNER_UID, profile.exists() ? profile.data() : null);
}

export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return resolveRole(credential.user);
}
export async function signInOwnerWithPhonePassword(phoneInput, password) {
  const phone = normalizeOwnerPhone(phoneInput);
  if (!phone) throw new Error("This mobile number is not registered for Owner access.");
  const credential = await signInWithEmailAndPassword(auth, ownerAlias(phone), password);
  const role = await resolveRole(credential.user);
  if (role.role !== "owner") {
    await signOut(auth);
    throw new Error("Owner phone verification is not linked to this account. Use Set / Forgot Password.");
  }
  return role;
}
export async function startOwnerPhoneVerification(phoneInput, verifier) {
  const phone = normalizeOwnerPhone(phoneInput);
  if (!phone) throw new Error("This mobile number is not registered for Owner access.");
  return signInWithPhoneNumber(auth, phone, verifier);
}
export async function completeOwnerPasswordSetup(confirmation, code, newPassword) {
  if (String(newPassword || "").length < 6) throw new Error("Password must be at least 6 characters.");
  const credential = await confirmation.confirm(code);
  const user = credential.user;
  const phone = normalizeOwnerPhone(user.phoneNumber);
  if (!phone) {
    await signOut(auth);
    throw new Error("Verified number is not approved for Owner access.");
  }
  const alias = ownerAlias(phone);
  if (!user.email) {
    await linkWithCredential(user, EmailAuthProvider.credential(alias, newPassword));
  } else if (user.email.toLowerCase() === alias.toLowerCase()) {
    await updatePassword(user, newPassword);
  } else {
    throw new Error("This phone account is already linked to a different email. Contact the app administrator.");
  }
  await user.reload();
  return resolveRole(auth.currentUser);
}
export async function signOutUser() { await signOut(auth); }
export function watchAuth(callback) {
  let revision = 0;
  return onAuthStateChanged(auth, async user => {
    const eventRevision = ++revision;
    const stillCurrent = () => eventRevision === revision && (auth.currentUser?.uid || null) === (user?.uid || null);
    try {
      const role = user ? await resolveRole(user) : { allowed: false, reason: "signed-out" };
      if (stillCurrent()) callback(role, user);
    } catch (error) {
      if (stillCurrent()) callback({ allowed: false, reason: "role-check-failed", error }, user);
    }
  });
}

// Owner-only legacy-safe inventory check; does not change or migrate any data.
export async function getCloudCollectionCounts() {
  const result = {};
  for (const name of ["members", "payments", "renewals", "attendance", "expenses"]) {
    result[name] = (await getDocs(collection(db, name))).size;
  }
  return result;
}

// Staff/Owner transaction records are append-only at the Firestore rules layer.
export async function addPayment(record, user = auth.currentUser) {
  if (!user) throw new Error("Login required");
  const role = await resolveRole(user);
  if (!role.allowed) throw new Error("Account is not enabled for cloud records");
  return addDoc(collection(db, "payments"), { ...record, createdBy: user.uid, createdAt: serverTimestamp() });
}
export async function addRenewal(record, user = auth.currentUser) {
  if (!user) throw new Error("Login required");
  const role = await resolveRole(user);
  if (!role.allowed) throw new Error("Account is not enabled for cloud records");
  return addDoc(collection(db, "renewals"), { ...record, createdBy: user.uid, createdAt: serverTimestamp() });
}
