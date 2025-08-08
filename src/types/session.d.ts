import 'express-session';

declare module 'express-session' {
  interface SessionData {
    companyCode?: string;
  }
}