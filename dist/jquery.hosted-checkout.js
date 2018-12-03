;(function ($, window, document, undefined) {

	"use strict";

	/*
     * Export "hp"
     */
    window.checkout = {};
    window.checkout.Utils = checkout.Utils || {};

    // exposes defaults
    checkout.Utils.defaults = {};

    // exposes plugins
    checkout.Utils.initSession = {};

	var newGuid = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	};

	var pluginName = "checkout",
		version = "v1.0.0",
		defaults = {
			apiUrl: "https://checkout.emoney.com/",
			businessId: "",
			bearerToken: "",
			apikey: ""
		};

	var $outerWrap = $("<div />", {
		class: "hp-button-wrap"
	});

	var $button = $("<button />", {
		class: "hp-button-element"
	});

	var $emoneyLogoWrap = $("<span />", {
		class: "hp-button-logo-wrap"
	});

	var $emoneyLogo = $("<img />", {
		src: "https://app.emoney.com/Public/Styles/Images/logo-blue.svg",
		class: "hp-button-logo",
		height: 20
	});

	var $textContent = $("<span />", {
		class: "hp-button-text",
		text: " Checkout"
	});

	var $tagLineContent = $("<span />", {
		class: "hp-button-tagline",
		text: "Make Commerce Happen!"
	});

	var $versionTag = $("<small />", {
		class: "hp-button-version",
		text: version
	});

	$emoneyLogoWrap
		.append($emoneyLogo);

	$button
		.append($emoneyLogoWrap);

	$button
		.append($textContent);

	$outerWrap
		.append($button);

	$tagLineContent
		.append($versionTag);

	$outerWrap
		.append($tagLineContent)

	
	
	var sessionToken = "";
	var redirectUrl = "";

	var initSession = { }
		initSession.id = newGuid();
		initSession.total = "";
		initSession.customerFirstName = "";
		initSession.customerLastName = "";
		initSession.successCallbackUrl = "";
		initSession.successRedirectUrl = "";
		initSession.cancelCallbackUrl = "";
		initSession.cancelRedirectUrl = "";
		initSession.declineCallbackUrl = "";
		initSession.declineRedirectUrl = "";
		initSession.errorCallbackUrl = "";
		initSession.errorRedirectUrl = "";
		initSession.privacyPolicyUrl = "";
		initSession.termsAndConditionsUrl = "";
	
	// The actual plugin constructor
	function Plugin(element, options) {
		this._name = pluginName;
		this.element = $(element);

		checkout.Utils.defaults = jQuery.extend({}, defaults, options);
		checkout.Utils.initSession = jQuery.extend({}, initSession, options);
		
		this.init();
		checkout.Utils.__instance = this;
	}
	
	// Avoid Plugin.prototype conflicts
	$.extend(Plugin.prototype, {

		init: function () {
			this.addElementToPluginElement();
			this.addEventHandler();
		},

		addElementToPluginElement: function () {
			this.element.append($outerWrap);
		},

		addEventHandler: function () {


			$button
				.off("click")
				.on("click", ($ev) => {
			this.showErrorState();

					this.addLoadingIndicator();

					this.authenticateSession()
						.then(this.createSession())
						.then(
							(successResponse) => {
								this.removeLoadingIndicator();
							}, 
							(errorResponse) => this.showErrorState()
						);
			});
		},

		addLoadingIndicator: function() {},

		removeLoadingIndicator: function() {},

		showErrorState: function() {

			this.removeLoadingIndicator();

			$outerWrap.addClass("hp-error");

			var previousState = $tagLineContent.html();

			$tagLineContent
				.fadeOut(function(){
					$(this).html("An error occured.");
					$(this).fadeIn(function(){
						$(this)
							.delay(5000)
							.fadeOut()
							.fadeIn(function(){
								$(this).html(previousState);
								$outerWrap.removeClass("hp-error");
							});
					});
				});
		},

		authenticateSession: function() {
			var deferred = $.Deferred();
			// do ajax
			// inside success do
			// ... deferred.resolve()
			var sessionUrl = defaults.apiUrl + "issuer/" + defaults.businessId + "/session/authenticate/api-key";
			var authSessionCredentials = {
					"credentials" : btoa(defaults.apikey).toString()
				}
			$.ajax({
				type: "POST",
				contentType: 'application/json',
				headers: {
					"Authorization": `Bearer ${defaults.bearerToken}`
				}, 
				url: sessionUrl,
				data: authSessionCredentials,
				success: function(response){
					sessionToken = response.resource.sessionToken;
					redirectUrl = response.href;
					this.createSession()
				}
			});

    		return deferred.promise();
		},

		createSession: function() {
			var deferred = $.Deferred();
			// do ajax
			// inside success do
			// ... deferred.resolve()
			var createSessionUrl = defaults.apiUrl + "/issuer/" + defaults.businessId + "/checkout/" + sessionToken + "/session";
			$.ajax({
				type: "POST",
				url: createSessionUrl,
				contentType: 'application/json',
				headers: {
					"Authorization": `Bearer ${defaults.bearerToken}`
				},
				data: JSON.stringify(initSession),
				success: function (response) {
					window.location.href = redirectUrl;
				}
			});

    		return deferred.promise();
		}

	});

	$.fn[pluginName] = function (options) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" +
					pluginName, new Plugin(this, options));
			}
		});
	};

})(jQuery, window, document);