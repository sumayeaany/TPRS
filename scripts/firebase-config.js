// Replace these with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB40DvPAU_pVPnwyTDdzHkk4PSfo6FgBDk",
  authDomain: "project-d7c9c146-bcce-427e-a85.firebaseapp.com",
  projectId: "project-d7c9c146-bcce-427e-a85",
  storageBucket: "project-d7c9c146-bcce-427e-a85.firebasestorage.app",
  messagingSenderId: "106086814105",
  appId: "1:106086814105:web:e6f2bef6239741380ec308",
  measurementId: "G-BQFXFN1LSL"
};

// Initialize Firebase App
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}
