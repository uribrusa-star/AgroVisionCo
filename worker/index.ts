// Polyfill SWC/Babel helpers for Service Worker scope
if (typeof (self as any)._async_to_generator === 'undefined') {
  (self as any)._async_to_generator = function (fn: any) {
    return function (this: any) {
      var selfObj = this, args = arguments;
      return new Promise(function (resolve, reject) {
        var gen = fn.apply(selfObj, args);
        function step(key: string, arg?: any) {
          try {
            var info = gen[key](arg);
            var value = info.value;
          } catch (error) {
            reject(error);
            return;
          }
          if (info.done) {
            resolve(value);
          } else {
            Promise.resolve(value).then(
              function (val) { step("next", val); },
              function (err) { step("throw", err); }
            );
          }
        }
        step("next");
      });
    };
  };
}
if (typeof (self as any)._ts_generator === 'undefined') {
  (self as any)._ts_generator = function (thisArg: any, body: any) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [] as any[], ops: [] as any[] }, f: number, y: any, t: any, g: any;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n: number) { return function (v?: any) { return step([n, v]); }; }
    function step(op: any[]) {
      if (f) throw new TypeError("Generator is already executing.");
      while (_) try {
        if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
        if (y = 0, t) op = [op[0] & 2, t.value];
        switch (op[0]) {
          case 0: case 1: t = op; break;
          case 4: _.label++; return { value: op[1], done: false };
          case 5: _.label++; y = op[1]; op = [0]; continue;
          case 7: op = _.ops.pop(); _.trys.pop(); continue;
          default:
            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
            if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
            if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
            if (t[2]) _.ops.pop();
            _.trys.pop(); continue;
        }
        op = body.call(thisArg, _);
      } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
      if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
}

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
