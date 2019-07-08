"use strict";

;

(function ($, window, document, undefined) {
  var pluginName = "loyalty";
  var version = "v4.0.6";
  var defaults = {
    baseUrl: "https://app.emoney.com/loyalty/",
    issuerId: null,
    apiKey: null,
    publicKey: null,
    tagline: "Make Commerce Happen!",
    text: "Want a loyalty account?",
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
    text: " Loyalty"
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
    this.init();
  } // Avoid Plugin.prototype conflicts


  $.extend(Plugin.prototype, {
    init: function init() {
      this.addElementToPluginElement();
      this.addEventHandler();
    },
    addElementToPluginElement: function addElementToPluginElement() {
      $emoneyLogo.attr("src", this.options.logo);

      if (this.options.logo != null) {
        $emoneyLogoWrap.append($emoneyLogo);
      }

      $emoneyLogoWrap.append($loader);
      $button.append($emoneyLogoWrap);
      $textContent.text(this.options.text);
      $button.append($textContent);
      $outerWrap.append($button);
      $tagLineContent.text(this.options.tagline);
      $tagLineContent.append($versionTag);
      $outerWrap.append($tagLineContent);

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

      $button.off("click").on("click", function ($ev) {
        _this2.addLoadingIndicator();

        _this2.loyaltyRedirectUrl();
      });
    },
    addLoadingIndicator: function addLoadingIndicator() {
      $outerWrap.addClass("hp-loading");
    },
    removeLoadingIndicator: function removeLoadingIndicator() {
      $outerWrap.removeClass("hp-loading");
    },
    showErrorState: function showErrorState() {
      this.removeLoadingIndicator();
      $outerWrap.addClass("hp-error");
      var previousState = $tagLineContent.html();
      $tagLineContent.fadeOut(function () {
        $(this).html("An error occured.");
        $(this).fadeIn(function () {
          $(this).delay(5000).fadeOut().fadeIn(function () {
            $(this).html(previousState);
            $outerWrap.removeClass("hp-error");
          });
        });
      });
    },
    loyaltyRedirectUrl: function loyaltyRedirectUrl() {
      var redirectLink = this.options.baseUrl + this.options.issuerId;
      window.location.href = redirectLink;
    }
  });

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);