import { ErrorModel } from "./ErrorModel";

export class HpError {
    constructor(err: ErrorModel) {
      const error = Error(err.message);
  
      // set immutable object properties
      Object.defineProperty(error, "message", {
        get(): string {
          return err.message;
        },
      });
  
      Object.defineProperty(error, "name", {
        get(): string {
          return "HpError";
        },
      });
  
      Object.defineProperty(error, "created_on", {
        get(): Date {
          return err.created_on;
        },
      });
  
      Object.defineProperty(error, "token", {
        get(): string {
          return err.token;
        },
      });
  
      Object.defineProperty(error, "status", {
        get(): string {
          return err.status;
        },
      });
  
      // capture where error occured
      Error.captureStackTrace(error, HpError);
  
      return error;
    }
  }