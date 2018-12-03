; (function ($, window, document, undefined) {

	"use strict";

	const pluginName = "checkout";
	const version = "v3.9.7";

	let defaults = {
		id: newGuid(),
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
	};

	const $outerWrap = $("<div />", {
		class: "hp-button-wrap"
	});

	const $button = $("<button />", {
		class: "hp-button-element"
	});

	const $emoneyLogoWrap = $("<span />", {
		class: "hp-button-logo-wrap"
	});

	const $emoneyLogo = $("<img />", {
		src: "https://app.emoney.com/Public/Styles/Images/logo-blue.svg",
		class: "hp-button-logo",
		height: 20
	});

	const $loader = $("<img />", {
		src: "https://app.emoney.com/public/styles/images/loading.gif",
		class: "hp-button-loader",
		height: 20
	});

	const $textContent = $("<span />", {
		class: "hp-button-text",
		text: " Checkout"
	});

	const $tagLineContent = $("<span />", {
		class: "hp-button-tagline",
		text: "Make Commerce Happen!"
	});

	const $versionTag = $("<small />", {
		class: "hp-button-version",
		text: version
	});

	$emoneyLogoWrap
		.append($emoneyLogo);

	$emoneyLogoWrap
		.append($loader);

	$button
		.append($emoneyLogoWrap);

	$button
		.append($textContent);

	$outerWrap
		.append($button);

	$tagLineContent
		.append($versionTag);

	$outerWrap
		.append($tagLineContent);

	// The actual plugin constructor
	function Plugin(element, options) {

		this._name = pluginName;
		this.element = $(element);
		this.options = $.extend({}, defaults, options);

		$.ajaxSetup({
			contentType: 'application/json',
			headers: {
				"Authorization": `Bearer ${defaults.publicKey}`
			},
			beforeSend: (xhr, ajaxOptions) => {
				ajaxOptions.url = this.options.baseUrl + ajaxOptions.url;
			}
		});

		this.init();
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

					this.addLoadingIndicator();

					this.authenticateSession()
						.then((sessionResponse) => this.createSession(sessionResponse.resource.sessionToken, sessionResponse.href))
						.then(
							(checkoutRedirectUrl) => {
								this.redirectToCheckoutUrl(checkoutRedirectUrl);
							},
							() => this.showErrorState()
						);
				});
		},

		addLoadingIndicator: function () {
			$outerWrap.addClass("hp-loading");
		},

		removeLoadingIndicator: function () {
			$outerWrap.removeClass("hp-loading");
		},

		redirectToCheckoutUrl: function (urlToRedirect) {
			setTimeout(() => window.location.href = urlToRedirect, 1000);
		},

		showErrorState: function () {

			this.removeLoadingIndicator();

			$outerWrap.addClass("hp-error");

			const previousState = $tagLineContent.html();

			$tagLineContent
				.fadeOut(function () {
					$(this).html("An error occured.");
					$(this).fadeIn(function () {
						$(this)
							.delay(5000)
							.fadeOut()
							.fadeIn(function () {
								$(this).html(previousState);
								$outerWrap.removeClass("hp-error");
							});
					});
				});
		},

		authenticateSession: function () {

			const deferred = $.Deferred();
			const sessionUrl = `issuer/${this.options.issuerId}/session/authenticate/api-key`;

			$.ajax({
				type: "POST",
				url: sessionUrl,
				data: JSON.stringify({
					"credentials": btoa(this.options.apiKey)
				}),
				success: deferred.resolve,
				error: deferred.reject
			});

			return deferred.promise();
		},

		createSession: function (sessionToken, checkoutRedirectUrl) {

			const deferred = $.Deferred();
			const createSessionUrl = `issuer/${this.options.issuerId}/checkout/${sessionToken}/session`;

			$.ajax({
				type: "POST",
				url: createSessionUrl,
				data: JSON.stringify(this.options),
				success: () => deferred.resolve(checkoutRedirectUrl),
				error: deferred.reject
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

	/**
	 * Helpers
	 */
	function newGuid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	};

})(jQuery, window, document);