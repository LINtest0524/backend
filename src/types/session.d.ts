import 'express-session';

declare module 'express-session' {
  interface SessionData {
    companyCode?: string;
    facebookLoginData?: {
      token: string;
      user: any;
      company: string;
    };
  }
}