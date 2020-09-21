import LocalizedStrings, { LocalizedStringsMethods } from "localized-strings";

export interface TransvaultStrings extends LocalizedStringsMethods {
  transactionInProgressMessage: string;
  authorizationInProgressMessage: String;
  terminalActiveMessage: String;
  waitingForSignatureMessage: String;
  errorMessage: String;
  cancelMessage: String;
  buildingLinkMessage: String;
}

export class ResourceDefs {
  private transvaultStrings: TransvaultStrings;

  /**
   * Create a ResourceDefs.
   */
  constructor() {
    this.transvaultStrings = new LocalizedStrings({
      en: {
        transactionInProgressMessage: "Transaction in progress... Don't refresh!",
        authorizationInProgressMessage: "Authorization in progress... Don't refresh!",
        terminalActiveMessage: "Terminal active... Don't refresh!",
        waitingForSignatureMessage: "Waiting for signature... Don't refresh!",
        errorMessage: "Declined... Please try again.",
        cancelMessage: "Cancelled... Please try again.",
        buildingLinkMessage: "Building deeplink...",
      },
    });
  }

  /**
   * Transvault
   */
  public get Transvault(): TransvaultStrings {
    return this.transvaultStrings;
  }
}
