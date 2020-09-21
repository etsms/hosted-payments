export interface ErrorModel {
  status: "Success" | "Error";
  created_on: Date;
  token?: string;
  message: string;
}