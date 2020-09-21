import { PluginBase } from "./PluginBase";


/* hp.Plugins.Transvault */
// Copyright (c) Elavon Inc. All rights reserved.
// Licensed under the Apache License
class TransvaultPlugin extends PluginBase
{    
    constructor($element: JQuery<HTMLElement>) {
        super($element);
    }

    public get isTransvault() {
        return true;
    }

    public get messages() {
        return {
            Success: this.resources.Transvault.authorizationInProgressMessage,
            BeginSale: this.resources.Transvault.transactionInProgressMessage,
            BeginAuth: this.resources.Transvault.authorizationInProgressMessage,
            Login: this.resources.Transvault.terminalActiveMessage,
            LoginSuccess: this.resources.Transvault.terminalActiveMessage,
            ExecuteCommand: this.resources.Transvault.terminalActiveMessage,
            DisplayAmount: this.resources.Transvault.transactionInProgressMessage,
            DisplayForm: this.resources.Transvault.transactionInProgressMessage,
            FindTermsAndConditions: this.resources.Transvault.transactionInProgressMessage,
            InsertOrSwipe: this.resources.Transvault.transactionInProgressMessage,
            Idle: this.resources.Transvault.transactionInProgressMessage,
            Offline: this.resources.Transvault.errorMessage,
            ProcessingError: this.resources.Transvault.errorMessage,
            ReadCardRequest: this.resources.Transvault.transactionInProgressMessage,
            SetEmvPaymentType: this.resources.Transvault.authorizationInProgressMessage,
            Gratuity: this.resources.Transvault.waitingForSignatureMessage,
            CardInserted: this.resources.Transvault.authorizationInProgressMessage,
            CardRemoved: this.resources.Transvault.authorizationInProgressMessage,
            WaitingForSignature: this.resources.Transvault.waitingForSignatureMessage,
            DownloadingSignature: this.resources.Transvault.waitingForSignatureMessage,
            Signature: this.resources.Transvault.waitingForSignatureMessage,
            SignatureBlocks: this.resources.Transvault.waitingForSignatureMessage,
            StopTransaction: this.resources.Transvault.authorizationInProgressMessage,
            TermsAndConditions: this.resources.Transvault.authorizationInProgressMessage,
            Cancelled: this.resources.Transvault.cancelMessage,
            Connected: this.resources.Transvault.terminalActiveMessage,
            Declined: this.resources.Transvault.errorMessage,
            Error: this.resources.Transvault.errorMessage,
            GetMerchantCredentials: this.resources.Transvault.buildingLinkMessage
        };
    }

    private getMessage(event): Record<"key" | "value" | "message", string>  {

        var eventKey = "Idle";
        var eventValue = "";
        var eventMessage = "";

        if (event !== undefined && event !== null) {

            if (event.STATE !== undefined && event.STATE !== null) {
                eventKey = event.STATE;
            }

            if (event.INFO !== undefined && event.INFO !== null) {
                eventKey = event.INFO;
            }

            if (event.Message !== undefined && event.Message !== null) {
                eventKey = event.Message;

                if (event.Name !== undefined && event.Name !== null) {
                    eventKey = event.Name;
                    eventMessage = event.Message;
                    eventValue = this.messages[eventKey];
                }

            }

            if (event.GA !== undefined && event.GA !== null) {
                eventKey = "Gratuity";
            }

            if (event.OR !== undefined && event.OR !== null) {
                eventKey = event.OR;

                if (eventKey === "SUCCESS" || eventKey === "Success" || eventKey === "00") {
                    eventKey = "Success";
                }

                if (eventKey === "DECLINED" || eventKey === "Declined" || eventKey === "08") {
                    eventKey = "Declined";
                }

                if (eventKey === "CANCELLED" || eventKey === "Cancelled" || eventKey === "10") {
                    eventKey = "Cancelled";
                }

                if (eventKey === "ERROR" || eventKey === "Error" || eventKey === "01" || eventKey === "02" || eventKey === "03" || eventKey === "04" || eventKey === "05" || eventKey === "06" || eventKey === "07") {
                    eventKey = "Error";
                }

                if (eventKey === "HOLDCALL" || eventKey === "HoldCall" || eventKey === "09") {
                    eventKey = "HoldCall";
                }
            }

            if (event.RD !== undefined && event.RD !== null) {
                eventMessage = event.RD;
            }

            if (event.RC !== undefined && event.RC !== null) {
                eventValue = event.RC;
            }
        }

        eventKey = eventKey.replace(/\s/gi, "");

        if (eventMessage === "") {
            eventValue = this.messages[eventKey];
        }

        var messageObject = {
            key: eventKey,
            value: eventValue,
            message: eventMessage
        };

        if (messageObject.message.startsWith("An error occured.")) {

            var extractedMessage = messageObject.message
                .replace("An error occured.", "")
                .replace(/\n/, "")
                .trim();

            if (extractedMessage.startsWith("{")) {

                var messageAsJson = JSON.parse(extractedMessage);

                if (messageAsJson.ModelState !== undefined) {

                    var newlyParsedMessage = messageAsJson.Message;

                    Object
                        .keys(messageAsJson.ModelState)
                        .forEach(function(element) {
                            newlyParsedMessage += " " + messageAsJson.ModelState[element];
                        });

                    messageObject.message = newlyParsedMessage;
                    messageObject.key = "Error";
                }

            }
        }

        hp.Utils.log("Raw message: ", event);
        hp.Utils.log("Parsed message: ", messageObject);

        return messageObject;
    };

    private getMessageKeyColor(message): string {
        var result = "";

        switch (message) {
            case this.resources.Transvault.buildingLinkMessage:
                result = "#ED4958";
                break;

            case this.resources.Transvault.transactionInProgressMessage:
                result = "#ED4958";
                break;

            case this.resources.Transvault.authorizationInProgressMessage:
                result = "#ED4958";
                break;

            case this.resources.Transvault.terminalActiveMessage:
                result = "#0062CC";
                break;

            case this.resources.Transvault.waitingForSignatureMessage:
                result = "#0062CC";
                break;

            case this.resources.Transvault.errorMessage:
                result = "#ED4958";
                break;

            default:
                result = "#000000";
        }

        return result;
    };
}

/* hp.Plugins.Transvault */
// Copyright (c) Elavon Inc. All rights reserved.
// Licensed under the Apache License
(function($, window, document, undefined) {

    /*
     * Export "hp"
     */
    window.hp = hp || {};
    
    /*
     * The default message shown when transactions are in progress...
     */
    var transactionInProgressMessage = "Transaction in progress... Don't refresh!",
        authorizationInProgressMessage = "Authorization in progress... Don't refresh!",
        terminalActiveMessage = "Terminal active... Don't refresh!",
        waitingForSignatureMessage = "Waiting for signature... Don't refresh!",
        errorMessage = "Declined... Please try again.",
        cancelMessage = "Cancelled... Please try again.",
        buildingLinkMessage = "Building deeplink...";

    var messages = {
        Success: authorizationInProgressMessage,
        BeginSale: transactionInProgressMessage,
        BeginAuth: authorizationInProgressMessage,
        Login: terminalActiveMessage,
        LoginSuccess: terminalActiveMessage,
        ExecuteCommand: terminalActiveMessage,
        DisplayAmount: transactionInProgressMessage,
        DisplayForm: transactionInProgressMessage,
        FindTermsAndConditions: transactionInProgressMessage,
        InsertOrSwipe: transactionInProgressMessage,
        Idle: transactionInProgressMessage,
        Offline: errorMessage,
        ProcessingError: errorMessage,
        ReadCardRequest: transactionInProgressMessage,
        SetEmvPaymentType: authorizationInProgressMessage,
        Gratuity: waitingForSignatureMessage,
        CardInserted: authorizationInProgressMessage,
        CardRemoved: authorizationInProgressMessage,
        WaitingForSignature: waitingForSignatureMessage,
        DownloadingSignature: waitingForSignatureMessage,
        Signature: waitingForSignatureMessage,
        SignatureBlocks: waitingForSignatureMessage,
        StopTransaction: authorizationInProgressMessage,
        TermsAndConditions: authorizationInProgressMessage,
        Cancelled: cancelMessage,
        Connected: terminalActiveMessage,
        Declined: errorMessage,
        Error: errorMessage,
        GetMerchantCredentials: buildingLinkMessage
    };

    var getMessage = function getMessage(event) {

        var eventKey = "Idle";
        var eventValue = "";
        var eventMessage = "";

        if (event !== undefined && event !== null) {

            if (event.STATE !== undefined && event.STATE !== null) {
                eventKey = event.STATE;
            }

            if (event.INFO !== undefined && event.INFO !== null) {
                eventKey = event.INFO;
            }

            if (event.Message !== undefined && event.Message !== null) {
                eventKey = event.Message;

                if (event.Name !== undefined && event.Name !== null) {
                    eventKey = event.Name;
                    eventMessage = event.Message;
                    eventValue = messages[eventKey];
                }

            }

            if (event.GA !== undefined && event.GA !== null) {
                eventKey = "Gratuity";
            }

            if (event.OR !== undefined && event.OR !== null) {
                eventKey = event.OR;

                if (eventKey === "SUCCESS" || eventKey === "Success" || eventKey === "00") {
                    eventKey = "Success";
                }

                if (eventKey === "DECLINED" || eventKey === "Declined" || eventKey === "08") {
                    eventKey = "Declined";
                }

                if (eventKey === "CANCELLED" || eventKey === "Cancelled" || eventKey === "10") {
                    eventKey = "Cancelled";
                }

                if (eventKey === "ERROR" || eventKey === "Error" || eventKey === "01" || eventKey === "02" || eventKey === "03" || eventKey === "04" || eventKey === "05" || eventKey === "06" || eventKey === "07") {
                    eventKey = "Error";
                }

                if (eventKey === "HOLDCALL" || eventKey === "HoldCall" || eventKey === "09") {
                    eventKey = "HoldCall";
                }
            }

            if (event.RD !== undefined && event.RD !== null) {
                eventMessage = event.RD;
            }

            if (event.RC !== undefined && event.RC !== null) {
                eventValue = event.RC;
            }
        }

        eventKey = eventKey.replace(/\s/gi, "");

        if (eventMessage === "") {
            eventValue = messages[eventKey];
        }

        var messageObject = {
            key: eventKey,
            value: eventValue,
            message: eventMessage
        };

        if (messageObject.message.startsWith("An error occured.")) {

            var extractedMessage = messageObject.message
                .replace("An error occured.", "")
                .replace(/\n/, "")
                .trim();

            if (extractedMessage.startsWith("{")) {

                var messageAsJson = JSON.parse(extractedMessage);

                if (messageAsJson.ModelState !== undefined) {

                    var newlyParsedMessage = messageAsJson.Message;

                    Object
                        .keys(messageAsJson.ModelState)
                        .forEach(function(element) {
                            newlyParsedMessage += " " + messageAsJson.ModelState[element];
                        });

                    messageObject.message = newlyParsedMessage;
                    messageObject.key = "Error";
                }

            }
        }

        hp.Utils.log("Raw message: ", event);
        hp.Utils.log("Parsed message: ", messageObject);

        return messageObject;
    };

    var getMessageKeyColor = function getMessageKeyColor(message) {
        var result = "";

        switch (message) {
            case buildingLinkMessage:
                result = "#ED4958";
                break;

            case transactionInProgressMessage:
                result = "#ED4958";
                break;

            case authorizationInProgressMessage:
                result = "#ED4958";
                break;

            case terminalActiveMessage:
                result = "#0062CC";
                break;

            case waitingForSignatureMessage:
                result = "#0062CC";
                break;

            case errorMessage:
                result = "#ED4958";
                break;

            default:
                result = "#000000";
        }

        return result;
    };

    /*
     * Transvault Class
     */
    function Transvault($element) {
        this.context = null;
        this.$parent = null;
        this.$content = null;
        this.$element = $element;
        this.browserId = null;
        this.transactionId = "";
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.formData = {
            _isValid: false
        };
    }

    Transvault.prototype.init = function() {
        // utils call
        var context = hp.Utils.handleLegacyCssClassApplication("transvault", this.$element),
            $parent = context.parent,
            $content = context.content;
        this.context = context;
        this.$parent = $parent;
        this.$content = $content;
        this.transvaultHub = $.connection.transvaultHub;
        this.$btn = null;
        this.terminalId = hp.Utils.getTerminalId();
        this.connectionId = "0";
        this.correlationId = "";
        this.transactionId = hp.Utils.defaults.transactionId;
        this.wasCancelled = false;
    };

    Transvault.prototype.showError = function(message, title, code) {
        setTimeout(function() {
            var createdOn = new Date().toISOString();
            var sessionId = hp.Utils.getSession().sessionId;
            message = typeof message === "undefined" ? "Transaction Cancelled." : message;
            hp.Utils.showError(message, false);

            if (typeof title !== "undefined" && typeof code !== "undefined") {
                var $errorContainer = $(".hp-error-container-active");

                if ($errorContainer.is(":visible")) {
                    var $title = $errorContainer.find(".hp-error-text");
                    var $message = $errorContainer.find(".hp-error-message");
                    $title.empty();
                    $message.empty();
                    $title.text(title);
                    $message.html(message + " <br />" + code);
                    message = $title.text() + " - " + $message.text();
                }
            }

            var errorResponse = {
                status: "Error",
                message: message,
                created_on: createdOn,
                token: sessionId
            };

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            }
        }, 0);
    };

    Transvault.prototype.createTemplate = function() {
        if (hp.Utils.defaults.paymentTypeOrder.indexOf(3) < 0) {
            return "";
        }

        var $html = [
            '<div class="hp-transvault-visual">', 
                '<a class="hp-submit-refresh" href="javascript:;" title="Refresh Transvault">', 
                    '<img class="hp-submit-refresh-img" src="https://cdn.jsdelivr.net/gh/etsms/hosted-payments@latest/dist/images/icon-refresh.png" alt="Refresh Transvault Button" />', 
                "</a>", 
                '<div class="hp-transvault-visual-image {{isAlt}}">', 
                    '<img class="event event-default" src="https://cdn.jsdelivr.net/gh/etsms/hosted-payments@latest/dist/images/terminal-loading.svg" alt="Status" />', 
                "</div>", 
                '<p class="hp-input-transvault-message {{isAlt}}">', 
                    "Disconnected <span></span>", 
                "</p>", 
                '<button class="hp-submit hp-submit-danger">Cancel Request</button>', 
            "</div>"
        ].join("");

        $html = $html.replace(/{{isAlt}}/gi, hp.Utils.getTerminalId().startsWith("1") || hp.Utils.getTerminalId().startsWith("3") ? "alt" : "");
        return $html;
    };

    Transvault.prototype.detachEvents = function() {
        this.$parent.off("hp.transvaultSuccess");
        this.$parent.off("hp.transvaultError");
        this.$parent.off("hp.transvaultProgress");
        this.$parent.find(".hp-submit").off();
        this.$parent.find(".hp-submit-refresh").off();
        this.$parent.off("hp.notify");
        this.transvaultHub.off("onMessage");
        this.$parent.removeClass("hp-form-transvault-app-link");
    };

    Transvault.prototype.attachEvents = function() {
        this.detachEvents();
        var $this = this;
        $this.transvaultHub.connection.url = hp.Utils.defaults.baseUrl + "/transvault";
        $this.setupWebockets();
        $this.$parent.find(".hp-submit-refresh").on("click", hp.Utils.reset);
        $this.$parent.find(".hp-submit").on("click", function(e) {
            e.preventDefault();
            $this.cancelTransaction();
        });
    };

    Transvault.prototype.onMessage = function(response) {
        var hostUrl = hp.Utils.defaults.baseUrl;

        if (response.Url !== undefined && response.Url !== null) {
            hostUrl = response.Url;
        }

        var messageObject = getMessage(response);
        var eventKey = messageObject.key;
        var eventMessage = messageObject.value;
        var el = this.setMessage(eventMessage);
        var $this = this;
        $this.$parent.trigger("hp.notify", messageObject);

        if (eventKey === "Thecredentialsprovidedwereinvalid.") {
            $this.cancelTransaction().then(function() {
                hp.Utils.showError("Reauthenticating. Please wait...");
                setTimeout(hp.Utils.reset, 5000);
            });
            return;
        }

        el.css("color", getMessageKeyColor(eventMessage));

        if (eventKey === "Success") {
            $this.onSuccess(response);
            return;
        } else if (eventKey === "Cancelled" || eventMessage === cancelMessage) {
            if (messageObject.message === "Transaction is Pending. Please try again...") {
                return;
            }

            if (this.wasCancelled) {
                return;
            }

            this.wasCancelled = true;
            $this.onCancelled();
            return;
        } else if (eventMessage === waitingForSignatureMessage) {
            hp.Utils.showLoader();
            return;
        } else if (eventKey === "Declined" || eventKey === "Error") {
            $this.onError(messageObject);
            return;
        } else if (eventKey === "HoldCall") {
            messageObject.message = "Transaction voided.";
            $this.onError(messageObject);
            return;
        } else if (eventKey === "BeginAuth") {
            $this.hideSubmitButton();
            $this.disableNavBar();
            return;
        } else if (eventKey === "GetMerchantCredentials") {
            var emoneyMobileAppUrl = hp.Utils.buildEMoneyMobileAppUrl(hp.Utils.defaults.paymentType, messageObject.message, this.transactionId, hp.Utils.getSession().sessionToken, this.browserId, hp.Utils.getCorrelationId(), hp.Utils.getAmount(), hostUrl, hp.Utils.defaults.entryType);
            this.buildAppRedirectLinkForm(emoneyMobileAppUrl);
        }
    };

    Transvault.prototype.removeAppRedirectLinkForm = function(emoneyMobileAppUrl) {
        var $formElement = this.$parent.eq(0);
        /*
         * Add Active Class
         */

        $formElement.removeClass("hp-form-transvault-app-link");
        /*
         * Remove existing form if present
         */

        $formElement.find(".hp-app-link-container").remove();
    };

    Transvault.prototype.buildAppRedirectLinkForm = function(emoneyMobileAppUrl) {
        var $formElement = this.$parent.eq(0);
        /*
         * Add Active Class
         */

        $formElement.addClass("hp-form-transvault-app-link");
        var html = ['<div class="hp-app-link-container hp-page-active">', "<div>", '<a target="_parent" class="hp-submit hp-submit-redirect" href="' + emoneyMobileAppUrl + '">Start Transaction</a>', "</div>", "</div>"].join("");
        /*
         * Remove existing form if present
         */

        $formElement.find(".hp-app-link-container").remove();
        /*
         * Add form to DOM
         */

        $formElement.prepend(html);
    };

    Transvault.prototype.onSuccess = function(response) {
        var $this = this,
            props = response;

        if (!props.ACCT) {
            props.ACCT = "";
        }

        if (!props.AN) {
            props.AN = "";
        }

        if (!props.AC) {
            props.AC = "";
        }

        if (!props.PM) {
            props.PM = "Other";
        }

        if (!props.SD) {
            props.SD = "https://images.emoney.com/00000000";
        } else {
            props.SD = props.SD.toLowerCase();
        }

        if (!props.CRDT) {
            props.CRDT = "";
        } else {
            props.CRDT = props.CRDT.toUpperCase().replace("ETS", "");
        }

        if (!props.RD) {
            props.RD = "";
        }

        if (!props.CEM) {
            props.CEM = "";
        } else {
            props.CEM = props.CEM.replace(/\s/gi, "_").toUpperCase();
        }

        if (!props.APAN) {
            props.APAN = "";
        }

        if (!props.CHN) {
            props.CHN = "";
        }

        if (!props.AID) {
            props.AID = "";
        }

        if (!props.TVR) {
            props.TVR = "";
        }

        if (!props.IAD) {
            props.IAD = "";
        }

        if (!props.TSI) {
            props.TSI = "";
        }

        if (!props.ARC) {
            props.ARC = "";
        }

        if (!props.TA) {
            props.TA = "";
        }

        if (!props.TCCT) {
            props.TCCT = "USD$";
        }

        if (!props.EMD) {
            props.EMD = "";
        } else {
            props.EMD = props.EMD.replace(/\s/gi, "_").toUpperCase();
        }

        if (!props.CVMD) {
            props.CVMD = "";
        }

        if (!props.TT) {
            props.TT = "PURCHASE";
        }

        if (!props.VA) {
            props.VA = 0;
        } else {
            if (typeof props.VA === "string") {
                props.VA = +props.VA.replace("$", "");
            } else {
                props.VA = +props.VA;
            }
        }

        if (!props.GA) {
            props.GA = 0;
        } else {
            if (typeof props.GA === "string") {
                props.GA = +props.GA.replace("$", "");
            } else {
                props.GA = +props.GA;
            }
        }

        if (!props.TAX) {
            props.TAX = 0;
        } else {
            if (typeof props.TAX === "string") {
                props.TAX = +props.TAX.replace("$", "");
            } else {
                props.TAX = +props.TAX;
            }
        }

        if (!props.CBA) {
            props.CBA = 0;
        } else {
            if (typeof props.CBA === "string") {
                props.CBA = +props.CBA.replace("$", "");
            } else {
                props.CBA = +props.CBA;
            }
        }

        if (!props.SA) {
            props.SA = 0;
        } else {
            if (typeof props.SA === "string") {
                props.SA = +props.SA.replace("$", "");
            } else {
                props.SA = +props.SA;
            }
        }

        if (!props.ED) {
            props.ED = "";
        } else {
            var year = new Date().getFullYear().toString().substring(0, 2) + props.ED.substr(2);
            var month = props.ED.substr(0, 2);
            props.ED = month + "/" + year;
        }

        if (props.AN === "" && props.APAN !== "") {
            props.AN = props.APAN;
        }

        if (props.AN !== "") {
            props.AN = props.AN.replace(/\*|\X|\x/gi, "");
        }

        if (props.AN.length > 4) {
            props.AN = props.AN.substr(props.AN.length - 4);
        }

        var successResponse = {
            status: "Success",
            message: $.trim(props.RD),
            amount: props.TA,
            token: hp.Utils.getSession().sessionToken,
            anti_forgery_token: hp.Utils.defaults.antiForgeryToken,
            transaction_id: props.ETT,
            transaction_sequence_number: props.TSN,
            transaction_approval_code: props.AC,
            transaction_avs_street_passed: true,
            transaction_avs_postal_code_passed: true,
            transaction_currency: props.TCCT,
            transaction_status_indicator: props.TSI,
            transaction_type: props.TT,
            transaction_tax: props.TAX,
            transaction_surcharge: props.SA,
            transaction_gratuity: props.GA,
            transaction_cashback: props.CBA,
            transaction_total: props.VA,
            instrument_id: props.ACCT,
            instrument_type: props.CRDT,
            instrument_method: props.PM,
            instrument_last_four: props.AN,
            instrument_routing_last_four: "",
            instrument_expiration_date: props.ED,
            instrument_verification_method: props.CVMD,
            instrument_entry_type: props.CEM,
            instrument_entry_type_description: props.EMD,
            instrument_verification_results: props.TVR,
            created_on: new Date().toISOString(),
            customer_name: props.CHN,
            customer_signature: props.SD,
            correlation_id: $this.correlationId,
            customer_token: hp.Utils.getCustomerToken(),
            application_identifier: props.AID,
            application_response_code: props.ARC,
            application_issuer_data: props.IAD
        };
        $this.$parent.trigger("hp.transvaultSuccess", successResponse);
        $this.removeAppRedirectLinkForm();
    };

    Transvault.prototype.setMessage = function(message) {
        var el = this.$parent.find(".hp-input-transvault-message");
        el.text(message);
        return el;
    };

    Transvault.prototype.cancelTransactionWithoutError = function() {
        var token = hp.Utils.getSession().sessionToken,
            correlationId = hp.Utils.getCorrelationId(),
            deferred = jQuery.Deferred(),
            amount = hp.Utils.getAmount();

        if (this.browserId === null) {
            deferred.resolve();
            return deferred;
        }

        this.sendMessage({
            transvault: {
                transvaultRequest: {
                    token: token,
                    amount: amount,
                    transactionId: this.transactionId,
                    correlationId: "HP:FROM-GUI",
                    terminalId: this.terminalId,
                    action: "CANCEL",
                    browserId: this.browserId,
                    shouldVoid: hp.Utils.defaults.shouldVoidOnCancel,
                    documentIndex: hp.Utils.defaults.documentIndex
                }
            }
        });
        this.wasCancelled = true;
        deferred.resolve();
        return deferred;
    };

    Transvault.prototype.cancelTransaction = function() {
        var token = hp.Utils.getSession().sessionToken,
            correlationId = hp.Utils.getCorrelationId(),
            deferred = jQuery.Deferred(),
            amount = hp.Utils.getAmount();
        var $this = this;

        if ($this.browserId === null) {
            $this.onCancelled();
            deferred.resolve();
            return deferred;
        }

        $this.sendMessage({
            transvault: {
                transvaultRequest: {
                    token: token,
                    amount: amount,
                    transactionId: $this.transactionId,
                    correlationId: "HP:FROM-GUI",
                    terminalId: $this.terminalId,
                    action: "CANCEL",
                    browserId: $this.browserId,
                    shouldVoid: hp.Utils.defaults.shouldVoidOnCancel,
                    documentIndex: hp.Utils.defaults.documentIndex
                }
            }
        });
        $this.onCancelled();
        deferred.resolve();
        return deferred;
    };

    Transvault.prototype.disableNavBar = function() {
        if (this.$parent != null) {
            var nav = this.$parent.find(".hp-nav");
            nav.find(".hp-hide-list").remove();
            nav.css("position", "relative");
            nav.append($("<li />", {
                "class": "hp-hide-list",
                css: {
                    position: "absolute",
                    top: "0",
                    left: "0",
                    height: "100%",
                    width: "100%",
                    "z-index": "100",
                    background: "rgba(255, 255, 255, .7)"
                }
            }));
        }
    };

    Transvault.prototype.hideSubmitButton = function() {
        if (this.$parent != null) {
            this.$parent.find(".hp-submit").hide();
        }
    };

    Transvault.prototype.hideMessageText = function() {
        if (this.$parent != null) {
            this.$parent.find(".event-default").hide();
        }
    };

    Transvault.prototype.onCancelled = function() {
        this.hideSubmitButton();
        this.hideMessageText();
        this.showError("Transaction cancelled.");
        this.wasCancelled = true;
    };

    Transvault.prototype.onError = function(messageObject) {
        this.$parent.find(".event-default").hide();
        this.$parent.find(".hp-submit").hide();
        var $this = this;
        $this.showError(messageObject.message, messageObject.key, messageObject.value);

        try {
            if (messageObject.key === "HoldCall") {
                hp.Utils.makeRequest({
                    "void": {
                        voidRequest: {
                            token: hp.Utils.getSession().sessionToken,
                            transactionId: $this.transactionId,
                            amount: hp.Utils.getAmount()
                        }
                    }
                }).then(hp.Utils.log, hp.Utils.log);
            }
        } catch (e) {}
    };

    Transvault.prototype.sendMessage = function(request) {
        var requestStringified = JSON.stringify(request);
        this.transvaultHub.server.sendMessage(requestStringified);
    };

    Transvault.prototype.requestAppRedirectLinkForm = function() {
        this.transvaultHub.server.getMerchantCredentials(this.browserId, hp.Utils.getSession().sessionToken);
    };

    Transvault.prototype.setupWebockets = function(amount) {
        var $this = this,
            $message = $this.$parent.find(".hp-input-transvault-message"),
            token = hp.Utils.getSession().sessionToken;
        amount = amount || hp.Utils.getAmount();
        $this.correlationId = hp.Utils.getCorrelationId();

        var messageHandler = function messageHandler(response) {
            $this.onMessage(response);
        };

        var reconnectHandler = function reconnectHandler(response) {
            if (response && response.message && response.message.startsWith("No transport")) {
                $message.hide();
                $this.$parent.find(".event-default").hide();
                $this.$parent.find(".hp-submit").hide();
                $this.showError("This browser does not support WebSockets.");
                return;
            }

            hp.Utils.log("Transvault: Connection error!");
            setTimeout(function() {
                hp.Utils.log("Transvault: Connection reconnecting...");
                $message.css("color", "#FDFDFD").text("Reconnecting in 5 seconds...");
                hp.Utils.reset();
            }, 6000);
        };

        var startHandler = function startHandler() {
            $(".hp-input-transvault-message").text("Connected (listening)...").css("color", "#F4854A");
            hp.Utils.log("Your connection ID: " + $this.transvaultHub.connection.id);
            $this.browserId = $this.transvaultHub.connection.id;

            if ($this.isMobile && ($this.terminalId === undefined || $this.terminalId === null || $this.terminalId === "")) {
                $this.requestAppRedirectLinkForm();
                return;
            }

            $this.sendMessage({
                transvault: {
                    transvaultRequest: {
                        token: token,
                        amount: amount,
                        transactionId: $this.transactionId,
                        correlationId: $this.correlationId,
                        entryType: hp.EntryType.DEVICE_CAPTURED,
                        terminalId: $this.terminalId,
                        action: hp.Utils.defaults.paymentType,
                        browserId: $this.browserId,
                        documentIndex: hp.Utils.defaults.documentIndex
                    }
                }
            });
        };

        var errorHandler = function errorHandler(response) {
            if (response) {
                $message.css("color", "#FC5F45").text(response);
                return;
            }

            $message.css("color", "#FC5F45").text("Could not connect!");
            reconnectHandler(response);
        };

        $message.off("click").removeClass("hp-input-transvault-message-btn").text("Connecting");
        hp.Utils.log("Transvault: Addding events...");
        $this.transvaultHub.off("onMessage").on("onMessage", messageHandler);

        try {
            var socketOptions = {
                withCredentials: false,
                jsonp: false,
                transport: ["webSockets"],
                waitForPageLoad: true
            };
            $this.transvaultHub.connection.start(socketOptions).done(startHandler).fail(errorHandler);
            $this.transvaultHub.off("error").on("error", function(err) {
                hp.Utils.log("Transvault error: ", err);
                reconnectHandler();
            });
            $this.transvaultHub.off("disconnected").on("disconnected", function(err) {
                hp.Utils.log("Transvault disconnected: ", err);
                hp.Utils.log("Transvault attempting reconnection... ");
                setTimeout(function() {
                    $this.transvaultHub.connection.start(socketOptions).done(startHandler).fail(errorHandler);
                }, 2500);
            });
        } catch (error) {
            reconnectHandler("An unknown exception occurred. Reconnecting...");
        }

        $this.$parent.trigger("hp.notify");
    };

    Transvault.prototype.showSuccess = function(delay) {
        hp.Utils.showSuccessPage(delay);
    };

    Transvault.prototype.isCreditCard = function() {
        return false;
    };

    Transvault.prototype.isBankAccount = function() {
        return false;
    };

    Transvault.prototype.isEMoney = function() {
        return false;
    };

    Transvault.prototype.isSuccessPage = function() {
        return false;
    };

    Transvault.prototype.isCode = function() {
        return false;
    };

    Transvault.prototype.isTransvault = function() {
        return true;
    };

    /*
     * Export "Transvault"
     */
    hp.Transvault = Transvault;
})(jQuery, window, document);