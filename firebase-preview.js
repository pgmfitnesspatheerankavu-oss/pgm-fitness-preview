import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyA4OCKFMQqoK7GH4t7lpSUcH0CBGEopi-Y",
  authDomain: "pgmfitness-5e107.firebaseapp.com",
  projectId: "pgmfitness-5e107",
  storageBucket: "pgmfitness-5e107.firebasestorage.app",
  messagingSenderId: "207204433978",
  appId: "1:207204433978:web:4cf0e33871c8c07f3d7503"
};
const OWNER_UID = "uk9cEyJbLSP8eFTjFw7y3Hk5Jf22";
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const say = value => { $("status").textContent = value; };
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("submit").disabled = true;
  say("Checking credentials…");
  try {
    const credential = await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    const user = credential.user;
    if (user.uid === OWNER_UID) {
      say("Owner login successful. Firebase Authentication is connected.");
    } else {
      const snap = await getDoc(doc(db, "users", user.uid));
      const profile = snap.exists() ? snap.data() : null;
      if (profile?.role === "staff" && profile?.active === true) {
        say("Staff login successful. Active Staff profile verified. UID: " + user.uid);
      } else {
        await signOut(auth);
        say("This account has no active Staff profile. Ask the Owner to check users/" + user.uid);
      }
    }
  } catch (error) {
    const code = error?.code || "unknown";
    say("Login check failed: " + code + ". Check the email/password and Firebase connection.");
    console.error(error);
  } finally {
    $("submit").disabled = false;
  }
});
$("logout").addEventListener("click", () => signOut(auth));
onAuthStateChanged(auth, user => {
  $("logout").classList.toggle("hide", !user);
  if (!user && !$("status").textContent.startsWith("Login check failed")) say("Signed out. Enter your Firebase email and password.");
});
