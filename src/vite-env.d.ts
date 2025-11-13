/// <reference types="vite/client" />

interface ImportMetaEnv {
  // AWS Cognito Configuration
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_DOMAIN: string;
  // API Gateway Configuration
  readonly VITE_API_GATEWAY_URL: string;
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

