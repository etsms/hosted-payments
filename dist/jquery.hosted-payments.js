'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*!
 * Copyright (c) 2017 ETS Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */
(function ($, window, document, undefined) {

	'use strict';

	// Get a regular interval for drawing to the screen

	window.requestAnimFrame = function (callback) {
		return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimaitonFrame || function (callback) {
			window.setTimeout(callback, 1000 / 60);
		};
	}();

    /*
     * Plugin Constructor
     */
	var pluginName = 'jqSignature',
		defaults = {
			lineColor: '#222222',
			lineWidth: 1,
			border: '1px dashed #AAAAAA',
			background: 'transparent',
			width: 300,
			height: 100,
			autoFit: false
		},
		canvasFixture = '<canvas></canvas>',
		idCounter = 0;

	function Signature(element, options) {
		// DOM elements/objects
		this.element = element;
		this.$element = $(this.element);
		this.canvas = false;
		this.$canvas = false;
		this.ctx = false;
		// Drawing state
		this.drawing = false;
		this.currentPos = {
			x: 0,
			y: 0
		};
		this.lastPos = this.currentPos;
		// Determine plugin settings
		this._data = this.$element.data();
		this.settings = $.extend({}, defaults, options, this._data);
		// Initialize the plugin
		this.init();
		this.points = [-81, -251];
	}

	Signature.prototype = {

		// Initialize the signature canvas
		init: function init() {
			this.id = 'jq-signature-canvas-' + ++idCounter;

			// Set up the canvas
			this.$canvas = $(canvasFixture).appendTo(this.$element);
			this.$canvas.attr({
				width: this.settings.width,
				height: this.settings.height
			});
			this.$canvas.css({
				boxSizing: 'border-box',
				width: this.settings.width + 'px',
				height: this.settings.height + 'px',
				border: this.settings.border,
				background: this.settings.background,
				cursor: 'crosshair'
			});
			this.$canvas.attr('id', this.id);

			// Fit canvas to width of parent
			if (this.settings.autoFit === true) {
				this._resizeCanvas();
				// TODO - allow for dynamic canvas resizing
				// (need to save canvas state before changing width to avoid getting cleared)
				// var timeout = false;
				// $(window).on('resize', $.proxy(function(e) {
				//   clearTimeout(timeout);
				//   timeout = setTimeout($.proxy(this._resizeCanvas, this), 250);
				// }, this));
			}
			this.canvas = this.$canvas[0];
			this._resetCanvas();

			// Listen for pointer/mouse/touch events
			// TODO - PointerEvent isn't fully supported, but eventually do something like this:
			// if (window.PointerEvent) {
			//  this.$canvas.parent().css('-ms-touch-action', 'none');
			//  this.$canvas.on("pointerdown MSPointerDown", $.proxy(this._downHandler, this));
			//   this.$canvas.on("pointermove MSPointerMove", $.proxy(this._moveHandler, this));
			//  this.$canvas.on("pointerup MSPointerUp", $.proxy(this._upHandler, this));
			// }
			// else {
			//   this.$canvas.on('mousedown touchstart', $.proxy(this._downHandler, this));
			//   this.$canvas.on('mousemove touchmove', $.proxy(this._moveHandler, this));
			//   this.$canvas.on('mouseup touchend', $.proxy(this._upHandler, this));
			// }
			this.$canvas.on('mousedown touchstart', $.proxy(this._downHandler, this));
			this.$canvas.on('mousemove touchmove', $.proxy(this._moveHandler, this));
			this.$canvas.on('mouseup touchend', $.proxy(this._upHandler, this));

			// Start drawing
			var that = this;
			(function drawLoop() {
				window.requestAnimFrame(drawLoop);
				that._renderCanvas();
			})();
		},

		// Clear the canvas
		clearCanvas: function clearCanvas() {
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this._resetCanvas();
		},

		// Get the content of the canvas as a base64 data URL
		getDataURL: function getDataURL() {
			return this.canvas.toDataURL();
		},

		// Get the content of the canvas as a base64 data URL
		getDataPoints: function getDataPoints() {
			return JSON.stringify(this.points).replace('[', '').replace(']', '');
		},

		// Handle the start of a signature
		_downHandler: function _downHandler(e) {
			this.drawing = true;
			this.lastPos = this.currentPos = this._getPosition(e);
			// Prevent scrolling, etc
			$('body').css('overflow', 'hidden');
			e.preventDefault();
		},

		// Handle mouse/touch moves during a signature
		_moveHandler: function _moveHandler(e) {

			this.currentPos = this._getPosition(e);
			this._setPointsDown();

			e.preventDefault();
		},

		// Handle the end of a signature
		_upHandler: function _upHandler(e) {

			this.drawing = false;
			this._setPointsUp();

			// Trigger a change event
			var changedEvent = $.Event('jq.signature.changed');
			this.$element.trigger(changedEvent);

			// Allow scrolling again
			$('body').css('overflow', 'auto');
			e.preventDefault();
		},

		// Get the position of the mouse/touch
		_getPosition: function _getPosition(event) {
			var xPos, yPos, rect;
			rect = this.canvas.getBoundingClientRect();
			if (event.originalEvent) event = event.originalEvent;

			// Touch event
			if (event.type.indexOf('touch') !== -1) {
				// event.constructor === TouchEvent
				xPos = event.touches[0].clientX - rect.left;
				yPos = event.touches[0].clientY - rect.top;
			}
			// Mouse event
			else {
				xPos = event.clientX - rect.left;
				yPos = event.clientY - rect.top;
			}
			return {
				x: xPos,
				y: yPos
			};
		},

		_setPointsDown: function _setPointsDown() {
			if (this.drawing) {
				this.points.push(this.currentPos.x);
				this.points.push(this.currentPos.y);
			}
		},

		_setPointsUp: function _setPointsUp() {
			this.points.push(-81);
			this.points.push(-251);
		},

		// Render the signature to the canvas
		_renderCanvas: function _renderCanvas() {
			if (this.drawing) {
				this.ctx.beginPath();
				this.ctx.moveTo(this.lastPos.x, this.lastPos.y);
				this.ctx.lineTo(this.currentPos.x, this.currentPos.y);
				this.ctx.stroke();
				this.lastPos = this.currentPos;
			}
		},

		_resetPoints: function _resetPoints() {
			this.points = [];
			this._setPointsUp();
		},

		// Reset the canvas context
		_resetCanvas: function _resetCanvas() {
			this.ctx = this.canvas.getContext("2d");
			this.ctx.strokeStyle = this.settings.lineColor;
			this.ctx.lineWidth = this.settings.lineWidth;
			this._resetPoints();
		},

		// Resize the canvas element
		_resizeCanvas: function _resizeCanvas() {
			var width = this.$element.outerWidth();
			this.$canvas.attr('width', width);
			this.$canvas.css('width', width + 'px');
		}

	};

    /*
     * Plugin wrapper and initialization
     */

	$.fn[pluginName] = function (options) {
		var args = arguments;
		if (options === undefined || (typeof options === 'undefined' ? 'undefined' : _typeof(options)) === 'object') {
			return this.each(function () {
				if (!$.data(this, 'plugin_' + pluginName)) {
					$.data(this, 'plugin_' + pluginName, new Signature(this, options));
				}
			});
		} else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
			var returns;
			this.each(function () {
				var instance = $.data(this, 'plugin_' + pluginName);
				if (instance instanceof Signature && typeof instance[options] === 'function') {
					returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
				}
				if (options === 'destroy') {
					$.data(this, 'plugin_' + pluginName, null);
				}
			});
			return returns !== undefined ? returns : this;
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var resources = {
		nojQuery: "jQuery was not found. Please ensure jQuery is referenced before the SignalR client JavaScript file.",
		noTransportOnInit: "No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.",
		errorOnNegotiate: "Error during negotiation request.",
		stoppedWhileLoading: "The connection was stopped during page load.",
		stoppedWhileNegotiating: "The connection was stopped during the negotiate request.",
		errorParsingNegotiateResponse: "Error parsing negotiate response.",
		errorDuringStartRequest: "Error during start request. Stopping the connection.",
		stoppedDuringStartRequest: "The connection was stopped during the start request.",
		errorParsingStartResponse: "Error parsing start response: '{0}'. Stopping the connection.",
		invalidStartResponse: "Invalid start response: '{0}'. Stopping the connection.",
		protocolIncompatible: "You are using a version of the client that isn't compatible with the server. Client version {0}, server version {1}.",
		sendFailed: "Send failed.",
		parseFailed: "Failed at parsing response: {0}",
		longPollFailed: "Long polling request failed.",
		eventSourceFailedToConnect: "EventSource failed to connect.",
		eventSourceError: "Error raised by EventSource",
		webSocketClosed: "WebSocket closed.",
		pingServerFailedInvalidResponse: "Invalid ping response when pinging server: '{0}'.",
		pingServerFailed: "Failed to ping server.",
		pingServerFailedStatusCode: "Failed to ping server.  Server responded with status code {0}, stopping the connection.",
		pingServerFailedParse: "Failed to parse ping server response, stopping the connection.",
		noConnectionTransport: "Connection is in an invalid state, there is no transport active.",
		webSocketsInvalidState: "The Web Socket transport is in an invalid state, transitioning into reconnecting.",
		reconnectTimeout: "Couldn't reconnect within the configured timeout of {0} ms, disconnecting.",
		reconnectWindowTimeout: "The client has been inactive since {0} and it has exceeded the inactivity timeout of {1} ms. Stopping the connection."
	};

	if (typeof $ !== "function") {
		// no jQuery!
		throw new Error(resources.nojQuery);
	}

	var _signalR,
		_connection,
		_pageLoaded = window.document.readyState === "complete",
		_pageWindow = $(window),
		_negotiateAbortText = "__Negotiate Aborted__",
		events = {
			onStart: "onStart",
			onStarting: "onStarting",
			onReceived: "onReceived",
			onError: "onError",
			onConnectionSlow: "onConnectionSlow",
			onReconnecting: "onReconnecting",
			onReconnect: "onReconnect",
			onStateChanged: "onStateChanged",
			onDisconnect: "onDisconnect"
		},
		ajaxDefaults = {
			processData: true,
			timeout: null,
			async: true,
			global: false,
			cache: false
		},
		_log = function _log(msg, logging) {
			if (logging === false) {
				return;
			}
			var m;
			if (typeof window.console === "undefined") {
				return;
			}
			m = "[" + new Date().toTimeString() + "] SignalR: " + msg;
			if (window.console.debug) {
				window.console.debug(m);
			} else if (window.console.log) {
				window.console.log(m);
			}
		},
		changeState = function changeState(connection, expectedState, newState) {
			if (expectedState === connection.state) {
				connection.state = newState;

				$(connection).triggerHandler(events.onStateChanged, [{ oldState: expectedState, newState: newState }]);
				return true;
			}

			return false;
		},
		isDisconnecting = function isDisconnecting(connection) {
			return connection.state === _signalR.connectionState.disconnected;
		},
		supportsKeepAlive = function supportsKeepAlive(connection) {
			return connection._.keepAliveData.activated && connection.transport.supportsKeepAlive(connection);
		},
		configureStopReconnectingTimeout = function configureStopReconnectingTimeout(connection) {
			var stopReconnectingTimeout, onReconnectTimeout;

			// Check if this connection has already been configured to stop reconnecting after a specified timeout.
			// Without this check if a connection is stopped then started events will be bound multiple times.
			if (!connection._.configuredStopReconnectingTimeout) {
				onReconnectTimeout = function onReconnectTimeout(connection) {
					var message = _signalR._.format(_signalR.resources.reconnectTimeout, connection.disconnectTimeout);
					connection.log(message);
					$(connection).triggerHandler(events.onError, [_signalR._.error(message, /* source */"TimeoutException")]);
					connection.stop( /* async */false, /* notifyServer */false);
				};

				connection.reconnecting(function () {
					var connection = this;

					// Guard against state changing in a previous user defined even handler
					if (connection.state === _signalR.connectionState.reconnecting) {
						stopReconnectingTimeout = window.setTimeout(function () {
							onReconnectTimeout(connection);
						}, connection.disconnectTimeout);
					}
				});

				connection.stateChanged(function (data) {
					if (data.oldState === _signalR.connectionState.reconnecting) {
						// Clear the pending reconnect timeout check
						window.clearTimeout(stopReconnectingTimeout);
					}
				});

				connection._.configuredStopReconnectingTimeout = true;
			}
		};

	_signalR = function signalR(url, qs, logging) {
		/// <summary>Creates a new SignalR connection for the given url</summary>
		/// <param name="url" type="String">The URL of the long polling endpoint</param>
		/// <param name="qs" type="Object">
		///     [Optional] Custom querystring parameters to add to the connection URL.
		///     If an object, every non-function member will be added to the querystring.
		///     If a string, it's added to the QS as specified.
		/// </param>
		/// <param name="logging" type="Boolean">
		///     [Optional] A flag indicating whether connection logging is enabled to the browser
		///     console/log. Defaults to false.
		/// </param>

		return new _signalR.fn.init(url, qs, logging);
	};

	_signalR._ = {
		defaultContentType: "application/x-www-form-urlencoded; charset=UTF-8",

		ieVersion: function () {
			var version, matches;

			if (window.navigator.appName === 'Microsoft Internet Explorer') {
				// Check if the user agent has the pattern "MSIE (one or more numbers).(one or more numbers)";
				matches = /MSIE ([0-9]+\.[0-9]+)/.exec(window.navigator.userAgent);

				if (matches) {
					version = window.parseFloat(matches[1]);
				}
			}

			// undefined value means not IE
			return version;
		}(),

		error: function error(message, source, context) {
			var e = new Error(message);
			e.source = source;

			if (typeof context !== "undefined") {
				e.context = context;
			}

			return e;
		},

		transportError: function transportError(message, transport, source, context) {
			var e = this.error(message, source, context);
			e.transport = transport ? transport.name : undefined;
			return e;
		},

		format: function format() {
			/// <summary>Usage: format("Hi {0}, you are {1}!", "Foo", 100) </summary>
			var s = arguments[0];
			for (var i = 0; i < arguments.length - 1; i++) {
				s = s.replace("{" + i + "}", arguments[i + 1]);
			}
			return s;
		},

		firefoxMajorVersion: function firefoxMajorVersion(userAgent) {
			// Firefox user agents: http://useragentstring.com/pages/Firefox/
			var matches = userAgent.match(/Firefox\/(\d+)/);
			if (!matches || !matches.length || matches.length < 2) {
				return 0;
			}
			return parseInt(matches[1], 10 /* radix */);
		},

		configurePingInterval: function configurePingInterval(connection) {
			var config = connection._.config,
				onFail = function onFail(error) {
					$(connection).triggerHandler(events.onError, [error]);
				};

			if (config && !connection._.pingIntervalId && config.pingInterval) {
				connection._.pingIntervalId = window.setInterval(function () {
					_signalR.transports._logic.pingServer(connection).fail(onFail);
				}, config.pingInterval);
			}
		}
	};

	_signalR.events = events;

	_signalR.resources = resources;

	_signalR.ajaxDefaults = ajaxDefaults;

	_signalR.changeState = changeState;

	_signalR.isDisconnecting = isDisconnecting;

	_signalR.connectionState = {
		connecting: 0,
		connected: 1,
		reconnecting: 2,
		disconnected: 4
	};

	_signalR.hub = {
		start: function start() {
			// This will get replaced with the real hub connection start method when hubs is referenced correctly
			throw new Error("SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/js'></script>.");
		}
	};

	// .on() was added in version 1.7.0, .load() was removed in version 3.0.0 so we fallback to .load() if .on() does
	// not exist to not break existing applications
	if (typeof _pageWindow.on == "function") {
		_pageWindow.on("load", function () {
			_pageLoaded = true;
		});
	} else {
		_pageWindow.load(function () {
			_pageLoaded = true;
		});
	}

	function validateTransport(requestedTransport, connection) {
		/// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
		/// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
		/// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
		/// <returns type="Object" />

		if ($.isArray(requestedTransport)) {
			// Go through transport array and remove an "invalid" tranports
			for (var i = requestedTransport.length - 1; i >= 0; i--) {
				var transport = requestedTransport[i];
				if ($.type(transport) !== "string" || !_signalR.transports[transport]) {
					connection.log("Invalid transport: " + transport + ", removing it from the transports list.");
					requestedTransport.splice(i, 1);
				}
			}

			// Verify we still have transports left, if we dont then we have invalid transports
			if (requestedTransport.length === 0) {
				connection.log("No transports remain within the specified transport array.");
				requestedTransport = null;
			}
		} else if (!_signalR.transports[requestedTransport] && requestedTransport !== "auto") {
			connection.log("Invalid transport: " + requestedTransport.toString() + ".");
			requestedTransport = null;
		} else if (requestedTransport === "auto" && _signalR._.ieVersion <= 8) {
			// If we're doing an auto transport and we're IE8 then force longPolling, #1764
			return ["longPolling"];
		}

		return requestedTransport;
	}

	function getDefaultPort(protocol) {
		if (protocol === "http:") {
			return 80;
		} else if (protocol === "https:") {
			return 443;
		}
	}

	function addDefaultPort(protocol, url) {
		// Remove ports  from url.  We have to check if there's a / or end of line
		// following the port in order to avoid removing ports such as 8080.
		if (url.match(/:\d+$/)) {
			return url;
		} else {
			return url + ":" + getDefaultPort(protocol);
		}
	}

	function ConnectingMessageBuffer(connection, drainCallback) {
		var that = this,
			buffer = [];

		that.tryBuffer = function (message) {
			if (connection.state === $.signalR.connectionState.connecting) {
				buffer.push(message);

				return true;
			}

			return false;
		};

		that.drain = function () {
			// Ensure that the connection is connected when we drain (do not want to drain while a connection is not active)
			if (connection.state === $.signalR.connectionState.connected) {
				while (buffer.length > 0) {
					drainCallback(buffer.shift());
				}
			}
		};

		that.clear = function () {
			buffer = [];
		};
	}

	_signalR.fn = _signalR.prototype = {
		init: function init(url, qs, logging) {
			var $connection = $(this);

			this.url = url;
			this.qs = qs;
			this.lastError = null;
			this._ = {
				keepAliveData: {},
				connectingMessageBuffer: new ConnectingMessageBuffer(this, function (message) {
					$connection.triggerHandler(events.onReceived, [message]);
				}),
				lastMessageAt: new Date().getTime(),
				lastActiveAt: new Date().getTime(),
				beatInterval: 5000, // Default value, will only be overridden if keep alive is enabled,
				beatHandle: null,
				totalTransportConnectTimeout: 0 // This will be the sum of the TransportConnectTimeout sent in response to negotiate and connection.transportConnectTimeout
			};
			if (typeof logging === "boolean") {
				this.logging = logging;
			}
		},

		_parseResponse: function _parseResponse(response) {
			var that = this;

			if (!response) {
				return response;
			} else if (typeof response === "string") {
				return that.json.parse(response);
			} else {
				return response;
			}
		},

		_originalJson: window.JSON,

		json: window.JSON,

		isCrossDomain: function isCrossDomain(url, against) {
			/// <summary>Checks if url is cross domain</summary>
			/// <param name="url" type="String">The base URL</param>
			/// <param name="against" type="Object">
			///     An optional argument to compare the URL against, if not specified it will be set to window.location.
			///     If specified it must contain a protocol and a host property.
			/// </param>
			var link;

			url = $.trim(url);

			against = against || window.location;

			if (url.indexOf("http") !== 0) {
				return false;
			}

			// Create an anchor tag.
			link = window.document.createElement("a");
			link.href = url;

			// When checking for cross domain we have to special case port 80 because the window.location will remove the
			return link.protocol + addDefaultPort(link.protocol, link.host) !== against.protocol + addDefaultPort(against.protocol, against.host);
		},

		ajaxDataType: "text",

		contentType: "application/json; charset=UTF-8",

		logging: false,

		state: _signalR.connectionState.disconnected,

		clientProtocol: "1.5",

		reconnectDelay: 2000,

		transportConnectTimeout: 0,

		disconnectTimeout: 30000, // This should be set by the server in response to the negotiate request (30s default)

		reconnectWindow: 30000, // This should be set by the server in response to the negotiate request

		keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

		start: function start(options, callback) {
			/// <summary>Starts the connection</summary>
			/// <param name="options" type="Object">Options map</param>
			/// <param name="callback" type="Function">A callback function to execute when the connection has started</param>
			var connection = this,
				config = {
					pingInterval: 300000,
					waitForPageLoad: true,
					transport: "auto",
					jsonp: false
				},
				_initialize,
				deferred = connection._deferral || $.Deferred(),
				// Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it
				parser = window.document.createElement("a");

			connection.lastError = null;

			// Persist the deferral so that if start is called multiple times the same deferral is used.
			connection._deferral = deferred;

			if (!connection.json) {
				// no JSON!
				throw new Error("SignalR: No JSON parser found. Please ensure json2.js is referenced before the SignalR.js file if you need to support clients without native JSON parsing support, e.g. IE<8.");
			}

			if ($.type(options) === "function") {
				// Support calling with single callback parameter
				callback = options;
			} else if ($.type(options) === "object") {
				$.extend(config, options);
				if ($.type(config.callback) === "function") {
					callback = config.callback;
				}
			}

			config.transport = validateTransport(config.transport, connection);

			// If the transport is invalid throw an error and abort start
			if (!config.transport) {
				throw new Error("SignalR: Invalid transport(s) specified, aborting start.");
			}

			connection._.config = config;

			// Check to see if start is being called prior to page load
			// If waitForPageLoad is true we then want to re-direct function call to the window load event
			if (!_pageLoaded && config.waitForPageLoad === true) {
				connection._.deferredStartHandler = function () {
					connection.start(options, callback);
				};
				_pageWindow.bind("load", connection._.deferredStartHandler);

				return deferred.promise();
			}

			// If we're already connecting just return the same deferral as the original connection start
			if (connection.state === _signalR.connectionState.connecting) {
				return deferred.promise();
			} else if (changeState(connection, _signalR.connectionState.disconnected, _signalR.connectionState.connecting) === false) {
				// We're not connecting so try and transition into connecting.
				// If we fail to transition then we're either in connected or reconnecting.

				deferred.resolve(connection);
				return deferred.promise();
			}

			configureStopReconnectingTimeout(connection);

			// Resolve the full url
			parser.href = connection.url;
			if (!parser.protocol || parser.protocol === ":") {
				connection.protocol = window.document.location.protocol;
				connection.host = parser.host || window.document.location.host;
			} else {
				connection.protocol = parser.protocol;
				connection.host = parser.host;
			}

			connection.baseUrl = connection.protocol + "//" + connection.host;

			// Set the websocket protocol
			connection.wsProtocol = connection.protocol === "https:" ? "wss://" : "ws://";

			// If jsonp with no/auto transport is specified, then set the transport to long polling
			// since that is the only transport for which jsonp really makes sense.
			// Some developers might actually choose to specify jsonp for same origin requests
			// as demonstrated by Issue #623.
			if (config.transport === "auto" && config.jsonp === true) {
				config.transport = "longPolling";
			}

			// If the url is protocol relative, prepend the current windows protocol to the url.
			if (connection.url.indexOf("//") === 0) {
				connection.url = window.location.protocol + connection.url;
				connection.log("Protocol relative URL detected, normalizing it to '" + connection.url + "'.");
			}

			if (this.isCrossDomain(connection.url)) {
				connection.log("Auto detected cross domain url.");

				if (config.transport === "auto") {
					// TODO: Support XDM with foreverFrame
					config.transport = ["webSockets", "serverSentEvents", "longPolling"];
				}

				if (typeof config.withCredentials === "undefined") {
					config.withCredentials = true;
				}

				// Determine if jsonp is the only choice for negotiation, ajaxSend and ajaxAbort.
				// i.e. if the browser doesn't supports CORS
				// If it is, ignore any preference to the contrary, and switch to jsonp.
				if (!config.jsonp) {
					config.jsonp = !$.support.cors;

					if (config.jsonp) {
						connection.log("Using jsonp because this browser doesn't support CORS.");
					}
				}

				connection.contentType = _signalR._.defaultContentType;
			}

			connection.withCredentials = config.withCredentials;

			connection.ajaxDataType = config.jsonp ? "jsonp" : "text";

			$(connection).bind(events.onStart, function (e, data) {
				if ($.type(callback) === "function") {
					callback.call(connection);
				}
				deferred.resolve(connection);
			});

			connection._.initHandler = _signalR.transports._logic.initHandler(connection);

			_initialize = function initialize(transports, index) {
				var noTransportError = _signalR._.error(resources.noTransportOnInit);

				index = index || 0;
				if (index >= transports.length) {
					if (index === 0) {
						connection.log("No transports supported by the server were selected.");
					} else if (index === 1) {
						connection.log("No fallback transports were selected.");
					} else {
						connection.log("Fallback transports exhausted.");
					}

					// No transport initialized successfully
					$(connection).triggerHandler(events.onError, [noTransportError]);
					deferred.reject(noTransportError);
					// Stop the connection if it has connected and move it into the disconnected state
					connection.stop();
					return;
				}

				// The connection was aborted
				if (connection.state === _signalR.connectionState.disconnected) {
					return;
				}

				var transportName = transports[index],
					transport = _signalR.transports[transportName],
					onFallback = function onFallback() {
						_initialize(transports, index + 1);
					};

				connection.transport = transport;

				try {
					connection._.initHandler.start(transport, function () {
						// success
						// Firefox 11+ doesn't allow sync XHR withCredentials: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#withCredentials
						var isFirefox11OrGreater = _signalR._.firefoxMajorVersion(window.navigator.userAgent) >= 11,
							asyncAbort = !!connection.withCredentials && isFirefox11OrGreater;

						connection.log("The start request succeeded. Transitioning to the connected state.");

						if (supportsKeepAlive(connection)) {
							_signalR.transports._logic.monitorKeepAlive(connection);
						}

						_signalR.transports._logic.startHeartbeat(connection);

						// Used to ensure low activity clients maintain their authentication.
						// Must be configured once a transport has been decided to perform valid ping requests.
						_signalR._.configurePingInterval(connection);

						if (!changeState(connection, _signalR.connectionState.connecting, _signalR.connectionState.connected)) {
							connection.log("WARNING! The connection was not in the connecting state.");
						}

						// Drain any incoming buffered messages (messages that came in prior to connect)
						connection._.connectingMessageBuffer.drain();

						$(connection).triggerHandler(events.onStart);

						// wire the stop handler for when the user leaves the page
						_pageWindow.bind("unload", function () {
							connection.log("Window unloading, stopping the connection.");

							connection.stop(asyncAbort);
						});

						if (isFirefox11OrGreater) {
							// Firefox does not fire cross-domain XHRs in the normal unload handler on tab close.
							// #2400
							_pageWindow.bind("beforeunload", function () {
								// If connection.stop() runs runs in beforeunload and fails, it will also fail
								// in unload unless connection.stop() runs after a timeout.
								window.setTimeout(function () {
									connection.stop(asyncAbort);
								}, 0);
							});
						}
					}, onFallback);
				} catch (error) {
					connection.log(transport.name + " transport threw '" + error.message + "' when attempting to start.");
					onFallback();
				}
			};

			var url = connection.url + "/negotiate",
				onFailed = function onFailed(error, connection) {
					var err = _signalR._.error(resources.errorOnNegotiate, error, connection._.negotiateRequest);

					$(connection).triggerHandler(events.onError, err);
					deferred.reject(err);
					// Stop the connection if negotiate failed
					connection.stop();
				};

			$(connection).triggerHandler(events.onStarting);

			url = _signalR.transports._logic.prepareQueryString(connection, url);

			connection.log("Negotiating with '" + url + "'.");

			// Save the ajax negotiate request object so we can abort it if stop is called while the request is in flight.
			connection._.negotiateRequest = _signalR.transports._logic.ajax(connection, {
				url: url,
				error: function error(_error2, statusText) {
					// We don't want to cause any errors if we're aborting our own negotiate request.
					if (statusText !== _negotiateAbortText) {
						onFailed(_error2, connection);
					} else {
						// This rejection will noop if the deferred has already been resolved or rejected.
						deferred.reject(_signalR._.error(resources.stoppedWhileNegotiating, null /* error */, connection._.negotiateRequest));
					}
				},
				success: function success(result) {
					var res,
						keepAliveData,
						protocolError,
						transports = [],
						supportedTransports = [];

					try {
						res = connection._parseResponse(result);
					} catch (error) {
						onFailed(_signalR._.error(resources.errorParsingNegotiateResponse, error), connection);
						return;
					}

					keepAliveData = connection._.keepAliveData;
					connection.appRelativeUrl = res.Url;
					connection.id = res.ConnectionId;
					connection.token = res.ConnectionToken;
					connection.webSocketServerUrl = res.WebSocketServerUrl;

					// The long poll timeout is the ConnectionTimeout plus 10 seconds
					connection._.pollTimeout = res.ConnectionTimeout * 1000 + 10000; // in ms

					// Once the server has labeled the PersistentConnection as Disconnected, we should stop attempting to reconnect
					// after res.DisconnectTimeout seconds.
					connection.disconnectTimeout = res.DisconnectTimeout * 1000; // in ms

					// Add the TransportConnectTimeout from the response to the transportConnectTimeout from the client to calculate the total timeout
					connection._.totalTransportConnectTimeout = connection.transportConnectTimeout + res.TransportConnectTimeout * 1000;

					// If we have a keep alive
					if (res.KeepAliveTimeout) {
						// Register the keep alive data as activated
						keepAliveData.activated = true;

						// Timeout to designate when to force the connection into reconnecting converted to milliseconds
						keepAliveData.timeout = res.KeepAliveTimeout * 1000;

						// Timeout to designate when to warn the developer that the connection may be dead or is not responding.
						keepAliveData.timeoutWarning = keepAliveData.timeout * connection.keepAliveWarnAt;

						// Instantiate the frequency in which we check the keep alive.  It must be short in order to not miss/pick up any changes
						connection._.beatInterval = (keepAliveData.timeout - keepAliveData.timeoutWarning) / 3;
					} else {
						keepAliveData.activated = false;
					}

					connection.reconnectWindow = connection.disconnectTimeout + (keepAliveData.timeout || 0);

					if (!res.ProtocolVersion || res.ProtocolVersion !== connection.clientProtocol) {
						protocolError = _signalR._.error(_signalR._.format(resources.protocolIncompatible, connection.clientProtocol, res.ProtocolVersion));
						$(connection).triggerHandler(events.onError, [protocolError]);
						deferred.reject(protocolError);

						return;
					}

					$.each(_signalR.transports, function (key) {
						if (key.indexOf("_") === 0 || key === "webSockets" && !res.TryWebSockets) {
							return true;
						}
						supportedTransports.push(key);
					});

					if ($.isArray(config.transport)) {
						$.each(config.transport, function (_, transport) {
							if ($.inArray(transport, supportedTransports) >= 0) {
								transports.push(transport);
							}
						});
					} else if (config.transport === "auto") {
						transports = supportedTransports;
					} else if ($.inArray(config.transport, supportedTransports) >= 0) {
						transports.push(config.transport);
					}

					_initialize(transports);
				}
			});

			return deferred.promise();
		},

		starting: function starting(callback) {
			/// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
			/// <param name="callback" type="Function">A callback function to execute before the connection is fully instantiated.</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onStarting, function (e, data) {
				callback.call(connection);
			});
			return connection;
		},

		send: function send(data) {
			/// <summary>Sends data over the connection</summary>
			/// <param name="data" type="String">The data to send over the connection</param>
			/// <returns type="signalR" />
			var connection = this;

			if (connection.state === _signalR.connectionState.disconnected) {
				// Connection hasn't been started yet
				throw new Error("SignalR: Connection must be started before data can be sent. Call .start() before .send()");
			}

			if (connection.state === _signalR.connectionState.connecting) {
				// Connection hasn't been started yet
				throw new Error("SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started.");
			}

			connection.transport.send(connection, data);
			// REVIEW: Should we return deferred here?
			return connection;
		},

		received: function received(callback) {
			/// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
			/// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onReceived, function (e, data) {
				callback.call(connection, data);
			});
			return connection;
		},

		stateChanged: function stateChanged(callback) {
			/// <summary>Adds a callback that will be invoked when the connection state changes</summary>
			/// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onStateChanged, function (e, data) {
				callback.call(connection, data);
			});
			return connection;
		},

		error: function error(callback) {
			/// <summary>Adds a callback that will be invoked after an error occurs with the connection</summary>
			/// <param name="callback" type="Function">A callback function to execute when an error occurs on the connection</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onError, function (e, errorData, sendData) {
				connection.lastError = errorData;
				// In practice 'errorData' is the SignalR built error object.
				// In practice 'sendData' is undefined for all error events except those triggered by
				// 'ajaxSend' and 'webSockets.send'.'sendData' is the original send payload.
				callback.call(connection, errorData, sendData);
			});
			return connection;
		},

		disconnected: function disconnected(callback) {
			/// <summary>Adds a callback that will be invoked when the client disconnects</summary>
			/// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onDisconnect, function (e, data) {
				callback.call(connection);
			});
			return connection;
		},

		connectionSlow: function connectionSlow(callback) {
			/// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
			/// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onConnectionSlow, function (e, data) {
				callback.call(connection);
			});

			return connection;
		},

		reconnecting: function reconnecting(callback) {
			/// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
			/// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onReconnecting, function (e, data) {
				callback.call(connection);
			});
			return connection;
		},

		reconnected: function reconnected(callback) {
			/// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
			/// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
			/// <returns type="signalR" />
			var connection = this;
			$(connection).bind(events.onReconnect, function (e, data) {
				callback.call(connection);
			});
			return connection;
		},

		stop: function stop(async, notifyServer) {
			/// <summary>Stops listening</summary>
			/// <param name="async" type="Boolean">Whether or not to asynchronously abort the connection</param>
			/// <param name="notifyServer" type="Boolean">Whether we want to notify the server that we are aborting the connection</param>
			/// <returns type="signalR" />
			var connection = this,

				// Save deferral because this is always cleaned up
				deferral = connection._deferral;

			// Verify that we've bound a load event.
			if (connection._.deferredStartHandler) {
				// Unbind the event.
				_pageWindow.unbind("load", connection._.deferredStartHandler);
			}

			// Always clean up private non-timeout based state.
			delete connection._.config;
			delete connection._.deferredStartHandler;

			// This needs to be checked despite the connection state because a connection start can be deferred until page load.
			// If we've deferred the start due to a page load we need to unbind the "onLoad" -> start event.
			if (!_pageLoaded && (!connection._.config || connection._.config.waitForPageLoad === true)) {
				connection.log("Stopping connection prior to negotiate.");

				// If we have a deferral we should reject it
				if (deferral) {
					deferral.reject(_signalR._.error(resources.stoppedWhileLoading));
				}

				// Short-circuit because the start has not been fully started.
				return;
			}

			if (connection.state === _signalR.connectionState.disconnected) {
				return;
			}

			connection.log("Stopping connection.");

			// Clear this no matter what
			window.clearTimeout(connection._.beatHandle);
			window.clearInterval(connection._.pingIntervalId);

			if (connection.transport) {
				connection.transport.stop(connection);

				if (notifyServer !== false) {
					connection.transport.abort(connection, async);
				}

				if (supportsKeepAlive(connection)) {
					_signalR.transports._logic.stopMonitoringKeepAlive(connection);
				}

				connection.transport = null;
			}

			if (connection._.negotiateRequest) {
				// If the negotiation request has already completed this will noop.
				connection._.negotiateRequest.abort(_negotiateAbortText);
				delete connection._.negotiateRequest;
			}

			// Ensure that initHandler.stop() is called before connection._deferral is deleted
			if (connection._.initHandler) {
				connection._.initHandler.stop();
			}

			delete connection._deferral;
			delete connection.messageId;
			delete connection.groupsToken;
			delete connection.id;
			delete connection._.pingIntervalId;
			delete connection._.lastMessageAt;
			delete connection._.lastActiveAt;

			// Clear out our message buffer
			connection._.connectingMessageBuffer.clear();

			// Trigger the disconnect event
			changeState(connection, connection.state, _signalR.connectionState.disconnected);
			$(connection).triggerHandler(events.onDisconnect);

			return connection;
		},

		log: function log(msg) {
			_log(msg, this.logging);
		}
	};

	_signalR.fn.init.prototype = _signalR.fn;

	_signalR.noConflict = function () {
		/// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
		/// <returns type="signalR" />
		if ($.connection === _signalR) {
			$.connection = _connection;
		}
		return _signalR;
	};

	if ($.connection) {
		_connection = $.connection;
	}

	$.connection = $.signalR = _signalR;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var signalR = $.signalR,
		events = $.signalR.events,
		changeState = $.signalR.changeState,
		startAbortText = "__Start Aborted__",
		transportLogic;

	signalR.transports = {};

	function beat(connection) {
		if (connection._.keepAliveData.monitoring) {
			checkIfAlive(connection);
		}

		// Ensure that we successfully marked active before continuing the heartbeat.
		if (transportLogic.markActive(connection)) {
			connection._.beatHandle = window.setTimeout(function () {
				beat(connection);
			}, connection._.beatInterval);
		}
	}

	function checkIfAlive(connection) {
		var keepAliveData = connection._.keepAliveData,
			timeElapsed;

		// Only check if we're connected
		if (connection.state === signalR.connectionState.connected) {
			timeElapsed = new Date().getTime() - connection._.lastMessageAt;

			// Check if the keep alive has completely timed out
			if (timeElapsed >= keepAliveData.timeout) {
				connection.log("Keep alive timed out.  Notifying transport that connection has been lost.");

				// Notify transport that the connection has been lost
				connection.transport.lostConnection(connection);
			} else if (timeElapsed >= keepAliveData.timeoutWarning) {
				// This is to assure that the user only gets a single warning
				if (!keepAliveData.userNotified) {
					connection.log("Keep alive has been missed, connection may be dead/slow.");
					$(connection).triggerHandler(events.onConnectionSlow);
					keepAliveData.userNotified = true;
				}
			} else {
				keepAliveData.userNotified = false;
			}
		}
	}

	function getAjaxUrl(connection, path) {
		var url = connection.url + path;

		if (connection.transport) {
			url += "?transport=" + connection.transport.name;
		}

		return transportLogic.prepareQueryString(connection, url);
	}

	function InitHandler(connection) {
		this.connection = connection;

		this.startRequested = false;
		this.startCompleted = false;
		this.connectionStopped = false;
	}

	InitHandler.prototype = {
		start: function start(transport, onSuccess, onFallback) {
			var that = this,
				connection = that.connection,
				failCalled = false;

			if (that.startRequested || that.connectionStopped) {
				connection.log("WARNING! " + transport.name + " transport cannot be started. Initialization ongoing or completed.");
				return;
			}

			connection.log(transport.name + " transport starting.");

			transport.start(connection, function () {
				if (!failCalled) {
					that.initReceived(transport, onSuccess);
				}
			}, function (error) {
				// Don't allow the same transport to cause onFallback to be called twice
				if (!failCalled) {
					failCalled = true;
					that.transportFailed(transport, error, onFallback);
				}

				// Returns true if the transport should stop;
				// false if it should attempt to reconnect
				return !that.startCompleted || that.connectionStopped;
			});

			that.transportTimeoutHandle = window.setTimeout(function () {
				if (!failCalled) {
					failCalled = true;
					connection.log(transport.name + " transport timed out when trying to connect.");
					that.transportFailed(transport, undefined, onFallback);
				}
			}, connection._.totalTransportConnectTimeout);
		},

		stop: function stop() {
			this.connectionStopped = true;
			window.clearTimeout(this.transportTimeoutHandle);
			signalR.transports._logic.tryAbortStartRequest(this.connection);
		},

		initReceived: function initReceived(transport, onSuccess) {
			var that = this,
				connection = that.connection;

			if (that.startRequested) {
				connection.log("WARNING! The client received multiple init messages.");
				return;
			}

			if (that.connectionStopped) {
				return;
			}

			that.startRequested = true;
			window.clearTimeout(that.transportTimeoutHandle);

			connection.log(transport.name + " transport connected. Initiating start request.");
			signalR.transports._logic.ajaxStart(connection, function () {
				that.startCompleted = true;
				onSuccess();
			});
		},

		transportFailed: function transportFailed(transport, error, onFallback) {
			var connection = this.connection,
				deferred = connection._deferral,
				wrappedError;

			if (this.connectionStopped) {
				return;
			}

			window.clearTimeout(this.transportTimeoutHandle);

			if (!this.startRequested) {
				transport.stop(connection);

				connection.log(transport.name + " transport failed to connect. Attempting to fall back.");
				onFallback();
			} else if (!this.startCompleted) {
				// Do not attempt to fall back if a start request is ongoing during a transport failure.
				// Instead, trigger an error and stop the connection.
				wrappedError = signalR._.error(signalR.resources.errorDuringStartRequest, error);

				connection.log(transport.name + " transport failed during the start request. Stopping the connection.");
				$(connection).triggerHandler(events.onError, [wrappedError]);
				if (deferred) {
					deferred.reject(wrappedError);
				}

				connection.stop();
			} else {
				// The start request has completed, but the connection has not stopped.
				// No need to do anything here. The transport should attempt its normal reconnect logic.
			}
		}
	};

	transportLogic = signalR.transports._logic = {
		ajax: function ajax(connection, options) {
			return $.ajax($.extend( /*deep copy*/true, {}, $.signalR.ajaxDefaults, {
				type: "GET",
				data: {},
				xhrFields: { withCredentials: connection.withCredentials },
				contentType: connection.contentType,
				dataType: connection.ajaxDataType
			}, options));
		},

		pingServer: function pingServer(connection) {
			/// <summary>Pings the server</summary>
			/// <param name="connection" type="signalr">Connection associated with the server ping</param>
			/// <returns type="signalR" />
			var url,
				xhr,
				deferral = $.Deferred();

			if (connection.transport) {
				url = connection.url + "/ping";

				url = transportLogic.addQs(url, connection.qs);

				xhr = transportLogic.ajax(connection, {
					url: url,
					success: function success(result) {
						var data;

						try {
							data = connection._parseResponse(result);
						} catch (error) {
							deferral.reject(signalR._.transportError(signalR.resources.pingServerFailedParse, connection.transport, error, xhr));
							connection.stop();
							return;
						}

						if (data.Response === "pong") {
							deferral.resolve();
						} else {
							deferral.reject(signalR._.transportError(signalR._.format(signalR.resources.pingServerFailedInvalidResponse, result), connection.transport, null /* error */
								, xhr));
						}
					},
					error: function error(_error3) {
						if (_error3.status === 401 || _error3.status === 403) {
							deferral.reject(signalR._.transportError(signalR._.format(signalR.resources.pingServerFailedStatusCode, _error3.status), connection.transport, _error3, xhr));
							connection.stop();
						} else {
							deferral.reject(signalR._.transportError(signalR.resources.pingServerFailed, connection.transport, _error3, xhr));
						}
					}
				});
			} else {
				deferral.reject(signalR._.transportError(signalR.resources.noConnectionTransport, connection.transport));
			}

			return deferral.promise();
		},

		prepareQueryString: function prepareQueryString(connection, url) {
			var preparedUrl;

			// Use addQs to start since it handles the ?/& prefix for us
			preparedUrl = transportLogic.addQs(url, "clientProtocol=" + connection.clientProtocol);

			// Add the user-specified query string params if any
			preparedUrl = transportLogic.addQs(preparedUrl, connection.qs);

			if (connection.token) {
				preparedUrl += "&connectionToken=" + window.encodeURIComponent(connection.token);
			}

			if (connection.data) {
				preparedUrl += "&connectionData=" + window.encodeURIComponent(connection.data);
			}

			return preparedUrl;
		},

		addQs: function addQs(url, qs) {
			var appender = url.indexOf("?") !== -1 ? "&" : "?",
				firstChar;

			if (!qs) {
				return url;
			}

			if ((typeof qs === 'undefined' ? 'undefined' : _typeof(qs)) === "object") {
				return url + appender + $.param(qs);
			}

			if (typeof qs === "string") {
				firstChar = qs.charAt(0);

				if (firstChar === "?" || firstChar === "&") {
					appender = "";
				}

				return url + appender + qs;
			}

			throw new Error("Query string property must be either a string or object.");
		},

		// BUG #2953: The url needs to be same otherwise it will cause a memory leak
		getUrl: function getUrl(connection, transport, reconnecting, poll, ajaxPost) {
			/// <summary>Gets the url for making a GET based connect request</summary>
			var baseUrl = transport === "webSockets" ? "" : connection.baseUrl,
				url = baseUrl + connection.appRelativeUrl,
				qs = "transport=" + transport;

			if (!ajaxPost && connection.groupsToken) {
				qs += "&groupsToken=" + window.encodeURIComponent(connection.groupsToken);
			}

			if (!reconnecting) {
				url += "/connect";
			} else {
				if (poll) {
					// longPolling transport specific
					url += "/poll";
				} else {
					url += "/reconnect";
				}

				if (!ajaxPost && connection.messageId) {
					qs += "&messageId=" + window.encodeURIComponent(connection.messageId);
				}
			}
			url += "?" + qs;
			url = transportLogic.prepareQueryString(connection, url);

			if (!ajaxPost) {
				url += "&tid=" + Math.floor(Math.random() * 11);
			}

			return url;
		},

		maximizePersistentResponse: function maximizePersistentResponse(minPersistentResponse) {
			return {
				MessageId: minPersistentResponse.C,
				Messages: minPersistentResponse.M,
				Initialized: typeof minPersistentResponse.S !== "undefined" ? true : false,
				ShouldReconnect: typeof minPersistentResponse.T !== "undefined" ? true : false,
				LongPollDelay: minPersistentResponse.L,
				GroupsToken: minPersistentResponse.G
			};
		},

		updateGroups: function updateGroups(connection, groupsToken) {
			if (groupsToken) {
				connection.groupsToken = groupsToken;
			}
		},

		stringifySend: function stringifySend(connection, message) {
			if (typeof message === "string" || typeof message === "undefined" || message === null) {
				return message;
			}
			return connection.json.stringify(message);
		},

		ajaxSend: function ajaxSend(connection, data) {
			var payload = transportLogic.stringifySend(connection, data),
				url = getAjaxUrl(connection, "/send"),
				xhr,
				onFail = function onFail(error, connection) {
					$(connection).triggerHandler(events.onError, [signalR._.transportError(signalR.resources.sendFailed, connection.transport, error, xhr), data]);
				};

			xhr = transportLogic.ajax(connection, {
				url: url,
				type: connection.ajaxDataType === "jsonp" ? "GET" : "POST",
				contentType: signalR._.defaultContentType,
				data: {
					data: payload
				},
				success: function success(result) {
					var res;

					if (result) {
						try {
							res = connection._parseResponse(result);
						} catch (error) {
							onFail(error, connection);
							connection.stop();
							return;
						}

						transportLogic.triggerReceived(connection, res);
					}
				},
				error: function error(_error4, textStatus) {
					if (textStatus === "abort" || textStatus === "parsererror") {
						// The parsererror happens for sends that don't return any data, and hence
						// don't write the jsonp callback to the response. This is harder to fix on the server
						// so just hack around it on the client for now.
						return;
					}

					onFail(_error4, connection);
				}
			});

			return xhr;
		},

		ajaxAbort: function ajaxAbort(connection, async) {
			if (typeof connection.transport === "undefined") {
				return;
			}

			// Async by default unless explicitly overidden
			async = typeof async === "undefined" ? true : async;

			var url = getAjaxUrl(connection, "/abort");

			transportLogic.ajax(connection, {
				url: url,
				async: async,
				timeout: 1000,
				type: "POST"
			});

			connection.log("Fired ajax abort async = " + async + ".");
		},

		ajaxStart: function ajaxStart(connection, onSuccess) {
			var rejectDeferred = function rejectDeferred(error) {
				var deferred = connection._deferral;
				if (deferred) {
					deferred.reject(error);
				}
			},
				triggerStartError = function triggerStartError(error) {
					connection.log("The start request failed. Stopping the connection.");
					$(connection).triggerHandler(events.onError, [error]);
					rejectDeferred(error);
					connection.stop();
				};

			connection._.startRequest = transportLogic.ajax(connection, {
				url: getAjaxUrl(connection, "/start"),
				success: function success(result, statusText, xhr) {
					var data;

					try {
						data = connection._parseResponse(result);
					} catch (error) {
						triggerStartError(signalR._.error(signalR._.format(signalR.resources.errorParsingStartResponse, result), error, xhr));
						return;
					}

					if (data.Response === "started") {
						onSuccess();
					} else {
						triggerStartError(signalR._.error(signalR._.format(signalR.resources.invalidStartResponse, result), null /* error */, xhr));
					}
				},
				error: function error(xhr, statusText, _error5) {
					if (statusText !== startAbortText) {
						triggerStartError(signalR._.error(signalR.resources.errorDuringStartRequest, _error5, xhr));
					} else {
						// Stop has been called, no need to trigger the error handler
						// or stop the connection again with onStartError
						connection.log("The start request aborted because connection.stop() was called.");
						rejectDeferred(signalR._.error(signalR.resources.stoppedDuringStartRequest, null /* error */, xhr));
					}
				}
			});
		},

		tryAbortStartRequest: function tryAbortStartRequest(connection) {
			if (connection._.startRequest) {
				// If the start request has already completed this will noop.
				connection._.startRequest.abort(startAbortText);
				delete connection._.startRequest;
			}
		},

		tryInitialize: function tryInitialize(connection, persistentResponse, onInitialized) {
			if (persistentResponse.Initialized && onInitialized) {
				onInitialized();
			} else if (persistentResponse.Initialized) {
				connection.log("WARNING! The client received an init message after reconnecting.");
			}
		},

		triggerReceived: function triggerReceived(connection, data) {
			if (!connection._.connectingMessageBuffer.tryBuffer(data)) {
				$(connection).triggerHandler(events.onReceived, [data]);
			}
		},

		processMessages: function processMessages(connection, minData, onInitialized) {
			var data;

			// Update the last message time stamp
			transportLogic.markLastMessage(connection);

			if (minData) {
				data = transportLogic.maximizePersistentResponse(minData);

				transportLogic.updateGroups(connection, data.GroupsToken);

				if (data.MessageId) {
					connection.messageId = data.MessageId;
				}

				if (data.Messages) {
					$.each(data.Messages, function (index, message) {
						transportLogic.triggerReceived(connection, message);
					});

					transportLogic.tryInitialize(connection, data, onInitialized);
				}
			}
		},

		monitorKeepAlive: function monitorKeepAlive(connection) {
			var keepAliveData = connection._.keepAliveData;

			// If we haven't initiated the keep alive timeouts then we need to
			if (!keepAliveData.monitoring) {
				keepAliveData.monitoring = true;

				transportLogic.markLastMessage(connection);

				// Save the function so we can unbind it on stop
				connection._.keepAliveData.reconnectKeepAliveUpdate = function () {
					// Mark a new message so that keep alive doesn't time out connections
					transportLogic.markLastMessage(connection);
				};

				// Update Keep alive on reconnect
				$(connection).bind(events.onReconnect, connection._.keepAliveData.reconnectKeepAliveUpdate);

				connection.log("Now monitoring keep alive with a warning timeout of " + keepAliveData.timeoutWarning + ", keep alive timeout of " + keepAliveData.timeout + " and disconnecting timeout of " + connection.disconnectTimeout);
			} else {
				connection.log("Tried to monitor keep alive but it's already being monitored.");
			}
		},

		stopMonitoringKeepAlive: function stopMonitoringKeepAlive(connection) {
			var keepAliveData = connection._.keepAliveData;

			// Only attempt to stop the keep alive monitoring if its being monitored
			if (keepAliveData.monitoring) {
				// Stop monitoring
				keepAliveData.monitoring = false;

				// Remove the updateKeepAlive function from the reconnect event
				$(connection).unbind(events.onReconnect, connection._.keepAliveData.reconnectKeepAliveUpdate);

				// Clear all the keep alive data
				connection._.keepAliveData = {};
				connection.log("Stopping the monitoring of the keep alive.");
			}
		},

		startHeartbeat: function startHeartbeat(connection) {
			connection._.lastActiveAt = new Date().getTime();
			beat(connection);
		},

		markLastMessage: function markLastMessage(connection) {
			connection._.lastMessageAt = new Date().getTime();
		},

		markActive: function markActive(connection) {
			if (transportLogic.verifyLastActive(connection)) {
				connection._.lastActiveAt = new Date().getTime();
				return true;
			}

			return false;
		},

		isConnectedOrReconnecting: function isConnectedOrReconnecting(connection) {
			return connection.state === signalR.connectionState.connected || connection.state === signalR.connectionState.reconnecting;
		},

		ensureReconnectingState: function ensureReconnectingState(connection) {
			if (changeState(connection, signalR.connectionState.connected, signalR.connectionState.reconnecting) === true) {
				$(connection).triggerHandler(events.onReconnecting);
			}
			return connection.state === signalR.connectionState.reconnecting;
		},

		clearReconnectTimeout: function clearReconnectTimeout(connection) {
			if (connection && connection._.reconnectTimeout) {
				window.clearTimeout(connection._.reconnectTimeout);
				delete connection._.reconnectTimeout;
			}
		},

		verifyLastActive: function verifyLastActive(connection) {
			if (new Date().getTime() - connection._.lastActiveAt >= connection.reconnectWindow) {
				var message = signalR._.format(signalR.resources.reconnectWindowTimeout, new Date(connection._.lastActiveAt), connection.reconnectWindow);
				connection.log(message);
				$(connection).triggerHandler(events.onError, [signalR._.error(message, /* source */"TimeoutException")]);
				connection.stop( /* async */false, /* notifyServer */false);
				return false;
			}

			return true;
		},

		reconnect: function reconnect(connection, transportName) {
			var transport = signalR.transports[transportName];

			// We should only set a reconnectTimeout if we are currently connected
			// and a reconnectTimeout isn't already set.
			if (transportLogic.isConnectedOrReconnecting(connection) && !connection._.reconnectTimeout) {
				// Need to verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
				if (!transportLogic.verifyLastActive(connection)) {
					return;
				}

				connection._.reconnectTimeout = window.setTimeout(function () {
					if (!transportLogic.verifyLastActive(connection)) {
						return;
					}

					transport.stop(connection);

					if (transportLogic.ensureReconnectingState(connection)) {
						connection.log(transportName + " reconnecting.");
						transport.start(connection);
					}
				}, connection.reconnectDelay);
			}
		},

		handleParseFailure: function handleParseFailure(connection, result, error, onFailed, context) {
			var wrappedError = signalR._.transportError(signalR._.format(signalR.resources.parseFailed, result), connection.transport, error, context);

			// If we're in the initialization phase trigger onFailed, otherwise stop the connection.
			if (onFailed && onFailed(wrappedError)) {
				connection.log("Failed to parse server response while attempting to connect.");
			} else {
				$(connection).triggerHandler(events.onError, [wrappedError]);
				connection.stop();
			}
		},

		initHandler: function initHandler(connection) {
			return new InitHandler(connection);
		},

		foreverFrame: {
			count: 0,
			connections: {}
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var signalR = $.signalR,
		events = $.signalR.events,
		changeState = $.signalR.changeState,
		transportLogic = signalR.transports._logic;

	signalR.transports.webSockets = {
		name: "webSockets",

		supportsKeepAlive: function supportsKeepAlive() {
			return true;
		},

		send: function send(connection, data) {
			var payload = transportLogic.stringifySend(connection, data);

			try {
				connection.socket.send(payload);
			} catch (ex) {
				$(connection).triggerHandler(events.onError, [signalR._.transportError(signalR.resources.webSocketsInvalidState, connection.transport, ex, connection.socket), data]);
			}
		},

		start: function start(connection, onSuccess, onFailed) {
			var url,
				opened = false,
				that = this,
				reconnecting = !onSuccess,
				$connection = $(connection);

			if (!window.WebSocket) {
				onFailed();
				return;
			}

			if (!connection.socket) {
				if (connection.webSocketServerUrl) {
					url = connection.webSocketServerUrl;
				} else {
					url = connection.wsProtocol + connection.host;
				}

				url += transportLogic.getUrl(connection, this.name, reconnecting);

				connection.log("Connecting to websocket endpoint '" + url + "'.");
				connection.socket = new window.WebSocket(url);

				connection.socket.onopen = function () {
					opened = true;
					connection.log("Websocket opened.");

					transportLogic.clearReconnectTimeout(connection);

					if (changeState(connection, signalR.connectionState.reconnecting, signalR.connectionState.connected) === true) {
						$connection.triggerHandler(events.onReconnect);
					}
				};

				connection.socket.onclose = function (event) {
					var error;

					// Only handle a socket close if the close is from the current socket.
					// Sometimes on disconnect the server will push down an onclose event
					// to an expired socket.

					if (this === connection.socket) {
						if (opened && typeof event.wasClean !== "undefined" && event.wasClean === false) {
							// Ideally this would use the websocket.onerror handler (rather than checking wasClean in onclose) but
							// I found in some circumstances Chrome won't call onerror. This implementation seems to work on all browsers.
							error = signalR._.transportError(signalR.resources.webSocketClosed, connection.transport, event);

							connection.log("Unclean disconnect from websocket: " + (event.reason || "[no reason given]."));
						} else {
							connection.log("Websocket closed.");
						}

						if (!onFailed || !onFailed(error)) {
							if (error) {
								$(connection).triggerHandler(events.onError, [error]);
							}

							that.reconnect(connection);
						}
					}
				};

				connection.socket.onmessage = function (event) {
					var data;

					try {
						data = connection._parseResponse(event.data);
					} catch (error) {
						transportLogic.handleParseFailure(connection, event.data, error, onFailed, event);
						return;
					}

					if (data) {
						// data.M is PersistentResponse.Messages
						if ($.isEmptyObject(data) || data.M) {
							transportLogic.processMessages(connection, data, onSuccess);
						} else {
							// For websockets we need to trigger onReceived
							// for callbacks to outgoing hub calls.
							transportLogic.triggerReceived(connection, data);
						}
					}
				};
			}
		},

		reconnect: function reconnect(connection) {
			transportLogic.reconnect(connection, this.name);
		},

		lostConnection: function lostConnection(connection) {
			this.reconnect(connection);
		},

		stop: function stop(connection) {
			// Don't trigger a reconnect after stopping
			transportLogic.clearReconnectTimeout(connection);

			if (connection.socket) {
				connection.log("Closing the Websocket.");
				connection.socket.close();
				connection.socket = null;
			}
		},

		abort: function abort(connection, async) {
			transportLogic.ajaxAbort(connection, async);
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var signalR = $.signalR,
		events = $.signalR.events,
		changeState = $.signalR.changeState,
		transportLogic = signalR.transports._logic,
		clearReconnectAttemptTimeout = function clearReconnectAttemptTimeout(connection) {
			window.clearTimeout(connection._.reconnectAttemptTimeoutHandle);
			delete connection._.reconnectAttemptTimeoutHandle;
		};

	signalR.transports.serverSentEvents = {
		name: "serverSentEvents",

		supportsKeepAlive: function supportsKeepAlive() {
			return true;
		},

		timeOut: 3000,

		start: function start(connection, onSuccess, onFailed) {
			var that = this,
				opened = false,
				$connection = $(connection),
				reconnecting = !onSuccess,
				url;

			if (connection.eventSource) {
				connection.log("The connection already has an event source. Stopping it.");
				connection.stop();
			}

			if (!window.EventSource) {
				if (onFailed) {
					connection.log("This browser doesn't support SSE.");
					onFailed();
				}
				return;
			}

			url = transportLogic.getUrl(connection, this.name, reconnecting);

			try {
				connection.log("Attempting to connect to SSE endpoint '" + url + "'.");
				connection.eventSource = new window.EventSource(url, { withCredentials: connection.withCredentials });
			} catch (e) {
				connection.log("EventSource failed trying to connect with error " + e.Message + ".");
				if (onFailed) {
					// The connection failed, call the failed callback
					onFailed();
				} else {
					$connection.triggerHandler(events.onError, [signalR._.transportError(signalR.resources.eventSourceFailedToConnect, connection.transport, e)]);
					if (reconnecting) {
						// If we were reconnecting, rather than doing initial connect, then try reconnect again
						that.reconnect(connection);
					}
				}
				return;
			}

			if (reconnecting) {
				connection._.reconnectAttemptTimeoutHandle = window.setTimeout(function () {
					if (opened === false) {
						// If we're reconnecting and the event source is attempting to connect,
						// don't keep retrying. This causes duplicate connections to spawn.
						if (connection.eventSource.readyState !== window.EventSource.OPEN) {
							// If we were reconnecting, rather than doing initial connect, then try reconnect again
							that.reconnect(connection);
						}
					}
				}, that.timeOut);
			}

			connection.eventSource.addEventListener("open", function (e) {
				connection.log("EventSource connected.");

				clearReconnectAttemptTimeout(connection);
				transportLogic.clearReconnectTimeout(connection);

				if (opened === false) {
					opened = true;

					if (changeState(connection, signalR.connectionState.reconnecting, signalR.connectionState.connected) === true) {
						$connection.triggerHandler(events.onReconnect);
					}
				}
			}, false);

			connection.eventSource.addEventListener("message", function (e) {
				var res;

				// process messages
				if (e.data === "initialized") {
					return;
				}

				try {
					res = connection._parseResponse(e.data);
				} catch (error) {
					transportLogic.handleParseFailure(connection, e.data, error, onFailed, e);
					return;
				}

				transportLogic.processMessages(connection, res, onSuccess);
			}, false);

			connection.eventSource.addEventListener("error", function (e) {
				var error = signalR._.transportError(signalR.resources.eventSourceError, connection.transport, e);

				// Only handle an error if the error is from the current Event Source.
				// Sometimes on disconnect the server will push down an error event
				// to an expired Event Source.
				if (this !== connection.eventSource) {
					return;
				}

				if (onFailed && onFailed(error)) {
					return;
				}

				connection.log("EventSource readyState: " + connection.eventSource.readyState + ".");

				if (e.eventPhase === window.EventSource.CLOSED) {
					// We don't use the EventSource's native reconnect function as it
					// doesn't allow us to change the URL when reconnecting. We need
					// to change the URL to not include the /connect suffix, and pass
					// the last message id we received.
					connection.log("EventSource reconnecting due to the server connection ending.");
					that.reconnect(connection);
				} else {
					// connection error
					connection.log("EventSource error.");
					$connection.triggerHandler(events.onError, [error]);
				}
			}, false);
		},

		reconnect: function reconnect(connection) {
			transportLogic.reconnect(connection, this.name);
		},

		lostConnection: function lostConnection(connection) {
			this.reconnect(connection);
		},

		send: function send(connection, data) {
			transportLogic.ajaxSend(connection, data);
		},

		stop: function stop(connection) {
			// Don't trigger a reconnect after stopping
			clearReconnectAttemptTimeout(connection);
			transportLogic.clearReconnectTimeout(connection);

			if (connection && connection.eventSource) {
				connection.log("EventSource calling close().");
				connection.eventSource.close();
				connection.eventSource = null;
				delete connection.eventSource;
			}
		},

		abort: function abort(connection, async) {
			transportLogic.ajaxAbort(connection, async);
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var signalR = $.signalR,
		events = $.signalR.events,
		changeState = $.signalR.changeState,
		transportLogic = signalR.transports._logic,
		createFrame = function createFrame() {
			var frame = window.document.createElement("iframe");
			frame.setAttribute("style", "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;");
			return frame;
		},

		// Used to prevent infinite loading icon spins in older versions of ie
		// We build this object inside a closure so we don't pollute the rest of
		// the foreverFrame transport with unnecessary functions/utilities.
		loadPreventer = function () {
			var loadingFixIntervalId = null,
				loadingFixInterval = 1000,
				attachedTo = 0;

			return {
				prevent: function prevent() {
					// Prevent additional iframe removal procedures from newer browsers
					if (signalR._.ieVersion <= 8) {
						// We only ever want to set the interval one time, so on the first attachedTo
						if (attachedTo === 0) {
							// Create and destroy iframe every 3 seconds to prevent loading icon, super hacky
							loadingFixIntervalId = window.setInterval(function () {
								var tempFrame = createFrame();

								window.document.body.appendChild(tempFrame);
								window.document.body.removeChild(tempFrame);

								tempFrame = null;
							}, loadingFixInterval);
						}

						attachedTo++;
					}
				},
				cancel: function cancel() {
					// Only clear the interval if there's only one more object that the loadPreventer is attachedTo
					if (attachedTo === 1) {
						window.clearInterval(loadingFixIntervalId);
					}

					if (attachedTo > 0) {
						attachedTo--;
					}
				}
			};
		}();

	signalR.transports.foreverFrame = {
		name: "foreverFrame",

		supportsKeepAlive: function supportsKeepAlive() {
			return true;
		},

		// Added as a value here so we can create tests to verify functionality
		iframeClearThreshold: 50,

		start: function start(connection, onSuccess, onFailed) {
			var that = this,
				frameId = transportLogic.foreverFrame.count += 1,
				url,
				frame = createFrame(),
				frameLoadHandler = function frameLoadHandler() {
					connection.log("Forever frame iframe finished loading and is no longer receiving messages.");
					if (!onFailed || !onFailed()) {
						that.reconnect(connection);
					}
				};

			if (window.EventSource) {
				// If the browser supports SSE, don't use Forever Frame
				if (onFailed) {
					connection.log("Forever Frame is not supported by SignalR on browsers with SSE support.");
					onFailed();
				}
				return;
			}

			frame.setAttribute("data-signalr-connection-id", connection.id);

			// Start preventing loading icon
			// This will only perform work if the loadPreventer is not attached to another connection.
			loadPreventer.prevent();

			// Build the url
			url = transportLogic.getUrl(connection, this.name);
			url += "&frameId=" + frameId;

			// add frame to the document prior to setting URL to avoid caching issues.
			window.document.documentElement.appendChild(frame);

			connection.log("Binding to iframe's load event.");

			if (frame.addEventListener) {
				frame.addEventListener("load", frameLoadHandler, false);
			} else if (frame.attachEvent) {
				frame.attachEvent("onload", frameLoadHandler);
			}

			frame.src = url;
			transportLogic.foreverFrame.connections[frameId] = connection;

			connection.frame = frame;
			connection.frameId = frameId;

			if (onSuccess) {
				connection.onSuccess = function () {
					connection.log("Iframe transport started.");
					onSuccess();
				};
			}
		},

		reconnect: function reconnect(connection) {
			var that = this;

			// Need to verify connection state and verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
			if (transportLogic.isConnectedOrReconnecting(connection) && transportLogic.verifyLastActive(connection)) {
				window.setTimeout(function () {
					// Verify that we're ok to reconnect.
					if (!transportLogic.verifyLastActive(connection)) {
						return;
					}

					if (connection.frame && transportLogic.ensureReconnectingState(connection)) {
						var frame = connection.frame,
							src = transportLogic.getUrl(connection, that.name, true) + "&frameId=" + connection.frameId;
						connection.log("Updating iframe src to '" + src + "'.");
						frame.src = src;
					}
				}, connection.reconnectDelay);
			}
		},

		lostConnection: function lostConnection(connection) {
			this.reconnect(connection);
		},

		send: function send(connection, data) {
			transportLogic.ajaxSend(connection, data);
		},

		receive: function receive(connection, data) {
			var cw, body, response;

			if (connection.json !== connection._originalJson) {
				// If there's a custom JSON parser configured then serialize the object
				// using the original (browser) JSON parser and then deserialize it using
				// the custom parser (connection._parseResponse does that). This is so we
				// can easily send the response from the server as "raw" JSON but still
				// support custom JSON deserialization in the browser.
				data = connection._originalJson.stringify(data);
			}

			response = connection._parseResponse(data);

			transportLogic.processMessages(connection, response, connection.onSuccess);

			// Protect against connection stopping from a callback trigger within the processMessages above.
			if (connection.state === $.signalR.connectionState.connected) {
				// Delete the script & div elements
				connection.frameMessageCount = (connection.frameMessageCount || 0) + 1;
				if (connection.frameMessageCount > signalR.transports.foreverFrame.iframeClearThreshold) {
					connection.frameMessageCount = 0;
					cw = connection.frame.contentWindow || connection.frame.contentDocument;
					if (cw && cw.document && cw.document.body) {
						body = cw.document.body;

						// Remove all the child elements from the iframe's body to conserver memory
						while (body.firstChild) {
							body.removeChild(body.firstChild);
						}
					}
				}
			}
		},

		stop: function stop(connection) {
			var cw = null;

			// Stop attempting to prevent loading icon
			loadPreventer.cancel();

			if (connection.frame) {
				if (connection.frame.stop) {
					connection.frame.stop();
				} else {
					try {
						cw = connection.frame.contentWindow || connection.frame.contentDocument;
						if (cw.document && cw.document.execCommand) {
							cw.document.execCommand("Stop");
						}
					} catch (e) {
						connection.log("Error occurred when stopping foreverFrame transport. Message = " + e.message + ".");
					}
				}

				// Ensure the iframe is where we left it
				if (connection.frame.parentNode === window.document.body) {
					window.document.body.removeChild(connection.frame);
				}

				delete transportLogic.foreverFrame.connections[connection.frameId];
				connection.frame = null;
				connection.frameId = null;
				delete connection.frame;
				delete connection.frameId;
				delete connection.onSuccess;
				delete connection.frameMessageCount;
				connection.log("Stopping forever frame.");
			}
		},

		abort: function abort(connection, async) {
			transportLogic.ajaxAbort(connection, async);
		},

		getConnection: function getConnection(id) {
			return transportLogic.foreverFrame.connections[id];
		},

		started: function started(connection) {
			if (changeState(connection, signalR.connectionState.reconnecting, signalR.connectionState.connected) === true) {

				$(connection).triggerHandler(events.onReconnect);
			}
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var signalR = $.signalR,
		events = $.signalR.events,
		changeState = $.signalR.changeState,
		isDisconnecting = $.signalR.isDisconnecting,
		transportLogic = signalR.transports._logic;

	signalR.transports.longPolling = {
		name: "longPolling",

		supportsKeepAlive: function supportsKeepAlive() {
			return false;
		},

		reconnectDelay: 3000,

		start: function start(connection, onSuccess, onFailed) {
			/// <summary>Starts the long polling connection</summary>
			/// <param name="connection" type="signalR">The SignalR connection to start</param>
			var that = this,
				_fireConnect = function fireConnect() {
					_fireConnect = $.noop;

					connection.log("LongPolling connected.");

					if (onSuccess) {
						onSuccess();
					} else {
						connection.log("WARNING! The client received an init message after reconnecting.");
					}
				},
				tryFailConnect = function tryFailConnect(error) {
					if (onFailed(error)) {
						connection.log("LongPolling failed to connect.");
						return true;
					}

					return false;
				},
				privateData = connection._,
				reconnectErrors = 0,
				fireReconnected = function fireReconnected(instance) {
					window.clearTimeout(privateData.reconnectTimeoutId);
					privateData.reconnectTimeoutId = null;

					if (changeState(instance, signalR.connectionState.reconnecting, signalR.connectionState.connected) === true) {
						// Successfully reconnected!
						instance.log("Raising the reconnect event");
						$(instance).triggerHandler(events.onReconnect);
					}
				},

				// 1 hour
				maxFireReconnectedTimeout = 3600000;

			if (connection.pollXhr) {
				connection.log("Polling xhr requests already exists, aborting.");
				connection.stop();
			}

			connection.messageId = null;

			privateData.reconnectTimeoutId = null;

			privateData.pollTimeoutId = window.setTimeout(function () {
				(function poll(instance, raiseReconnect) {
					var messageId = instance.messageId,
						connect = messageId === null,
						reconnecting = !connect,
						polling = !raiseReconnect,
						url = transportLogic.getUrl(instance, that.name, reconnecting, polling, true /* use Post for longPolling */),
						postData = {};

					if (instance.messageId) {
						postData.messageId = instance.messageId;
					}

					if (instance.groupsToken) {
						postData.groupsToken = instance.groupsToken;
					}

					// If we've disconnected during the time we've tried to re-instantiate the poll then stop.
					if (isDisconnecting(instance) === true) {
						return;
					}

					connection.log("Opening long polling request to '" + url + "'.");
					instance.pollXhr = transportLogic.ajax(connection, {
						xhrFields: {
							onprogress: function onprogress() {
								transportLogic.markLastMessage(connection);
							}
						},
						url: url,
						type: "POST",
						contentType: signalR._.defaultContentType,
						data: postData,
						timeout: connection._.pollTimeout,
						success: function success(result) {
							var minData,
								delay = 0,
								data,
								shouldReconnect;

							connection.log("Long poll complete.");

							// Reset our reconnect errors so if we transition into a reconnecting state again we trigger
							// reconnected quickly
							reconnectErrors = 0;

							try {
								// Remove any keep-alives from the beginning of the result
								minData = connection._parseResponse(result);
							} catch (error) {
								transportLogic.handleParseFailure(instance, result, error, tryFailConnect, instance.pollXhr);
								return;
							}

							// If there's currently a timeout to trigger reconnect, fire it now before processing messages
							if (privateData.reconnectTimeoutId !== null) {
								fireReconnected(instance);
							}

							if (minData) {
								data = transportLogic.maximizePersistentResponse(minData);
							}

							transportLogic.processMessages(instance, minData, _fireConnect);

							if (data && $.type(data.LongPollDelay) === "number") {
								delay = data.LongPollDelay;
							}

							if (isDisconnecting(instance) === true) {
								return;
							}

							shouldReconnect = data && data.ShouldReconnect;
							if (shouldReconnect) {
								// Transition into the reconnecting state
								// If this fails then that means that the user transitioned the connection into a invalid state in processMessages.
								if (!transportLogic.ensureReconnectingState(instance)) {
									return;
								}
							}

							// We never want to pass a raiseReconnect flag after a successful poll.  This is handled via the error function
							if (delay > 0) {
								privateData.pollTimeoutId = window.setTimeout(function () {
									poll(instance, shouldReconnect);
								}, delay);
							} else {
								poll(instance, shouldReconnect);
							}
						},

						error: function error(data, textStatus) {
							var error = signalR._.transportError(signalR.resources.longPollFailed, connection.transport, data, instance.pollXhr);

							// Stop trying to trigger reconnect, connection is in an error state
							// If we're not in the reconnect state this will noop
							window.clearTimeout(privateData.reconnectTimeoutId);
							privateData.reconnectTimeoutId = null;

							if (textStatus === "abort") {
								connection.log("Aborted xhr request.");
								return;
							}

							if (!tryFailConnect(error)) {

								// Increment our reconnect errors, we assume all errors to be reconnect errors
								// In the case that it's our first error this will cause Reconnect to be fired
								// after 1 second due to reconnectErrors being = 1.
								reconnectErrors++;

								if (connection.state !== signalR.connectionState.reconnecting) {
									connection.log("An error occurred using longPolling. Status = " + textStatus + ".  Response = " + data.responseText + ".");
									$(instance).triggerHandler(events.onError, [error]);
								}

								// We check the state here to verify that we're not in an invalid state prior to verifying Reconnect.
								// If we're not in connected or reconnecting then the next ensureReconnectingState check will fail and will return.
								// Therefore we don't want to change that failure code path.
								if ((connection.state === signalR.connectionState.connected || connection.state === signalR.connectionState.reconnecting) && !transportLogic.verifyLastActive(connection)) {
									return;
								}

								// Transition into the reconnecting state
								// If this fails then that means that the user transitioned the connection into the disconnected or connecting state within the above error handler trigger.
								if (!transportLogic.ensureReconnectingState(instance)) {
									return;
								}

								// Call poll with the raiseReconnect flag as true after the reconnect delay
								privateData.pollTimeoutId = window.setTimeout(function () {
									poll(instance, true);
								}, that.reconnectDelay);
							}
						}
					});

					// This will only ever pass after an error has occurred via the poll ajax procedure.
					if (reconnecting && raiseReconnect === true) {
						// We wait to reconnect depending on how many times we've failed to reconnect.
						// This is essentially a heuristic that will exponentially increase in wait time before
						// triggering reconnected.  This depends on the "error" handler of Poll to cancel this
						// timeout if it triggers before the Reconnected event fires.
						// The Math.min at the end is to ensure that the reconnect timeout does not overflow.
						privateData.reconnectTimeoutId = window.setTimeout(function () {
							fireReconnected(instance);
						}, Math.min(1000 * (Math.pow(2, reconnectErrors) - 1), maxFireReconnectedTimeout));
					}
				})(connection);
			}, 250); // Have to delay initial poll so Chrome doesn't show loader spinner in tab
		},

		lostConnection: function lostConnection(connection) {
			if (connection.pollXhr) {
				connection.pollXhr.abort("lostConnection");
			}
		},

		send: function send(connection, data) {
			transportLogic.ajaxSend(connection, data);
		},

		stop: function stop(connection) {
			/// <summary>Stops the long polling connection</summary>
			/// <param name="connection" type="signalR">The SignalR connection to stop</param>

			window.clearTimeout(connection._.pollTimeoutId);
			window.clearTimeout(connection._.reconnectTimeoutId);

			delete connection._.pollTimeoutId;
			delete connection._.reconnectTimeoutId;

			if (connection.pollXhr) {
				connection.pollXhr.abort();
				connection.pollXhr = null;
				delete connection.pollXhr;
			}
		},

		abort: function abort(connection, async) {
			transportLogic.ajaxAbort(connection, async);
		}
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var eventNamespace = ".hubProxy",
		signalR = $.signalR;

	function makeEventName(event) {
		return event + eventNamespace;
	}

	// Equivalent to Array.prototype.map
	function map(arr, fun, thisp) {
		var i,
			length = arr.length,
			result = [];
		for (i = 0; i < length; i += 1) {
			if (arr.hasOwnProperty(i)) {
				result[i] = fun.call(thisp, arr[i], i, arr);
			}
		}
		return result;
	}

	function getArgValue(a) {
		return $.isFunction(a) ? null : $.type(a) === "undefined" ? null : a;
	}

	function hasMembers(obj) {
		for (var key in obj) {
			// If we have any properties in our callback map then we have callbacks and can exit the loop via return
			if (obj.hasOwnProperty(key)) {
				return true;
			}
		}

		return false;
	}

	function clearInvocationCallbacks(connection, error) {
		/// <param name="connection" type="hubConnection" />
		var callbacks = connection._.invocationCallbacks,
			callback;

		if (hasMembers(callbacks)) {
			connection.log("Clearing hub invocation callbacks with error: " + error + ".");
		}

		// Reset the callback cache now as we have a local var referencing it
		connection._.invocationCallbackId = 0;
		delete connection._.invocationCallbacks;
		connection._.invocationCallbacks = {};

		// Loop over the callbacks and invoke them.
		// We do this using a local var reference and *after* we've cleared the cache
		// so that if a fail callback itself tries to invoke another method we don't
		// end up with its callback in the list we're looping over.
		for (var callbackId in callbacks) {
			callback = callbacks[callbackId];
			callback.method.call(callback.scope, { E: error });
		}
	}

	// hubProxy
	function hubProxy(hubConnection, hubName) {
		/// <summary>
		///     Creates a new proxy object for the given hub connection that can be used to invoke
		///     methods on server hubs and handle client method invocation requests from the server.
		/// </summary>
		return new hubProxy.fn.init(hubConnection, hubName);
	}

	hubProxy.fn = hubProxy.prototype = {
		init: function init(connection, hubName) {
			this.state = {};
			this.connection = connection;
			this.hubName = hubName;
			this._ = {
				callbackMap: {}
			};
		},

		constructor: hubProxy,

		hasSubscriptions: function hasSubscriptions() {
			return hasMembers(this._.callbackMap);
		},

		on: function on(eventName, callback) {
			/// <summary>Wires up a callback to be invoked when a invocation request is received from the server hub.</summary>
			/// <param name="eventName" type="String">The name of the hub event to register the callback for.</param>
			/// <param name="callback" type="Function">The callback to be invoked.</param>
			var that = this,
				callbackMap = that._.callbackMap;

			// Normalize the event name to lowercase
			eventName = eventName.toLowerCase();

			// If there is not an event registered for this callback yet we want to create its event space in the callback map.
			if (!callbackMap[eventName]) {
				callbackMap[eventName] = {};
			}

			// Map the callback to our encompassed function
			callbackMap[eventName][callback] = function (e, data) {
				callback.apply(that, data);
			};

			$(that).bind(makeEventName(eventName), callbackMap[eventName][callback]);

			return that;
		},

		off: function off(eventName, callback) {
			/// <summary>Removes the callback invocation request from the server hub for the given event name.</summary>
			/// <param name="eventName" type="String">The name of the hub event to unregister the callback for.</param>
			/// <param name="callback" type="Function">The callback to be invoked.</param>
			var that = this,
				callbackMap = that._.callbackMap,
				callbackSpace;

			// Normalize the event name to lowercase
			eventName = eventName.toLowerCase();

			callbackSpace = callbackMap[eventName];

			// Verify that there is an event space to unbind
			if (callbackSpace) {
				// Only unbind if there's an event bound with eventName and a callback with the specified callback
				if (callbackSpace[callback]) {
					$(that).unbind(makeEventName(eventName), callbackSpace[callback]);

					// Remove the callback from the callback map
					delete callbackSpace[callback];

					// Check if there are any members left on the event, if not we need to destroy it.
					if (!hasMembers(callbackSpace)) {
						delete callbackMap[eventName];
					}
				} else if (!callback) {
					// Check if we're removing the whole event and we didn't error because of an invalid callback
					$(that).unbind(makeEventName(eventName));

					delete callbackMap[eventName];
				}
			}

			return that;
		},

		invoke: function invoke(methodName) {
			/// <summary>Invokes a server hub method with the given arguments.</summary>
			/// <param name="methodName" type="String">The name of the server hub method.</param>

			var that = this,
				connection = that.connection,
				args = $.makeArray(arguments).slice(1),
				argValues = map(args, getArgValue),
				data = { H: that.hubName, M: methodName, A: argValues, I: connection._.invocationCallbackId },
				d = $.Deferred(),
				callback = function callback(minResult) {
					var result = that._maximizeHubResponse(minResult),
						source,
						error;

					// Update the hub state
					$.extend(that.state, result.State);

					if (result.Progress) {
						if (d.notifyWith) {
							// Progress is only supported in jQuery 1.7+
							d.notifyWith(that, [result.Progress.Data]);
						} else if (!connection._.progressjQueryVersionLogged) {
							connection.log("A hub method invocation progress update was received but the version of jQuery in use (" + $.prototype.jquery + ") does not support progress updates. Upgrade to jQuery 1.7+ to receive progress notifications.");
							connection._.progressjQueryVersionLogged = true;
						}
					} else if (result.Error) {
						// Server hub method threw an exception, log it & reject the deferred
						if (result.StackTrace) {
							connection.log(result.Error + "\n" + result.StackTrace + ".");
						}

						// result.ErrorData is only set if a HubException was thrown
						source = result.IsHubException ? "HubException" : "Exception";
						error = signalR._.error(result.Error, source);
						error.data = result.ErrorData;

						connection.log(that.hubName + "." + methodName + " failed to execute. Error: " + error.message);
						d.rejectWith(that, [error]);
					} else {
						// Server invocation succeeded, resolve the deferred
						connection.log("Invoked " + that.hubName + "." + methodName);
						d.resolveWith(that, [result.Result]);
					}
				};

			connection._.invocationCallbacks[connection._.invocationCallbackId.toString()] = { scope: that, method: callback };
			connection._.invocationCallbackId += 1;

			if (!$.isEmptyObject(that.state)) {
				data.S = that.state;
			}

			connection.log("Invoking " + that.hubName + "." + methodName);
			connection.send(data);

			return d.promise();
		},

		_maximizeHubResponse: function _maximizeHubResponse(minHubResponse) {
			return {
				State: minHubResponse.S,
				Result: minHubResponse.R,
				Progress: minHubResponse.P ? {
					Id: minHubResponse.P.I,
					Data: minHubResponse.P.D
				} : null,
				Id: minHubResponse.I,
				IsHubException: minHubResponse.H,
				Error: minHubResponse.E,
				StackTrace: minHubResponse.T,
				ErrorData: minHubResponse.D
			};
		}
	};

	hubProxy.fn.init.prototype = hubProxy.fn;

	// hubConnection
	function hubConnection(url, options) {
		/// <summary>Creates a new hub connection.</summary>
		/// <param name="url" type="String">[Optional] The hub route url, defaults to "/signalr".</param>
		/// <param name="options" type="Object">[Optional] Settings to use when creating the hubConnection.</param>
		var settings = {
			qs: null,
			logging: false,
			useDefaultPath: true
		};

		$.extend(settings, options);

		if (!url || settings.useDefaultPath) {
			url = (url || "") + "/signalr";
		}
		return new hubConnection.fn.init(url, settings);
	}

	hubConnection.fn = hubConnection.prototype = $.connection();

	hubConnection.fn.init = function (url, options) {
		var settings = {
			qs: null,
			logging: false,
			useDefaultPath: true
		},
			connection = this;

		$.extend(settings, options);

		// Call the base constructor
		$.signalR.fn.init.call(connection, url, settings.qs, settings.logging);

		// Object to store hub proxies for this connection
		connection.proxies = {};

		connection._.invocationCallbackId = 0;
		connection._.invocationCallbacks = {};

		// Wire up the received handler
		connection.received(function (minData) {
			var data, proxy, dataCallbackId, callback, hubName, eventName;
			if (!minData) {
				return;
			}

			// We have to handle progress updates first in order to ensure old clients that receive
			// progress updates enter the return value branch and then no-op when they can't find
			// the callback in the map (because the minData.I value will not be a valid callback ID)
			if (typeof minData.P !== "undefined") {
				// Process progress notification
				dataCallbackId = minData.P.I.toString();
				callback = connection._.invocationCallbacks[dataCallbackId];
				if (callback) {
					callback.method.call(callback.scope, minData);
				}
			} else if (typeof minData.I !== "undefined") {
				// We received the return value from a server method invocation, look up callback by id and call it
				dataCallbackId = minData.I.toString();
				callback = connection._.invocationCallbacks[dataCallbackId];
				if (callback) {
					// Delete the callback from the proxy
					connection._.invocationCallbacks[dataCallbackId] = null;
					delete connection._.invocationCallbacks[dataCallbackId];

					// Invoke the callback
					callback.method.call(callback.scope, minData);
				}
			} else {
				data = this._maximizeClientHubInvocation(minData);

				// We received a client invocation request, i.e. broadcast from server hub
				connection.log("Triggering client hub event '" + data.Method + "' on hub '" + data.Hub + "'.");

				// Normalize the names to lowercase
				hubName = data.Hub.toLowerCase();
				eventName = data.Method.toLowerCase();

				// Trigger the local invocation event
				proxy = this.proxies[hubName];

				// Update the hub state
				$.extend(proxy.state, data.State);
				$(proxy).triggerHandler(makeEventName(eventName), [data.Args]);
			}
		});

		connection.error(function (errData, origData) {
			var callbackId, callback;

			if (!origData) {
				// No original data passed so this is not a send error
				return;
			}

			callbackId = origData.I;
			callback = connection._.invocationCallbacks[callbackId];

			// Verify that there is a callback bound (could have been cleared)
			if (callback) {
				// Delete the callback
				connection._.invocationCallbacks[callbackId] = null;
				delete connection._.invocationCallbacks[callbackId];

				// Invoke the callback with an error to reject the promise
				callback.method.call(callback.scope, { E: errData });
			}
		});

		connection.reconnecting(function () {
			if (connection.transport && connection.transport.name === "webSockets") {
				clearInvocationCallbacks(connection, "Connection started reconnecting before invocation result was received.");
			}
		});

		connection.disconnected(function () {
			clearInvocationCallbacks(connection, "Connection was disconnected before invocation result was received.");
		});
	};

	hubConnection.fn._maximizeClientHubInvocation = function (minClientHubInvocation) {
		return {
			Hub: minClientHubInvocation.H,
			Method: minClientHubInvocation.M,
			Args: minClientHubInvocation.A,
			State: minClientHubInvocation.S
		};
	};

	hubConnection.fn._registerSubscribedHubs = function () {
		/// <summary>
		///     Sets the starting event to loop through the known hubs and register any new hubs
		///     that have been added to the proxy.
		/// </summary>
		var connection = this;

		if (!connection._subscribedToHubs) {
			connection._subscribedToHubs = true;
			connection.starting(function () {
				// Set the connection's data object with all the hub proxies with active subscriptions.
				// These proxies will receive notifications from the server.
				var subscribedHubs = [];

				$.each(connection.proxies, function (key) {
					if (this.hasSubscriptions()) {
						subscribedHubs.push({ name: key });
						connection.log("Client subscribed to hub '" + key + "'.");
					}
				});

				if (subscribedHubs.length === 0) {
					connection.log("No hubs have been subscribed to.  The client will not receive data from hubs.  To fix, declare at least one client side function prior to connection start for each hub you wish to subscribe to.");
				}

				connection.data = connection.json.stringify(subscribedHubs);
			});
		}
	};

	hubConnection.fn.createHubProxy = function (hubName) {
		/// <summary>
		///     Creates a new proxy object for the given hub connection that can be used to invoke
		///     methods on server hubs and handle client method invocation requests from the server.
		/// </summary>
		/// <param name="hubName" type="String">
		///     The name of the hub on the server to create the proxy for.
		/// </param>

		// Normalize the name to lowercase
		hubName = hubName.toLowerCase();

		var proxy = this.proxies[hubName];
		if (!proxy) {
			proxy = hubProxy(this, hubName);
			this.proxies[hubName] = proxy;
		}

		this._registerSubscribedHubs();

		return proxy;
	};

	hubConnection.fn.init.prototype = hubConnection.fn;

	$.hubConnection = hubConnection;
})(jQuery, window, document);

(function ($, window, document, undefined) {
	$.signalR.version = "2.2.1";
})(jQuery, window, document);

(function ($, window, document, undefined) {
	/// <param name="$" type="jQuery" />
	"use strict";

	if (typeof $.signalR !== "function") {
		throw new Error("SignalR: SignalR is not loaded. Please ensure jquery.signalR-x.js is referenced before ~/signalr/js.");
	}

	var signalR = $.signalR;

	function makeProxyCallback(hub, callback) {
		return function () {
			// Call the client hub method
			callback.apply(hub, $.makeArray(arguments));
		};
	}

	function registerHubProxies(instance, shouldSubscribe) {
		var key, hub, memberKey, memberValue, subscriptionMethod;

		for (key in instance) {
			if (instance.hasOwnProperty(key)) {
				hub = instance[key];

				if (!hub.hubName) {
					// Not a client hub
					continue;
				}

				if (shouldSubscribe) {
					// We want to subscribe to the hub events
					subscriptionMethod = hub.on;
				} else {
					// We want to unsubscribe from the hub events
					subscriptionMethod = hub.off;
				}

				// Loop through all members on the hub and find client hub functions to subscribe/unsubscribe
				for (memberKey in hub.client) {
					if (hub.client.hasOwnProperty(memberKey)) {
						memberValue = hub.client[memberKey];

						if (!$.isFunction(memberValue)) {
							// Not a client hub function
							continue;
						}

						subscriptionMethod.call(hub, memberKey, makeProxyCallback(hub, memberValue));
					}
				}
			}
		}
	}

	$.hubConnection.prototype.createHubProxies = function () {
		var proxies = {};
		this.starting(function () {
			// Register the hub proxies as subscribed
			// (instance, shouldSubscribe)
			registerHubProxies(proxies, true);

			this._registerSubscribedHubs();
		}).disconnected(function () {
			// Unsubscribe all hub proxies when we "disconnect".  This is to ensure that we do not re-add functional call backs.
			// (instance, shouldSubscribe)
			registerHubProxies(proxies, false);
		});

		proxies['transvaultHub'] = this.createHubProxy('transvaultHub');
		proxies['transvaultHub'].client = {};
		proxies['transvaultHub'].server = {
			getMerchantCredentials: function getMerchantCredentials(browserId, accessToken) {
				return proxies['transvaultHub'].invoke.apply(proxies['transvaultHub'], $.merge(["GetMerchantCredentials"], $.makeArray(arguments)));
			},

			getSignatureUrl: function getSignatureUrl(browserId, pointArray) {
				return proxies['transvaultHub'].invoke.apply(proxies['transvaultHub'], $.merge(["GetSignatureUrl"], $.makeArray(arguments)));
			},

			sendMessage: function sendMessage(data) {
				return proxies['transvaultHub'].invoke.apply(proxies['transvaultHub'], $.merge(["SendMessage"], $.makeArray(arguments)));
			}
		};

		return proxies;
	};

	signalR.hub = $.hubConnection("/hp/v3/adapters/transvault", { useDefaultPath: false });

	$.extend(signalR, signalR.hub.createHubProxies());
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

	if (!Math.round10) {

		Math.round10 = function (value, exp) {

			// If the exp is undefined or zero...
			if (typeof exp === 'undefined' || +exp === 0) {
				return Math.round(value);
			}

			value = +value;
			exp = +exp;

			// If the value is not a number or the exp is not an integer...
			if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
				return NaN;
			}

			// Shift
			value = value.toString().split('e');
			value = Math.round(+(value[0] + 'e' + (value[1] ? +value[1] - exp : -exp)));

			// Shift back
			value = value.toString().split('e');

			return +(value[0] + 'e' + (value[1] ? +value[1] + exp : exp));
		};
	}

	if (!String.prototype.startsWith) {

		String.prototype.startsWith = function (searchString, position) {
			position = position || 0;
			return this.indexOf(searchString, position) === position;
		};
	}

	if (!String.prototype.includes) {

		String.prototype.includes = function () {
			return String.prototype.indexOf.apply(this, arguments) !== -1;
		};
	}

	if (!Date.prototype.toISOString) {

		var pad = function pad(number) {
			var r = String(number);
			if (r.length === 1) {
				r = '0' + r;
			}
			return r;
		};

		Date.prototype.toISOString = function () {
			return this.getUTCFullYear() + '-' + pad(this.getUTCMonth() + 1) + '-' + pad(this.getUTCDate()) + 'T' + pad(this.getUTCHours()) + ':' + pad(this.getUTCMinutes()) + ':' + pad(this.getUTCSeconds()) + '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + 'Z';
		};
	}

    /*
     * Export "hp"
     */
	window.hp = {};
	window.hp.Utils = hp.Utils || {};

	// exposes defaults
	hp.Utils.defaults = {};

	// exposes plugins
	hp.Utils.plugins = {};

	// payment service type
	hp.PaymentService = {};
	hp.PaymentService.EFT = "EFT";
	hp.PaymentService.EMONEY = "EMONEY";
	hp.PaymentService.TEST = "TEST";

	// entry type
	hp.EntryType = {};
	hp.EntryType.DEVICE_CAPTURED = "DEVICE_CAPTURED";
	hp.EntryType.KEYED_CARD_PRESENT = "KEYED_CARD_PRESENT";
	hp.EntryType.KEYED_CARD_NOT_PRESENT = "KEYED_CARD_NOT_PRESENT";

	// request type
	hp.RequestTypes = {};
	hp.RequestTypes.CREATE_INSTRUMENT = 0;
	hp.RequestTypes.CHARGE = 1;
	hp.RequestTypes.REFUND = 2;
	hp.RequestTypes.SIGNATURE = 3;
	hp.RequestTypes.ERROR = 9;

	// entry type
	hp.PaymentType = {};
	hp.PaymentType.CHARGE = "CHARGE";
	hp.PaymentType.REFUND = "REFUND";
	hp.PaymentType.CANCEL = "CANCEL";
	hp.PaymentType.PREAUTH = "PRE_AUTHORIZE";
	hp.PaymentType.ISSUE = "ISSUE";
	hp.PaymentType.GET_CARD_INFORMATION = "GET_CARD_INFORMATION";
	hp.PaymentType.DISPLAY_MERCHANT_DOCUMENT = "DISPLAY_MERCHANT_DOCUMENT";
	hp.PaymentType.GIFTCARD_ISSUE = "GIFTCARD_ISSUE";
	hp.PaymentType.GIFTCARD_ADD_VALUE = "GIFTCARD_ADD_VALUE";
	hp.PaymentType.GIFTCARD_GET_CARD_BALANCE = "GIFTCARD_GET_CARD_BALANCE";
	hp.PaymentType.GIFTCARD_REVERSE_ADD_VALUE = "GIFTCARD_REVERSE_ADD_VALUE";
	hp.PaymentType.CAPTURE_SIGNATURE = "CAPTURE_SIGNATURE";

	// exposes payments (for split payment methods)
	hp.Utils.payments = [];

	// expose inital boolean for embeded instrument
	hp.Utils.hasPaymentInstrument = false;

	// A variety of CSS based identifiers
	var handleLegacyCssClassApplication = function handleLegacyCssClassApplication(classPrefix, $form) {

		var activeClass = "hp-content-active",
			currentClass = "hp-form-" + classPrefix,
			$hp = $form.find(".hp");

		var $parent = $hp.removeClass("hp-form-emoney hp-form-transvault hp-form-bank hp-form-signature hp-form-code hp-form-cc hp-form-gc hp-form-success hp-form-error").addClass("hp hp-form").addClass(currentClass);

		$parent.find(".hp-content").removeClass(activeClass);

		var $content = $parent.find(".hp-content-" + classPrefix).addClass(activeClass);

		setTimeout(function () {
			$form.find(".hp").addClass("hp-active");
		}, 0);

		return {
			parent: $parent,
			content: $content
		};
	};

	var setPaymentService = function setPaymentService(serivceType) {

		var result = hp.PaymentService.EFT;

		serivceType = serivceType.toString().toLowerCase().replace(/_/gi, "");

		switch (serivceType) {
			case "emoney":
				result = hp.PaymentService.EMONEY;
				break;
			case "eft":
				result = hp.PaymentService.EFT;
				break;
			case "test":
				result = hp.PaymentService.TEST;
				break;
			default:
				result = hp.PaymentService.EFT;
		}

		hp.Utils.defaults.paymentService = result;

		log("Payment service: " + result);

		return result;
	};

	var setEntryType = function setEntryType(entryType) {

		var result = hp.EntryType.KEYED_CARD_NOT_PRESENT;

		entryType = entryType.toString().toLowerCase().replace(/_/gi, "");

		switch (entryType) {
			case "devicecaptured":
				result = hp.EntryType.DEVICE_CAPTURED;
				break;
			case "keyedcardpresent":
				result = hp.EntryType.KEYED_CARD_PRESENT;
				break;
			case "keyedcardnotpresent":
				result = hp.EntryType.KEYED_CARD_NOT_PRESENT;
				break;
			default:
				result = hp.EntryType.KEYED_CARD_NOT_PRESENT;
		}

		hp.Utils.defaults.entryType = result;

		log("Entry type: " + result);

		return result;
	};

	var setPaymentType = function setPaymentType(paymentType) {

		var result = hp.PaymentType.CHARGE;

		paymentType = paymentType.toString().toLowerCase().replace(/_/gi, "");

		switch (paymentType) {
			case "charge":
				result = hp.PaymentType.CHARGE;
				break;
			case "refund":
				result = hp.PaymentType.REFUND;
				break;
			case "getcardinformation":
				result = hp.PaymentType.GET_CARD_INFORMATION;
				break;
			case "displaymerchantdocument":
				result = hp.PaymentType.DISPLAY_MERCHANT_DOCUMENT;
				break;
			case "giftcardissue":
				result = hp.PaymentType.GIFTCARD_ISSUE;
				break;
			case "giftcardaddvalue":
				result = hp.PaymentType.GIFTCARD_ADD_VALUE;
				break;
			case "giftcardgetcardbalance":
				result = hp.PaymentType.GIFTCARD_GET_CARD_BALANCE;
				break;
			case "giftcardreverseaddvalue":
				result = hp.PaymentType.GIFTCARD_REVERSE_ADD_VALUE;
				break;
			case "capturesignature":
				result = hp.PaymentType.CAPTURE_SIGNATURE;
				break;
			case "preauth":
			case "preauthorize":
				result = hp.PaymentType.PRE_AUTHORIZE;
				break;
			default:
				result = hp.PaymentType.CHARGE;
		}

		hp.Utils.defaults.paymentType = result;

		log("Payment type: " + result);

		return result;
	};

	var log = function (undefined) {

		var Log = Error; // does this do anything?  proper inheritance...?

		Log.prototype.write = function (args) {

			// via @fredrik SO trace suggestion; wrapping in special construct so it stands out
			var suffix = "@(" + (this.lineNumber ? this.fileName + ':' + this.lineNumber + ":1" : extractLineNumberFromStack(this.stack));

			args = args.concat([suffix]);

			// via @paulirish console wrapper
			if (console && console.log) {
				if (console.log.apply) {
					console.log.apply(console, args);
				} else {
					console.log(args);
				} // nicer display in some browsers
			}
		};

		var extractLineNumberFromStack = function extractLineNumberFromStack(stack) {

			try {

				var line = stack.split('\n')[3];

				// fix for various display text
				line = line.indexOf(' (') >= 0 ? line.split(' (')[1].substring(0, line.length - 1) : line.split('at ')[1];

				return line;
			} catch (e) {
				return 1;
			}
		};

		return function (params) {

			// only if explicitly true somewhere
			if (!hp.Utils.defaults.debug) return;

			// call handler extension which provides stack trace
			Log().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
		};
	}();

	var getVersion = function getVersion() {
		return hp.Utils.defaults.version;
	};

	var setPaymentInstrument = function setPaymentInstrument() {
		if (typeof hp.Utils.defaults.instrumentId !== "undefined" && hp.Utils.defaults.instrumentId !== "") {
			hp.Utils.hasPaymentInstrument = true;
			return;
		}

		hp.Utils.hasPaymentInstrument = false;
	};

	var generateGUID = function generateGUID() {

		var d = null;

		if (window.performance && window.performance.now) {
			d = window.performance.now();
		} else if (Date.now) {
			d = Date.now();
		} else {
			d = new Date().getTime();
		}

		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (d + Math.random() * 16) % 16 | 0;
			d = Math.floor(d / 16);
			return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
		});

		return uuid;
	};

	var updateAvsInfo = function updateAvsInfo(avsStreet, avsZip) {

		if (typeof avsZip === "undefined") {
			avsZip = "";
		}

		if (typeof avsStreet === "undefined") {
			avsStreet = "";
		}

		hp.Utils.defaults.billingAddress.addressLine1 = avsStreet;
		hp.Utils.defaults.billingAddress.postalCode = avsZip;
	};

	var showLoader = function showLoader() {

		if ($(".hp-error-container").is(":visible")) {
			hideError();
		}

		$(".hp-loading-container").addClass("hp-loading-container-active");
	};

	var hideLoader = function hideLoader() {
		$(".hp-loading-container").removeClass("hp-loading-container-active");
	};

	var showError = function showError(message, showDismissalLink) {

		if ($(".hp-loading-container").is(":visible")) {
			hideLoader();
		}

		$(".hp-error-container").addClass("hp-error-container-active");

		var $message = $(".hp-error-container .hp-error-message"),
			isArray = typeof message !== "undefined" && typeof message.push !== "undefined",
			list = "<p>Please review the following errors: </p><ul class=\"hp-error-message-list\">{{errors}}</ul>";

		if (isArray) {

			var errors = "";

			for (var i = 0; i < message.length; i++) {
				errors += "<li>" + message[i] + "</li>";
			}

			list = list.replace("{{errors}}", errors);
			$message.html(list);
		} else {
			$message.text(message);
		}

		$(".hp-error-container .hp-error-disclaimer a").show().on("click", hideError);

		if (typeof showDismissalLink !== "undefined" && !showDismissalLink) {
			$(".hp-error-container .hp-error-disclaimer a").hide();
		}
	};

	var hideError = function hideError(shouldReset) {

		$(".hp-error-container").removeClass("hp-error-container-active");
		$(".hp-error-container .hp-error-disclaimer a").off("click");

		hp.Utils.defaults.eventCallback();

		if (typeof shouldReset === "undefined") {
			shouldReset = true;
		}

		if (shouldReset) {
			hp.Utils.reset();
		}
	};

	// sets up iframe DOM
	var createInstance = function createInstance($element, callback) {

		// Create wrapping HTML
		var $wrapper = ['<div class="hp hp-form">', '<div class="hp-loading-container">', '<span class="hp-loading-text">Loading</span>', '<div class="hp-loading"><span></span><span></span><span></span><span></span></div>', '</div>', '<div class="hp-error-container">', '<span class="hp-error-text">{{error}} </span>', '<div class="hp-error-message"></div>', '<hr />', '<div class="hp-error-disclaimer">If you feel that the above error was made by a mistake please contact our support at {{phone}}. <br /><br /><a href="javascript:;">&times; Dismiss error</a></div>', '</div>', '<div class="hp-row">', '<div class="hp-col hp-col-left">', '<ul class="hp-nav">', '{{nav}}', '</ul>', '<div class="hp-secure">', '<div class="hp-support">', '<strong>Help &amp; support</strong>', '<p>Having issues with your payments? Call us at <a href="tel:{{phone}}">{{phone}}</a>.</p>', '<br />', '</div>', '<div class="hp-cards">', '<img class="hp-cards-icons' + (hp.Utils.defaults.showAmex ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/amex.svg" alt="AMEX" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showDiners ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/diners.svg" alt="Diners" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showDiscover ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/discover.svg" alt="Discover" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showJcb ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/jcb.svg" alt="JCB" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showMasterCard ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/mastercard.svg" alt="Master Card" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showVisa ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/payment-icons/master/svg/flat/visa.svg" alt="VISA" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showEMoney ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/c2568c3f7343be79032ac7a717fa80de/raw/7923fdf2aacffbc6baf62454cc4213b46b943596/emoney-card-icon.svg" alt="EMoney" />', '<img class="hp-cards-icons' + (hp.Utils.defaults.showGift ? "" : " hide") + '" src="https://cdn.rawgit.com/etsms/cd2abb29142a84bb16fbeb3d07a7aefa/raw/a17760bdd23cf1d90c22c8a2235f8d6e6753663e/gift-card-icon.svg" alt="Gift Cards" />', '</div>', '<a class="hp-secure-icon" href="https://www.etsms.com/" target="_blank" title="ETS - Electronic Transaction Systems">', '<img src="https://cdn.rawgit.com/etsms/a5b6be8ebd898748ec829538bd4b603e/raw/9691ef92d11b5a1608a73f5f46c427c4c494d0b9/secure-icon.svg" alt="Secured by ETS" />', '<span>Secured by <br />ETS Corporation</span>', '</a>', '<div class="hp-secure-bottom">', '<div class="hp-secure-bottom-left">', '<span class="' + (hp.Utils.getAmount() === 0 ? "hide " : "") + (hp.Utils.defaults.paymentType === hp.PaymentType.REFUND ? "hp-version-refund" : "hp-version-charge") + '">' + (hp.Utils.defaults.paymentType === hp.PaymentType.REFUND ? "Refund" : "Charge") + ': <span class="hp-version-amount">' + hp.Utils.formatCurrency(hp.Utils.getAmount() + hp.Utils.defaults.surchargeFee + hp.Utils.defaults.convenienceFee) + '</span></span><br />', '</div>', '<div class="hp-secure-bottom-right">', hp.Utils.getVersion(), '</div>', '</div>', '</div>', '</div>', '<div class="hp-col hp-col-right">', '{{order}}', '<div class="hp-content hp-content-success">{{success}}</div>', '</div>', '</div>', '</div>'].join("");

		hp.Utils.plugins.CreditCard = new hp.CreditCard($element);
		hp.Utils.plugins.BankAccount = new hp.BankAccount($element);
		hp.Utils.plugins.Code = new hp.Code($element);
		hp.Utils.plugins.Success = new hp.Success($element);
		hp.Utils.plugins.Transvault = new hp.Transvault($element);
		hp.Utils.plugins.GiftCard = new hp.GiftCard($element);
		hp.Utils.plugins.Signature = new hp.Signature($element);

		$element.html($wrapper.replace("{{success}}", hp.Utils.plugins.Success.createTemplate().replace("{{redirectLabel}}", hp.Utils.defaults.defaultRedirectLabel).replace("{{successLabel}}", hp.Utils.defaults.defaultSuccessLabel)).replace(/{{phone}}/gi, hp.Utils.defaults.defaultPhone).replace("{{error}}", hp.Utils.defaults.defaultErrorLabel).replace("{{order}}", hp.Utils.createOrder()).replace("{{nav}}", hp.Utils.createNav()));

		var $parent = $element.find(".hp"),
			$types = $parent.find(".hp-type"),
			activeClass = "hp-active";

		if (!$parent.length) {
			throw new Error("hosted-payments.js : Could not locate template.");
		}

		if (!$types.length) {
			throw new Error("hosted-payments.js : Could not locate template.");
		}

		$types.off("click").on("click", function (e) {

			e.preventDefault();

			var $this = $(this),
				currentIndex = $this.index();

			$types.removeClass(activeClass).eq(currentIndex).addClass(activeClass);

			// Wait for DOM to finish loading before querying
			$(function () {

				if (!!$this.attr("class").match(/hp-cc/gi)) {
					callback(hp.Utils.plugins.CreditCard);
				}

				if (!!$this.attr("class").match(/hp-bank/gi)) {
					callback(hp.Utils.plugins.BankAccount);
				}

				if (!!$this.attr("class").match(/hp-emoney/gi)) {
					callback(hp.Utils.plugins.EMoney);
				}

				if (!!$this.attr("class").match(/hp-code/gi)) {

					// Takes focus off link so that a swipe may occur on the HP element
					$this.find("a").blur();

					callback(hp.Utils.plugins.Code);
				}

				if (!!$this.attr("class").match(/hp-transvault/gi)) {
					callback(hp.Utils.plugins.Transvault);
				}

				if (!!$this.attr("class").match(/hp-gc/gi)) {
					callback(hp.Utils.plugins.GiftCard);
				}

				if (!!$this.attr("class").match(/hp-signature/gi)) {
					callback(hp.Utils.plugins.Signature);
				}
			});
		}).eq(0).trigger("click");
	};

	// success page
	var showSuccessPage = function showSuccessPage(delay) {

		var deferred = jQuery.Deferred(),
			timeout = typeof delay === "undefined" ? 0 : delay;

		setTimeout(function () {

			$(".hp-app-link-container").removeClass("hp-page-active").hide();

			$(".hp-form").removeClass("hp-form-transvault-app-link");

			hp.Utils.plugins.Success.init();

			$(".hp-col-left .hp-type").off("click").removeClass("hp-active");

			deferred.resolve();
		}, timeout);

		return deferred;
	};

	// signature page
	var showSignaturePage = function showSignaturePage(delay) {

		var deferred = jQuery.Deferred(),
			timeout = typeof delay === "undefined" ? 0 : delay;

		setTimeout(function () {

			$(".hp-app-link-container").removeClass("hp-page-active").hide();

			$(".hp-form").removeClass("hp-form-transvault-app-link");

			hp.Utils.plugins.Signature.init();

			$(".hp-col-left .hp-type").off("click").removeClass("hp-active");

			deferred.resolve();
		}, timeout);

		return deferred;
	};

	var setAmount = function setAmount(amount) {
		hp.Utils.defaults.amount = Math.abs(Math.round10(parseFloat(amount), -2));
		$(".hp.hp-form .hp-version-amount").text(formatCurrency(hp.Utils.defaults.amount));

		return hp.Utils.defaults.amount;
	};

	var getAmount = function getAmount() {
		return hp.Utils.defaults.amount;
	};

	var createNav = function createNav() {

		var defaultAreas = hp.Utils.defaults.paymentTypeOrder,
			html = '',
			creditCard = '',
			bankAccount = '',
			code = '',
			transvault = '',
			signature = '',
			giftcard = '';

		if (defaultAreas.indexOf(0) >= 0) {
			creditCard = '<li class="hp-type hp-cc"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/9e2e4c55564ca8eba12f9fa3e7064299/raw/93965040e6e421e1851bfe7a15af92bdc722fa43/credt-card-icon.svg" alt="Credit Card" /> <span>Credit Card</span></a></li>';
		}

		if (defaultAreas.indexOf(1) >= 0) {
			bankAccount = '<li class="hp-type hp-bank"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/af49afe3c1c1cb41cb3204a45492bd47/raw/78e935c7e5290923dba15e8b595aef7c95b2292e/ach-icon.svg" alt="ACH and Bank Account" /> <span>Bank (ACH)</span></a></li>';
		}

		if (defaultAreas.indexOf(2) >= 0) {
			code = '<li class="hp-type hp-code"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/c70317acba59d3d5b60e5999d5feeab8/raw/764478d2660f97d002eb3bd3177b725a410f694d/swipe-icon.svg" alt="Swipe or Scan" /> <span>Swipe\\Scan</span></a></li>';
		}

		if (defaultAreas.indexOf(3) >= 0) {
			transvault = '<li class="hp-type hp-transvault"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/5363122967f20bd31d6630529cb17c3f/raw/0a0ae6a30247ced8ed5c0c85f2b42072b59b8fba/transvault-icon.svg" alt="Hosted Transvault" /> <span>Transvault</span></a></li>';
		}

		if (defaultAreas.indexOf(4) >= 0) {
			giftcard = '<li class="hp-type hp-gc"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/2e9f0f3bb754a7910ffbdbd16ea9926a/raw/27ce16494e375ff8d04deb918ffd76d743397488/gift-icon.svg" alt="Gift Card" /> <span>Gift Card</span></a></li>';
		}

		if (defaultAreas.indexOf(5) >= 0) {
			signature = '<li class="hp-type hp-signature"><a href="javascript:void(0);"><img src="https://cdn.rawgit.com/etsms/d0f7a8a7fc4fd889fb932990e757eaf8/raw/b5477130ac9d74273c4078944418ce850cc733a7/signature-icon.svg" alt="Signature" /> <span>Signature</span></a></li>';
		}

		for (var i = 0; i < defaultAreas.length; i++) {

			if (defaultAreas[i] === 0) {
				html += creditCard;
			}

			if (defaultAreas[i] === 1) {
				html += bankAccount;
			}

			if (defaultAreas[i] === 2) {
				html += code;
			}

			if (defaultAreas[i] === 3) {
				html += transvault;
			}

			if (defaultAreas[i] === 4) {
				html += giftcard;
			}

			if (defaultAreas[i] === 5) {
				html += signature;
			}
		}

		return html;
	};

	var createOrder = function createOrder() {

		var defaultAreas = hp.Utils.defaults.paymentTypeOrder,
			html = '',
			creditCard = '',
			bankAccount = '',
			code = '',
			transvault = '',
			signature = '',
			giftcard = '';

		if (defaultAreas.indexOf(0) >= 0) {
			creditCard = '<div class="hp-content hp-content-cc">{{creditCard}}</div>'.replace("{{creditCard}}", hp.Utils.plugins.CreditCard.createTemplate(hp.Utils.defaults.defaultCardCharacters, hp.Utils.defaults.defaultNameOnCardName, hp.Utils.defaults.defaultDateCharacters));
		}

		if (defaultAreas.indexOf(1) >= 0) {
			bankAccount = '<div class="hp-content hp-content-bank">{{bankAccount}}</div>'.replace("{{bankAccount}}", hp.Utils.plugins.BankAccount.createTemplate(hp.Utils.defaults.defaultName, hp.Utils.defaults.defaultAccountNumberCharacters, hp.Utils.defaults.defaultRoutingNumberCharacters));
		}

		if (defaultAreas.indexOf(2) >= 0) {
			code = '<div class="hp-content hp-content-code">{{code}}</div>'.replace("{{code}}", hp.Utils.plugins.Code.createTemplate(hp.Utils.defaults.defaultCardCharacters, hp.Utils.defaults.defaultNameOnCardNameSwipe, hp.Utils.defaults.defaultDateCharacters));
		}

		if (defaultAreas.indexOf(3) >= 0) {
			transvault = '<div class="hp-content hp-content-transvault">{{transvault}}</div>'.replace("{{transvault}}", hp.Utils.plugins.Transvault.createTemplate());
		}

		if (defaultAreas.indexOf(4) >= 0) {
			giftcard = '<div class="hp-content hp-content-gc">{{giftcard}}</div>'.replace("{{giftcard}}", hp.Utils.plugins.GiftCard.createTemplate(hp.Utils.defaults.defaultCardCharacters, hp.Utils.defaults.defaultNameOnCardName, +new Date().getFullYear().toString().substring(2, 4) + 3));
		}

		if (defaultAreas.indexOf(5) >= 0) {
			signature = '<div class="hp-content hp-content-signature">{{signature}}</div>'.replace("{{signature}}", hp.Utils.plugins.Signature.createTemplate());
		}

		for (var i = 0; i < defaultAreas.length; i++) {

			if (defaultAreas[i] === 0) {
				html += creditCard;
			}

			if (defaultAreas[i] === 1) {
				html += bankAccount;
			}

			if (defaultAreas[i] === 2) {
				html += code;
			}

			if (defaultAreas[i] === 3) {
				html += transvault;
			}

			if (defaultAreas[i] === 4) {
				html += giftcard;
			}

			if (defaultAreas[i] === 5) {
				html += signature;
			}
		}

		return html;
	};

	var setSession = function setSession(session, isApiKey) {

		var currentSession = getSession();

		if (session.length <= 36 && !isApiKey) {
			currentSession.sessionToken = session;
		}

		if (isApiKey) {
			currentSession.apiKey = session;
		}

		hp.Utils.defaults.session = currentSession;
	};

	var getSession = function getSession() {

		var currentSession = {};
		currentSession.sessionToken = "";
		currentSession.apiKey = "";

		currentSession.sessionToken = hp.Utils.defaults.session ? hp.Utils.defaults.session.sessionToken ? hp.Utils.defaults.session.sessionToken : "" : "";
		currentSession.apiKey = hp.Utils.defaults.session ? hp.Utils.defaults.session.apiKey ? hp.Utils.defaults.session.apiKey : "" : "";

		return currentSession;
	};

	var buildSuccessResultObject = function buildSuccessResultObject() {
		return {
			"status": "Success",
			"amount": getAmount(),
			"message": "Transaction processed",
			"token": getSession().sessionToken,
			"transaction_id": "",
			"transaction_sequence_number": "",
			"transaction_approval_code": "",
			"transaction_avs_street_passed": false,
			"transaction_avs_postal_code_passed": false,
			"transaction_currency": "USD$",
			"transaction_status_indicator": "",
			"transaction_type": hp.Utils.defaults.paymentType,
			"transaction_tax": 0,
			"transaction_surcharge": hp.Utils.defaults.surchargeFee,
			"transaction_gratuity": 0,
			"transaction_cashback": 0,
			"transaction_total": getAmount(),
			"correlation_id": getCorrelationId(),
			"customer_token": getCustomerToken(),
			"instrument_id": "",
			"instrument_type": "",
			"instrument_method": "Other",
			"instrument_last_four": "",
			"instrument_routing_last_four": "",
			"instrument_expiration_date": "",
			"instrument_verification_method": "",
			"instrument_entry_type": hp.Utils.defaults.entryType,
			"instrument_entry_type_description": "KEY_ENTRY",
			"instrument_verification_results": "",
			"created_on": new Date().toISOString(),
			"customer_name": "",
			"customer_signature": "https://images.pmoney.com/00000000",
			"anti_forgery_token": hp.Utils.defaults.antiForgeryToken,
			"application_identifier": "Hosted Payments",
			"application_response_code": "",
			"application_issuer_data": ""
		};
	};

	var buildSignatureResultObject = function buildSignatureResultObject(response) {

		var deferred = jQuery.Deferred();
		var baseResponse = buildSuccessResultObject();

		baseResponse.amount = 0;
		baseResponse.transaction_type = 0;
		baseResponse.message = "Signature captured";
		baseResponse.transaction_type = hp.PaymentType.CAPTURE_SIGNATURE;
		baseResponse.customer_signature = response.signatureUrl;

		deferred.resolve([baseResponse]);
		return deferred;
	};

	var buildResultObjectByType = function buildResultObjectByType(response) {

		var deferred = jQuery.Deferred();

		var isBankAccount = function isBankAccount(req) {

			var isBank = false;

			if (typeof req.properties !== "undefined" && typeof req.properties.accountNumber !== "undefined") {
				isBank = true;
			}

			return isBank;
		};

		var isEMoney = function isEMoney(req) {

			if (isBankAccount(req)) {
				return false;
			}

			if (typeof req.type !== "undefined" && (req.type.toLowerCase() === "emoney" || req.type.toLowerCase() === "creditcard" || req.type.toLowerCase() === "ach")) {
				return true;
			}

			return false;
		};

		var isCreditCard = function isCreditCard(req) {

			if (isBankAccount(req)) {
				return false;
			}

			if (isEMoney(req)) {
				return false;
			}

			if (typeof req.properties !== "undefined" && typeof req.properties.cardNumber !== "undefined") {
				return true;
			}

			return false;
		};

		var isTrackAccount = function isTrackAccount(req) {

			if (isBankAccount(req)) {
				return false;
			}

			if (isEMoney(req)) {
				return false;
			}

			if (isCreditCard(req)) {
				return false;
			}

			if (typeof req.properties !== "undefined" && (typeof req.properties.trackOne !== "undefined" || typeof req.properties.trackTwo !== "undefined" || typeof req.properties.trackThree !== "undefined")) {
				return true;
			}

			return false;
		};

		if (typeof response.splice === "function") {

			var responses = [],
				isCreateOnly = hp.Utils.getAmount() === 0;

			for (var i = 0; i < response.length; i++) {

				var res = response[i],
					createdOn = new Date().toISOString(),
					payment = res.request,
					message = "Transaction processed.",
					session = getSession(),
					lastFour = "",
					routingLastFour = "",
					name = "",
					type = "",
					expirationDate = "",
					isError = res.isException ? true : false,
					status = "Success",
					payload = payment.__request,
					swipe = payload ? payload.__swipe : undefined,
					isAch = isBankAccount(payload),
					isEm = isEMoney(payload),
					isCC = isCreditCard(payload),
					isTrack = isTrackAccount(payload),
					isScan = typeof swipe !== "undefined";

				// For BANK ACCOUNT objects
				if (isAch) {

					message = "Transaction pending.";
					lastFour = payload.properties.accountNumber.substr(payload.properties.accountNumber.length - 4) + "";
					routingLastFour = payload.properties.routingNumber.substr(payload.properties.routingNumber.length - 4) + "";
					name = payload.name;
					type = "ACH";
				}

				// For WALLET objects
				if (isEm) {

					var reqType = payload.type.toLowerCase();

					if (reqType === "ach") {
						name = payload.bankName;
						lastFour = payload.accountNumber.replace(/\*/gi, "");
					} else if (reqType === "creditcard") {
						name = payload.nameOnCard;
						lastFour = payload.cardNumber.substr(payload.cardNumber.length - 4) + "";
						expirationDate = payload.properties.expirationDate;
					} else {
						name = payload.email;
						lastFour = payload.cardNumber.substr(payload.cardNumber.length - 4) + "";
					}

					type = "EMONEY";
				}

				// For Credit Card requests
				if (isCC) {

					lastFour = payload.properties.cardNumber.substr(payload.properties.cardNumber.length - 4) + "";
					name = payload.properties.nameOnCard;

					try {
						type = $.payment.cardType(payload.properties.cardNumber).toUpperCase();
					} catch (e) {
						type = "Unknown";
						hp.Utils.log("Coudn't determine cardType. ", e);
					}

					expirationDate = payload.properties.expirationDate;
				}

				if (isError) {
					status = "Error";
				}

				if (isScan) {

					lastFour = swipe.cardNumber.substr(swipe.cardNumber.length - 4);
					name = swipe.nameOnCard;

					try {
						type = $.payment.cardType(swipe.cardNumber).toUpperCase();
					} catch (e) {
						type = "Unknown";
						hp.Utils.log("Coudn't determine cardType. ", e);
					}

					expirationDate = swipe.expMonth + "/" + swipe.expYear;
				}

				if (isCreateOnly) {
					message = "Payment instrumented created.";
				} else if (hp.Utils.defaults.PaymentType === hp.PaymentType.REFUND) {
					message = "Transaction refunded.";
				}

				var successResponse = buildSuccessResultObject();

				successResponse.status = status;
				successResponse.amount = payment.amount;
				successResponse.message = isError ? res.description : message;
				successResponse.transaction_id = res.transactionId;
				successResponse.transaction_total = payment.amount;
				successResponse.instrument_id = payment.instrumentId;
				successResponse.instrument_type = type;
				successResponse.instrument_last_four = lastFour;
				successResponse.instrument_routing_last_four = routingLastFour;
				successResponse.instrument_expiration_date = expirationDate;
				successResponse.instrument_entry_type_description = isTrack ? "MAGNETIC_SWIPE" : "KEY_ENTRY";
				successResponse.customer_name = name;

				if (!hp.Utils.defaults.saveCustomer && typeof res.payment !== "undefined") {

					successResponse.instrument_id = res.payment.instrumentId;
					successResponse.instrument_type = res.payment.cardType;
					successResponse.instrument_last_four = res.payment.accountNumber;

					if (typeof res.payment.expirationDate === "undefined") {
						res.payment.expirationDate = "9909";
					}

					if (typeof res.payment.routingNumber !== "undefined") {
						successResponse.instrument_routing_last_four = res.payment.routingNumber;
					}

					if (typeof successResponse.instrument_type === "undefined") {
						successResponse.instrument_type = "ACH";
					}

					if (successResponse.customer_name === "") {
						successResponse.customer_name = res.payment.nameOnAccount;
					}

					var date = res.payment.expirationDate,
						year = date.substring(0, 2),
						month = date.substring(2);

					successResponse.instrument_expiration_date = month + "/" + new Date().getFullYear().toString().substring(0, 2) + year;
				}

				responses.push(successResponse);
			}

			if (isCreateOnly) {

				deferred.resolve(responses);
			} else {

				var responseCount = responses.length || 0,
					currentCount = 0;

				$.each(responses, function (index) {

					var statusRequest = {
						"status": {
							"statusRequest": {
								"token": hp.Utils.getSession().sessionToken,
								"transactionId": responses[index].transaction_id
							}
						}
					};

					hp.Utils.makeRequest(statusRequest).then(function (statusResponse) {

						if (statusResponse.type === "Transaction" && typeof statusResponse.properties !== "undefined") {
							var isACH = statusResponse.properties.accountType === "BankAccount";
							responses[currentCount].transaction_approval_code = isACH ? "" : statusResponse.properties.approvalCode;
							responses[currentCount].transaction_sequence_number = statusResponse.properties.sequenceNumber;
							responses[currentCount].transaction_avs_postal_code_passed = isACH ? true : statusResponse.properties.postalCodeCheck;
							responses[currentCount].transaction_avs_street_passed = isACH ? true : statusResponse.properties.addressLine1Check;
							responses[currentCount].customer_signature = statusResponse.properties.signatureRef === null || statusResponse.properties.signatureRef === undefined || statusResponse.properties.signatureRef === "" ? "https://images.pmoney.com/00000000" : statusResponse.properties.signatureRef;
							responses[currentCount].message = (responses[currentCount].message + " " + (statusResponse.properties.message + ".")).toLowerCase().replace(" .", "");
							responses[currentCount].instrument_verification_results = isACH ? false : true;
							responses[currentCount].instrument_verification_method = isACH ? "" : "SIGNATURE";
							responses[currentCount].instrument_method = typeof statusResponse.properties.accountType !== "undefined" ? statusResponse.properties.accountType : "CreditCard";
						}

						currentCount = currentCount + 1;

						if (currentCount === responseCount) {
							deferred.resolve(responses);
						}
					});
				});
			}
		} else {
			var newResponse = [];
			newResponse.push(response);
			return buildResultObjectByType(newResponse);
		}

		return deferred;
	};

	var retrieveTransactionStatus = function retrieveTransactionStatus(transactionId) {

		var deferred = jQuery.Deferred();

		var successResponse = buildSuccessResultObject();

		var statusRequest = {
			"status": {
				"statusRequest": {
					"token": getSession().sessionToken,
					"transactionId": transactionId
				}
			}
		};

		hp.Utils.makeRequest(statusRequest).then(function (statusResponse) {

			if (statusResponse.type === "Transaction" && typeof statusResponse.properties !== "undefined") {

				var isACH = statusResponse.properties.accountType === "BankAccount";

				successResponse.transaction_approval_code = isACH ? "" : statusResponse.properties.approvalCode;
				successResponse.transaction_avs_postal_code_passed = isACH ? true : statusResponse.properties.postalCodeCheck;
				successResponse.transaction_avs_street_passed = isACH ? true : statusResponse.properties.addressLine1Check;
				successResponse.customer_signature = statusResponse.properties.signatureRef === null || statusResponse.properties.signatureRef === undefined || statusResponse.properties.signatureRef === "" ? "https://images.pmoney.com/00000000" : statusResponse.properties.signatureRef;
				successResponse.message = (successResponse.message + " " + (statusResponse.properties.message + ".")).toLowerCase().replace(" .", "");
				successResponse.instrument_verification_results = isACH ? false : true;
				successResponse.instrument_verification_method = isACH ? "" : "SIGNATURE";
				successResponse.instrument_method = typeof statusResponse.properties.accountType !== "undefined" ? statusResponse.properties.accountType : "CreditCard";
				successResponse.customer_name = statusResponse.properties.nameOnAccount;
				successResponse.instrument_id = statusResponse.properties.instrumentId;
				successResponse.instrument_last_four = statusResponse.properties.accountNumber;
				successResponse.instrument_type = statusResponse.properties.cardType;
				successResponse.transaction_id = transactionId;
				successResponse.transaction_sequence_number = statusResponse.properties.sequenceNumber;
				successResponse.transaction_avs_postal_code_passed = statusResponse.properties.postalCodeCheck;
				successResponse.transaction_avs_street_passed = statusResponse.properties.addressLine1Check;
			}

			deferred.resolve(successResponse);
		}, deferred.reject);

		return deferred;
	};

	var requestTypes = {};

	requestTypes.SIGN_IN = "signIn";
	requestTypes.SIGN_IN_REQUEST = "signInRequest";
	requestTypes.SIGN_IN_RESPONSE = "signInResponse";

	requestTypes.CHARGE = "charge";
	requestTypes.CHARGE_REQUEST = "chargeRequest";
	requestTypes.CHARGE_RESPONSE = "chargeResponse";

	requestTypes.REFUND = "refund";
	requestTypes.REFUND_REQUEST = "refundRequest";
	requestTypes.REFUND_RESPONSE = "refundResponse";

	requestTypes.TRANSVAULT = "transvault";
	requestTypes.TRANSVAULT_REQUEST = "transvaultRequest";
	requestTypes.TRANSVAULT_RESPONSE = "transvaultResponse";

	requestTypes.CREATE_PAYMENT_INSTRUMENT = "createPaymentInstrument";
	requestTypes.CREATE_PAYMENT_INSTRUMENT_REQUEST = "createPaymentInstrumentRequest";
	requestTypes.CREATE_PAYMENT_INSTRUMENT_RESPONSE = "createPaymentInstrumentResponse";

	requestTypes.WALLET = "wallet";
	requestTypes.WALLET_REQUEST = "walletRequest";
	requestTypes.WALLET_RESPONSE = "walletResponse";

	requestTypes.STATUS = "status";
	requestTypes.STATUS_REQUEST = "statusRequest";
	requestTypes.STATUS_RESPONSE = "statusResponse";

	requestTypes.SIGNATURE = "signature";
	requestTypes.SIGNATURE_REQUEST = "signatureRequest";
	requestTypes.SIGNATURE_RESPONSE = "signatureResponse";

	var getObjectResponseFromData = function getObjectResponseFromData(data) {

		var memberName = "";
		var requestMemberName = "";
		var responseMemberName = "";
		var result = {};
		var isResponse = false;

		if (requestTypes.SIGN_IN in data) {
			memberName = requestTypes.SIGN_IN;
			requestMemberName = requestTypes.SIGN_IN_REQUEST;
			responseMemberName = requestTypes.SIGN_IN_RESPONSE;
		}

		if (requestTypes.CHARGE in data) {
			memberName = requestTypes.CHARGE;
			requestMemberName = requestTypes.CHARGE_REQUEST;
			responseMemberName = requestTypes.CHARGE_RESPONSE;
		}

		if (requestTypes.REFUND in data) {
			memberName = requestTypes.REFUND;
			requestMemberName = requestTypes.REFUND_REQUEST;
			responseMemberName = requestTypes.REFUND_RESPONSE;
		}

		if (requestTypes.TRANSVAULT in data) {
			memberName = requestTypes.TRANSVAULT;
			requestMemberName = requestTypes.TRANSVAULT_REQUEST;
			responseMemberName = requestTypes.TRANSVAULT_RESPONSE;
		}

		if (requestTypes.CREATE_PAYMENT_INSTRUMENT in data) {
			memberName = requestTypes.CREATE_PAYMENT_INSTRUMENT;
			requestMemberName = requestTypes.CREATE_PAYMENT_INSTRUMENT_REQUEST;
			responseMemberName = requestTypes.CREATE_PAYMENT_INSTRUMENT_RESPONSE;
		}

		if (requestTypes.WALLET in data) {
			memberName = requestTypes.WALLET;
			requestMemberName = requestTypes.WALLET_REQUEST;
			responseMemberName = requestTypes.WALLET_RESPONSE;
		}

		if (requestTypes.STATUS in data) {
			memberName = requestTypes.STATUS;
			requestMemberName = requestTypes.STATUS_REQUEST;
			responseMemberName = requestTypes.STATUS_RESPONSE;
		}

		if (requestTypes.SIGNATURE in data) {
			memberName = requestTypes.SIGNATURE;
			requestMemberName = requestTypes.SIGNATURE_REQUEST;
			responseMemberName = requestTypes.SIGNATURE_RESPONSE;
		}

		if (requestTypes.CHARGE_RESPONSE in data) {
			memberName = requestTypes.CHARGE_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.REFUND_RESPONSE in data) {
			memberName = requestTypes.REFUND_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.TRANSVAULT_RESPONSE in data) {
			memberName = requestTypes.TRANSVAULT_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.SIGN_IN_RESPONSE in data) {
			memberName = requestTypes.SIGN_IN_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.CREATE_PAYMENT_INSTRUMENT_RESPONSE in data) {
			memberName = requestTypes.CREATE_PAYMENT_INSTRUMENT_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.WALLET_RESPONSE in data) {
			memberName = requestTypes.WALLET_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.STATUS_RESPONSE in data) {
			memberName = requestTypes.STATUS_RESPONSE;
			isResponse = true;
		}

		if (requestTypes.SIGNATURE_RESPONSE in data) {
			memberName = requestTypes.SIGNATURE_RESPONSE;
			isResponse = true;
		}

		if (memberName === "") {
			throw new Error("hosted-payments.utils.js - Could not parse data from response/request object.");
		}

		if (!isResponse) {
			if (typeof data[memberName][responseMemberName] !== "undefined") {
				result = data[memberName][responseMemberName];
			} else if (typeof data[memberName][requestMemberName] !== "undefined") {
				result = data[memberName][requestMemberName];
			} else {
				throw new Error("hosted-payments.utils.js - Could not parse data from response/request object.");
			}
		} else {
			result = data[memberName];
		}

		return result;
	};

	var promptAvs = function promptAvs($element) {

		var deferred = jQuery.Deferred();

		if (!hp.Utils.defaults.promptForAvs) {
			deferred.resolve();
			return deferred;
		}

		if (typeof $element === "undefined") {
			$element = $(".hp-form");
		}

		if ($element.find(".hp-avs-prompt").length) {
			$element.find(".hp-avs-prompt").remove();
		}

		setTimeout(function () {

			var template = ['<div class="hp-avs-prompt">', '<div class="hp-avs-prompt-container">', '<p>Billing Address</p>', '<div class="hp-avs-prompt-left">', '<label class="hp-label-avs" for="avsStreet">Address <span class="hp-avs-required">*</span></label>', '<div class="hp-input hp-input-avs hp-input-avs-street">', '<input placeholder="Street Address" value="' + hp.Utils.defaults.billingAddress.addressLine1 + '" name="avsStreet" id="avsStreet" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "address-line1") + '" type="text" pattern="\\d*">', '</div>', '</div>', '<div class="hp-avs-prompt-right">', '<div class="hp-pull-left">', '<label class="hp-label-avs" for="avsZip">City</label>', '<div class="hp-input hp-input-avs hp-input-avs-city">', '<input placeholder="City" name="city" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text">', '</div>', '</div>', '<div class="hp-pull-left">', '<label class="hp-label-avs" for="avsZip">State</label>', '<div class="hp-input hp-input-avs hp-input-avs-state">', '<input placeholder="State" name="state" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text">', '</div>', '</div>', '<div class="hp-pull-left">', '<label class="hp-label-avs" for="avsZip">Zip <span class="hp-avs-required">*</span></label>', '<div class="hp-input hp-input-avs hp-input-avs-zip">', '<input placeholder="Zipcode" value="' + hp.Utils.defaults.billingAddress.postalCode + '" name="avsZip" id="avsZip" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "postal-code") + '" type="text" pattern="\\d*">', '</div>', '</div>', '</div>', '<br class="hp-break" />', '<hr>', '<button class="hp-submit hp-avs-submit">Submit Payment</button>', hp.Utils.defaults.allowAvsSkip ? '<a class="hp-avs-skip" href="javascript:;">Skip \'Address Verification\'</a>' : '', '</div>', '</div>'].join("");

			$element.prepend(template);

			var $avsPrompt = $element.find(".hp-avs-prompt"),
				avsZipValue = "",
				avsStreetValue = "";

			var handleSubmit = function handleSubmit(e) {
				e.preventDefault();

				hp.Utils.updateAvsInfo(avsStreetValue, avsZipValue);

				$element.removeClass("hp-avs-active");
				$avsPrompt.removeClass("active");
				deferred.resolve();

				setTimeout(function () {
					$element.find(".hp-avs-prompt").remove();
				}, 0);
			};

			$avsPrompt.find(".hp-input-avs input").on("focus blur keyup", function (e) {

				e.preventDefault();

				if ($(this).attr("name") === "avsStreet") {
					avsStreetValue = $(this).val();
				}

				if ($(this).attr("name") === "avsZip") {
					avsZipValue = $(this).val();
				}

				var keycode = e.keyCode ? e.keyCode : e.which;

				if (keycode === 13) {
					handleSubmit(e);
				}
			});

			$avsPrompt.find(".hp-avs-submit").on("click", handleSubmit);

			if (hp.Utils.defaults.allowAvsSkip) {

				$avsPrompt.find(".hp-avs-skip").on("click", function (e) {
					e.preventDefault();

					$element.removeClass("hp-avs-active");
					$avsPrompt.removeClass("active");
					deferred.resolve();

					setTimeout(function () {
						$element.find(".hp-avs-prompt").remove();
					}, 0);

					hp.Utils.defaults.eventCallback(e);
				});
			}

			$element.addClass("hp-avs-active");
			$avsPrompt.addClass("active");
		}, 0);

		$element.find(".hp-input-avs-street input").focus();

		return deferred;
	};

	// basic http requests
	var makeRequest = function makeRequest(data, isSync) {

		var deferred = jQuery.Deferred();

		var requestObject = {
			url: hp.Utils.defaults.baseUrl + encodeURI("?dt=" + new Date().getTime()),
			type: "POST",
			dataType: "json",
			contentType: "application/json",
			crossDomain: true,
			data: JSON.stringify(data)
		};

		if (isSync) {
			requestObject.async = false;
		}

		$.ajax(requestObject).done(function (res) {

			var requestData = getObjectResponseFromData(data);

			if (res.error) {
				res.error.request = requestData;
				deferred.resolve(res.error);
				return;
			}

			var result = getObjectResponseFromData(res);
			result.request = requestData;

			deferred.resolve(result);
		}).fail(deferred.reject).catch(deferred.reject);

		return deferred;
	};

	var reset = function reset(options) {

		hp.Utils.log("Checking options to reset with...", options);

		if (typeof options === "undefined") {
			options = {};
		}

		if (options === null) {
			options = {};
		}

		hp.Utils.log("Getting instance element...", hp.Utils.__instance.element);

		var element = $(hp.Utils.__instance.element);

		hp.Utils.log("Emptying the container element...");

		element.empty();

		hp.Utils.__instance.element = element.get();

		hp.Utils.log("Handle special option types...");

		if (typeof options.entryType !== "undefined") {
			options.entryType = hp.Utils.setEntryType(options.entryType);
		}

		if (typeof options.paymentType !== "undefined") {
			options.paymentType = hp.Utils.setPaymentType(options.paymentType);
		}

		if (typeof options.paymentService !== "undefined") {
			options.paymentService = hp.Utils.setPaymentService(options.paymentService);
		}

		if (typeof options.amount !== "undefined") {
			options.amount = hp.Utils.setAmount(options.amount);
		}

		if (typeof options.convenienceFee !== "undefined") {
			hp.Utils.defaults.convenienceFee = options.convenienceFee;
		}

		if (typeof options.surchargeFee !== "undefined") {
			hp.Utils.defaults.surchargeFee = options.surchargeFee;
		}

		if (typeof options.saveCustomer !== "undefined") {
			if (options.saveCustomer.toString() === "false") {
				options.saveCustomer = false;
			} else if (options.saveCustomer.toString() === "true") {
				options.saveCustomer = true;
			}
		}

		if (typeof options.transactionId === "undefined" || options.transactionId === "") {

			if (typeof hp.Utils.defaults.transactionId === "undefined") {
				hp.Utils.defaults.transactionId = hp.Utils.generateGUID();
			}

			options.transactionId = hp.Utils.defaults.transactionId;
		}

		if (typeof options.apiKey !== "undefined") {
			hp.Utils.setSession(options.apiKey, true);
		}

		hp.Utils.log("Merging plugin defaults with newly provided options...");

		hp.Utils.defaults = jQuery.extend({}, hp.Utils.defaults, options);

		element.data(options);

		try {

			if (typeof hp.Utils.plugins.Transvault.transvaultHub !== "undefined") {

				var socketOptions = {
					withCredentials: false,
					jsonp: false,
					transport: ['webSockets'],
					waitForPageLoad: true
				};

				hp.Utils.plugins.Transvault.transvaultHub.connection.stop(socketOptions);
			}
		} catch (e) {
			hp.Utils.log(e);
		}

		setTimeout(function () {
			hp.Utils.log("Reinitialized plugin with new options!");
			hp.Utils.__instance.init();
			hp.Utils.__instance = hp.Utils.__instance;
		});
	};

	var signIn = function signIn() {

		var deferred = jQuery.Deferred(),
			createdOn = new Date().toISOString(),
			sessionId = getSession().sessionToken,
			apiKey = getSession().apiKey;

        /*
         * Skip sign in
         */
		if (hp.Utils.defaults.paymentService === hp.PaymentService.TEST) {
			hp.Utils.log("Sign In: Bypassed.");
			hp.Utils.setSession(apiKey);
			deferred.resolve(apiKey);
			return deferred;
		}

		hp.Utils.makeRequest({
			"signIn": {
				"signInRequest": {
					"apiKey": apiKey
				}
			}
		}).then(function (res) {

			hp.Utils.setSession(res.token);

			deferred.resolve(res);

			hp.Utils.log("Sign In: Retrieved from server.");
		}, function (res) {

			if (typeof res === "undefined" || res === null || res === "") {
				hp.Utils.reset();
				return;
			}

			var errorResponse = {
				"status": "Error",
				"message": "We're sorry. Payments cannot accepted at this time. Please try again later.",
				"created_on": createdOn,
				"token": sessionId
			};

			if (!hp.Utils.shouldErrorPostBack()) {
				hp.Utils.showError(errorResponse.message);
				hp.Utils.defaults.errorCallback(errorResponse);
			} else {
				hp.Utils.buildFormFromObject(errorResponse).then(function ($form) {
					$form.attr("action", hp.Utils.defaults.errorCallback).submit();
				});
			}

			deferred.reject();
		});

		return deferred;
	};

	var formatCurrency = function formatCurrency(amount) {
		var aDigits = amount.toFixed(2).split(".");
		aDigits[0] = aDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");
		return "$" + aDigits.join(".");
	};

	var hasChecked = false;

	var checkHttpsConnection = function checkHttpsConnection() {

		if (!hasChecked && (location.hostname === "localhost" || location.hostname === "")) {
			hasChecked = true;
		}

		if (!hp.Utils.defaults.allowHttpsSkip) {

            /*
             * Description: Shows an error when the current web page is not secure.
             *              This error cannot be "dismissed".
             */
			if (location.protocol !== "https:" && !hasChecked) {
				hp.Utils.showError("This connection is untrusted. Make sure you're visting this website using 'HTTPS'!", false);
			}
		}
	};

	var getBalance = function getBalance(sessionId, cardNumber) {

		var balance = 0,
			settings = {
				url: hp.Utils.defaults.baseUrl + encodeURI("?dt=" + new Date().getTime()),
				type: "POST",
				dataType: "json",
				contentType: "application/json",
				crossDomain: true,
				data: JSON.stringify({
					"balance": {
						"balanceRequest": {
							"token": sessionId,
							"cardNumber": cardNumber
						}
					}
				}),
				async: false
			};

		$.ajax(settings).done(function (res) {

			if (res.balanceResponse) {
				balance = res.balanceResponse.balance;
			}
		}).fail(function () {
			balance = 0;
		});

		return balance;
	};

	var isEmail = function isEmail(email) {
		return (/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(email)
		);
	};

	var validateEMoneyData = function validateEMoneyData(formData, callback) {

		var errors = [];

		if (typeof formData.email === "undefined" || formData.email === "") {
			errors.push({
				type: "email",
				message: "Please provide an email address."
			});
		}

		if (typeof formData.email !== "undefined" && !isEmail(formData.email)) {
			errors.push({
				type: "email",
				message: "The email provided did not validate."
			});
		}

		if (typeof formData.password === "undefined" || formData.password === "") {
			errors.push({
				type: "password",
				message: "Please provide a password."
			});
		}

		if (typeof formData.password !== "undefined" && formData.password.length <= 6) {
			errors.push({
				type: "password",
				message: "Please provide a valid password."
			});
		}

		if (errors.length) {
			return callback(errors, formData);
		}

		return callback(null, formData);
	};

	var validateBankAccountData = function validateBankAccountData(formData, callback) {

		var errors = [];

		if (typeof formData.accountNumber === "undefined" || formData.accountNumber === "") {
			errors.push({
				type: "accountNumber",
				message: "Account number on card cannot be empty."
			});
		}

		if (typeof formData.accountNumber !== "undefined" && formData.accountNumber.length <= 4) {
			errors.push({
				type: "accountNumber",
				message: "The account number must be atleast 5 characters."
			});
		}

		if (typeof formData.routingNumber === "undefined" || formData.routingNumber === "") {
			errors.push({
				type: "routingNumber",
				message: "Routing number be empty."
			});
		}

		if (typeof formData.routingNumber !== "undefined" && formData.routingNumber.length !== 9) {
			errors.push({
				type: "routingNumber",
				message: "Routing number must be 9 characters."
			});
		}

		if (typeof formData.name === "undefined" || formData.name === "") {
			errors.push({
				type: "name",
				message: "Name cannot be empty."
			});
		}

		if (typeof formData.name !== "undefined" && formData.name.length <= 1) {
			errors.push({
				type: "name",
				message: "Name must be greater than one character."
			});
		}

		if (errors.length) {
			return callback(errors, formData);
		}

		return callback(null, formData);
	};

	var shouldErrorPostBack = function shouldErrorPostBack() {

		var options = hp.Utils.defaults;

		if (typeof options.errorCallback !== "function" && typeof options.errorCallback !== "undefined") {
			return true;
		}

		return false;
	};

	var shouldSuccessPostBack = function shouldSuccessPostBack() {

		var options = hp.Utils.defaults;

		if (typeof options.successCallback !== "function" && typeof options.successCallback !== "undefined") {
			return true;
		}

		return false;
	};

	// Validate Credit Card Data
	var validateCreditCardData = function validateCreditCardData(formData, callback) {

		var errors = [];

		if (!$.payment.validateCardNumber(formData.cardNumber)) {
			errors.push({
				type: "cc",
				message: "Card number is invalid."
			});
		}

		if (!$.payment.validateCardExpiry(formData._expiryMonth, formData._expiryYear)) {
			errors.push({
				type: "date",
				message: "Expiration date is invalid."
			});
		}

		if (!$.payment.validateCardCVC(formData.cvv, formData.cardType)) {
			errors.push({
				type: "cvv",
				message: "CVV is not valid for this card type."
			});
		}

		if (typeof formData.name === "undefined" || formData.name === "") {
			errors.push({
				type: "name",
				message: "Name on card cannot be empty."
			});
		}

		if (typeof formData.name !== "undefined" && formData.name.length <= 1) {
			errors.push({
				type: "name",
				message: "Name on card must be greater than one character."
			});
		}

		if (errors.length) {
			return callback(errors, formData);
		}

		return callback(null, formData);
	};

	var buildAntiForgeryInput = function buildAntiForgeryInput() {

		var result = "";

		if (hp.Utils.defaults.antiForgeryToken === "" || hp.Utils.defaults.antiForgeryName === "") {
			return null;
		}

		if (hp.Utils.defaults.antiForgeryToken.startsWith(".") || hp.Utils.defaults.antiForgeryToken.startsWith("#") || hp.Utils.defaults.antiForgeryToken.includes("[")) {
			result = $(hp.Utils.defaults.antiForgeryToken).eq(0).val() || $(hp.Utils.defaults.antiForgeryToken).eq(0).text();
		} else {
			result = hp.Utils.defaults.antiForgeryToken;
		}

		if (typeof result === "undefined" || result === "") {
			return null;
		}

		return $("<input />", {
			"type": "hidden",
			"name": hp.Utils.defaults.antiForgeryName,
			"value": result
		});
	};

	var buildFormFromObject = function buildFormFromObject(obj) {

		var deferred = jQuery.Deferred(),
			$antiForgeryInput = buildAntiForgeryInput();

		setTimeout(function () {

			var formId = "FRM" + new Date().getTime().toString(),
				$form = $("<form />", {
					"method": "POST",
					"id": formId
				});

			if (!$.isEmptyObject(obj)) {

				if (typeof obj.push === "function") {

					for (var i = obj.length - 1; i >= 0; i--) {

						var objInArray = obj[i];

						for (var objKey in objInArray) {

							$form.append($("<input />", {
								"type": "hidden",
								"name": objKey + "[" + i + "]",
								"value": objInArray[objKey]
							}));
						}
					}
				} else {

					for (var key in obj) {

						$form.append($("<input />", {
							"type": "hidden",
							"name": key,
							"value": obj[key]
						}));
					}
				}

				if ($antiForgeryInput) {
					$form.append($antiForgeryInput);
				}

				$(document.body).prepend($form);

				return deferred.resolve($("#" + formId));
			}

			return deferred.reject();
		}, 0);

		return deferred;
	};

	var getTerminalId = function getTerminalId() {
		return hp.Utils.defaults.terminalId || "";
	};

	var getCorrelationId = function getCorrelationId() {
		return hp.Utils.defaults.correlationId.length ? hp.Utils.defaults.correlationId : generateGUID();
	};

	var getCustomerToken = function getCustomerToken() {

		if (hp.Utils.defaults.customerToken == null || typeof hp.Utils.defaults.customerToken === "undefined") {
			return null;
		}

		return hp.Utils.defaults.customerToken;
	};

	var getInstrumentId = function getInstrumentId() {

		if (hp.Utils.defaults.instrumentId == null || typeof hp.Utils.defaults.instrumentId === "undefined") {
			return null;
		}

		return hp.Utils.defaults.instrumentId;
	};

	var setContainerClass = function setContainerClass($instance) {

		var mobileClass = "hp-form-mobile",
			tabletClass = "hp-form-tablet",
			desktopClass = "hp-form-desktop";

		var currentWidth = $instance.outerWidth(true, true),
			containerElement = $instance.find(".hp");

		containerElement.removeClass(mobileClass).removeClass(tabletClass).removeClass(desktopClass);

		setTimeout(function () {

			if (currentWidth >= 615) {
				containerElement.addClass(desktopClass);
				return;
			}

			if (currentWidth >= 420) {
				containerElement.addClass(tabletClass);
				return;
			}

			if (currentWidth >= 320) {
				containerElement.addClass(mobileClass);
				return;
			}
		}, 0);
	};

	var handleError = function handleError(res) {

		var errorResponse = {
			"status": "Error",
			"message": "Your session is no longer valid. Please refresh your page and try again.",
			"created_on": new Date().toISOString(),
			"token": getSession().sessionToken
		};

		if (typeof res === "undefined") {

			if (!hp.Utils.shouldErrorPostBack()) {
				hp.Utils.showError(errorResponse.message);
				hp.Utils.defaults.errorCallback(errorResponse);
			} else {
				hp.Utils.buildFormFromObject(errorResponse).then(function ($form) {
					$form.attr("action", hp.Utils.defaults.errorCallback).submit();
				});
			}

			return;
		}

		var message = "";

		if (typeof res.message !== "undefined") {
			message = res.message;
		} else if (typeof res.description !== "undefined") {
			message = res.description;
		} else if (typeof res.error !== "undefined" && typeof res.error.description !== "undefined") {
			message = res.error.description;
		} else {
			message = res;
		}

		errorResponse.message = message;

		if (hp.Utils.shouldErrorPostBack()) {
			hp.Utils.buildFormFromObject(errorResponse).then(function ($form) {
				$form.attr("action", hp.Utils.defaults.errorCallback).submit();
			});
		} else {
			hp.Utils.showError(errorResponse.message);
			hp.Utils.defaults.errorCallback(errorResponse);
		}
	};

	var handleSuccess = function handleSuccess(res) {

		var errorResponse = {
			"status": "Error",
			"message": "Your session is no longer valid. Please refresh your page and try again.",
			"created_on": new Date().toISOString(),
			"token": getSession().sessionToken
		};

		if (typeof res === "undefined") {

			if (!hp.Utils.shouldErrorPostBack()) {
				hp.Utils.showError(errorResponse.message);
				hp.Utils.defaults.errorCallback(errorResponse);
			} else {
				hp.Utils.buildFormFromObject(errorResponse).then(function ($form) {
					$form.attr("action", hp.Utils.defaults.errorCallback).submit();
				});
			}

			return;
		}

		var response = res.length > 1 ? res : res[0];

		if (hp.Utils.shouldSuccessPostBack()) {
			hp.Utils.buildFormFromObject(response).then(function ($form) {
				$form.attr("action", hp.Utils.defaults.successCallback).submit();
			});
		} else {
			hp.Utils.defaults.successCallback(response);
		}
	};

	var setupPluginInstances = function setupPluginInstances($element) {

		var deferred = jQuery.Deferred();

		// Handle instance
		hp.Utils.createInstance($element, function (instance) {

			// The same elements across many instances
			var $this = $element,
				$submit = $this.find(".hp-submit"),
				$all = $this.find(".hp-input"),
				clearInputs = $.noop();

			hp.Utils.checkHttpsConnection();

			instance.init();
			instance.attachEvents();

            /*
             * Transvault 
             *      Methods for handling swipes through a terminal
             * @description:
             *      Invoke terminal and communicate to this instance unqiuely
             */
			if (instance.isTransvault()) {

				$this.off().on("hp.notify", hp.Utils.defaults.eventCallback).on("hp.transvaultSuccess", function (e, data) {

					var _response = data;

					instance.showSuccess();
					hp.Utils.hideLoader();

					if (!hp.Utils.shouldSuccessPostBack()) {
						hp.Utils.defaults.successCallback(_response);
					} else {
						hp.Utils.buildFormFromObject(_response).then(function ($form) {
							$form.attr("action", hp.Utils.defaults.successCallback).submit();
						});
					}
				});
			}

            /*
             * Code 
             *      Methods for handling barcodes & swipes
             * @description:
             *      Should handle encrypted MSR reads
             *      Should handle non-encrypted MSR reads
             *      Should handle non-encrypted Barcode reads
             */
			if (instance.isCode() || instance.isBankAccount() || instance.isCreditCard() || instance.isGiftCard() || instance.isSignature()) {

                /*
                 * Make sure Transvault is disconnected
                 */
				if (typeof hp.Utils.plugins.Transvault !== "undefined" && hp.Utils.plugins.Transvault.browserId !== null) {
					hp.Utils.log("Cancelling transvault instance.");
					hp.Utils.plugins.Transvault.cancelTransactionWithoutError();
				}

				$this.off().on("hp.notify", hp.Utils.defaults.eventCallback).on("hp.submit", function (e, eventResponse) {

					if (eventResponse.type === hp.RequestTypes.CHARGE) {
						instance.handleSuccess(eventResponse.res);
						hp.Utils.hideLoader();
					}

					if (eventResponse.type === hp.RequestTypes.SIGNATURE) {
						instance.handleSuccess(eventResponse.res);
						hp.Utils.hideLoader();
					}

					if (eventResponse.type === hp.RequestTypes.ERROR) {
						instance.handleError(eventResponse.res);
						hp.Utils.hideLoader();
					}

					instance.clearInputs();
				});
			}

			deferred.resolve();
		});

		return deferred;
	};

    /*
     * Build APP url
     *  Sample: "emmerchant://{{paymentType}}/{{merchantCredentials}}?transactionId={{transactionId}}&token={{token}}&browserId={{browserId}}&correlationId={{correlationId}}&amount={{amount}}&entryType={{entryType}}"
     */
	var buildEMoneyMobileAppUrl = function buildEMoneyMobileAppUrl(paymentType, merchantCredentials, transactionId, token, browserId, correlationId, amount, hostUrl, entryType) {

		var url = hp.Utils.defaults.emoneyMobileAppUrl;

		return url.replace("{{paymentType}}", paymentType.toLowerCase()).replace("{{merchantCredentials}}", encodeURIComponent(merchantCredentials)).replace("{{transactionId}}", transactionId).replace("{{token}}", token).replace("{{browserId}}", browserId).replace("{{correlationId}}", encodeURIComponent(correlationId)).replace("{{amount}}", amount).replace("{{url}}", encodeURIComponent(hostUrl)).replace("{{entryType}}", encodeURIComponent(entryType));
	};

    /*
     * Export "Utils"
     */
	hp.Utils.handleLegacyCssClassApplication = handleLegacyCssClassApplication;
	hp.Utils.makeRequest = makeRequest;
	hp.Utils.validateCreditCardData = validateCreditCardData;
	hp.Utils.validateBankAccountData = validateBankAccountData;
	hp.Utils.validateEMoneyData = validateEMoneyData;
	hp.Utils.buildFormFromObject = buildFormFromObject;
	hp.Utils.buildAntiForgeryInput = buildAntiForgeryInput;
	hp.Utils.createInstance = createInstance;
	hp.Utils.showSuccessPage = showSuccessPage;
	hp.Utils.showSignaturePage = showSignaturePage;
	hp.Utils.getAmount = getAmount;
	hp.Utils.setAmount = setAmount;
	hp.Utils.getSession = getSession;
	hp.Utils.setSession = setSession;
	hp.Utils.getBalance = getBalance;
	hp.Utils.formatCurrency = formatCurrency;
	hp.Utils.buildResultObjectByType = buildResultObjectByType;
	hp.Utils.buildSignatureResultObject = buildSignatureResultObject;
	hp.Utils.generateGUID = generateGUID;
	hp.Utils.createOrder = createOrder;
	hp.Utils.createNav = createNav;
	hp.Utils.getCorrelationId = getCorrelationId;
	hp.Utils.setContainerClass = setContainerClass;
	hp.Utils.shouldSuccessPostBack = shouldSuccessPostBack;
	hp.Utils.shouldErrorPostBack = shouldErrorPostBack;
	hp.Utils.getTerminalId = getTerminalId;
	hp.Utils.showLoader = showLoader;
	hp.Utils.hideLoader = hideLoader;
	hp.Utils.showError = showError;
	hp.Utils.hideError = hideError;
	hp.Utils.setPaymentInstrument = setPaymentInstrument;
	hp.Utils.log = log;
	hp.Utils.getVersion = getVersion;
	hp.Utils.setEntryType = setEntryType;
	hp.Utils.setPaymentType = setPaymentType;
	hp.Utils.updateAvsInfo = updateAvsInfo;
	hp.Utils.promptAvs = promptAvs;
	hp.Utils.checkHttpsConnection = checkHttpsConnection;
	hp.Utils.handleError = handleError;
	hp.Utils.handleSuccess = handleSuccess;
	hp.Utils.signIn = signIn;
	hp.Utils.setupPluginInstances = setupPluginInstances;
	hp.Utils.reset = reset;
	hp.Utils.setPaymentService = setPaymentService;
	hp.Utils.retrieveTransactionStatus = retrieveTransactionStatus;
	hp.Utils.buildEMoneyMobileAppUrl = buildEMoneyMobileAppUrl;
	hp.Utils.getCustomerToken = getCustomerToken;
	hp.Utils.getInstrumentId = getInstrumentId;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

	function Success($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.$element = $element;
		this.formData = { _isValid: false };
	}

	Success.prototype.init = function () {

		var context = hp.Utils.handleLegacyCssClassApplication("success", this.$element),
			$parent = context.parent,
			$content = context.content;

		$parent.find(".icon.success").addClass("animate").show();

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;
	};

	Success.prototype.createTemplate = function () {

		var $html = ['<div class="hp-success-visual"></div>', '<h2 class="hp-success-label">{{successLabel}}</h2>', '<p class="text-muted">{{redirectLabel}}</p>'].join("");

		return $html;
	};

	Success.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	Success.prototype.isCreditCard = function () {
		return false;
	};

	Success.prototype.isBankAccount = function () {
		return false;
	};

	Success.prototype.isEMoney = function () {
		return false;
	};

	Success.prototype.isSuccessPage = function () {
		return true;
	};

	Success.prototype.isCode = function () {
		return false;
	};

	Success.prototype.isGiftCard = function () {
		return false;
	};

	Success.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Success"
     */
	hp.Success = Success;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

	function Signature($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.hasChanged = false;
		this.$element = $element;
		this.formData = { _isValid: false };
	}

	Signature.prototype.init = function () {

		var context = hp.Utils.handleLegacyCssClassApplication("signature", this.$element),
			$parent = context.parent,
			$content = context.content;

		$parent.find(".icon.signature").addClass("animate").show();

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;

		this.$signature = this.$parent.find('.hp-js-signature').jqSignature({
			autoFit: true,
			lineColor: '#007aff',
			height: 320,
			border: "0 none"
		});

		var that = this;

		this.$signature.on("jq.signature.changed", function (e) {

			if (!that.hasChanged) {
				that.hasChanged = true;
				that.enableButtons();
			}
		});

		this.$parent.find(".hp-dismiss-icon").off("click").on("click", function () {
			hp.Utils.reset();
		});
	};

	Signature.prototype.createTemplate = function () {

		var $html = ['<div class="hp-signature-visual">', '<div class="hp-signature-container">', '<a class="hp-dismiss-icon" href="javascript:;">&times</a>', '<div class="hp-js-signature">', '</div>', '<div class="hp-submit-group">', '<button disabled="disabled" class="hp-submit hp-submit-danger">Clear Signature</button>', '<button disabled="disabled" class="hp-submit hp-submit-success">Submit Signature</button>', '</div>', '</div>', '</div>'].join("");

		return $html;
	};

	Signature.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	Signature.prototype.attachEvents = function () { };

	Signature.prototype.detachEvents = function () { };

	Signature.prototype.handleSignature = function () {

		var signature = this.$signature.jqSignature('getDataPoints'),
			that = this,
			requestModel = {
				"signature": {
					"signatureRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"correlationId": hp.Utils.getCorrelationId(),
						"transactionId": hp.Utils.defaults.transactionId,
						"data": signature
					}
				}
			};

		hp.Utils.showLoader();

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildSignatureResultObject).then(function (promiseResponse) {

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.SIGNATURE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	Signature.prototype.handleError = function (res) {
		hp.Utils.handleError(res);
		this.clearInputs();
	};

	Signature.prototype.clearInputs = function () {
		this.$signature.jqSignature('clearCanvas');
	};

	Signature.prototype.enableButtons = function () {

		var that = this;

		this.$parent.find(".hp-submit-group .hp-submit").removeAttr("disabled");

		this.$parent.find(".hp-submit-group .hp-submit-success").off("click").on("click", function () {
			that.handleSignature();
		});

		this.$parent.find(".hp-submit-group .hp-submit-danger").off("click").on("click", function () {

			that.$signature.jqSignature('clearCanvas');
			that.hasChanged = false;

			that.$parent.find(".hp-submit-group .hp-submit").attr("disabled", "disabled");
		});
	};

	Signature.prototype.handleSuccess = function (res) {
		hp.Utils.handleSuccess(res);
		this.showSuccess();
	};

	Signature.prototype.isCreditCard = function () {
		return false;
	};

	Signature.prototype.isBankAccount = function () {
		return false;
	};

	Signature.prototype.isEMoney = function () {
		return false;
	};

	Signature.prototype.isSuccessPage = function () {
		return false;
	};

	Signature.prototype.isCode = function () {
		return false;
	};

	Signature.prototype.isGiftCard = function () {
		return false;
	};

	Signature.prototype.isSignature = function () {
		return true;
	};

	Signature.prototype.isTransvault = function () {
		return false;
	};

    /*
     * Export "Signature"
     */
	hp.Signature = Signature;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

    /*
     * Credit Card Class
     */
	function CreditCard($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.$loader = null;
		this.$element = $element;
		this.formData = {
			_isValid: false
		};

		// session
		this.instrumentId = "";
		this.transactionId = "";
	}

	var $cc = null,
		$cvv = null,
		$month = null,
		$year = null,
		$name = null,
		$submit = null,
		$visualcc = null,
		$visualmonth = null,
		$visualyear = null,
		$visualname = null,
		$visualcard = null,
		$all = null,
		$fancy = null;

	var sessionId = "",
		createdOn = new Date().toISOString();

	CreditCard.prototype.init = function () {

		sessionId = hp.Utils.getSession().sessionToken;

		// utils call
		var context = hp.Utils.handleLegacyCssClassApplication("cc", this.$element),
			$parent = context.parent,
			$content = context.content;

		// Clean parent, notify on complete.
		$parent.removeClass("hp-back").trigger("hp.notify");

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;
		this.$loader = $parent.find(".hp-img-loading").eq(0);
		this.wasOnceEMoney = false;

		$cc = this.$content.find(".hp-input-cc input");
		$cvv = this.$content.find(".hp-input-cvv input");
		$month = this.$content.find(".hp-input-month select");
		$year = this.$content.find(".hp-input-year select");
		$name = this.$content.find(".hp-input-name input");
		$submit = this.$content.find(".hp-submit");
		$visualcc = this.$content.find(".hp-card-visual-number");
		$visualmonth = this.$content.find(".hp-card-visual-expiry-month");
		$visualyear = this.$content.find(".hp-card-visual-expiry-year");
		$visualname = this.$content.find(".hp-card-visual-name");
		$visualcard = this.$content.find(".hp-card-visual");
		$visualcard = this.$content.find(".hp-card-visual");
		$all = this.$content.find(".hp-input");
		$fancy = $([$month, $year]);

		this.transactionId = hp.Utils.defaults.transactionId;
	};

	CreditCard.prototype.clearInputs = function () {

		this.formData = {
			_isValid: false
		};

		$visualcc.html(hp.Utils.defaults.defaultCardCharacters);
		$visualmonth.html(hp.Utils.defaults.defaultDateCharacters);
		$visualyear.html(hp.Utils.defaults.defaultDateCharacters);
		$visualname.text(hp.Utils.defaults.defaultNameOnCardName);
		$visualcard.parent().removeClass().addClass("hp-content hp-content-cc hp-content-active");
		$name.removeAttr("disabled").val("");
		$month.removeAttr("disabled");
		$year.removeAttr("disabled");
		$cvv.removeAttr("disabled").val("");
		$cc.removeAttr("disabled").val("");
		$submit.removeAttr("disabled");
		$submit.text("Submit Payment");
	};

	CreditCard.prototype.createTemplate = function (defaultCardCharacters, defaultNameOnCardName, defaultDateCharacters) {

		if (hp.Utils.defaults.paymentTypeOrder.indexOf(0) < 0) {
			return "";
		}

		if (typeof defaultCardCharacters === "undefined" || typeof defaultNameOnCardName === "undefined" || typeof defaultDateCharacters === "undefined") {
			throw new Error("hosted-payments.credit-card.js : Cannot create template. Arguments are null or undefined.");
		}

		var generateYearList = function generateYearList(input) {

			var min = new Date().getFullYear(),
				max = new Date().getFullYear() + 10,
				select = "";

			for (var i = min; i <= max; i++) {

				if (i === min) {
					select += '<option selected="selected">';
				} else {
					select += "<option>";
				}

				select += i.toString();
				select += "</option>";
			}

			return select;
		};

		var generateMonthList = function generateMonthList(input) {

			var min = 1,
				select = "";

			for (var i = min; i <= 12; i++) {

				if (i === new Date().getMonth() + 1) {
					select += '<option selected="selected">';
				} else {
					select += "<option>";
				}

				if (i < 10) {
					select += "0" + i.toString();
				} else {
					select += i.toString();
				}

				select += "</option>";
			}

			return select;
		};

		var parseDatesTemplates = function parseDatesTemplates(input) {
			return input.replace("{{monthList}}", generateMonthList()).replace("{{yearList}}", generateYearList());
		};

		var $html = ['<div class="hp-card-visual">', '<div class="hp-card-visual-number">' + defaultCardCharacters + '</div>', '<div class="hp-card-visual-name">' + defaultNameOnCardName + '</div>', '<div class="hp-card-visual-expiry">', '<span class="hp-card-visual-expiry-label">Month/Year</span>', '<span class="hp-card-visual-expiry-label-alt">Valid Thru</span>', '<span class="hp-card-visual-expiry-value"><span class="hp-card-visual-expiry-month">' + defaultDateCharacters + '</span><span>/</span><span class="hp-card-visual-expiry-year">' + defaultDateCharacters + '</span></span>', '</div>', '</div>', '<div class="hp-input-wrapper">', '<div class="hp-input hp-input-cc">', '<input placeholder="Enter Card Number" name="cardnumber" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-number") + '" type="text" pattern="\\d*">', '</div>', '<div class="hp-input hp-input-name">', '<input placeholder="Enter Full Name" name="ccname" value="' + hp.Utils.defaults.customerName + '" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-name") + '" type="text">', '</div>', '<div class="hp-input-container hp-input-container-date">', '<div class="hp-input hp-input-month">', '<select autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-exp-month") + '" name="cc-exp">', '{{monthList}}', '</select>', '</div>', '<div class="hp-input hp-input-year">', '<select autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-exp-year") + '" name="cc-exp">', '{{yearList}}', '</select>', '</div>', '</div>', '<div class="hp-input hp-input-third hp-input-cvv">', '<input placeholder="Enter CVV" name="cvc" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-csc") + '" type="text" pattern="\\d*">', '<span class="hp-input-cvv-image"></span>', '</div>', '<button class="hp-submit">' + (hp.Utils.defaults.promptForAvs ? "Verify Billing Address &#10144;" : "Submit Payment") + '</button>', '</div>'].join("");

		return parseDatesTemplates($html);
	};

	CreditCard.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	CreditCard.prototype.detachEvents = function () {
		$cc.off().val("");
		$cvv.off().val("");
		$name.off().val(hp.Utils.defaults.customerName);
		$submit.off();
		$month.off("focus");
		$year.off("focus");
		this.$parent.trigger("hp.notify");
		this.handleNotify();
	};

	CreditCard.prototype.handleCreditCardInput = function (cardNumber) {

		if (cardNumber === "") {
			$visualcc.html(hp.Utils.defaults.defaultCardCharacters);
			return;
		}

		var cardType = $.payment.cardType(cardNumber);

		if ((cardType === null || cardType !== "emoney") && this.wasOnceEMoney) {
			var date = new Date();
			$name.val("").trigger("keyup").removeAttr("readonly");
			$month.removeAttr("readonly").val(date.getMonth() <= 9 ? "0" + date.getMonth() : date.getMonth()).trigger("change");
			$year.removeAttr("readonly").val(date.getFullYear()).trigger("change");
			$cvv.val("").trigger("keyup").removeAttr("readonly");
		}

		if (cardType === "emoney") {
			$name.val("EMoney Card").trigger("keyup").attr("readonly", "readonly");
			$month.val("12").trigger("change").attr("readonly", "readonly");
			$year.val("2025").trigger("change").attr("readonly", "readonly");
			$cvv.val("999").trigger("keyup").attr("readonly", "readonly");
			this.wasOnceEMoney = true;
		}

		this.formData.cardNumber = cardNumber.replace(/\s/gi, "");
		this.formData.cardType = cardType;
		$visualcc.text(cardNumber);
	};

	CreditCard.prototype.handleMonthInput = function (expiryMonth) {

		if (expiryMonth === "") {
			$visualmonth.html(hp.Utils.defaults.defaultDateCharacters);
			return;
		}

		this.formData._expiryMonth = $.trim(expiryMonth);
		$visualmonth.text(expiryMonth);

		setTimeout(function () {
			$month.next().text(expiryMonth);
		}, 0);
	};

	CreditCard.prototype.handleYearInput = function (expiryYear) {

		if (expiryYear === "") {
			$visualyear.html(hp.Utils.defaults.defaultDateCharacters);
			return;
		}

		this.formData._expiryYear = $.trim(expiryYear);
		$visualyear.text(expiryYear.substring(2));

		setTimeout(function () {
			$year.next().text(expiryYear);
		}, 0);
	};

	CreditCard.prototype.handleNameInput = function (name) {

		if (name === "") {
			$visualname.text(hp.Utils.defaults.defaultNameOnCardName);
			return;
		}

		name = name.replace(/[0-9]/g, '');

		this.formData.name = name;

		$visualname.text(this.formData.name);
	};

	CreditCard.prototype.handleCVVInput = function (cvv) {
		this.formData.cvv = $.trim(cvv);
	};

	CreditCard.prototype.handleChargeWithoutInstrument = function (createInstrumentRequest) {

		var that = this,
			requestModel = {},
			cardProperties = createInstrumentRequest.createPaymentInstrument.createPaymentInstrumentRequest.properties;

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": that.transactionId,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"properties": cardProperties,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": createInstrumentRequest
					}
				}
			};

			if (hp.Utils.defaults.surchargeFee > 0) {
				requestModel.charge.chargeRequest.surchargeFee = hp.Utils.defaults.surchargeFee;
			}

			if (hp.Utils.defaults.convenienceFee > 0) {
				requestModel.charge.chargeRequest.convenienceFee = hp.Utils.defaults.convenienceFee;
			}
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.PREAUTH) {

			requestModel = {
				"preAuth": {
					"preAuthRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": that.transactionId,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"properties": cardProperties,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": createInstrumentRequest
					}
				}
			};

			if (hp.Utils.defaults.surchargeFee > 0) {
				requestModel.preAuth.preAuthRequest.surchargeFee = hp.Utils.defaults.surchargeFee;
			}

			if (hp.Utils.defaults.convenienceFee > 0) {
				requestModel.preAuth.preAuthRequest.convenienceFee = hp.Utils.defaults.convenienceFee;
			}
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"properties": cardProperties,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": createInstrumentRequest
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	CreditCard.prototype.handleCharge = function (res) {

		var that = this,
			hasBalance = true,
			cardBalance = 0;

		var errorResponse = {
			"status": "Error",
			"message": "The payment instrument provided had no remaining funds and will not be applied to the split payment.",
			"created_on": createdOn,
			"token": sessionId
		};

		var requestModel = {};

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": that.transactionId,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"instrumentId": that.instrumentId,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": res.request
					}
				}
			};

			if (hp.Utils.defaults.surchargeFee > 0) {
				requestModel.charge.chargeRequest.surchargeFee = hp.Utils.defaults.surchargeFee;
			}

			if (hp.Utils.defaults.convenienceFee > 0) {
				requestModel.charge.chargeRequest.convenienceFee = hp.Utils.defaults.convenienceFee;
			}
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.PREAUTH) {

			requestModel = {
				"preAuth": {
					"preAuthRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": that.transactionId,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"instrumentId": that.instrumentId,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": res.request
					}
				}
			};

			if (hp.Utils.defaults.surchargeFee > 0) {
				requestModel.preAuth.preAuthRequest.surchargeFee = hp.Utils.defaults.surchargeFee;
			}

			if (hp.Utils.defaults.convenienceFee > 0) {
				requestModel.preAuth.preAuthRequest.convenienceFee = hp.Utils.defaults.convenienceFee;
			}
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"token": hp.Utils.getSession().sessionToken,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"instrumentId": that.instrumentId,
						"correlationId": hp.Utils.getCorrelationId(),
						"__request": res.request
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	CreditCard.prototype.handleSubmit = function () {

		var that = this;

		if (!that.formData._isValid) {
			$visualcard.addClass("hp-card-invalid");
			setTimeout(function () {
				$visualcard.removeClass("hp-card-invalid");
			}, 2000);
			return;
		}

		$submit.attr("disabled", "disabled").text("Submitting...");

		hp.Utils.promptAvs().then(function () {

			hp.Utils.showLoader();

			var createInstrumentRequest = {
				"createPaymentInstrument": {
					"createPaymentInstrumentRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"customerToken": hp.Utils.getCustomerToken(),
						"instrumentId": hp.Utils.getInstrumentId(),
						"transactionId": that.transactionId,
						"token": hp.Utils.getSession().sessionToken,
						"name": that.formData.name,
						"properties": {
							"cardNumber": that.formData.cardNumber,
							"expirationDate": that.formData._expiryMonth + "/" + that.formData._expiryYear,
							"cvv": that.formData.cvv,
							"nameOnCard": that.formData.name,
							"customerToken": hp.Utils.getCustomerToken(),
							"instrumentId": hp.Utils.getInstrumentId()
						},
						"billingAddress": {
							"addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
							"postalCode": hp.Utils.defaults.billingAddress.postalCode
						}
					}
				}
			};

			if (hp.Utils.defaults.saveCustomer) {
				return hp.Utils.makeRequest(createInstrumentRequest);
			}

			that.handleChargeWithoutInstrument(createInstrumentRequest);
		}).then(function (res) {

			if (!hp.Utils.defaults.saveCustomer) {
				return;
			}

			if (res.isException) {

				that.$parent.trigger("hp.submit", {
					"type": 9,
					"res": res
				});

				return;
			}

			that.instrumentId = res.instrumentId;
			that.transactionId = typeof res.transactionId !== "undefined" ? res.transactionId : that.transactionId;

			that.$parent.trigger("hp.submit", {
				"type": 0,
				"res": res
			});

			that.handleCharge(res);
		}).fail(function (err) {

			if (typeof err.responseJSON !== "undefined") {
				err = err.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": 9,
				"res": err
			});
		});
	};

	CreditCard.prototype.handleSuccess = function (res) {
		hp.Utils.handleSuccess(res);
		this.showSuccess();
	};

	CreditCard.prototype.handleError = function (res) {
		hp.Utils.handleError(res);
		this.clearInputs();
	};

	CreditCard.prototype.attachEvents = function () {

		this.detachEvents();

		var $this = this;

		hp.Utils.setContainerClass($this.$element);

		$cc.payment('formatCardNumber').on("keyup", function () {

			var cardNumber = $(this).val();
			var cardType = $.payment.cardType(cardNumber);

			$this.$parent.removeClass("hp-back");

			if (cardType) {
				$this.$content.removeClass().addClass("hp-content hp-content-cc hp-content-active").addClass("hp-content-card-" + cardType);
			}

			$this.handleCreditCardInput(cardNumber);
			$this.$parent.trigger("hp.cc", cardNumber);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		$cvv.payment('formatCardCVC').on("focus", function () {

			$this.$parent.addClass("hp-back");
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		}).on("keyup", function (e) {

			var cvv = $(this).val();
			$this.handleCVVInput(cvv);
			$this.$parent.trigger("hp.cvv", cvv);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		$name.on("focus", function () {

			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
			$this.$parent.removeClass("hp-back");
		}).on("keyup", function (e) {

			var name = $(this).val();
			$this.handleNameInput(name);
			$this.$parent.trigger("hp.name", name);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();

			var $el = $(this);

			setTimeout(function () {
				if ($this.formData.name.length != 1) {
					$el.val($this.formData.name);
				}
			});
		});

		if (hp.Utils.defaults.customerName !== "") {
			$name.trigger("keyup");
		}

		$month.on("focus", function (e) {
			$(".hp-input-active").removeClass("hp-input-active");
			$(this).parents(".hp-input").addClass("hp-input-active");
		}).on("change.fs", function (e) {

			var month = $(this).val();
			$this.handleMonthInput(month);
			$this.$parent.removeClass("hp-back");
			$this.$parent.trigger("hp.expiryMonth", month);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		}).on("blur", function (e) {
			$(".hp-input-active").removeClass("hp-input-active");
		}).trigger("change.fs");

		$year.on("focus", function (e) {
			$(".hp-input-active").removeClass("hp-input-active");
			$(this).parents(".hp-input").addClass("hp-input-active");
		}).on("change.fs", function (e) {

			var year = $(this).val();
			$this.handleYearInput(year);
			$this.$parent.removeClass("hp-back");
			$this.$parent.trigger("hp.expiryYear", year);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		}).on("blur", function (e) {
			$(".hp-input-active").removeClass("hp-input-active");
		}).trigger("change.fs");

		$submit.on("click", function (e) {
			e.preventDefault();
			$this.handleSubmit();
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		this.$parent.trigger("hp.notify");
		this.handleNotify();
	};

	CreditCard.prototype.handleNotify = function () {

		if (typeof this.formData._expiryYear !== "undefined" && typeof this.formData._expiryMonth !== "undefined") {
			this.formData.expirationDate = $.trim(this.formData._expiryMonth + this.formData._expiryYear.substring(2));
		}

		var $this = this;

		hp.Utils.validateCreditCardData(this.formData, function (error, data) {

			$all.removeClass("hp-error");

			if (!error) {
				$this.formData._isValid = true;
				return;
			}

			for (var err in error) {

				if (error[err].type === "cc") {

					if ($cc.val() !== "") {
						$cc.parent().addClass("hp-error");
					}
				}

				if (error[err].type === "cvv") {

					if ($cvv.val() !== "") {
						$cvv.parent().addClass("hp-error");
					}
				}

				if (error[err].type === "date") {

					if ($year.val() !== "" && $month.val() !== "") {
						$year.parent().addClass("hp-error");
						$month.parent().addClass("hp-error");
					}
				}

				if (error[err].type === "name") {

					if ($name.val() !== "") {
						$name.parent().addClass("hp-error");
					}
				}
			}
		});
	};

	CreditCard.prototype.isCreditCard = function () {
		return true;
	};

	CreditCard.prototype.isBankAccount = function () {
		return false;
	};

	CreditCard.prototype.isEMoney = function () {
		return false;
	};

	CreditCard.prototype.isCode = function () {
		return false;
	};

	CreditCard.prototype.isSuccessPage = function () {
		return false;
	};

	CreditCard.prototype.isTransvault = function () {
		return false;
	};

	CreditCard.prototype.isGiftCard = function () {
		return false;
	};

	CreditCard.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Credit Card"
     */
	hp.CreditCard = CreditCard;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

    /*
     * Gift Card Class
     */
	function GiftCard($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.$loader = null;
		this.$element = $element;
		this.formData = {
			_isValid: false
		};
		this.currrentPage = 0;
		this.transactionId = "";
	}

	var sessionId = "",
		createdOn = new Date().toISOString();

	GiftCard.prototype.init = function () {

		sessionId = hp.Utils.getSession().sessionToken;

		// utils call
		var context = hp.Utils.handleLegacyCssClassApplication("gc", this.$element),
			$parent = context.parent,
			$content = context.content;

		// Clean parent, notify on complete.
		$parent.removeClass("hp-back").trigger("hp.notify");

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;
		this.totalPages = $content.find(".hp-page").length;
		this.currrentPage = 0;
		this.transactionId = hp.Utils.defaults.transactionId;
	};

	GiftCard.prototype.clearInputs = function () {

		this.formData = {
			_isValid: false
		};
	};

	GiftCard.prototype.createTemplate = function (defaultCardCharacters, defaultNameOnCardName, defaultDateCharacters) {

		if (hp.Utils.defaults.paymentTypeOrder.indexOf(4) < 0) {
			return "";
		}

		var $html = ['<div class="hp-page hp-page-0 hp-page-active">', '<h2>Swipe, scan, or manually<br /> enter a gift card.</h2><br />', '<div class="hp-card-visual">', '<div class="hp-card-visual-number">' + defaultCardCharacters + '</div>', '<div class="hp-card-visual-name">' + defaultNameOnCardName + '</div>', '<div class="hp-card-visual-expiry">', '<span class="hp-card-visual-expiry-label">Month/Year</span>', '<span class="hp-card-visual-expiry-label-alt">Valid Thru</span>', '<span class="hp-card-visual-expiry-value"><span class="hp-card-visual-expiry-month">12</span><span>/</span><span class="hp-card-visual-expiry-year">' + defaultDateCharacters + '</span></span>', '</div>', '</div>', '<div class="hp-input-wrapper">', '<div class="hp-input-group hp-clearfix">', '<div class="hp-input hp-input-gc hp-pull-left">', '<input placeholder="Enter Card Number" name="cardNumber" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "cc-number") + '" type="text" pattern="\\d*">', '</div>', '<button class="hp-submit hp-pull-left">Submit</button>', '</div>', '<hr />', '<button class="hp-submit hp-submit-success">Issue a new Gift Card</button>', '</div>', '</div>', '<div class="hp-page hp-page-1">', '<h2>Page 1.</h2><br />', '</div>', '<div class="hp-page hp-page-2">', '<h2>Page 2.</h2><br />', '</div>', '<div class="hp-page hp-page-3">', '<h2>Page 3.</h2><br />', '</div>', '<div class="hp-page hp-page-4">', '<h2>Page 4.</h2><br />', '</div>', '<div class="hp-page hp-page-5">', '<h2>Page 5.</h2><br />', '</div>', '<br />'].join("");

		return $html;
	};

	GiftCard.prototype.getCurrentPageElement = function () {
		return this.$content.find(".hp-page-active").eq(0);
	};

	GiftCard.prototype.goTo = function (pageNumber) {

		if (pageNumber === "first") {
			pageNumber = 0;
		}

		if (pageNumber === "last") {
			pageNumber = this.totalPages - 1;
		}

		var num = +pageNumber;

		if (num < 0) {
			num = 0;
		}

		if (num > this.totalPages) {
			num = this.totalPages;
		}

		this.$content.find(".hp-page").removeClass("hp-page-active").filter(".hp-page-" + num).addClass("hp-page-active");

		this.currrentPage = num;
		this.$parent.trigger("hp.notify", { "type": "page", "value": num });
	};

	GiftCard.prototype.next = function () {
		var page = this.currrentPage + 1;
		this.goTo(page === this.totalPages ? "first" : page);
	};

	GiftCard.prototype.prev = function () {
		this.goTo(this.currrentPage === 0 ? "last" : this.currrentPage - 1);
	};

	GiftCard.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	GiftCard.prototype.detachEvents = function () {
		this.$parent.trigger("hp.notify");
		this.handleNotify();
	};

	GiftCard.prototype.handleCharge = function (res) {

		var that = this,
			hasBalance = true,
			cardBalance = 0;

		var errorResponse = {
			"status": "Error",
			"message": "The payment instrument provided had no remaining funds and will not be applied to the split payment.",
			"created_on": createdOn,
			"token": sessionId
		};

		var requestModel = {
			"charge": {
				"chargeRequest": {
					"correlationId": hp.Utils.getCorrelationId(),
					"token": hp.Utils.getSession().sessionToken,
					"transactionId": this.transactionId,
					"instrumentId": this.instrumentId,
					"entryType": hp.Utils.defaults.entryType,
					"amount": hp.Utils.getAmount(),
					"__request": res.request
				}
			}
		};

		if (hp.Utils.defaults.surchargeFee > 0) {
			requestModel.charge.chargeRequest.surchargeFee = hp.Utils.defaults.surchargeFee;
		}

		if (hp.Utils.defaults.convenienceFee > 0) {
			requestModel.charge.chargeRequest.convenienceFee = hp.Utils.defaults.convenienceFee;
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	GiftCard.prototype.handleSubmit = function () {

		var that = this;

		if (!that.formData._isValid) {
			return;
		}

		$submit.attr("disabled", "disabled").text("Submitting...");

		hp.Utils.promptAvs().then(function () {

			hp.Utils.showLoader();

			return hp.Utils.makeRequest({
				"createPaymentInstrument": {
					"createPaymentInstrumentRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"customerToken": hp.Utils.getCustomerToken(),
						"instrumentId": hp.Utils.getInstrumentId(),
						"token": hp.Utils.getSession().sessionToken,
						"name": that.formData.name,
						"properties": {
							"cardNumber": that.formData.cardNumber,
							"expirationDate": that.formData._expiryMonth + "/" + that.formData._expiryYear,
							"cvv": that.formData.cvv,
							"nameOnCard": that.formData.name,
							"customerToken": hp.Utils.getCustomerToken(),
							"instrumentId": hp.Utils.getInstrumentId()
						},
						"billingAddress": {
							"addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
							"postalCode": hp.Utils.defaults.billingAddress.postalCode
						}
					}
				}
			});
		}).then(function (res) {

			if (res.isException) {

				that.$parent.trigger("hp.submit", {
					"type": 9,
					"res": res
				});

				return;
			}

			that.instrumentId = res.instrumentId;
			that.transactionId = typeof res.transactionId !== "undefined" ? res.transactionId : that.transactionId;

			that.$parent.trigger("hp.submit", {
				"type": 0,
				"res": res
			});

			that.handleCharge(res);
		}).fail(function (err) {

			if (typeof err.responseJSON !== "undefined") {
				err = err.responseJSON;
			}

			that.$parent.trigger("hp.submit", {
				"type": 9,
				"res": err
			});
		});
	};

	GiftCard.prototype.handleSuccess = function (res) {
		hp.Utils.handleSuccess(res);
		this.showSuccess();
	};

	GiftCard.prototype.handleError = function (res) {
		hp.Utils.handleError(res);
		this.clearInputs();
	};

	GiftCard.prototype.addScanSwipeListener = function (first_argument) {

		var $this = this;

		$(document).pos({
			onEventName: "hp.global_giftcard_start",
			offEventName: "hp.global_giftcard_end",
			onSwipeScan: function onSwipeScan(result) {
				$this.handleSubmit(data);
			}
		});
	};

	GiftCard.prototype.attachEvents = function () {

		var $this = this;

		$this.$parent.on("hp.notify", function (e, args) {

			if (typeof args === "undefined") {
				return;
			}

			if (typeof args.type === "undefined") {
				return;
			}

			if (args.type !== "page") {
				return;
			}

			var pageNum = args.value,
				pageFunc = "handlePage" + pageNum + "Events";

			if (typeof $this[pageFunc] === "undefined") {
				return;
			}

			$this[pageFunc]($this.getCurrentPageElement());
		});

		$this.handlePage0Events($this.getCurrentPageElement());
		$this.handleNotify();
	};

	GiftCard.prototype.handlePage0Events = function (container) {

		this.addScanSwipeListener();

		container.find(".hp-input-gc input").payment('formatCardNumber');

		container.find(".hp-input-gc .hp-submit").off().on("click", function (e) { });

		console.log("handlePage0Events", container);
	};

	GiftCard.prototype.handlePage1Events = function (container) {
		console.log("handlePage1Events", container);
	};

	GiftCard.prototype.handlePage2Events = function (container) {
		console.log("handlePage2Events", container);
	};

	GiftCard.prototype.handlePage3Events = function (container) {
		console.log("handlePage3Events", container);
	};

	GiftCard.prototype.handlePage4Events = function (container) {
		console.log("handlePage4Events", container);
	};

	GiftCard.prototype.handlePage5Events = function (container) {
		console.log("handlePage5Events", container);
	};

	GiftCard.prototype.handleNotify = function () {

		var $this = this;

		hp.Utils.validateCreditCardData(this.formData, function (error, data) {

			if (!error) {
				$this.formData._isValid = true;
				return;
			}

			for (var err in error) { }
		});
	};

	GiftCard.prototype.isCreditCard = function () {
		return true;
	};

	GiftCard.prototype.isBankAccount = function () {
		return false;
	};

	GiftCard.prototype.isEMoney = function () {
		return false;
	};

	GiftCard.prototype.isCode = function () {
		return false;
	};

	GiftCard.prototype.isSuccessPage = function () {
		return false;
	};

	GiftCard.prototype.isTransvault = function () {
		return false;
	};

	GiftCard.prototype.isGiftCard = function () {
		return true;
	};

	GiftCard.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Credit Card"
     */
	hp.GiftCard = GiftCard;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

    /*
     * Bank Account Class
     */
	function BankAccount($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.$element = $element;
		this.formData = { _isValid: false };
		this.transactionId = "";
	}

	var $fullname = null,
		$accountNumber = null,
		$routingNumber = null,
		$visualaccount = null,
		$visualbank = null,
		$visualrouting = null,
		$visualfullname = null,
		$all = null,
		$submit;

	var sessionId = "",
		createdOn = new Date().toISOString();

	BankAccount.prototype.init = function () {

		sessionId = hp.Utils.getSession().sessionToken;

		// utils call
		var context = hp.Utils.handleLegacyCssClassApplication("bank", this.$element),
			$parent = context.parent,
			$content = context.content;

		// Clean parent, notify on complete.
		$parent.trigger("hp.notify");

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;

		$fullname = this.$content.find(".hp-input-fullname input");
		$accountNumber = this.$content.find(".hp-input-account input");
		$routingNumber = this.$content.find(".hp-input-routing input");
		$visualaccount = this.$content.find(".hp-bank-visual-right");
		$visualbank = this.$content.find(".hp-bank-visual");
		$visualrouting = this.$content.find(".hp-bank-visual-left");
		$visualfullname = this.$content.find(".hp-bank-visual-name");
		$submit = this.$content.find(".hp-submit");
		$all = this.$content.find(".hp-input");

		this.transactionId = hp.Utils.defaults.transactionId;
	};

	BankAccount.prototype.clearInputs = function () {

		this.formData = {
			_isValid: false
		};

		$all.each(function () {
			$(this).find("input").val("");
		});

		$visualfullname.html(hp.Utils.defaults.defaultName);
		$visualaccount.html(hp.Utils.defaults.defaultAccountNumberCharacters);
		$visualrouting.html(hp.Utils.defaults.defaultRoutingNumberCharacters);
		$visualbank.parent().removeClass().addClass("hp-content hp-content-bank hp-content-active");
	};

	BankAccount.prototype.createTemplate = function (defaultName, defaultAccountNumberCharacters, defaultRoutingNumberCharacters) {

		if (hp.Utils.defaults.paymentTypeOrder.indexOf(1) < 0) {
			return "";
		}

		if (typeof defaultAccountNumberCharacters === "undefined" || typeof defaultRoutingNumberCharacters === "undefined" || typeof defaultName === "undefined") {
			throw new Error("hosted-payments.bank-account.js : Cannot create template. Arguments are null or undefined.");
		}

		var $html = ['<div class="hp-bank-visual">', '<div class="hp-bank-visual-image"></div>', '<div class="hp-bank-visual-logo"></div>', '<div class="hp-bank-visual-name">' + defaultName + '</div>', '<div class="hp-bank-visual-right">' + defaultAccountNumberCharacters + '</div>', '<div class="hp-bank-visual-left">' + defaultRoutingNumberCharacters + '</div>', '</div>', '<div class="hp-input-wrapper">', '<div class="hp-input hp-input-fullname">', '<input placeholder="Enter Full Name" name="name" value="' + hp.Utils.defaults.customerName + '" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "name") + '" type="text">', '</div>', '<div class="hp-break" >', '{{inputHtml}}', '</div>', '<button class="hp-submit">Submit Payment</button>', '<p class="info">* Please note that bank account (ACH) transactions may take up to 3 days to process. This time period varies depending on the your issuing bank. For more information please visit us at <a href="https://www.etsms.com/" target="_blank">https://etsms.com</a>.</p>', '</div>'].join("");

		var $inputHtml = ['<div class="hp-input hp-input-account hp-input-left">', '<input placeholder="Account Number" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text" pattern="\\d*">', '</div>', '<div class="hp-input hp-input-routing hp-input-right">', '<input placeholder="Routing Number" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text" pattern="\\d*">', '</div>'].join("");

		if (hp.Utils.defaults.swapAchInputs) {
			$inputHtml = ['<div class="hp-input hp-input-routing hp-input-left">', '<input placeholder="Routing Number" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text" pattern="\\d*">', '</div>', '<div class="hp-input hp-input-account hp-input-right">', '<input placeholder="Account Number" autocomplete="' + (hp.Utils.defaults.disableAutocomplete ? "off" : "on") + '" type="text" pattern="\\d*">', '</div>'].join("");
		}

		$html = $html.replace("{{inputHtml}}", $inputHtml);

		return $html;
	};

	BankAccount.prototype.detachEvents = function () {

		this.$content.find(".hp-input-account input").off().val("");
		this.$content.find(".hp-input-fullname input").off().val(hp.Utils.defaults.customerName);
		this.$content.find(".hp-input-routing input").off().val("");
		this.$content.find(".hp-submit").off();
		this.$parent.trigger("hp.notify");
		this.handleNotify();
	};

	BankAccount.prototype.handleRoutingInput = function (routingNumber) {

		if (routingNumber === "") {
			return $visualrouting.html(hp.Utils.defaults.defaultRoutingNumberCharacters);
		}

		this.formData.routingNumber = $.trim(routingNumber);
		$visualrouting.text(this.formData.routingNumber);
	};

	BankAccount.prototype.handleAccountInput = function (accountNumber) {

		if (accountNumber === "") {
			return $visualaccount.html(hp.Utils.defaults.defaultAccountNumberCharacters);
		}

		this.formData.accountNumber = $.trim(accountNumber);
		$visualaccount.text(this.formData.accountNumber);
	};

	BankAccount.prototype.handleNameInput = function (name) {

		if (name === "") {
			return $visualfullname.html(hp.Utils.defaults.defaultName);
		}

		name = name.replace(/[0-9]/g, '');

		this.formData.name = name;

		$visualfullname.text(this.formData.name);
	};

	BankAccount.prototype.attachEvents = function () {

		this.detachEvents();

		var $this = this;

		$this.$content.find(".hp-input-account input").payment('restrictNumeric').on("keyup, keydown, keypress, change, input", function () {

			var that = $(this),
				count = that.val().length;

			if (count > 16) {
				var value = that.val().substr(0, 16);
				that.val(value);
			}

			var accountNumber = $(this).val();

			$this.$parent.removeClass("hp-back");

			$this.$content.removeClass().addClass("hp-content hp-content-bank hp-content-active");

			$this.handleAccountInput(accountNumber);
			$this.$parent.trigger("hp.account", accountNumber);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		$this.$content.find(".hp-input-fullname input").on("keyup, keydown, keypress, change, input", function () {

			var name = $(this).val();

			$this.$parent.removeClass("hp-back");

			$this.handleNameInput(name);
			$this.$parent.trigger("hp.name", name);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		if (hp.Utils.defaults.customerName !== "") {
			setTimeout(function () {
				$this.$content.find(".hp-input-fullname input").val(hp.Utils.defaults.customerName);
				$this.$content.find(".hp-input-fullname input").trigger("keyup");
				$this.$parent.trigger("hp.name", hp.Utils.defaults.customerName);
				$this.handleNameInput(hp.Utils.defaults.customerName);
				$this.handleNotify();
			}, 0);
		}

		$this.$content.find(".hp-input-routing input").payment('restrictNumeric').on("keyup, keydown, keypress, change, input", function (e) {

			var that = $(this),
				count = that.val().length;

			if (count > 9) {
				var value = that.val().substr(0, 9);
				that.val(value);
			}

			var routingNumber = $(this).val();
			$this.$parent.removeClass("hp-back");
			$this.handleRoutingInput(routingNumber);
			$this.$parent.trigger("hp.routing", routingNumber);
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		$this.$content.find(".hp-submit").on("click", function (e) {
			e.preventDefault();
			$this.handleSubmit();
			$this.$parent.trigger("hp.notify");
			$this.handleNotify();
		});

		this.$parent.trigger("hp.notify");
		this.handleNotify();
	};

	BankAccount.prototype.handleNotify = function () {

		var $this = this;

		hp.Utils.validateBankAccountData(this.formData, function (error, data) {

			$all.removeClass("hp-error");

			if (!error) {
				$this.formData._isValid = true;
				return;
			}

			for (var err in error) {

				if (error[err].type === "accountNumber") {

					if ($accountNumber.val() !== "") {
						$accountNumber.parent().addClass("hp-error");
					}
				}

				if (error[err].type === "routingNumber") {

					if ($routingNumber.val() !== "") {
						$routingNumber.parent().addClass("hp-error");
					}
				}

				if (error[err].type === "name") {

					if ($fullname.val() !== "") {
						$fullname.parent().addClass("hp-error");
					}
				}
			}
		});
	};

	BankAccount.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	BankAccount.prototype.handleChargeWithoutInstrument = function (createPaymentInstrumentRequest) {

		var $this = this,
			requestModel = {},
			accountProperties = createPaymentInstrumentRequest.createPaymentInstrument.createPaymentInstrumentRequest.properties;

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": $this.transactionId,
						"properties": accountProperties,
						"amount": hp.Utils.getAmount(),
						"__request": createPaymentInstrumentRequest
					}
				}
			};
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"properties": accountProperties,
						"amount": hp.Utils.getAmount(),
						"__request": createPaymentInstrumentRequest
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	BankAccount.prototype.handleCharge = function (res) {

		var $this = this;

		var requestModel = {};

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": $this.transactionId,
						"instrumentId": $this.instrumentId,
						"amount": hp.Utils.getAmount(),
						"__request": res.request
					}
				}
			};
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"instrumentId": $this.instrumentId,
						"amount": hp.Utils.getAmount(),
						"entryType": hp.Utils.defaults.entryType,
						"__request": res.request
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	BankAccount.prototype.handleSuccess = function (res) {
		hp.Utils.handleSuccess(res);
		this.showSuccess();
	};

	BankAccount.prototype.handleError = function (res) {
		hp.Utils.handleError(res);
		this.clearInputs();
	};

	BankAccount.prototype.handleSubmit = function () {

		var $this = this;

		if (!$this.formData._isValid) {
			$visualbank.addClass("hp-bank-invalid");
			setTimeout(function () {
				$visualbank.removeClass("hp-bank-invalid");
			}, 2000);
			return;
		}

		$submit.attr("disabled", "disabled").text("Submitting...");
		hp.Utils.showLoader();

		$submit.attr("disabled", "disabled").text("Processing payment...");

		var createPaymentInstrumentRequest = {
			"createPaymentInstrument": {
				"createPaymentInstrumentRequest": {
					"correlationId": hp.Utils.getCorrelationId(),
					"transactionId": $this.transactionId,
					"customerToken": hp.Utils.getCustomerToken(),
					"instrumentId": hp.Utils.getInstrumentId(),
					"token": hp.Utils.getSession().sessionToken,
					"name": $this.formData.name,
					"properties": {
						"accountNumber": $this.formData.accountNumber,
						"routingNumber": $this.formData.routingNumber,
						"bankName": $this.formData.name,
						"customerToken": hp.Utils.getCustomerToken(),
						"instrumentId": hp.Utils.getInstrumentId()
					},
					"billingAddress": {
						"addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
						"postalCode": hp.Utils.defaults.billingAddress.postalCode
					}
				}
			}
		};

		if (!hp.Utils.defaults.saveCustomer) {
			return $this.handleChargeWithoutInstrument(createPaymentInstrumentRequest);
		}

		hp.Utils.makeRequest(createPaymentInstrumentRequest).then(function (res) {

			if (res.isException) {

				$this.$parent.trigger("hp.submit", {
					"type": 9,
					"res": res
				});

				return;
			}

			$this.instrumentId = res.instrumentId;
			$this.transactionId = typeof res.transactionId !== "undefined" ? res.transactionId : $this.transactionId;

			$this.$parent.trigger("hp.submit", {
				"type": 0,
				"res": res
			});

			$this.handleCharge(res);
		}).fail(function (err) {

			if (typeof err.responseJSON !== "undefined") {
				err = err.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": 9,
				"res": err
			});
		});
	};

	BankAccount.prototype.isCreditCard = function () {
		return false;
	};

	BankAccount.prototype.isBankAccount = function () {
		return true;
	};

	BankAccount.prototype.isEMoney = function () {
		return false;
	};

	BankAccount.prototype.isSuccessPage = function () {
		return false;
	};

	BankAccount.prototype.isCode = function () {
		return false;
	};

	BankAccount.prototype.isTransvault = function () {
		return false;
	};

	BankAccount.prototype.isGiftCard = function () {
		return false;
	};

	BankAccount.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Bank Account"
     */
	hp.BankAccount = BankAccount;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

    /*
     * Export "hp"
     */

	window.hp = hp || {};

    /*
     * Code Class
     */
	function Code($element) {
		this.context = null;
		this.$parent = null;
		this.$content = null;
		this.$element = $element;

		// session
		this.instrumentId = "";
		this.transactionId = "";

		this.formData = {
			_isValid: false
		};
	}

	var $visualcodecc = null,
		$visualcodemonth = null,
		$visualcodeyear = null,
		$visualcodename = null,
		$visualcode = null,
		$all = null;

	var sessionId = "",
		createdOn = new Date().toISOString();

	Code.prototype.init = function () {

		sessionId = hp.Utils.getSession().sessionToken;

		// utils call
		var context = hp.Utils.handleLegacyCssClassApplication("code", this.$element),
			$parent = context.parent,
			$content = context.content;

		// Clean parent, notify on complete.
		$parent.trigger("hp.notify");

		this.context = context;
		this.$parent = $parent;
		this.$content = $content;

		$visualcodecc = this.$content.find(".hp-card-visual-number");
		$visualcodemonth = this.$content.find(".hp-card-visual-expiry-month");
		$visualcodeyear = this.$content.find(".hp-card-visual-expiry-year");
		$visualcodename = this.$content.find(".hp-card-visual-name");
		$visualcode = this.$content.find(".hp-card-visual.hp-card-visual-flat");
		$all = this.$content.find(".hp-input");

		this.transactionId = hp.Utils.defaults.transactionId;
	};

	Code.prototype.clearInputs = function () {

		this.formData = {
			_isValid: false
		};

		$visualcode.removeClass("hp-card-visual-flat-active");
		$visualcodecc.html(hp.Utils.defaults.defaultCardCharacters);
		$visualcodemonth.html(hp.Utils.defaults.defaultDateCharacters);
		$visualcodeyear.html(hp.Utils.defaults.defaultDateCharacters);
		$visualcodename.html(hp.Utils.defaults.defaultNameOnCardNameSwipe);
	};

	Code.prototype.createTemplate = function (defaultCardCharacters, defaultNameOnCardName, defaultDateCharacters) {

		if (hp.Utils.defaults.paymentTypeOrder.indexOf(2) < 0) {
			return "";
		}

		if (typeof defaultCardCharacters === "undefined" || typeof defaultNameOnCardName === "undefined" || typeof defaultDateCharacters === "undefined") {
			throw new Error("hosted-payments.code.js : Cannot create template. Arguments are null or undefined.");
		}

		var $html = ['<div class="hp-code-title">To begin: Swipe a card or scan a barcode.</div>', '<div class="hp-code-image"></div>', '<div class="hp-card-visual hp-card-visual-flat">', '<div class="hp-card-visual-number">' + defaultCardCharacters + '</div>', '<div class="hp-card-visual-name">' + defaultNameOnCardName + '</div>', '<div class="hp-card-visual-expiry">', '<span class="hp-card-visual-expiry-label">Month/Year</span>', '<span class="hp-card-visual-expiry-label-alt">Valid Thru</span>', '<span class="hp-card-visual-expiry-value"><span class="hp-card-visual-expiry-month">' + defaultDateCharacters + '</span><span>/</span><span class="hp-card-visual-expiry-year">' + defaultDateCharacters + '</span></span>', '</div>', '</div>'].join("");

		return $html;
	};

	Code.prototype.detachEvents = function () {
		this.$content.find(".hp-submit").off();
		this.$parent.off("hp.swipped");
		this.$parent.trigger("hp.notify");
		$(document).off("hp.global_swipped");
		$(document).off("hp.global_swipped_start");
		$(document).off("hp.global_swipped_end");
		$(window).off("keydown");
	};

	Code.prototype.attachEvents = function () {

		this.detachEvents();

		var $this = this;

		$(document).pos();

		$(document).on("hp.global_swipped_start", function (event, data) {
			hp.Utils.showLoader();
			hp.Utils.defaults.eventCallback(data);
		});

		$(document).on("hp.global_swipped_end", function (event, data) {
			hp.Utils.defaults.eventCallback(data);
			$this.handleSubmit(data);
		});

		// Kills spacebar page-down event
		$(window).on("keydown", function (e) {
			if (e.target == document.body) {
				return e.keyCode != 32;
			}
		});
	};

	Code.prototype.handleChargeWithoutInstrument = function (createInstrumentRequest) {

		var $this = this,
			requestModel = {},
			cardProperties = createInstrumentRequest.createPaymentInstrument.createPaymentInstrumentRequest.properties;

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": $this.transactionId,
						"properties": cardProperties,
						"amount": hp.Utils.getAmount(),
						"__request": createInstrumentRequest
					}
				}
			};
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"properties": cardProperties,
						"amount": hp.Utils.getAmount(),
						"__request": createInstrumentRequest
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	Code.prototype.handleCharge = function (res) {

		var hasBalance = true,
			$this = this,
			cardBalance = 0;

		var errorResponse = {
			"status": "Error",
			"message": "The payment instrument provided had no remaining funds and will not be applied to the split payment.",
			"created_on": createdOn,
			"token": sessionId
		};

		var requestModel = {};

		if (hp.Utils.defaults.paymentType == hp.PaymentType.CHARGE) {

			requestModel = {
				"charge": {
					"chargeRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"transactionId": $this.transactionId,
						"instrumentId": res.instrumentId,
						"amount": hp.Utils.getAmount(),
						"__request": res.request
					}
				}
			};
		}

		if (hp.Utils.defaults.paymentType == hp.PaymentType.REFUND) {

			requestModel = {
				"refund": {
					"refundRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"token": hp.Utils.getSession().sessionToken,
						"instrumentId": res.instrumentId,
						"amount": hp.Utils.getAmount(),
						"__request": res.request
					}
				}
			};
		}

		hp.Utils.makeRequest(requestModel).then(hp.Utils.buildResultObjectByType).then(function (promiseResponse) {

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.CHARGE,
				"res": promiseResponse
			});
		}).fail(function (promiseResponse) {

			if (typeof promiseResponse.responseJSON !== "undefined") {
				promiseResponse = promiseResponse.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": promiseResponse
			});
		});
	};

	Code.prototype.handleSubmit = function (data) {

		var $this = this;

		if (!data.is_valid) {
			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": "Bad swipe. Please try again."
			});
			return;
		}

		if (data.name_on_card) {
			$this.formData.nameOnCard = data.name_on_card;
		}

		if (data.card_exp_date_year) {
			$this.formData.expYear = data.current_year + data.card_exp_date_year;
		}

		if (data.card_exp_date_month) {
			$this.formData.expMonth = data.card_exp_date_month;
		}

		if (data.card_number) {

			try {
				$this.formData.cardNumber = $.payment.formatCardNumber(data.card_number);
			} catch (e) {
				$this.formData.cardNumber = data.card_number;
				hp.Utils.log("Coudn't format cardNumber. ", e);
			}

			try {
				$this.formData.cardType = $.payment.cardType(data.card_number).toUpperCase();
			} catch (e) {
				$this.formData.cardType = "Unknown";
				hp.Utils.log("Coudn't determine cardType. ", e);
			}
		}

		$visualcodename.text($this.formData.nameOnCard);
		$visualcodecc.text($this.formData.cardNumber);
		$visualcodeyear.text($this.formData.expYear.substring($this.formData.expYear.length - 2));
		$visualcodemonth.text($this.formData.expMonth);

		$this.formData.trackOne = data.track_one;
		$this.formData.trackTwo = data.track_two;
		$this.formData.trackThree = data.track_three;
		$this.formData.ksn = data.ksn;

		$visualcode.addClass("hp-card-visual-flat-active");

		$this.formData._isValid = data.is_valid;
		$this.formData._isEMoney = data.is_emoney;

		var cardProperties = {};

		if ($this.formData._isValid && $this.formData.ksn !== "" && !$this.formData._isEMoney) {
			cardProperties = {
				"trackOne": $this.formData.trackOne,
				"trackTwo": $this.formData.trackTwo,
				"trackThree": $this.formData.trackThree,
				"ksn": $this.formData.ksn
			};
		}

		if (this.formData._isValid && $this.formData.ksn === "" && !$this.formData._isEMoney) {
			cardProperties = {
				"trackOne": $this.formData.trackOne,
				"trackTwo": $this.formData.trackTwo,
				"trackThree": "",
				"ksn": ""
			};
		}

		if (this.formData._isValid && $this.formData._isEMoney) {
			cardProperties = {
				"cardNumber": $this.formData.cardNumber.replace(/\s/gi, ""),
				"cvv": "999",
				"expirationDate": $this.formData.expMonth + "/" + $this.formData.expYear,
				"nameOnCard": $this.formData.nameOnCard
			};
		}

		cardProperties["customerToken"] = hp.Utils.getCustomerToken();
		cardProperties["instrumentId"] = hp.Utils.getInstrumentId();

		hp.Utils.promptAvs().then(function () {

			var createInstrumentRequest = {
				"createPaymentInstrument": {
					"createPaymentInstrumentRequest": {
						"correlationId": hp.Utils.getCorrelationId(),
						"customerToken": hp.Utils.getCustomerToken(),
						"instrumentId": hp.Utils.getInstrumentId(),
						"transactionId": $this.transactionId,
						"token": hp.Utils.getSession().sessionToken,
						"name": $this.formData.nameOnCard,
						"properties": cardProperties,
						"billingAddress": {
							"addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
							"postalCode": hp.Utils.defaults.billingAddress.postalCode
						},
						"__swipe": $this.formData
					}
				}
			};

			if (hp.Utils.defaults.saveCustomer) {
				return hp.Utils.makeRequest(createInstrumentRequest);
			}

            /*
             * Since this doesn't return a promise, the following 'then' method will not execute
             */
			return $this.handleChargeWithoutInstrument(createInstrumentRequest);
		}).then(function (res) {

			if (!hp.Utils.defaults.saveCustomer) {
				return;
			}

			if (res.isException) {

				$this.$parent.trigger("hp.submit", {
					"type": hp.RequestTypes.ERROR,
					"res": res
				});

				return;
			}

			$this.instrumentId = res.instrumentId;
			$this.transactionId = typeof res.transactionId !== "undefined" ? res.transactionId : $this.transactionId;

			hp.Utils.showLoader();

			$this.$parent.trigger("hp.submit", {
				"type": 0,
				"res": res
			});

			$this.handleCharge(res);
		}).fail(function (err) {

			if (typeof err.responseJSON !== "undefined") {
				err = err.responseJSON;
			}

			$this.$parent.trigger("hp.submit", {
				"type": hp.RequestTypes.ERROR,
				"res": err
			});
		});
	};

	Code.prototype.handleSuccess = function (res) {
		hp.Utils.handleSuccess(res);
		this.showSuccess();
	};

	Code.prototype.handleError = function (res) {
		hp.Utils.handleError(res);
		this.clearInputs();
	};

	Code.prototype.showSuccess = function (delay) {
		return hp.Utils.showSuccessPage(delay);
	};

	Code.prototype.isCreditCard = function () {
		return false;
	};

	Code.prototype.isCode = function () {
		return true;
	};

	Code.prototype.isBankAccount = function () {
		return false;
	};

	Code.prototype.isEMoney = function () {
		return false;
	};

	Code.prototype.isSuccessPage = function () {
		return false;
	};

	Code.prototype.isTransvault = function () {
		return false;
	};

	Code.prototype.isGiftCard = function () {
		return false;
	};

	Code.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Code"
     */
	hp.Code = Code;
})(jQuery, window, document);

(function ($, window, document, undefined) {

	"use strict";

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
		"Success": authorizationInProgressMessage,
		"BeginSale": transactionInProgressMessage,
		"BeginAuth": authorizationInProgressMessage,
		"Login": terminalActiveMessage,
		"LoginSuccess": terminalActiveMessage,
		"ExecuteCommand": terminalActiveMessage,
		"DisplayAmount": transactionInProgressMessage,
		"DisplayForm": transactionInProgressMessage,
		"FindTermsAndConditions": transactionInProgressMessage,
		"InsertOrSwipe": transactionInProgressMessage,
		"Idle": transactionInProgressMessage,
		"Offline": errorMessage,
		"ProcessingError": errorMessage,
		"ReadCardRequest": transactionInProgressMessage,
		"SetEmvPaymentType": authorizationInProgressMessage,
		"Gratuity": waitingForSignatureMessage,
		"CardInserted": authorizationInProgressMessage,
		"CardRemoved": authorizationInProgressMessage,
		"WaitingForSignature": waitingForSignatureMessage,
		"DownloadingSignature": waitingForSignatureMessage,
		"Signature": waitingForSignatureMessage,
		"SignatureBlocks": waitingForSignatureMessage,
		"StopTransaction": authorizationInProgressMessage,
		"TermsAndConditions": authorizationInProgressMessage,
		"Cancelled": cancelMessage,
		"Connected": terminalActiveMessage,
		"Declined": errorMessage,
		"Error": errorMessage,
		"GetMerchantCredentials": buildingLinkMessage
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

	Transvault.prototype.init = function () {

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

	Transvault.prototype.showError = function (message, title, code) {

		setTimeout(function () {

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
				"status": "Error",
				"message": message,
				"created_on": createdOn,
				"token": sessionId
			};

			if (!hp.Utils.shouldErrorPostBack()) {
				hp.Utils.defaults.errorCallback(errorResponse);
			} else {
				hp.Utils.buildFormFromObject(errorResponse).then(function ($form) {
					$form.attr("action", hp.Utils.defaults.errorCallback).submit();
				});
			}
		}, 0);
	};

	Transvault.prototype.createTemplate = function () {

		if (hp.Utils.defaults.paymentTypeOrder.indexOf(3) < 0) {
			return "";
		}

		var $html = ['<div class="hp-transvault-visual">', '<a class="hp-submit-refresh" href="javascript:;" title="Refresh Transvault">', '<img class="hp-submit-refresh-img" src="https://cdn.rawgit.com/etsms/0f62d83b5d3bf18ba57cb14648d913ac/raw/c5f48f7882ad1f48196450fa296caf05f674f48b/refresh-icon.svg" alt="Refresh Transvault Button" />', '</a>', '<div class="hp-transvault-visual-image {{isAlt}}">', '<img class="event event-default" src="https://cdn.rawgit.com/etsms/786cb7bdd1d077acc10d7d7e08a4241f/raw/58a2ec726610c18c21716ae6023f7c6d776b5a71/terminal-loading.svg" alt="Status" />', '</div>', '<p class="hp-input-transvault-message {{isAlt}}">', 'Disconnected <span></span>', '</p>', '<button class="hp-submit hp-submit-danger">Cancel Request</button>', '</div>'].join("");

		$html = $html.replace(/{{isAlt}}/gi, hp.Utils.getTerminalId().startsWith("1") || hp.Utils.getTerminalId().startsWith("3") ? "alt" : "");

		return $html;
	};

	Transvault.prototype.detachEvents = function () {

		this.$parent.off("hp.transvaultSuccess");
		this.$parent.off("hp.transvaultError");
		this.$parent.off("hp.transvaultProgress");
		this.$parent.find(".hp-submit").off();
		this.$parent.find(".hp-submit-refresh").off();
		this.$parent.off("hp.notify");
		this.transvaultHub.off("onMessage");
		this.$parent.removeClass("hp-form-transvault-app-link");
	};

	Transvault.prototype.attachEvents = function () {

		this.detachEvents();

		var $this = this;

		$this.transvaultHub.connection.url = hp.Utils.defaults.baseUrl + "/transvault";
		$this.setupWebockets();
		$this.$parent.find(".hp-submit-refresh").on("click", hp.Utils.reset);

		$this.$parent.find(".hp-submit").on("click", function (e) {
			e.preventDefault();
			$this.cancelTransaction();
		});
	};

	Transvault.prototype.onMessage = function (response) {

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

			$this.cancelTransaction().then(function () {
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

	Transvault.prototype.removeAppRedirectLinkForm = function (emoneyMobileAppUrl) {

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

	Transvault.prototype.buildAppRedirectLinkForm = function (emoneyMobileAppUrl) {

		var $formElement = this.$parent.eq(0);

        /*
         * Add Active Class
         */
		$formElement.addClass("hp-form-transvault-app-link");

		var html = ['<div class="hp-app-link-container hp-page-active">', '<div>', '<a target="_parent" class="hp-submit hp-submit-redirect" href="' + emoneyMobileAppUrl + '">Start Transaction</a>', '</div>', '</div>'].join("");

        /*
         * Remove existing form if present
         */
		$formElement.find(".hp-app-link-container").remove();

        /*
         * Add form to DOM
         */
		$formElement.prepend(html);
	};

	Transvault.prototype.onSuccess = function (response) {

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
			props.SD = "https://images.pmoney.com/00000000";
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
			"status": "Success",
			"message": $.trim(props.RD),
			"amount": props.TA,
			"token": hp.Utils.getSession().sessionToken,
			"anti_forgery_token": hp.Utils.defaults.antiForgeryToken,
			"transaction_id": props.ETT,
			"transaction_sequence_number": props.TSN,
			"transaction_approval_code": props.AC,
			"transaction_avs_street_passed": true,
			"transaction_avs_postal_code_passed": true,
			"transaction_currency": props.TCCT,
			"transaction_status_indicator": props.TSI,
			"transaction_type": props.TT,
			"transaction_tax": props.TAX,
			"transaction_surcharge": props.SA,
			"transaction_gratuity": props.GA,
			"transaction_cashback": props.CBA,
			"transaction_total": props.VA,
			"instrument_id": props.ACCT,
			"instrument_type": props.CRDT,
			"instrument_method": props.PM,
			"instrument_last_four": props.AN,
			"instrument_routing_last_four": "",
			"instrument_expiration_date": props.ED,
			"instrument_verification_method": props.CVMD,
			"instrument_entry_type": props.CEM,
			"instrument_entry_type_description": props.EMD,
			"instrument_verification_results": props.TVR,
			"created_on": new Date().toISOString(),
			"customer_name": props.CHN,
			"customer_signature": props.SD,
			"correlation_id": $this.correlationId,
			"customer_token": hp.Utils.getCustomerToken(),
			"application_identifier": props.AID,
			"application_response_code": props.ARC,
			"application_issuer_data": props.IAD
		};

		$this.$parent.trigger("hp.transvaultSuccess", successResponse);
		$this.removeAppRedirectLinkForm();
	};

	Transvault.prototype.setMessage = function (message) {

		var el = this.$parent.find(".hp-input-transvault-message");
		el.text(message);

		return el;
	};

	Transvault.prototype.cancelTransactionWithoutError = function () {

		var token = hp.Utils.getSession().sessionToken,
			correlationId = hp.Utils.getCorrelationId(),
			deferred = jQuery.Deferred(),
			amount = hp.Utils.getAmount();

		if (this.browserId === null) {
			deferred.resolve();
			return deferred;
		}

		this.sendMessage({
			"transvault": {
				"transvaultRequest": {
					"token": token,
					"amount": amount,
					"transactionId": this.transactionId,
					"correlationId": "HP:FROM-GUI",
					"terminalId": this.terminalId,
					"action": "CANCEL",
					"browserId": this.browserId,
					"shouldVoid": hp.Utils.defaults.shouldVoidOnCancel,
					"documentIndex": hp.Utils.defaults.documentIndex
				}
			}
		});

		this.wasCancelled = true;

		deferred.resolve();
		return deferred;
	};

	Transvault.prototype.cancelTransaction = function () {

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
			"transvault": {
				"transvaultRequest": {
					"token": token,
					"amount": amount,
					"transactionId": $this.transactionId,
					"correlationId": "HP:FROM-GUI",
					"terminalId": $this.terminalId,
					"action": "CANCEL",
					"browserId": $this.browserId,
					"shouldVoid": hp.Utils.defaults.shouldVoidOnCancel,
					"documentIndex": hp.Utils.defaults.documentIndex
				}
			}
		});

		$this.onCancelled();
		deferred.resolve();
		return deferred;
	};

	Transvault.prototype.disableNavBar = function () {
		if (this.$parent != null) {
			var nav = this.$parent.find(".hp-nav");
			nav.find(".hp-hide-list").remove();
			nav.css("position", "relative");
			nav.append($("<li />", {
				class: "hp-hide-list",
				css: {
					"position": "absolute",
					"top": "0",
					"left": "0",
					"height": "100%",
					"width": "100%",
					"z-index": "100",
					"background": "rgba(255, 255, 255, .7)"
				}
			}));
		}
	};

	Transvault.prototype.hideSubmitButton = function () {
		if (this.$parent != null) {
			this.$parent.find(".hp-submit").hide();
		}
	};

	Transvault.prototype.hideMessageText = function () {
		if (this.$parent != null) {
			this.$parent.find(".event-default").hide();
		}
	};

	Transvault.prototype.onCancelled = function () {

		this.hideSubmitButton();
		this.hideMessageText();
		this.showError("Transaction cancelled.");
		this.wasCancelled = true;
	};

	Transvault.prototype.onError = function (messageObject) {

		this.$parent.find(".event-default").hide();
		this.$parent.find(".hp-submit").hide();

		var $this = this;

		$this.showError(messageObject.message, messageObject.key, messageObject.value);

		try {

			if (messageObject.key === "HoldCall") {

				hp.Utils.makeRequest({
					"void": {
						"voidRequest": {
							"token": hp.Utils.getSession().sessionToken,
							"transactionId": $this.transactionId,
							"amount": hp.Utils.getAmount()
						}
					}
				}).then(hp.Utils.log, hp.Utils.log);
			}
		} catch (e) { }
	};

	Transvault.prototype.sendMessage = function (request) {
		var requestStringified = JSON.stringify(request);
		this.transvaultHub.server.sendMessage(requestStringified);
	};

	Transvault.prototype.requestAppRedirectLinkForm = function () {

		this.transvaultHub.server.getMerchantCredentials(this.browserId, hp.Utils.getSession().sessionToken);
	};

	Transvault.prototype.setupWebockets = function (amount) {

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

			setTimeout(function () {
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
				"transvault": {
					"transvaultRequest": {
						"token": token,
						"amount": amount,
						"transactionId": $this.transactionId,
						"correlationId": $this.correlationId,
						"entryType": hp.EntryType.DEVICE_CAPTURED,
						"terminalId": $this.terminalId,
						"action": hp.Utils.defaults.paymentType,
						"browserId": $this.browserId,
						"documentIndex": hp.Utils.defaults.documentIndex
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
				transport: ['webSockets'],
				waitForPageLoad: true
			};

			$this.transvaultHub.connection.start(socketOptions).done(startHandler).fail(errorHandler);

			$this.transvaultHub.off("error").on("error", function (err) {
				hp.Utils.log("Transvault error: ", err);
				reconnectHandler();
			});

			$this.transvaultHub.off("disconnected").on("disconnected", function (err) {

				hp.Utils.log("Transvault disconnected: ", err);
				hp.Utils.log("Transvault attempting reconnection... ");

				setTimeout(function () {

					$this.transvaultHub.connection.start(socketOptions).done(startHandler).fail(errorHandler);
				}, 2500);
			});
		} catch (error) {
			reconnectHandler("An unknown exception occurred. Reconnecting...");
		}

		$this.$parent.trigger("hp.notify");
	};

	Transvault.prototype.showSuccess = function (delay) {
		hp.Utils.showSuccessPage(delay);
	};

	Transvault.prototype.isCreditCard = function () {
		return false;
	};

	Transvault.prototype.isBankAccount = function () {
		return false;
	};

	Transvault.prototype.isEMoney = function () {
		return false;
	};

	Transvault.prototype.isSuccessPage = function () {
		return false;
	};

	Transvault.prototype.isCode = function () {
		return false;
	};

	Transvault.prototype.isTransvault = function () {
		return true;
	};

	Transvault.prototype.isGiftCard = function () {
		return false;
	};

	Transvault.prototype.isSignature = function () {
		return false;
	};

    /*
     * Export "Transvault"
     */
	hp.Transvault = Transvault;
})(jQuery, window, document);

(function ($, window, document, undefined) {
	var cardFromNumber,
		cardFromType,
		cards,
		defaultFormat,
		formatBackCardNumber,
		formatBackExpiry,
		formatCardNumber,
		formatExpiry,
		formatForwardExpiry,
		formatForwardSlashAndSpace,
		hasTextSelected,
		luhnCheck,
		reFormatCVC,
		reFormatCardNumber,
		reFormatExpiry,
		reFormatNumeric,
		replaceFullWidthChars,
		restrictCVC,
		restrictCardNumber,
		restrictExpiry,
		restrictNumeric,
		safeVal,
		setCardType,
		__slice = [].slice,
		__indexOf = [].indexOf || function (item) {
			for (var i = 0, l = this.length; i < l; i++) {
				if (i in this && this[i] === item) return i;
			} return -1;
		};

	$.payment = {};

	$.payment.fn = {};

	$.fn.payment = function () {
		var args, method;
		method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
		return $.payment.fn[method].apply(this, args);
	};

	defaultFormat = /(\d{1,4})/g;

	$.payment.cards = cards = [{
		type: 'maestro',
		patterns: [5018, 502, 503, 506, 56, 58, 639, 6220, 67],
		format: defaultFormat,
		length: [12, 13, 14, 15, 16, 17, 18, 19],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'forbrugsforeningen',
		patterns: [600],
		format: defaultFormat,
		length: [16],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'dankort',
		patterns: [5019],
		format: defaultFormat,
		length: [16],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'visa',
		patterns: [4],
		format: defaultFormat,
		length: [13, 16],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'mastercard',
		patterns: [51, 52, 53, 54, 55, 22, 23, 24, 25, 26, 27],
		format: defaultFormat,
		length: [16],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'amex',
		patterns: [34, 37],
		format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
		length: [15],
		cvcLength: [3, 4],
		luhn: true
	}, {
		type: 'dinersclub',
		patterns: [30, 36, 38, 39],
		format: /(\d{1,4})(\d{1,6})?(\d{1,4})?/,
		length: [14],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'discover',
		patterns: [60, 64, 65, 622],
		format: defaultFormat,
		length: [16],
		cvcLength: [3],
		luhn: true
	}, {
		type: 'unionpay',
		patterns: [62, 88],
		format: defaultFormat,
		length: [16, 17, 18, 19],
		cvcLength: [3],
		luhn: false
	}, {
		type: 'jcb',
		patterns: [35],
		format: defaultFormat,
		length: [16],
		cvcLength: [3],
		luhn: true
	}];

	cardFromNumber = function cardFromNumber(num) {
		var card, p, pattern, _i, _j, _len, _len1, _ref;
		num = (num + '').replace(/\D/g, '');
		for (_i = 0, _len = cards.length; _i < _len; _i++) {
			card = cards[_i];
			_ref = card.patterns;
			for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
				pattern = _ref[_j];
				p = pattern + '';
				if (num.substr(0, p.length) === p) {
					return card;
				}
			}
		}
	};

	cardFromType = function cardFromType(type) {
		var card, _i, _len;
		for (_i = 0, _len = cards.length; _i < _len; _i++) {
			card = cards[_i];
			if (card.type === type) {
				return card;
			}
		}
	};

	luhnCheck = function luhnCheck(num) {
		var digit, digits, odd, sum, _i, _len;
		odd = true;
		sum = 0;
		digits = (num + '').split('').reverse();
		for (_i = 0, _len = digits.length; _i < _len; _i++) {
			digit = digits[_i];
			digit = parseInt(digit, 10);
			if (odd = !odd) {
				digit *= 2;
			}
			if (digit > 9) {
				digit -= 9;
			}
			sum += digit;
		}
		return sum % 10 === 0;
	};

	hasTextSelected = function hasTextSelected($target) {
		var _ref;
		if ($target.prop('selectionStart') != null && $target.prop('selectionStart') !== $target.prop('selectionEnd')) {
			return true;
		}
		if ((typeof document !== "undefined" && document !== null ? (_ref = document.selection) != null ? _ref.createRange : void 0 : void 0) != null) {
			if (document.selection.createRange().text) {
				return true;
			}
		}
		return false;
	};

	safeVal = function safeVal(value, $target) {
		var currPair, cursor, digit, error, last, prevPair;
		try {
			cursor = $target.prop('selectionStart');
		} catch (_error) {
			error = _error;
			cursor = null;
		}
		last = $target.val();
		$target.val(value);
		if (cursor !== null && $target.is(":focus")) {
			if (cursor === last.length) {
				cursor = value.length;
			}
			if (last !== value) {
				prevPair = last.slice(cursor - 1, +cursor + 1 || 9e9);
				currPair = value.slice(cursor - 1, +cursor + 1 || 9e9);
				digit = value[cursor];
				if (/\d/.test(digit) && prevPair === "" + digit + " " && currPair === " " + digit) {
					cursor = cursor + 1;
				}
			}
			$target.prop('selectionStart', cursor);
			return $target.prop('selectionEnd', cursor);
		}
	};

	replaceFullWidthChars = function replaceFullWidthChars(str) {
		var chars, chr, fullWidth, halfWidth, idx, value, _i, _len;
		if (str == null) {
			str = '';
		}
		fullWidth = '\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19';
		halfWidth = '0123456789';
		value = '';
		chars = str.split('');
		for (_i = 0, _len = chars.length; _i < _len; _i++) {
			chr = chars[_i];
			idx = fullWidth.indexOf(chr);
			if (idx > -1) {
				chr = halfWidth[idx];
			}
			value += chr;
		}
		return value;
	};

	reFormatNumeric = function reFormatNumeric(e) {
		var $target;
		$target = $(e.currentTarget);
		return setTimeout(function () {
			var value;
			value = $target.val();
			value = replaceFullWidthChars(value);
			value = value.replace(/\D/g, '');
			return safeVal(value, $target);
		});
	};

	reFormatCardNumber = function reFormatCardNumber(e) {
		var $target;
		$target = $(e.currentTarget);
		return setTimeout(function () {
			var value;
			value = $target.val();
			value = replaceFullWidthChars(value);
			value = $.payment.formatCardNumber(value);
			return safeVal(value, $target);
		});
	};

	formatCardNumber = function formatCardNumber(e) {
		var $target, card, digit, length, re, upperLength, value;
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		$target = $(e.currentTarget);
		value = $target.val();
		card = cardFromNumber(value + digit);
		length = (value.replace(/\D/g, '') + digit).length;
		upperLength = 16;
		if (card) {
			upperLength = card.length[card.length.length - 1];
		}
		if (length >= upperLength) {
			return;
		}
		if ($target.prop('selectionStart') != null && $target.prop('selectionStart') !== value.length) {
			return;
		}
		if (card && card.type === 'amex') {
			re = /^(\d{4}|\d{4}\s\d{6})$/;
		} else {
			re = /(?:^|\s)(\d{4})$/;
		}
		if (re.test(value)) {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val(value + ' ' + digit);
			});
		} else if (re.test(value + digit)) {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val(value + digit + ' ');
			});
		}
	};

	formatBackCardNumber = function formatBackCardNumber(e) {
		var $target, value;
		$target = $(e.currentTarget);
		value = $target.val();
		if (e.which !== 8) {
			return;
		}
		if ($target.prop('selectionStart') != null && $target.prop('selectionStart') !== value.length) {
			return;
		}
		if (/\d\s$/.test(value)) {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val(value.replace(/\d\s$/, ''));
			});
		} else if (/\s\d?$/.test(value)) {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val(value.replace(/\d$/, ''));
			});
		}
	};

	reFormatExpiry = function reFormatExpiry(e) {
		var $target;
		$target = $(e.currentTarget);
		return setTimeout(function () {
			var value;
			value = $target.val();
			value = replaceFullWidthChars(value);
			value = $.payment.formatExpiry(value);
			return safeVal(value, $target);
		});
	};

	formatExpiry = function formatExpiry(e) {
		var $target, digit, val;
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		$target = $(e.currentTarget);
		val = $target.val() + digit;
		if (/^\d$/.test(val) && val !== '0' && val !== '1') {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val("0" + val + " / ");
			});
		} else if (/^\d\d$/.test(val)) {
			e.preventDefault();
			return setTimeout(function () {
				var m1, m2;
				m1 = parseInt(val[0], 10);
				m2 = parseInt(val[1], 10);
				if (m2 > 2 && m1 !== 0) {
					return $target.val("0" + m1 + " / " + m2);
				} else {
					return $target.val("" + val + " / ");
				}
			});
		}
	};

	formatForwardExpiry = function formatForwardExpiry(e) {
		var $target, digit, val;
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		$target = $(e.currentTarget);
		val = $target.val();
		if (/^\d\d$/.test(val)) {
			return $target.val("" + val + " / ");
		}
	};

	formatForwardSlashAndSpace = function formatForwardSlashAndSpace(e) {
		var $target, val, which;
		which = String.fromCharCode(e.which);
		if (!(which === '/' || which === ' ')) {
			return;
		}
		$target = $(e.currentTarget);
		val = $target.val();
		if (/^\d$/.test(val) && val !== '0') {
			return $target.val("0" + val + " / ");
		}
	};

	formatBackExpiry = function formatBackExpiry(e) {
		var $target, value;
		$target = $(e.currentTarget);
		value = $target.val();
		if (e.which !== 8) {
			return;
		}
		if ($target.prop('selectionStart') != null && $target.prop('selectionStart') !== value.length) {
			return;
		}
		if (/\d\s\/\s$/.test(value)) {
			e.preventDefault();
			return setTimeout(function () {
				return $target.val(value.replace(/\d\s\/\s$/, ''));
			});
		}
	};

	reFormatCVC = function reFormatCVC(e) {
		var $target;
		$target = $(e.currentTarget);
		return setTimeout(function () {
			var value;
			value = $target.val();
			value = replaceFullWidthChars(value);
			value = value.replace(/\D/g, '').slice(0, 4);
			return safeVal(value, $target);
		});
	};

	restrictNumeric = function restrictNumeric(e) {
		var input;
		if (e.metaKey || e.ctrlKey) {
			return true;
		}
		if (e.which === 32) {
			return false;
		}
		if (e.which === 0) {
			return true;
		}
		if (e.which < 33) {
			return true;
		}
		input = String.fromCharCode(e.which);
		return !!/[\d\s]/.test(input);
	};

	restrictCardNumber = function restrictCardNumber(e) {
		var $target, card, digit, value;
		$target = $(e.currentTarget);
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		if (hasTextSelected($target)) {
			return;
		}
		value = ($target.val() + digit).replace(/\D/g, '');
		card = cardFromNumber(value);
		if (card) {
			return value.length <= card.length[card.length.length - 1];
		} else {
			return value.length <= 16;
		}
	};

	restrictExpiry = function restrictExpiry(e) {
		var $target, digit, value;
		$target = $(e.currentTarget);
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		if (hasTextSelected($target)) {
			return;
		}
		value = $target.val() + digit;
		value = value.replace(/\D/g, '');
		if (value.length > 6) {
			return false;
		}
	};

	restrictCVC = function restrictCVC(e) {
		var $target, digit, val;
		$target = $(e.currentTarget);
		digit = String.fromCharCode(e.which);
		if (!/^\d+$/.test(digit)) {
			return;
		}
		if (hasTextSelected($target)) {
			return;
		}
		val = $target.val() + digit;
		return val.length <= 4;
	};

	setCardType = function setCardType(e) {
		var $target, allTypes, card, cardType, val;
		$target = $(e.currentTarget);
		val = $target.val();
		cardType = $.payment.cardType(val) || 'unknown';
		if (!$target.hasClass(cardType)) {
			allTypes = function () {
				var _i, _len, _results;
				_results = [];
				for (_i = 0, _len = cards.length; _i < _len; _i++) {
					card = cards[_i];
					_results.push(card.type);
				}
				return _results;
			}();
			$target.removeClass('unknown');
			$target.removeClass(allTypes.join(' '));
			$target.addClass(cardType);
			$target.toggleClass('identified', cardType !== 'unknown');
			return $target.trigger('payment.cardType', cardType);
		}
	};

	$.payment.fn.formatCardCVC = function () {
		this.on('keypress', restrictNumeric);
		this.on('keypress', restrictCVC);
		this.on('paste', reFormatCVC);
		this.on('change', reFormatCVC);
		this.on('input', reFormatCVC);
		return this;
	};

	$.payment.fn.formatCardExpiry = function () {
		this.on('keypress', restrictNumeric);
		this.on('keypress', restrictExpiry);
		this.on('keypress', formatExpiry);
		this.on('keypress', formatForwardSlashAndSpace);
		this.on('keypress', formatForwardExpiry);
		this.on('keydown', formatBackExpiry);
		this.on('change', reFormatExpiry);
		this.on('input', reFormatExpiry);
		return this;
	};

	$.payment.fn.formatCardNumber = function () {
		this.on('keypress', restrictNumeric);
		this.on('keypress', restrictCardNumber);
		this.on('keypress', formatCardNumber);
		this.on('keydown', formatBackCardNumber);
		this.on('keyup', setCardType);
		this.on('paste', reFormatCardNumber);
		this.on('change', reFormatCardNumber);
		this.on('input', reFormatCardNumber);
		this.on('input', setCardType);
		return this;
	};

	$.payment.fn.restrictNumeric = function () {
		this.on('keypress', restrictNumeric);
		this.on('paste', reFormatNumeric);
		this.on('change', reFormatNumeric);
		this.on('input', reFormatNumeric);
		return this;
	};

	$.payment.fn.cardExpiryVal = function () {
		return $.payment.cardExpiryVal($(this).val());
	};

	$.payment.cardExpiryVal = function (value) {
		var month, prefix, year, _ref;
		_ref = value.split(/[\s\/]+/, 2), month = _ref[0], year = _ref[1];
		if ((year != null ? year.length : void 0) === 2 && /^\d+$/.test(year)) {
			prefix = new Date().getFullYear();
			prefix = prefix.toString().slice(0, 2);
			year = prefix + year;
		}
		month = parseInt(month, 10);
		year = parseInt(year, 10);
		return {
			month: month,
			year: year
		};
	};

	$.payment.validateCardNumber = function (num) {
		var card, _ref;
		num = (num + '').replace(/\s+|-/g, '');
		if (!/^\d+$/.test(num)) {
			return false;
		}
		card = cardFromNumber(num);
		if (!card) {
			return false;
		}
		return (_ref = num.length, __indexOf.call(card.length, _ref) >= 0) && (card.luhn === false || luhnCheck(num));
	};

	$.payment.validateCardExpiry = function (month, year) {
		var currentTime, expiry, _ref;
		if ((typeof month === 'undefined' ? 'undefined' : _typeof(month)) === 'object' && 'month' in month) {
			_ref = month, month = _ref.month, year = _ref.year;
		}
		if (!(month && year)) {
			return false;
		}
		month = $.trim(month);
		year = $.trim(year);
		if (!/^\d+$/.test(month)) {
			return false;
		}
		if (!/^\d+$/.test(year)) {
			return false;
		}
		if (!(1 <= month && month <= 12)) {
			return false;
		}
		if (year.length === 2) {
			if (year < 70) {
				year = "20" + year;
			} else {
				year = "19" + year;
			}
		}
		if (year.length !== 4) {
			return false;
		}
		expiry = new Date(year, month);
		currentTime = new Date();
		expiry.setMonth(expiry.getMonth() - 1);
		expiry.setMonth(expiry.getMonth() + 1, 1);
		return expiry > currentTime;
	};

	$.payment.validateCardCVC = function (cvc, type) {
		var card, _ref;
		cvc = $.trim(cvc);
		if (!/^\d+$/.test(cvc)) {
			return false;
		}
		card = cardFromType(type);
		if (card != null) {
			return _ref = cvc.length, __indexOf.call(card.cvcLength, _ref) >= 0;
		} else {
			return cvc.length >= 3 && cvc.length <= 4;
		}
	};

	$.payment.cardType = function (num) {
		var _ref;
		if (!num) {
			return null;
		}
		return ((_ref = cardFromNumber(num)) != null ? _ref.type : void 0) || null;
	};

	$.payment.formatCardNumber = function (num) {
		var card, groups, upperLength, _ref;
		num = num.replace(/\D/g, '');
		card = cardFromNumber(num);
		if (!card) {
			return num;
		}
		upperLength = card.length[card.length.length - 1];
		num = num.slice(0, upperLength);
		if (card.format.global) {
			return (_ref = num.match(card.format)) != null ? _ref.join(' ') : void 0;
		} else {
			groups = card.format.exec(num);
			if (groups == null) {
				return;
			}
			groups.shift();
			groups = $.grep(groups, function (n) {
				return n;
			});
			return groups.join(' ');
		}
	};

	$.payment.formatExpiry = function (expiry) {
		var mon, parts, sep, year;
		parts = expiry.match(/^\D*(\d{1,2})(\D+)?(\d{1,4})?/);
		if (!parts) {
			return '';
		}
		mon = parts[1] || '';
		sep = parts[2] || '';
		year = parts[3] || '';
		if (year.length > 0) {
			sep = ' / ';
		} else if (sep === ' /') {
			mon = mon.substring(0, 1);
			sep = '';
		} else if (mon.length === 2 || sep.length > 0) {
			sep = ' / ';
		} else if (mon.length === 1 && mon !== '0' && mon !== '1') {
			mon = "0" + mon;
			sep = ' / ';
		}
		return mon + sep + year;
	};
})(jQuery, window, document);

(function ($, window, document, undefined) {

	var defaults = {};

	$.fn.pos = function (options) {

		//define instance for use in child functions

		var $this = $(this),
			cardNumberRegex = new RegExp(/^(?:%B|\;)([0-9]+)/ig),
			nameOnCardRegex = new RegExp(/(?:\^(.*)\^)/ig),
			expirationDateRegex = new RegExp(/(?:\^(?:.*)\^|=)(\d{4})/ig),
			trackRegex = new RegExp(/\|([A-Z0-9]+)(?=\|)/ig),
			unencryptedTrackRegex = new RegExp(/^(.*?\?)(;.*)/ig),
			hasTrack = false;

		var data = {
			swipe: ''
		};

		//set default options
		defaults = {
			swipe: true,
			onEventName: "hp.global_swipped_start",
			offEventName: "hp.global_swipped_end",
			onScanSwipe: $.noop
		};

		// helper
		var hasValue = function hasValue(match, index) {
			var result = false;

			try {
				result = typeof match[index] !== "undefined";
			} catch (err) { }

			return result;
		};

		//extend options
		$this.options = $.extend(true, {}, defaults, options);

		$this.off("keypress").on("keypress", function (event) {

			if ($this.options.swipe) {

				if (event.which != 13) {

					data.swipe += String.fromCharCode(event.which);

					if (data.swipe.length == 2 && data.swipe == "%B") {
						$this.trigger($this.options.onEventName);
					}

					return;
				}

				var result = {
					track_one: "",
					track_two: "",
					track_three: "",
					ksn: "",
					card_number: "",
					name_on_card: "",
					card_exp_date_month: "",
					card_exp_date_year: "",
					is_valid: true,
					is_emoney: false,
					current_year: new Date().getFullYear().toString().substring(0, 2)
				};

				var parsedCardNumberResult = cardNumberRegex.exec(data.swipe),
					parsedNameOnCardResult = nameOnCardRegex.exec(data.swipe),
					parsedExpirationDateResult = expirationDateRegex.exec(data.swipe),
					parsedTrackResult = data.swipe.match(trackRegex),
					parsedUnencryptedResult = unencryptedTrackRegex.exec(data.swipe);

				// Assign card number result:
				if (parsedCardNumberResult != null && parsedCardNumberResult.length) {
					result.card_number = parsedCardNumberResult[1];
				}

				// Assign name on card result:
				if (parsedNameOnCardResult != null && parsedNameOnCardResult.length) {

					var name = parsedNameOnCardResult[1];

					if (name.indexOf(",") === -1) {
						name = name.replace(/\/+|\d+/gi, " ");
					} else {
						name = $.trim(name.replace(/\//gi, " ").replace(/\W+/gi, " "));
					}

					if (name.split(" ").length > 2) {
						name = name.split(" ")[1] + " " + name.split(" ")[2] + " " + name.split(" ")[0];
					} else {
						name = name.split(" ")[1] + " " + name.split(" ")[0];
					}

					result.name_on_card = name;
				}

				// Assign expiration date result:
				if (parsedExpirationDateResult != null && parsedExpirationDateResult.length) {

					var date = parsedExpirationDateResult[1],
						year = date.substring(0, 2),
						month = date.substring(2);

					// current century : new Date().getFullYear().toString().substring(0, 2)

					result.card_exp_date_year = year;
					result.card_exp_date_month = month;
				}

				// Clean matches
				if (parsedTrackResult != null && parsedTrackResult.length) {

					parsedTrackResult = parsedTrackResult.map(function (match) {
						return match.replace("|", "");
					});

					// Assign track one result:
					if (hasValue(parsedTrackResult, 1)) {
						result.track_one = parsedTrackResult[1];
					}

					// Assign track two result:
					if (hasValue(parsedTrackResult, 2)) {
						result.track_two = parsedTrackResult[2];
					}

					// Assign track three result:
					if (parsedTrackResult.length >= 10 && hasValue(parsedTrackResult, 3)) {
						result.track_three = parsedTrackResult[3];
					}

					// Assign ksn result:
					if (parsedTrackResult.length >= 10 && hasValue(parsedTrackResult, 8)) {
						result.ksn = parsedTrackResult[8];
					} else if (parsedTrackResult.length === 9) {
						result.ksn = parsedTrackResult[7];
					}
				} else if (parsedUnencryptedResult != null && parsedUnencryptedResult.length >= 3) {

					result.track_one = parsedUnencryptedResult[1];
					result.track_two = parsedUnencryptedResult[2];
				} else {
					result.is_valid = false;
				}

				if (event.which == 13) {

					// Handles Gift Card Scan
					if (!result.is_valid && result.card_number.indexOf("627571") !== -1) {
						result.is_valid = true;
						result.is_emoney = true;
						result.name_on_card = "EMoney Card";
						result.card_exp_date_year = (+new Date().getFullYear().toString().substring(2) + 9).toString();
						result.card_exp_date_month = "12";
					}

					if (data.swipe.indexOf("%E?") !== -1 || data.swipe.indexOf("+E?") !== -1 || data.swipe.indexOf(";E?") !== -1) {
						result.is_valid = false;
					}

					if (result.name_on_card === "") {
						result.name_on_card = "Unknown Card";
					}

					result.name_on_card = $.trim(result.name_on_card.replace("undefined", ""));

					$this.trigger($this.options.offEventName, result);
					$this.options.onScanSwipe(result);

					data.swipe = '';
				}
			}
		});
	};
})(jQuery, window, document);

/*
 *  jQuery Hosted Payments - v3.9.9
 *
 *  Made by Erik Zettersten
 *  Under MIT License
 */
(function ($, window, document, undefined) {

	var pluginName = "hp",
		defaults = {};

	defaults.version = "v3.9.9";
	defaults.amount = 0;
	defaults.baseUrl = "https://htv.emoney.com/v3/adapters";
	defaults.defaultCardCharacters = "&middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot;";
	defaults.defaultDateCharacters = "&middot;&middot;";
	defaults.defaultNameOnCardName = "Name On Card";
	defaults.defaultNameOnCardNameSwipe = "Swipe/Scan Card";
	defaults.defaultName = "Full Name";
	defaults.defaultPhone = "800-834-7790";
	defaults.defaultErrorLabel = "Error";
	defaults.defaultRedirectLabel = "";
	defaults.defaultSuccessLabel = "Transaction Complete!";
	defaults.paymentTypeOrder = [0, 1];
	defaults.paymentService = hp.PaymentService.EFT; // EFT, EMONEY, TEST
	defaults.defaultAccountNumberCharacters = "&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;";
	defaults.defaultRoutingNumberCharacters = "&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;";
	defaults.correlationId = "";
	defaults.successCallback = $.noop;
	defaults.errorCallback = $.noop;
	defaults.eventCallback = $.noop;
	defaults.terminalId = "";
	defaults.transactionId = "";
	defaults.apiKey = "";
	defaults.paymentType = hp.PaymentType.CHARGE; // "CHARGE", "REFUND", "CREATE_INSTRUMENT"
	defaults.entryType = hp.EntryType.KEYED_CARD_NOT_PRESENT; // "DEVICE_CAPTURED", "KEYED_CARD_PRESENT", "KEYED_CARD_NOT_PRESENT"
	defaults.billingAddress = {};
	defaults.billingAddress.addressLine1 = "";
	defaults.billingAddress.postalCode = "";
	defaults.antiForgeryToken = "";
	defaults.antiForgeryName = "__RequestVerificationToken";
	defaults.customerName = "";
	defaults.promptForAvs = false;
	defaults.allowAvsSkip = true;
	defaults.allowHttpsSkip = false;
	defaults.debug = false;
	defaults.showAmex = true;
	defaults.showVisa = true;
	defaults.showDiscover = true;
	defaults.showDiners = true;
	defaults.showJcb = true;
	defaults.showGift = true;
	defaults.showEMoney = true;
	defaults.showMasterCard = true;
	defaults.emoneyMobileAppUrl = "emmerchant://{{paymentType}}/{{merchantCredentials}}?transactionId={{transactionId}}&token={{token}}&browserId={{browserId}}&correlationId={{correlationId}}&amount={{amount}}&url={{url}}&entryType={{entryType}}";
	defaults.shouldVoidOnCancel = false;
	defaults.saveCustomer = false;
	defaults.documentIndex = 1;
	defaults.customerToken = null;
	defaults.instrumentId = null;
	defaults.swapAchInputs = false;
	defaults.convenienceFee = 0;
	defaults.surchargeFee = 0;
	defaults.disableAutocomplete = false;

	function Plugin(element, options) {

		this._name = pluginName;
		this.element = element;

		if (typeof options === "undefined") {
			options = {};
		}

		if (typeof options.entryType !== "undefined") {
			options.entryType = hp.Utils.setEntryType(options.entryType);
		}

		if (typeof options.paymentType !== "undefined") {
			options.paymentType = hp.Utils.setPaymentType(options.paymentType);
		}

		if (typeof options.paymentService !== "undefined") {
			options.paymentService = hp.Utils.setPaymentService(options.paymentService);
		}

		if (typeof options.amount !== "undefined") {
			options.amount = hp.Utils.setAmount(options.amount);
		}

		if (typeof options.saveCustomer !== "undefined") {
			if (options.saveCustomer.toString() === "false") {
				options.saveCustomer = false;
			} else if (options.saveCustomer.toString() === "true") {
				options.saveCustomer = true;
			}
		}

		if (typeof options.disableAutocomplete !== "undefined") {
			if (options.disableAutocomplete.toString() === "false") {
				options.disableAutocomplete = false;
			} else if (options.disableAutocomplete.toString() === "true") {
				options.disableAutocomplete = true;
			}
		}

		if (typeof options.transactionId === "undefined" || options.transactionId === "") {
			options.transactionId = hp.Utils.generateGUID();
		}

		hp.Utils.defaults = jQuery.extend({}, defaults, options);

		this.init();
		hp.Utils.__instance = this;
	}

    /*
     * Main
     */
	var intialize = function intialize() {

		var that = this,
			$element = $(that.element),
			sessionId = "",
			apiKey = "",
			createdOn = new Date().toISOString();

		if (hp.Utils.getSession().apiKey === "") {

			if (typeof $element.data("etsKey") !== "undefined") {
				apiKey = $element.data("etsKey").toString();
				hp.Utils.defaults.apiKey = apiKey;
			} else {
				apiKey = hp.Utils.defaults.apiKey;
			}

			hp.Utils.setSession(apiKey, true);
		}

		if (typeof $element.data("debug") !== "undefined") {
			if ($element.data("debug").toString() === "false") {
				hp.Utils.defaults.debug = false;
			} else {
				hp.Utils.defaults.debug = true;
			}
		}

		if (typeof $element.data("showAmex") !== "undefined") {
			if ($element.data("showAmex").toString() === "false") {
				hp.Utils.defaults.showAmex = false;
			} else if ($element.data("showAmex").toString() === "true") {
				hp.Utils.defaults.showAmex = true;
			}
		}

		if (typeof $element.data("showVisa") !== "undefined") {
			if ($element.data("showVisa").toString() === "false") {
				hp.Utils.defaults.showVisa = false;
			} else if ($element.data("showVisa").toString() === "true") {
				hp.Utils.defaults.showVisa = true;
			}
		}

		if (typeof $element.data("showDiscover") !== "undefined") {
			if ($element.data("showDiscover").toString() === "false") {
				hp.Utils.defaults.showDiscover = false;
			} else if ($element.data("showDiscover").toString() === "true") {
				hp.Utils.defaults.showDiscover = true;
			}
		}

		if (typeof $element.data("showDiners") !== "undefined") {
			if ($element.data("showDiners").toString() === "false") {
				hp.Utils.defaults.showDiners = false;
			} else if ($element.data("showDiners").toString() === "true") {
				hp.Utils.defaults.showDiners = true;
			}
		}

		if (typeof $element.data("showJcb") !== "undefined") {
			if ($element.data("showJcb").toString() === "false") {
				hp.Utils.defaults.showJcb = false;
			} else if ($element.data("showJcb").toString() === "true") {
				hp.Utils.defaults.showJcb = true;
			}
		}

		if (typeof $element.data("saveCustomer") !== "undefined") {
			if ($element.data("saveCustomer").toString() === "false") {
				hp.Utils.defaults.saveCustomer = false;
			} else if ($element.data("saveCustomer").toString() === "true") {
				hp.Utils.defaults.saveCustomer = true;
			}
		}

		if (typeof $element.data("disableAutocomplete") !== "undefined") {
			if ($element.data("disableAutocomplete").toString() === "false") {
				hp.Utils.defaults.disableAutocomplete = false;
			} else if ($element.data("disableAutocomplete").toString() === "true") {
				hp.Utils.defaults.disableAutocomplete = true;
			}
		}

		if (typeof $element.data("documentIndex") !== "undefined") {
			if ($element.data("documentIndex").toString() === "") {
				hp.Utils.defaults.documentIndex = 1;
			}
		}

		if (typeof $element.data("customerToken") !== "undefined") {
			hp.Utils.defaults.customerToken = $element.data("customerToken").toString();
		}

		if (typeof $element.data("showMasterCard") !== "undefined") {
			if ($element.data("showMasterCard").toString() === "false") {
				hp.Utils.defaults.showMasterCard = false;
			} else if ($element.data("showMasterCard").toString() === "true") {
				hp.Utils.defaults.showMasterCard = true;
			}
		}

		if (typeof $element.data("showEMoney") !== "undefined") {
			if ($element.data("showEMoney").toString() === "false") {
				hp.Utils.defaults.showEMoney = false;
			} else if ($element.data("showEMoney").toString() === "true") {
				hp.Utils.defaults.showEMoney = true;
			}
		}

		if (typeof $element.data("showGift") !== "undefined") {
			if ($element.data("showGift").toString() === "false") {
				hp.Utils.defaults.showGift = false;
			} else if ($element.data("showGift").toString() === "true") {
				hp.Utils.defaults.showGift = true;
			}
		}

		if (typeof $element.data("swapAchInputs") !== "undefined") {
			if ($element.data("swapAchInputs").toString() === "false") {
				hp.Utils.defaults.swapAchInputs = false;
			} else if ($element.data("swapAchInputs").toString() === "true") {
				hp.Utils.defaults.swapAchInputs = true;
			}
		}

		if (typeof $element.data("transactionId") !== "undefined") {
			hp.Utils.defaults.transactionId = $element.data("transactionId").toString();
		}

		if (typeof $element.data("appUrlScheme") !== "undefined") {
			hp.Utils.defaults.appUrlScheme = $element.data("appUrlScheme").toString();
		}

		if (typeof $element.data("avsStreet") !== "undefined") {
			hp.Utils.defaults.billingAddress.addressLine1 = $element.data("avsStreet").toString();
		}

		if (typeof $element.data("avsZip") !== "undefined") {
			hp.Utils.defaults.billingAddress.postalCode = $element.data("avsZip").toString();
		}

		if (typeof $element.data("paymentService") !== "undefined") {
			hp.Utils.defaults.paymentService = hp.Utils.setPaymentService($element.data("paymentService"));
		}

		if (typeof $element.data("entryType") !== "undefined") {
			hp.Utils.defaults.entryType = hp.Utils.setEntryType($element.data("entryType"));
		}

		if (typeof $element.data("paymentType") !== "undefined") {
			hp.Utils.defaults.paymentType = hp.Utils.setPaymentType($element.data("paymentType"));
		}

		if (typeof $element.data("promptForAvs") !== "undefined") {
			hp.Utils.defaults.promptForAvs = $element.data("promptForAvs").toString().toLowerCase() == "false" ? false : true;
		}

		if (typeof $element.data("allowAvsSkip") !== "undefined") {
			hp.Utils.defaults.allowAvsSkip = $element.data("allowAvsSkip").toString().toLowerCase() == "false" ? false : true;
		}

		if (typeof $element.data("allowHttpsSkip") !== "undefined") {
			hp.Utils.defaults.allowHttpsSkip = $element.data("allowHttpsSkip").toString().toLowerCase() == "false" ? false : true;
		}

		if (typeof $element.data("correlationId") !== "undefined") {
			hp.Utils.defaults.correlationId = $element.data("correlationId").toString();
		}

		if (typeof $element.data("terminalId") !== "undefined") {
			hp.Utils.defaults.terminalId = $element.data("terminalId").toString();
		}

		if (typeof $element.data("instrumentId") !== "undefined") {
			hp.Utils.defaults.instrumentId = $element.data("instrumentId").toString();
		}

		if (typeof $element.data("baseUrl") !== "undefined") {
			hp.Utils.defaults.baseUrl = $element.data("baseUrl").toString();
		}

		if (typeof $element.data("customerName") !== "undefined") {
			hp.Utils.defaults.customerName = $element.data("customerName").toString();
		}

		if (typeof $element.data("defaultPhone") !== "undefined") {
			hp.Utils.defaults.defaultPhone = $element.data("defaultPhone").toString();
		}

		if (typeof $element.data("errorLabel") !== "undefined") {
			hp.Utils.defaults.defaultErrorLabel = $element.data("errorLabel").toString();
		}

		if (typeof $element.data("redirectLabel") !== "undefined") {
			hp.Utils.defaults.defaultRedirectLabel = $element.data("redirectLabel").toString();
		}

		if (typeof $element.data("successLabel") !== "undefined") {
			hp.Utils.defaults.defaultSuccessLabel = $element.data("successLabel").toString();
		}

		if (typeof $element.data("paymentTypeOrder") !== "undefined") {
			hp.Utils.defaults.paymentTypeOrder = $.trim($element.data("paymentTypeOrder").toString().replace(" ", "")).split(",").map(function (item) {
				return +item;
			});
		}

		if (typeof $element.data("amount") !== "undefined") {
			hp.Utils.setAmount($element.data("amount"));
		}

		if (typeof $element.data("convenienceFee") !== "undefined") {
			hp.Utils.defaults.convenienceFee = +$element.data("convenienceFee");
		}

		if (typeof $element.data("surchargeFee") !== "undefined") {
			hp.Utils.defaults.surchargeFee = +$element.data("surchargeFee");
		}

		if (typeof $element.data("antiForgeryToken") !== "undefined") {
			hp.Utils.defaults.antiForgeryToken = $element.data("antiForgeryToken").toString();
		} else {
			hp.Utils.defaults.antiForgeryToken = hp.Utils.generateGUID();
		}

		if (typeof $element.data("antiForgeryName") !== "undefined") {
			hp.Utils.defaults.antiForgeryName = $element.data("antiForgeryName").toString();
		}

		$element.attr("data-ets-key", hp.Utils.generateGUID());

		hp.Utils.setPaymentInstrument();

		hp.Utils.signIn().then(function () {
			hp.Utils.setupPluginInstances($element);
		});
	};

	$.extend(Plugin.prototype, {

		init: function init() {

			var $element = $(this.element);

			// Get outer wrapper width and set css class for mobile purposes
			hp.Utils.setContainerClass($element);
			intialize.call(this);
		}
	});

	$.fn[pluginName] = function (options) {
		this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin(this, options));
			}
		});
		return this;
	};
})(jQuery, window, document);