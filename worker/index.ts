importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "studio-1014760813-be189",
  appId: "1:772501385922:web:739fa93cd99c91c393c15b",
  storageBucket: "studio-1014760813-be189.firebasestorage.app",
  apiKey: "AIzaSyDECON6YrcAh9R8M8prlaYt937dFyNjnN4",
  authDomain: "studio-1014760813-be189.firebaseapp.com",
  messagingSenderId: "772501385922"
};

if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "AgroVista Alerta";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes un nuevo mensaje.",
    icon: '/icon-512x512.png',
    badge: '/icon-512x512.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
