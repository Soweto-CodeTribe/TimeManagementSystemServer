import admin from 'firebase-admin';

// Initialize the app if it hasn't been initialized yet
if (!admin.apps.length) {
  // For production environment (like Render)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    // Construct the service account from environment variables
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } 
  // For production environment using the entire JSON string
  else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  // For local development with service account JSON file
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
  } 
  // Fallback initialization
  else {
    console.warn("No Firebase credentials found. Initializing with default config.");
    admin.initializeApp();
  }
  
  console.log("Firebase Admin initialized:", admin.apps[0]?.name);
}

const db = admin.firestore();


export { admin, db };