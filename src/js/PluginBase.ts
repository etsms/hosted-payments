import $, { Promise } from "jquery";
import { ResourceDefs } from "./ResourceDefs";

export class PluginBase {

  public context: any;
  public $parent: JQuery<HTMLElement>;
  public $content: JQuery<HTMLElement>;
  public $element: JQuery<HTMLElement>;
  public browserId: string;
  public transactionId: string;
  public isMobile: boolean;
  public formData: { _isValid: boolean };
  public resources: ResourceDefs;

  /**
   * Plugin
   */
  constructor($element: JQuery<HTMLElement>) {
    this.resources = new ResourceDefs();
    this.context = null;
    this.$parent = null;
    this.$content = null;
    this.$element = $element;
    this.browserId = null;
    this.transactionId = "";
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.formData = {
      _isValid: false,
    };
  }

  /**
   * init
   */
  public init(): void {}

  /**
   * createTemplate
   */
  public createTemplate(): JQuery<HTMLElement> {
    return $("<div />");
  }

  /**
   * attachEvents
   */
  public attachEvents(): void {}

  /**
   * detachEvents
   */
  public detachEvents(): void {}

  /**
   * showSuccess
   */
  public showSuccess<TR, TJ = any, TN = any>(): Promise<TR, TJ, TN>  {
    let def = $.Deferred();

    return def.promise();
  }

  /**
   * showSuccess
   */
  public showError<TR, TJ = any, TN = any>(message: string, title?: string, code?: string): Promise<TR, TJ, TN>  {
    
    let def = $.Deferred();

    const $el = $("<div />", {
      "class": "hp-error-container hp-error-container-active"
    });

    const html = `
      <div class="hp-error-container hp-error-container-active">
        <span class="hp-error-text">${title}</span>
        <div class="hp-error-message">${message}</div>
        <hr>
        <div class="hp-error-disclaimer">
          If you feel that the above error was made by a mistake please contact our support at ${}. 
          <br />
          <br />
          <a href="javascript:;">&times; Dismiss error</a>
        </div>
      </div>
    `;

    $el.html(html);

    $el
      .find("a")
      .on("click", function(e){
        e.preventDefault();
        $el.remove();
      });

    $el
      .appendTo(this.$parent)
      .fadeIn(function(){
        def.resolve();
      });

    return def.promise();
  }

  /**
   * isCreditCard
   */
  public get isCreditCard(): boolean {
    return false;
  }

  /**
   * isBankAccount
   */
  public get isBankAccount(): boolean {
    return false;
  }

  /**
   * isSuccessPage
   */
  public get isSuccessPage(): boolean {
    return false;
  }

  /**
   * isCode
   */
  public get isCode(): boolean {
    return false;
  }

  /**
   * isTransvault
   */
  public get isTransvault(): boolean {
    return false;
  }
}
