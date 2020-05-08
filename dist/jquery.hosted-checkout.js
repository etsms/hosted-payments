"use strict";

(function($, window, document, undefined) {
    var pluginName = "checkout";
    var version = "v4.2.7";
    var defaults = {
        id: null,
        publicKey: null,
        baseUrl: "https://checkout.emoney.com/",
        issuerId: null,
        apiKey: null,
        total: null,
        customerFirstName: null,
        customerLastName: null,
        successCallbackUrl: null,
        successRedirectUrl: null,
        cancelCallbackUrl: null,
        cancelRedirectUrl: null,
        declineCallbackUrl: null,
        declineRedirectUrl: null,
        errorCallbackUrl: null,
        errorRedirectUrl: null,
        privacyPolicyUrl: null,
        termsAndConditionsUrl: null,
        paymentOptions: null,
        tagline: "Make Commerce Happen!",
        text: "Checkout",
        logo: "https://app.emoney.com/Public/Styles/Images/logo-blue.svg",
        size: "normal" // small, responsive

    };
    var $outerWrap = $("<div />", {
        "class": "hp-button-wrap"
    });
    var $button = $("<button />", {
        "class": "hp-button-element"
    });
    var $emoneyLogoWrap = $("<span />", {
        "class": "hp-button-logo-wrap"
    });
    var $emoneyLogo = $("<img />", {
        src: "https://app.emoney.com/Public/Styles/Images/logo-blue.svg",
        "class": "hp-button-logo",
        height: 20
    });
    var $loader = $("<img />", {
        src: "https://app.emoney.com/public/styles/images/loading.gif",
        "class": "hp-button-loader",
        height: 20
    });
    var $textContent = $("<span />", {
        "class": "hp-button-text",
        text: " Checkout"
    });
    var $tagLineContent = $("<span />", {
        "class": "hp-button-tagline",
        text: "Make Commerce Happen!"
    });
    var $versionTag = $("<small />", {
        "class": "hp-button-version",
        text: version
    }); // The actual plugin constructor

    function Plugin(element, options) {
        var _this = this;

        this._name = pluginName;
        this.element = $(element);
        this.options = $.extend({}, defaults, options);

        if (this.options.id == null) {
            this.options.id = newGuid();
        }

        var currentLocation = this.buildCurrentUrl();

        if (this.options.cancelRedirectUrl == null) {
            this.options.cancelRedirectUrl = currentLocation.href + (currentLocation.hasQuery ? "&" : "?") + "checkoutAction=cancel&checkoutId=" + this.options.id + "&checkoutIssuer=" + this.options.issuerId;
        }

        if (this.options.successRedirectUrl == null) {
            this.options.successRedirectUrl = currentLocation.href + (currentLocation.hasQuery ? "&" : "?") + "checkoutAction=success&checkoutId=" + this.options.id + "&checkoutIssuer=" + this.options.issuerId;
        }

        if (this.options.declineCallbackUrl == null) {
            this.options.declineCallbackUrl = currentLocation.href + (currentLocation.hasQuery ? "&" : "?") + "checkoutAction=decline&checkoutId=" + this.options.id + "&checkoutIssuer=" + this.options.issuerId;
        }

        if (this.options.errorRedirectUrl == null) {
            this.options.errorRedirectUrl = currentLocation.href + (currentLocation.hasQuery ? "&" : "?") + "checkoutAction=error&checkoutId=" + this.options.id + "&checkoutIssuer=" + this.options.issuerId;
        }

        $.ajaxSetup({
            contentType: "application/json",
            headers: {
                Authorization: "Bearer " + defaults.publicKey
            },
            beforeSend: function beforeSend(xhr, ajaxOptions) {
                ajaxOptions.url = _this.options.baseUrl + ajaxOptions.url;
            }
        });
        this.init();
    } // Avoid Plugin.prototype conflicts


    $.extend(Plugin.prototype, {
        init: function init() {
            this.addElementToPluginElement();
            this.addEventHandler();
        },
        buildCurrentUrl: function buildCurrentUrl() {
            var tempel = document.createElement("a");
            var currentHref = location.href;
            var hasQuery = currentHref.indexOf("?") > 0 || currentHref.indexOf("&") > 0;
            tempel.href = currentHref;
            var hasQuery = currentHref.indexOf("?") > 0 || currentHref.indexOf("&") > 0;
            return {
                href: "https://" + tempel.host + tempel.pathname + tempel.search,
                hasQuery: hasQuery
            };
        },
        addElementToPluginElement: function addElementToPluginElement() {
            $emoneyLogo.attr("src", this.options.logo);
            $emoneyLogoWrap.append($loader);
            $button.append($emoneyLogoWrap);
            $textContent.text(this.options.text);
            $button.append($textContent);
            $outerWrap.append($button);
            $tagLineContent.text(this.options.tagline);
            $tagLineContent.append($versionTag);
            $outerWrap.append($tagLineContent);

            if (this.options.logo != null) {
                $emoneyLogoWrap.append($emoneyLogo);
            }

            switch (this.options.size) {
                case "responsive":
                    $outerWrap.addClass("hp-button-wrap-responsive");
                    break;

                case "small":
                    $outerWrap.addClass("hp-button-wrap-small");
                    break;

                default:
                    $outerWrap.addClass("hp-button-wrap-normal");
                    break;
            }

            this.element.append($outerWrap);
        },
        addEventHandler: function addEventHandler() {
            var _this2 = this;

            $button.off("click").on("click", function($ev) {
                _this2.addLoadingIndicator();

                _this2.authenticateSession().then(function(sessionResponse) {
                    return _this2.createSession(sessionResponse.resource.sessionToken, sessionResponse.href);
                }).then(function(checkoutRedirectUrl) {
                    _this2.redirectToCheckoutUrl(checkoutRedirectUrl);
                }, function() {
                    return _this2.showErrorState();
                });
            });
        },
        addLoadingIndicator: function addLoadingIndicator() {
            $outerWrap.addClass("hp-loading");
        },
        removeLoadingIndicator: function removeLoadingIndicator() {
            $outerWrap.removeClass("hp-loading");
        },
        redirectToCheckoutUrl: function redirectToCheckoutUrl(urlToRedirect) {
            setTimeout(function() {
                return window.location.href = urlToRedirect;
            }, 1000);
        },
        showErrorState: function showErrorState() {
            this.removeLoadingIndicator();
            $outerWrap.addClass("hp-error");
            var previousState = $tagLineContent.html();
            $tagLineContent.fadeOut(function() {
                $(this).html("An error occured.");
                $(this).fadeIn(function() {
                    $(this).delay(5000).fadeOut().fadeIn(function() {
                        $(this).html(previousState);
                        $outerWrap.removeClass("hp-error");
                    });
                });
            });
        },
        authenticateSession: function authenticateSession() {
            var deferred = $.Deferred();
            var sessionUrl = "issuer/" + this.options.issuerId + "/session/authenticate/api-key";
            $.ajax({
                type: "POST",
                url: sessionUrl,
                data: JSON.stringify({
                    credentials: btoa(this.options.apiKey)
                }),
                success: deferred.resolve,
                error: deferred.reject
            });
            return deferred.promise();
        },
        createSession: function createSession(sessionToken, checkoutRedirectUrl) {
            var deferred = $.Deferred();
            var createSessionUrl = "issuer/" + this.options.issuerId + "/checkout/" + sessionToken + "/session";
            $.ajax({
                type: "POST",
                url: createSessionUrl,
                data: JSON.stringify(this.options),
                success: function success() {
                    return deferred.resolve(checkoutRedirectUrl);
                },
                error: deferred.reject
            });
            return deferred.promise();
        }
    });

    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };
    /**
     * Helpers
     */


    function newGuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == "x" ? r : r & 0x3 | 0x8;
            return v.toString(16);
        });
    }
})(jQuery, window, document);