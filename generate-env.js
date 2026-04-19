const fs = require('fs');
const path = require('path');

const cfg = {
  apiKey:            process.env.FIREBASE_API_KEY            || '',
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
  projectId:         process.env.FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.FIREBASE_APP_ID             || '',
  measurementId:     process.env.FIREBASE_MEASUREMENT_ID     || ''
};

const dev = `export const environment = {
  production: false,
  firebase: {
    apiKey: '${cfg.apiKey}',
    authDomain: '${cfg.authDomain}',
    projectId: '${cfg.projectId}',
    storageBucket: '${cfg.storageBucket}',
    messagingSenderId: '${cfg.messagingSenderId}',
    appId: '${cfg.appId}',
    measurementId: '${cfg.measurementId}'
  }
};
`;

const prod = `export const environment = {
  production: true,
  firebase: {
    apiKey: '${cfg.apiKey}',
    authDomain: '${cfg.authDomain}',
    projectId: '${cfg.projectId}',
    storageBucket: '${cfg.storageBucket}',
    messagingSenderId: '${cfg.messagingSenderId}',
    appId: '${cfg.appId}',
    measurementId: '${cfg.measurementId}'
  }
};
`;

const envDir = path.join(__dirname, 'gremio-angular', 'src', 'environments');
fs.writeFileSync(path.join(envDir, 'environment.ts'), dev);
fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), prod);
console.log('✔ Environment files generated.');
