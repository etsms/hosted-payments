/*!
 * Copyright (c) 2016 ETS Corporation
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
// Closure
(function(){

	/**
	 * Decimal adjustment of a number.
	 *
	 * @param	{String}	type	The type of adjustment.
	 * @param	{Number}	value	The number.
	 * @param	{Integer}	exp		The exponent (the 10 logarithm of the adjustment base).
	 * @returns	{Number}			The adjusted value.
	 */
	function decimalAdjust(type, value, exp) {
		// If the exp is undefined or zero...
		if (typeof exp === 'undefined' || +exp === 0) {
			return Math[type](value);
		}
		value = +value;
		exp = +exp;
		// If the value is not a number or the exp is not an integer...
		if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
			return NaN;
		}
		// Shift
		value = value.toString().split('e');
		value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
		// Shift back
		value = value.toString().split('e');
		return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
	}

	// Decimal round
	if (!Math.round10) {
		Math.round10 = function(value, exp) {
			return decimalAdjust('round', value, exp);
		};
	}
	// Decimal floor
	if (!Math.floor10) {
		Math.floor10 = function(value, exp) {
			return decimalAdjust('floor', value, exp);
		};
	}
	// Decimal ceil
	if (!Math.ceil10) {
		Math.ceil10 = function(value, exp) {
			return decimalAdjust('ceil', value, exp);
		};
	}

})();
/* jquery.signalR.core.js */
/*global window:false */
/*!
 * ASP.NET SignalR JavaScript Library v2.2.0
 * http://signalr.net/
 *
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *
 */

/// <reference path="Scripts/jquery-1.6.4.js" />
/// <reference path="jquery.signalR.version.js" />
(function ($, window, undefined) {

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

    if (typeof ($) !== "function") {
        // no jQuery!
        throw new Error(resources.nojQuery);
    }

    var signalR,
        _connection,
        _pageLoaded = (window.document.readyState === "complete"),
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
        log = function (msg, logging) {
            if (logging === false) {
                return;
            }
            var m;
            if (typeof (window.console) === "undefined") {
                return;
            }
            m = "[" + new Date().toTimeString() + "] SignalR: " + msg;
            if (window.console.debug) {
                window.console.debug(m);
            } else if (window.console.log) {
                window.console.log(m);
            }
        },

        changeState = function (connection, expectedState, newState) {
            if (expectedState === connection.state) {
                connection.state = newState;

                $(connection).triggerHandler(events.onStateChanged, [{ oldState: expectedState, newState: newState }]);
                return true;
            }

            return false;
        },

        isDisconnecting = function (connection) {
            return connection.state === signalR.connectionState.disconnected;
        },

        supportsKeepAlive = function (connection) {
            return connection._.keepAliveData.activated &&
                   connection.transport.supportsKeepAlive(connection);
        },

        configureStopReconnectingTimeout = function (connection) {
            var stopReconnectingTimeout,
                onReconnectTimeout;

            // Check if this connection has already been configured to stop reconnecting after a specified timeout.
            // Without this check if a connection is stopped then started events will be bound multiple times.
            if (!connection._.configuredStopReconnectingTimeout) {
                onReconnectTimeout = function (connection) {
                    var message = signalR._.format(signalR.resources.reconnectTimeout, connection.disconnectTimeout);
                    connection.log(message);
                    $(connection).triggerHandler(events.onError, [signalR._.error(message, /* source */ "TimeoutException")]);
                    connection.stop(/* async */ false, /* notifyServer */ false);
                };

                connection.reconnecting(function () {
                    var connection = this;

                    // Guard against state changing in a previous user defined even handler
                    if (connection.state === signalR.connectionState.reconnecting) {
                        stopReconnectingTimeout = window.setTimeout(function () { onReconnectTimeout(connection); }, connection.disconnectTimeout);
                    }
                });

                connection.stateChanged(function (data) {
                    if (data.oldState === signalR.connectionState.reconnecting) {
                        // Clear the pending reconnect timeout check
                        window.clearTimeout(stopReconnectingTimeout);
                    }
                });

                connection._.configuredStopReconnectingTimeout = true;
            }
        };

    signalR = function (url, qs, logging) {
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

        return new signalR.fn.init(url, qs, logging);
    };

    signalR._ = {
        defaultContentType: "application/x-www-form-urlencoded; charset=UTF-8",

        ieVersion: (function () {
            var version,
                matches;

            if (window.navigator.appName === 'Microsoft Internet Explorer') {
                // Check if the user agent has the pattern "MSIE (one or more numbers).(one or more numbers)";
                matches = /MSIE ([0-9]+\.[0-9]+)/.exec(window.navigator.userAgent);

                if (matches) {
                    version = window.parseFloat(matches[1]);
                }
            }

            // undefined value means not IE
            return version;
        })(),

        error: function (message, source, context) {
            var e = new Error(message);
            e.source = source;

            if (typeof context !== "undefined") {
                e.context = context;
            }

            return e;
        },

        transportError: function (message, transport, source, context) {
            var e = this.error(message, source, context);
            e.transport = transport ? transport.name : undefined;
            return e;
        },

        format: function () {
            /// <summary>Usage: format("Hi {0}, you are {1}!", "Foo", 100) </summary>
            var s = arguments[0];
            for (var i = 0; i < arguments.length - 1; i++) {
                s = s.replace("{" + i + "}", arguments[i + 1]);
            }
            return s;
        },

        firefoxMajorVersion: function (userAgent) {
            // Firefox user agents: http://useragentstring.com/pages/Firefox/
            var matches = userAgent.match(/Firefox\/(\d+)/);
            if (!matches || !matches.length || matches.length < 2) {
                return 0;
            }
            return parseInt(matches[1], 10 /* radix */);
        },

        configurePingInterval: function (connection) {
            var config = connection._.config,
                onFail = function (error) {
                    $(connection).triggerHandler(events.onError, [error]);
                };

            if (config && !connection._.pingIntervalId && config.pingInterval) {
                connection._.pingIntervalId = window.setInterval(function () {
                    signalR.transports._logic.pingServer(connection).fail(onFail);
                }, config.pingInterval);
            }
        }
    };

    signalR.events = events;

    signalR.resources = resources;

    signalR.ajaxDefaults = ajaxDefaults;

    signalR.changeState = changeState;

    signalR.isDisconnecting = isDisconnecting;

    signalR.connectionState = {
        connecting: 0,
        connected: 1,
        reconnecting: 2,
        disconnected: 4
    };

    signalR.hub = {
        start: function () {
            // This will get replaced with the real hub connection start method when hubs is referenced correctly
            throw new Error("SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/js'></script>.");
        }
    };

    _pageWindow.load(function () { _pageLoaded = true; });

    function validateTransport(requestedTransport, connection) {
        /// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
        /// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
        /// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
        /// <returns type="Object" />

        if ($.isArray(requestedTransport)) {
            // Go through transport array and remove an "invalid" tranports
            for (var i = requestedTransport.length - 1; i >= 0; i--) {
                var transport = requestedTransport[i];
                if ($.type(transport) !== "string" || !signalR.transports[transport]) {
                    connection.log("Invalid transport: " + transport + ", removing it from the transports list.");
                    requestedTransport.splice(i, 1);
                }
            }

            // Verify we still have transports left, if we dont then we have invalid transports
            if (requestedTransport.length === 0) {
                connection.log("No transports remain within the specified transport array.");
                requestedTransport = null;
            }
        } else if (!signalR.transports[requestedTransport] && requestedTransport !== "auto") {
            connection.log("Invalid transport: " + requestedTransport.toString() + ".");
            requestedTransport = null;
        } else if (requestedTransport === "auto" && signalR._.ieVersion <= 8) {
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

    signalR.fn = signalR.prototype = {
        init: function (url, qs, logging) {
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
            if (typeof (logging) === "boolean") {
                this.logging = logging;
            }
        },

        _parseResponse: function (response) {
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

        isCrossDomain: function (url, against) {
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

        state: signalR.connectionState.disconnected,

        clientProtocol: "1.5",

        reconnectDelay: 2000,

        transportConnectTimeout: 0,

        disconnectTimeout: 30000, // This should be set by the server in response to the negotiate request (30s default)

        reconnectWindow: 30000, // This should be set by the server in response to the negotiate request 

        keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

        start: function (options, callback) {
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
                initialize,
                deferred = connection._deferral || $.Deferred(), // Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it
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
            if (connection.state === signalR.connectionState.connecting) {
                return deferred.promise();
            } else if (changeState(connection,
                            signalR.connectionState.disconnected,
                            signalR.connectionState.connecting) === false) {
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

                if (typeof (config.withCredentials) === "undefined") {
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

                connection.contentType = signalR._.defaultContentType;
            }

            connection.withCredentials = config.withCredentials;

            connection.ajaxDataType = config.jsonp ? "jsonp" : "text";

            $(connection).bind(events.onStart, function (e, data) {
                if ($.type(callback) === "function") {
                    callback.call(connection);
                }
                deferred.resolve(connection);
            });

            connection._.initHandler = signalR.transports._logic.initHandler(connection);

            initialize = function (transports, index) {
                var noTransportError = signalR._.error(resources.noTransportOnInit);

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
                if (connection.state === signalR.connectionState.disconnected) {
                    return;
                }

                var transportName = transports[index],
                    transport = signalR.transports[transportName],
                    onFallback = function () {
                        initialize(transports, index + 1);
                    };

                connection.transport = transport;

                try {
                    connection._.initHandler.start(transport, function () { // success
                        // Firefox 11+ doesn't allow sync XHR withCredentials: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#withCredentials
                        var isFirefox11OrGreater = signalR._.firefoxMajorVersion(window.navigator.userAgent) >= 11,
                            asyncAbort = !!connection.withCredentials && isFirefox11OrGreater;

                        connection.log("The start request succeeded. Transitioning to the connected state.");

                        if (supportsKeepAlive(connection)) {
                            signalR.transports._logic.monitorKeepAlive(connection);
                        }

                        signalR.transports._logic.startHeartbeat(connection);

                        // Used to ensure low activity clients maintain their authentication.
                        // Must be configured once a transport has been decided to perform valid ping requests.
                        signalR._.configurePingInterval(connection);

                        if (!changeState(connection,
                                            signalR.connectionState.connecting,
                                            signalR.connectionState.connected)) {
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
                }
                catch (error) {
                    connection.log(transport.name + " transport threw '" + error.message + "' when attempting to start.");
                    onFallback();
                }
            };

            var url = connection.url + "/negotiate",
                onFailed = function (error, connection) {
                    var err = signalR._.error(resources.errorOnNegotiate, error, connection._.negotiateRequest);

                    $(connection).triggerHandler(events.onError, err);
                    deferred.reject(err);
                    // Stop the connection if negotiate failed
                    connection.stop();
                };

            $(connection).triggerHandler(events.onStarting);

            url = signalR.transports._logic.prepareQueryString(connection, url);

            connection.log("Negotiating with '" + url + "'.");

            // Save the ajax negotiate request object so we can abort it if stop is called while the request is in flight.
            connection._.negotiateRequest = signalR.transports._logic.ajax(connection, {
                url: url,
                error: function (error, statusText) {
                    // We don't want to cause any errors if we're aborting our own negotiate request.
                    if (statusText !== _negotiateAbortText) {
                        onFailed(error, connection);
                    } else {
                        // This rejection will noop if the deferred has already been resolved or rejected.
                        deferred.reject(signalR._.error(resources.stoppedWhileNegotiating, null /* error */, connection._.negotiateRequest));
                    }
                },
                success: function (result) {
                    var res,
                        keepAliveData,
                        protocolError,
                        transports = [],
                        supportedTransports = [];

                    try {
                        res = connection._parseResponse(result);
                    } catch (error) {
                        onFailed(signalR._.error(resources.errorParsingNegotiateResponse, error), connection);
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
                        protocolError = signalR._.error(signalR._.format(resources.protocolIncompatible, connection.clientProtocol, res.ProtocolVersion));
                        $(connection).triggerHandler(events.onError, [protocolError]);
                        deferred.reject(protocolError);

                        return;
                    }

                    $.each(signalR.transports, function (key) {
                        if ((key.indexOf("_") === 0) || (key === "webSockets" && !res.TryWebSockets)) {
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

                    initialize(transports);
                }
            });

            return deferred.promise();
        },

        starting: function (callback) {
            /// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute before the connection is fully instantiated.</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStarting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        send: function (data) {
            /// <summary>Sends data over the connection</summary>
            /// <param name="data" type="String">The data to send over the connection</param>
            /// <returns type="signalR" />
            var connection = this;

            if (connection.state === signalR.connectionState.disconnected) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection must be started before data can be sent. Call .start() before .send()");
            }

            if (connection.state === signalR.connectionState.connecting) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started.");
            }

            connection.transport.send(connection, data);
            // REVIEW: Should we return deferred here?
            return connection;
        },

        received: function (callback) {
            /// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReceived, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        stateChanged: function (callback) {
            /// <summary>Adds a callback that will be invoked when the connection state changes</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStateChanged, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        error: function (callback) {
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

        disconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client disconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onDisconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        connectionSlow: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onConnectionSlow, function (e, data) {
                callback.call(connection);
            });

            return connection;
        },

        reconnecting: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnecting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        reconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        stop: function (async, notifyServer) {
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
                    deferral.reject(signalR._.error(resources.stoppedWhileLoading));
                }

                // Short-circuit because the start has not been fully started.
                return;
            }

            if (connection.state === signalR.connectionState.disconnected) {
                return;
            }

            connection.log("Stopping connection.");

            changeState(connection, connection.state, signalR.connectionState.disconnected);

            // Clear this no matter what
            window.clearTimeout(connection._.beatHandle);
            window.clearInterval(connection._.pingIntervalId);

            if (connection.transport) {
                connection.transport.stop(connection);

                if (notifyServer !== false) {
                    connection.transport.abort(connection, async);
                }

                if (supportsKeepAlive(connection)) {
                    signalR.transports._logic.stopMonitoringKeepAlive(connection);
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

            // Trigger the disconnect event
            $(connection).triggerHandler(events.onDisconnect);

            delete connection._deferral;
            delete connection.messageId;
            delete connection.groupsToken;
            delete connection.id;
            delete connection._.pingIntervalId;
            delete connection._.lastMessageAt;
            delete connection._.lastActiveAt;

            // Clear out our message buffer
            connection._.connectingMessageBuffer.clear();

            return connection;
        },

        log: function (msg) {
            log(msg, this.logging);
        }
    };

    signalR.fn.init.prototype = signalR.fn;

    signalR.noConflict = function () {
        /// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
        /// <returns type="signalR" />
        if ($.connection === signalR) {
            $.connection = _connection;
        }
        return signalR;
    };

    if ($.connection) {
        _connection = $.connection;
    }

    $.connection = $.signalR = signalR;

}(window.jQuery, window));
/* jquery.signalR.transports.common.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, window, undefined) {

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
        start: function (transport, onSuccess, onFallback) {
            var that = this,
                connection = that.connection,
                failCalled = false;

            if (that.startRequested || that.connectionStopped) {
                connection.log("WARNING! " + transport.name + " transport cannot be started. Initialization ongoing or completed.");
                return;
            }

            connection.log(transport.name + " transport starting.");

            that.transportTimeoutHandle = window.setTimeout(function () {
                if (!failCalled) {
                    failCalled = true;
                    connection.log(transport.name + " transport timed out when trying to connect.");
                    that.transportFailed(transport, undefined, onFallback);
                }
            }, connection._.totalTransportConnectTimeout);

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
        },

        stop: function () {
            this.connectionStopped = true;
            window.clearTimeout(this.transportTimeoutHandle);
            signalR.transports._logic.tryAbortStartRequest(this.connection);
        },

        initReceived: function (transport, onSuccess) {
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

        transportFailed: function (transport, error, onFallback) {
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
        ajax: function (connection, options) {
            return $.ajax(
                $.extend(/*deep copy*/ true, {}, $.signalR.ajaxDefaults, {
                    type: "GET",
                    data: {},
                    xhrFields: { withCredentials: connection.withCredentials },
                    contentType: connection.contentType,
                    dataType: connection.ajaxDataType
                }, options));
        },

        pingServer: function (connection) {
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
                    success: function (result) {
                        var data;

                        try {
                            data = connection._parseResponse(result);
                        }
                        catch (error) {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR.resources.pingServerFailedParse,
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                            connection.stop();
                            return;
                        }

                        if (data.Response === "pong") {
                            deferral.resolve();
                        }
                        else {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR._.format(signalR.resources.pingServerFailedInvalidResponse, result),
                                    connection.transport,
                                    null /* error */,
                                    xhr
                                )
                            );
                        }
                    },
                    error: function (error) {
                        if (error.status === 401 || error.status === 403) {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR._.format(signalR.resources.pingServerFailedStatusCode, error.status),
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                            connection.stop();
                        }
                        else {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR.resources.pingServerFailed,
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                        }
                    }
                });
            }
            else {
                deferral.reject(
                    signalR._.transportError(
                        signalR.resources.noConnectionTransport,
                        connection.transport
                    )
                );
            }

            return deferral.promise();
        },

        prepareQueryString: function (connection, url) {
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

        addQs: function (url, qs) {
            var appender = url.indexOf("?") !== -1 ? "&" : "?",
                firstChar;

            if (!qs) {
                return url;
            }

            if (typeof (qs) === "object") {
                return url + appender + $.param(qs);
            }

            if (typeof (qs) === "string") {
                firstChar = qs.charAt(0);

                if (firstChar === "?" || firstChar === "&") {
                    appender = "";
                }

                return url + appender + qs;
            }

            throw new Error("Query string property must be either a string or object.");
        },

        // BUG #2953: The url needs to be same otherwise it will cause a memory leak
        getUrl: function (connection, transport, reconnecting, poll, ajaxPost) {
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

        maximizePersistentResponse: function (minPersistentResponse) {
            return {
                MessageId: minPersistentResponse.C,
                Messages: minPersistentResponse.M,
                Initialized: typeof (minPersistentResponse.S) !== "undefined" ? true : false,
                ShouldReconnect: typeof (minPersistentResponse.T) !== "undefined" ? true : false,
                LongPollDelay: minPersistentResponse.L,
                GroupsToken: minPersistentResponse.G
            };
        },

        updateGroups: function (connection, groupsToken) {
            if (groupsToken) {
                connection.groupsToken = groupsToken;
            }
        },

        stringifySend: function (connection, message) {
            if (typeof (message) === "string" || typeof (message) === "undefined" || message === null) {
                return message;
            }
            return connection.json.stringify(message);
        },

        ajaxSend: function (connection, data) {
            var payload = transportLogic.stringifySend(connection, data),
                url = getAjaxUrl(connection, "/send"),
                xhr,
                onFail = function (error, connection) {
                    $(connection).triggerHandler(events.onError, [signalR._.transportError(signalR.resources.sendFailed, connection.transport, error, xhr), data]);
                };


            xhr = transportLogic.ajax(connection, {
                url: url,
                type: connection.ajaxDataType === "jsonp" ? "GET" : "POST",
                contentType: signalR._.defaultContentType,
                data: {
                    data: payload
                },
                success: function (result) {
                    var res;

                    if (result) {
                        try {
                            res = connection._parseResponse(result);
                        }
                        catch (error) {
                            onFail(error, connection);
                            connection.stop();
                            return;
                        }

                        transportLogic.triggerReceived(connection, res);
                    }
                },
                error: function (error, textStatus) {
                    if (textStatus === "abort" || textStatus === "parsererror") {
                        // The parsererror happens for sends that don't return any data, and hence
                        // don't write the jsonp callback to the response. This is harder to fix on the server
                        // so just hack around it on the client for now.
                        return;
                    }

                    onFail(error, connection);
                }
            });

            return xhr;
        },

        ajaxAbort: function (connection, async) {
            if (typeof (connection.transport) === "undefined") {
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

        ajaxStart: function (connection, onSuccess) {
            var rejectDeferred = function (error) {
                    var deferred = connection._deferral;
                    if (deferred) {
                        deferred.reject(error);
                    }
                },
                triggerStartError = function (error) {
                    connection.log("The start request failed. Stopping the connection.");
                    $(connection).triggerHandler(events.onError, [error]);
                    rejectDeferred(error);
                    connection.stop();
                };

            connection._.startRequest = transportLogic.ajax(connection, {
                url: getAjaxUrl(connection, "/start"),
                success: function (result, statusText, xhr) {
                    var data;

                    try {
                        data = connection._parseResponse(result);
                    } catch (error) {
                        triggerStartError(signalR._.error(
                            signalR._.format(signalR.resources.errorParsingStartResponse, result),
                            error, xhr));
                        return;
                    }

                    if (data.Response === "started") {
                        onSuccess();
                    } else {
                        triggerStartError(signalR._.error(
                            signalR._.format(signalR.resources.invalidStartResponse, result),
                            null /* error */, xhr));
                    }
                },
                error: function (xhr, statusText, error) {
                    if (statusText !== startAbortText) {
                        triggerStartError(signalR._.error(
                            signalR.resources.errorDuringStartRequest,
                            error, xhr));
                    } else {
                        // Stop has been called, no need to trigger the error handler
                        // or stop the connection again with onStartError
                        connection.log("The start request aborted because connection.stop() was called.");
                        rejectDeferred(signalR._.error(
                            signalR.resources.stoppedDuringStartRequest,
                            null /* error */, xhr));
                    }
                }
            });
        },

        tryAbortStartRequest: function (connection) {
            if (connection._.startRequest) {
                // If the start request has already completed this will noop.
                connection._.startRequest.abort(startAbortText);
                delete connection._.startRequest;
            }
        },

        tryInitialize: function (persistentResponse, onInitialized) {
            if (persistentResponse.Initialized) {
                onInitialized();
            }
        },

        triggerReceived: function (connection, data) {
            if (!connection._.connectingMessageBuffer.tryBuffer(data)) {
                $(connection).triggerHandler(events.onReceived, [data]);
            }
        },

        processMessages: function (connection, minData, onInitialized) {
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

                    transportLogic.tryInitialize(data, onInitialized);
                }
            }
        },

        monitorKeepAlive: function (connection) {
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

        stopMonitoringKeepAlive: function (connection) {
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

        startHeartbeat: function (connection) {
            connection._.lastActiveAt = new Date().getTime();
            beat(connection);
        },

        markLastMessage: function (connection) {
            connection._.lastMessageAt = new Date().getTime();
        },

        markActive: function (connection) {
            if (transportLogic.verifyLastActive(connection)) {
                connection._.lastActiveAt = new Date().getTime();
                return true;
            }

            return false;
        },

        isConnectedOrReconnecting: function (connection) {
            return connection.state === signalR.connectionState.connected ||
                   connection.state === signalR.connectionState.reconnecting;
        },

        ensureReconnectingState: function (connection) {
            if (changeState(connection,
                        signalR.connectionState.connected,
                        signalR.connectionState.reconnecting) === true) {
                $(connection).triggerHandler(events.onReconnecting);
            }
            return connection.state === signalR.connectionState.reconnecting;
        },

        clearReconnectTimeout: function (connection) {
            if (connection && connection._.reconnectTimeout) {
                window.clearTimeout(connection._.reconnectTimeout);
                delete connection._.reconnectTimeout;
            }
        },

        verifyLastActive: function (connection) {
            if (new Date().getTime() - connection._.lastActiveAt >= connection.reconnectWindow) {
                var message = signalR._.format(signalR.resources.reconnectWindowTimeout, new Date(connection._.lastActiveAt), connection.reconnectWindow);
                connection.log(message);
                $(connection).triggerHandler(events.onError, [signalR._.error(message, /* source */ "TimeoutException")]);
                connection.stop(/* async */ false, /* notifyServer */ false);
                return false;
            }

            return true;
        },

        reconnect: function (connection, transportName) {
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

        handleParseFailure: function (connection, result, error, onFailed, context) {
            var wrappedError = signalR._.transportError(
                signalR._.format(signalR.resources.parseFailed, result),
                connection.transport,
                error,
                context);

            // If we're in the initialization phase trigger onFailed, otherwise stop the connection.
            if (onFailed && onFailed(wrappedError)) {
                connection.log("Failed to parse server response while attempting to connect.");
            } else {
                $(connection).triggerHandler(events.onError, [wrappedError]);
                connection.stop();
            }
        },

        initHandler: function (connection) {
            return new InitHandler(connection);
        },

        foreverFrame: {
            count: 0,
            connections: {}
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.webSockets.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic;

    signalR.transports.webSockets = {
        name: "webSockets",

        supportsKeepAlive: function () {
            return true;
        },

        send: function (connection, data) {
            var payload = transportLogic.stringifySend(connection, data);

            try {
                connection.socket.send(payload);
            } catch (ex) {
                $(connection).triggerHandler(events.onError,
                    [signalR._.transportError(
                        signalR.resources.webSocketsInvalidState,
                        connection.transport,
                        ex,
                        connection.socket
                    ),
                    data]);
            }
        },

        start: function (connection, onSuccess, onFailed) {
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

                    if (changeState(connection,
                                    signalR.connectionState.reconnecting,
                                    signalR.connectionState.connected) === true) {
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
                            error = signalR._.transportError(
                                signalR.resources.webSocketClosed,
                                connection.transport,
                                event);

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
                    }
                    catch (error) {
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

        reconnect: function (connection) {
            transportLogic.reconnect(connection, this.name);
        },

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        stop: function (connection) {
            // Don't trigger a reconnect after stopping
            transportLogic.clearReconnectTimeout(connection);

            if (connection.socket) {
                connection.log("Closing the Websocket.");
                connection.socket.close();
                connection.socket = null;
            }
        },

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.serverSentEvents.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic,
        clearReconnectAttemptTimeout = function (connection) {
            window.clearTimeout(connection._.reconnectAttemptTimeoutHandle);
            delete connection._.reconnectAttemptTimeoutHandle;
        };

    signalR.transports.serverSentEvents = {
        name: "serverSentEvents",

        supportsKeepAlive: function () {
            return true;
        },

        timeOut: 3000,

        start: function (connection, onSuccess, onFailed) {
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
            }
            catch (e) {
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
                },
                that.timeOut);
            }

            connection.eventSource.addEventListener("open", function (e) {
                connection.log("EventSource connected.");

                clearReconnectAttemptTimeout(connection);
                transportLogic.clearReconnectTimeout(connection);

                if (opened === false) {
                    opened = true;

                    if (changeState(connection,
                                         signalR.connectionState.reconnecting,
                                         signalR.connectionState.connected) === true) {
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
                }
                catch (error) {
                    transportLogic.handleParseFailure(connection, e.data, error, onFailed, e);
                    return;
                }

                transportLogic.processMessages(connection, res, onSuccess);
            }, false);

            connection.eventSource.addEventListener("error", function (e) {
                var error = signalR._.transportError(
                    signalR.resources.eventSourceError,
                    connection.transport,
                    e);

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

        reconnect: function (connection) {
            transportLogic.reconnect(connection, this.name);
        },

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        stop: function (connection) {
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

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.foreverFrame.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic,
        createFrame = function () {
            var frame = window.document.createElement("iframe");
            frame.setAttribute("style", "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;");
            return frame;
        },
        // Used to prevent infinite loading icon spins in older versions of ie
        // We build this object inside a closure so we don't pollute the rest of   
        // the foreverFrame transport with unnecessary functions/utilities.
        loadPreventer = (function () {
            var loadingFixIntervalId = null,
                loadingFixInterval = 1000,
                attachedTo = 0;

            return {
                prevent: function () {
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
                cancel: function () {
                    // Only clear the interval if there's only one more object that the loadPreventer is attachedTo
                    if (attachedTo === 1) {
                        window.clearInterval(loadingFixIntervalId);
                    }

                    if (attachedTo > 0) {
                        attachedTo--;
                    }
                }
            };
        })();

    signalR.transports.foreverFrame = {
        name: "foreverFrame",

        supportsKeepAlive: function () {
            return true;
        },

        // Added as a value here so we can create tests to verify functionality
        iframeClearThreshold: 50,

        start: function (connection, onSuccess, onFailed) {
            var that = this,
                frameId = (transportLogic.foreverFrame.count += 1),
                url,
                frame = createFrame(),
                frameLoadHandler = function () {
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

        reconnect: function (connection) {
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

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        receive: function (connection, data) {
            var cw,
                body,
                response;

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

        stop: function (connection) {
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
                    }
                    catch (e) {
                        connection.log("Error occured when stopping foreverFrame transport. Message = " + e.message + ".");
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

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        },

        getConnection: function (id) {
            return transportLogic.foreverFrame.connections[id];
        },

        started: function (connection) {
            if (changeState(connection,
                signalR.connectionState.reconnecting,
                signalR.connectionState.connected) === true) {

                $(connection).triggerHandler(events.onReconnect);
            }
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.longPolling.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        isDisconnecting = $.signalR.isDisconnecting,
        transportLogic = signalR.transports._logic;

    signalR.transports.longPolling = {
        name: "longPolling",

        supportsKeepAlive: function () {
            return false;
        },

        reconnectDelay: 3000,

        start: function (connection, onSuccess, onFailed) {
            /// <summary>Starts the long polling connection</summary>
            /// <param name="connection" type="signalR">The SignalR connection to start</param>
            var that = this,
                fireConnect = function () {
                    fireConnect = $.noop;

                    connection.log("LongPolling connected.");
                    onSuccess();
                },
                tryFailConnect = function (error) {
                    if (onFailed(error)) {
                        connection.log("LongPolling failed to connect.");
                        return true;
                    }

                    return false;
                },
                privateData = connection._,
                reconnectErrors = 0,
                fireReconnected = function (instance) {
                    window.clearTimeout(privateData.reconnectTimeoutId);
                    privateData.reconnectTimeoutId = null;

                    if (changeState(instance,
                                    signalR.connectionState.reconnecting,
                                    signalR.connectionState.connected) === true) {
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
                        connect = (messageId === null),
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
                            onprogress: function () {
                                transportLogic.markLastMessage(connection);
                            }
                        },
                        url: url,
                        type: "POST",
                        contentType: signalR._.defaultContentType,
                        data: postData,
                        timeout: connection._.pollTimeout,
                        success: function (result) {
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
                            }
                            catch (error) {
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

                            transportLogic.processMessages(instance, minData, fireConnect);

                            if (data &&
                                $.type(data.LongPollDelay) === "number") {
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

                        error: function (data, textStatus) {
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
                                if ((connection.state === signalR.connectionState.connected ||
                                    connection.state === signalR.connectionState.reconnecting) &&
                                    !transportLogic.verifyLastActive(connection)) {
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

                    // This will only ever pass after an error has occured via the poll ajax procedure.
                    if (reconnecting && raiseReconnect === true) {
                        // We wait to reconnect depending on how many times we've failed to reconnect.
                        // This is essentially a heuristic that will exponentially increase in wait time before
                        // triggering reconnected.  This depends on the "error" handler of Poll to cancel this 
                        // timeout if it triggers before the Reconnected event fires.
                        // The Math.min at the end is to ensure that the reconnect timeout does not overflow.
                        privateData.reconnectTimeoutId = window.setTimeout(function () { fireReconnected(instance); }, Math.min(1000 * (Math.pow(2, reconnectErrors) - 1), maxFireReconnectedTimeout));
                    }
                }(connection));
            }, 250); // Have to delay initial poll so Chrome doesn't show loader spinner in tab
        },

        lostConnection: function (connection) {
            if (connection.pollXhr) {
                connection.pollXhr.abort("lostConnection");
            }
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        stop: function (connection) {
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

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.hubs.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, window, undefined) {

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
        return $.isFunction(a) ? null : ($.type(a) === "undefined" ? null : a);
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
        init: function (connection, hubName) {
            this.state = {};
            this.connection = connection;
            this.hubName = hubName;
            this._ = {
                callbackMap: {}
            };
        },

        constructor: hubProxy,

        hasSubscriptions: function () {
            return hasMembers(this._.callbackMap);
        },

        on: function (eventName, callback) {
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

        off: function (eventName, callback) {
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
                } else if (!callback) { // Check if we're removing the whole event and we didn't error because of an invalid callback
                    $(that).unbind(makeEventName(eventName));

                    delete callbackMap[eventName];
                }
            }

            return that;
        },

        invoke: function (methodName) {
            /// <summary>Invokes a server hub method with the given arguments.</summary>
            /// <param name="methodName" type="String">The name of the server hub method.</param>

            var that = this,
                connection = that.connection,
                args = $.makeArray(arguments).slice(1),
                argValues = map(args, getArgValue),
                data = { H: that.hubName, M: methodName, A: argValues, I: connection._.invocationCallbackId },
                d = $.Deferred(),
                callback = function (minResult) {
                    var result = that._maximizeHubResponse(minResult),
                        source,
                        error;

                    // Update the hub state
                    $.extend(that.state, result.State);

                    if (result.Progress) {
                        if (d.notifyWith) {
                            // Progress is only supported in jQuery 1.7+
                            d.notifyWith(that, [result.Progress.Data]);
                        } else if(!connection._.progressjQueryVersionLogged) {
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

        _maximizeHubResponse: function (minHubResponse) {
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
            if (typeof (minData.P) !== "undefined") {
                // Process progress notification
                dataCallbackId = minData.P.I.toString();
                callback = connection._.invocationCallbacks[dataCallbackId];
                if (callback) {
                    callback.method.call(callback.scope, minData);
                }
            } else if (typeof (minData.I) !== "undefined") {
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

}(window.jQuery, window));
/* jquery.signalR.version.js */
// Copyright (c) Microsoft Open Technologies, Inc. All rights reserved. See License.md in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />
(function ($, undefined) {
    $.signalR.version = "2.2.0";
}(window.jQuery));

/*!
 * ASP.NET SignalR JavaScript Library v2.2.0
 * http://signalr.net/
 *
 * Copyright Microsoft Open Technologies, Inc. All rights reserved.
 * Licensed under the Apache 2.0
 * https://github.com/SignalR/SignalR/blob/master/LICENSE.md
 *
 */

/// <reference path="..\..\SignalR.Client.JS\Scripts\jquery-1.6.4.js" />
/// <reference path="jquery.signalR.js" />
(function ($, window, undefined) {
    /// <param name="$" type="jQuery" />
    "use strict";

    if (typeof ($.signalR) !== "function") {
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

                if (!(hub.hubName)) {
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
        proxies['transvaultHub'].client = { };
        proxies['transvaultHub'].server = {
            registerClientWithApiKey: function (apiKey) {
                return proxies['transvaultHub'].invoke.apply(proxies['transvaultHub'], $.merge(["RegisterClientWithApiKey"], $.makeArray(arguments)));
             }
        };

        return proxies;
    };

    signalR.hub = $.hubConnection("/hp/v3/adapters/transvault", { useDefaultPath: false });
    $.extend(signalR, signalR.hub.createHubProxies());

}(window.jQuery, window));
(function() {

    "use strict";
    /*
     * setup patterns
     */
    var patterns = {};
    patterns.isNumber = "[0-9]+";
    patterns.isNotEmpty = "\S+";
    patterns.isEmail = ".+\@.+\..+";

    /*
     * setup urls
     */
    var shouldMatch = function(value, regex, message) {

        if (typeof value === "undefined") {
            throw new TypeError("Property cannot be undefined.");
        }

        value = value + "";

        var pattern = new RegExp(regex);

        if (!pattern.test(value)) {
            throw new Error(message);
        }

    };

    /*
     * findElement
     */
    var findCount = 0;
    var findDeferred = jQuery.Deferred();
    var findElement = function(id) {

        if (id.nodeType) {
            findDeferred.resolve(id);
            return findDeferred.promise;
        }

        if (!!document.getElementById(id)) {
            findDeferred.resolve(document.getElementById(id));
            return findDeferred.promise;
        }

        setTimeout(function() {
            if (findCount < 25) {
                findCount++;
                findElement(id);
            } else {
                findDeferred.reject();
            }
        }, 25);

        return findDeferred.promise;

    };

    /*
     * Query help
     */
    var toQueryString = function(obj) {

        var parts = [],
            url = "";

        for (var i in obj) {
            if (obj.hasOwnProperty(i)) {
                parts.push(encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]));
            }
        }

        url = "&" + parts.join("&");

        return url;
    };

    /*
     * Export "hp"
     */
    window.hp = {};

    /*
     * hp Types
     */
    hp.types = {};
    hp.types.Event = "Event";
    hp.types.Product = "Product";
    hp.types.Adapter = "Adapter";

    /*
     * hp Models
     */
    hp.models = {};

    hp.models.Item = function(label, price) {
        this.label = label;
        this.price = parseFloat(price, 2);
    };

    /*
     * Options
     * @param: merchantClientId 
     * @param: merchantPrimaryEmail
     * @param: merchantSecondaryEmail
     * @param: showMemoField
     * @param: merchantGoogleAnalytics
     * @param: customOrderId
     * @param: customFormName
     */
    hp.models.Options = function(merchantClientId, merchantPrimaryEmail, merchantSecondaryEmail, showMemoField, merchantGoogleAnalytics, customOrderId, customFormName, customSubjectLine) {

        this.name = customFormName || "Checkout";
        this.CID = merchantClientId;
        this.email = merchantPrimaryEmail;

        shouldMatch(this.CID, patterns.isNumber, "Client ID should be digits only.");
        shouldMatch(this.email, patterns.isEmail, "Primary email should be a valid email address.");

        if (typeof merchantGoogleAnalytics !== "undefined") {
            this.ga = merchantGoogleAnalytics;
        }

        if (typeof customSubjectLine !== "undefined") {
            this.subject = customSubjectLine;
        }

        if (typeof merchantSecondaryEmail !== "undefined") {
            this.repoEmail = merchantSecondaryEmail;
            shouldMatch(this.repoEmail, patterns.isEmail, "Secondary email should be a valid email address.");
        }

        if (typeof showMemoField !== "undefined") {
            this.showMemoField = showMemoField.toString().toLowerCase() === "true" ? "True" : "False";
        }

        if (typeof customOrderId !== "undefined") {
            this.orderId = customOrderId;
            shouldMatch(this.orderId, patterns.isNumber, "Customer order Id must be a valid number.");
        }

    };

    /*
     * Setup
     * @param: type 
     * @param: model
     */
    hp.Setup = function(type, options) {

        if (!(type in hp.types)) {
            throw new Error("Please specify type. 'hp.Types.Event' or 'hp.Types.Product'");
        }

        this.type = type;
        this.options = options;

        this.hasItems = false;

        this.items = {
            priceLabels: "",
            price: ""
        };

    };

    /*
     * addItem (prototype)
     * @param: item 
     */
    hp.Setup.prototype.addItem = function(item) {
        this.items.priceLabels += (this.items.price === "" ? "" : ",") + item.label;
        this.items.price += (this.items.price === "" ? "" : ",") + item.price;
        this.hasItems = true;
        return this;
    };

    /*
     * createForm (prototype)
     * @param: containerElementId 
     */
    hp.Setup.prototype.createForm = function(containerElementId, baseUrl) {

        var deferred = jQuery.Deferred();
        var iframe = document.createElement("iframe");
        var href = document.createElement("a");
        href.href = baseUrl;

        iframe.setAttribute("seamless", "seamless");
        iframe.setAttribute("marginheight", "0");
        iframe.setAttribute("marginwidth", "0");
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("horizontalscrolling", "no");
        iframe.setAttribute("verticalscrolling", "no");
        iframe.style.overflowY = "hidden";
        iframe.style.border = "none";
        iframe.width = "640";
        iframe.className = "inactive";

        iframe.style.opacity = "0";
        iframe.style.transition = "all 450ms 25ms cubic-bezier(0.175, 0.885, 0.320, 1)";
        iframe.style.webkitTransition = "all 450ms 25ms cubic-bezier(0.175, 0.885, 0.320, 1)";
        iframe.style.mozTransition = "all 450ms 25ms cubic-bezier(0.175, 0.885, 0.320, 1)";
        iframe.style.msTransition = "all 450ms 25ms cubic-bezier(0.175, 0.885, 0.320, 1)";
        iframe.style.oTransition = "all 450ms 25ms cubic-bezier(0.175, 0.885, 0.320, 1)";

        var url = href.protocol + "//" + href.host;

        if (this.type == hp.types.Event) {
            url = url + "/hp/v1/event";
            iframe.height = "1311";
        }

        if (this.type == hp.types.Product) {
            url = url + "/hp/v1/item";
            iframe.height = "1220";
        }

        url = url + "?" + toQueryString(this.options);

        if (!this.hasItems) {
            url = url + "&price=0";
        } else {
            url = url + toQueryString(this.items);
        }

        iframe.src = url
            .replace("item?&", "item?")
            .replace("event?&", "event?")
            .toString();

        iframe.onload = function() {
            deferred.resolve(iframe);
            iframe.className = "active";
            iframe.style.opacity = "1";
        };

        findElement(containerElementId).then(function(element) {
            element.appendChild(iframe);
        });

        return deferred;

    };

    $(function(){
        $("[data-inventory], [data-event]").hp();
    });

})();

(function($, window, document, undefined) {

    "use strict";

    // Production steps of ECMA-262, Edition 5, 15.4.4.19
    // Reference: http://es5.github.io/#x15.4.4.19
    if (!Array.prototype.map) {

        Array.prototype.map = function(callback, thisArg) {

            var T, A, k;

            if (this === null) {
                throw new TypeError(' this is null or not defined');
            }

            // 1. Let O be the result of calling ToObject passing the |this| 
            //    value as the argument.
            var O = Object(this);

            // 2. Let lenValue be the result of calling the Get internal 
            //    method of O with the argument "length".
            // 3. Let len be ToUint32(lenValue).
            var len = O.length >>> 0;

            // 4. If IsCallable(callback) is false, throw a TypeError exception.
            // See: http://es5.github.com/#x9.11
            if (typeof callback !== 'function') {
                throw new TypeError(callback + ' is not a function');
            }

            // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
            if (arguments.length > 1) {
                T = thisArg;
            }

            // 6. Let A be a new array created as if by the expression new Array(len) 
            //    where Array is the standard built-in constructor with that name and 
            //    len is the value of len.
            A = new Array(len);

            // 7. Let k be 0
            k = 0;

            // 8. Repeat, while k < len
            while (k < len) {

                var kValue, mappedValue;

                // a. Let Pk be ToString(k).
                //   This is implicit for LHS operands of the in operator
                // b. Let kPresent be the result of calling the HasProperty internal 
                //    method of O with argument Pk.
                //   This step can be combined with c
                // c. If kPresent is true, then
                if (k in O) {

                    // i. Let kValue be the result of calling the Get internal 
                    //    method of O with argument Pk.
                    kValue = O[k];

                    // ii. Let mappedValue be the result of calling the Call internal 
                    //     method of callback with T as the this value and argument 
                    //     list containing kValue, k, and O.
                    mappedValue = callback.call(T, kValue, k, O);

                    // iii. Call the DefineOwnProperty internal method of A with arguments
                    // Pk, Property Descriptor
                    // { Value: mappedValue,
                    //   Writable: true,
                    //   Enumerable: true,
                    //   Configurable: true },
                    // and false.

                    // In browsers that support Object.defineProperty, use the following:
                    // Object.defineProperty(A, k, {
                    //   value: mappedValue,
                    //   writable: true,
                    //   enumerable: true,
                    //   configurable: true
                    // });

                    // For best browser support, use the following:
                    A[k] = mappedValue;
                }
                // d. Increase k by 1.
                k++;
            }

            // 9. return A
            return A;
        };
    }

    if (!String.prototype.startsWith) {

        String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.indexOf(searchString, position) === position;
        };

    }

    if (!String.prototype.includes) {

        String.prototype.includes = function() {
            return String.prototype.indexOf.apply(this, arguments) !== -1;
        };

    }

    if (!String.prototype.startsWith) {

        String.prototype.startsWith = function(searchString, position) {
            position = position || 0;
            return this.indexOf(searchString, position) === position;
        };

    }

    if (!Date.prototype.toISOString) {
        (function() {

            function pad(number) {
                var r = String(number);
                if (r.length === 1) {
                    r = '0' + r;
                }
                return r;
            }

            Date.prototype.toISOString = function() {
                return this.getUTCFullYear() + '-' + pad(this.getUTCMonth() + 1) + '-' + pad(this.getUTCDate()) + 'T' + pad(this.getUTCHours()) + ':' + pad(this.getUTCMinutes()) + ':' + pad(this.getUTCSeconds()) + '.' + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + 'Z';
            };

        }());
    }

    /*
     * Export "hp"
     */
    window.hp = hp || {};
    window.hp.Utils = hp.Utils || {};

    // exposes defaults
    hp.Utils.defaults = {};

    // exposes plugins
    hp.Utils.plugins = {};

    // exposes payments (for split payment methods)
    hp.Utils.payments = [];

    // expose inital boolean for embeded instrument
    hp.Utils.hasPaymentInstrument = false;

    // Retains instances
    hp.Utils.__instances = [];

    // A variety of CSS based identifiers
    var handleLegacyCssClassApplication = function(classPrefix, $form) {

        var activeClass = "hp-content-active",
            currentClass = "hp-form-" + classPrefix,
            $hp = $form.find(".hp");

        var $parent = $hp
            .removeClass("hp-form-emoney hp-form-transvault hp-form-bank hp-form-code hp-form-cc hp-form-success hp-form-error")
            .addClass("hp hp-form")
            .addClass(currentClass);

        $parent.find(".hp-content").removeClass(activeClass);

        var $content = $parent.find(".hp-content-" + classPrefix).addClass(activeClass);

        setTimeout(function() {
            $form
                .find(".hp")
                .addClass("hp-active");
        }, 0);

        return {
            parent: $parent,
            content: $content
        };

    };

    var refresh = function () {

        // Reset defaults
        hp.Utils.defaults = jQuery.extend(true, {}, hp.Utils.__original);

        // exposes payments (for split payment methods)
        hp.Utils.payments = [];

        // expose inital boolean for embeded instrument
        hp.Utils.hasPaymentInstrument = false;

        // Updates amount
        setAmount(hp.Utils.defaults.amount);

    };

    var log = function() {

        if (typeof console !== "undefined" && typeof console.log !== "undefined") {

            var args = Array.prototype.slice.call(arguments);

            for (var i = 0; i < args.length; i++) {

                var val = args[i];

                if (typeof val === "string") {
                    args[i] = "Hosted Payments v3 (debug): " + val;
                }

            }

            console.log.apply(console, args);
            return;
        }

    };

    var getVersion = function() {
        return hp.Utils.defaults.version;
    };

    var setVersion = function(version) {
        hp.Utils.defaults.version = version;
    };

    var setPaymentInstrument = function() {
        if (typeof hp.Utils.defaults.instrumentId !== "undefined" && hp.Utils.defaults.instrumentId !== "") {
            hp.Utils.hasPaymentInstrument = true;
            return;
        }

        hp.Utils.hasPaymentInstrument = false;
    };

    var generateGuild = function() {

        var d = null;

        if (window.performance && window.performance.now) {
            d = window.performance.now();
        } else if (Date.now) {
            d = Date.now();
        } else {
            d = new Date().getTime();
        }

        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });

        return uuid;
    };

    var showLoader = function() {
        
        if ($(".hp-error-container").is(":visible")) {
            hideError();
        }

        $(".hp-loading-container").addClass("hp-loading-container-active");
    };

    var hideLoader = function() {
        $(".hp-loading-container").removeClass("hp-loading-container-active");
    };

    var showError = function(message) {
        
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

        $(".hp-error-container .hp-error-disclaimer a").on("click", hideError);

    };

    var hideError = function() {
        $(".hp-error-container").removeClass("hp-error-container-active");
        $(".hp-error-container .hp-error-disclaimer a").off("click");
    };

    // sets up iframe DOM
    var createInstance = function($element, callback) {

        // Create wrapping HTML
        var $wrapper = [
            '<div class="hp hp-form">',
            '<div class="hp-loading-container">',
                '<span class="hp-loading-text">Loading</span>',
                '<div class="hp-loading"><span></span><span></span><span></span><span></span></div>',
            '</div>',
            '<div class="hp-error-container">',
                '<span class="hp-error-text">{{error}} </span>',
                '<div class="hp-error-message"></div>',
                '<hr />',
                '<div class="hp-error-disclaimer">If you feel that the above error was made by a mistake please contact our support at {{phone}}. <br /><br /><a href="javascript:;">&times; Dismiss error</a></div>',
            '</div>',
            '<div class="hp-row">',
            '<div class="hp-col hp-col-left">',
            '<ul class="hp-nav">',
            '{{nav}}',
            '</ul>',
            '<div class="hp-support">',
            '<strong>Help &amp; support</strong>',
            '<p>Having issues with your payments? Call us at {{phone}}.</p>',
            '</div>',
            '<div class="hp-secure">',
            '<a class="hp-secure-icon" href="https://www.etsms.com/" target="_blank" title="ETS - Electronic Transaction Systems">Powered By ETS</a>',
            '</div>',
            '<div class="hp-version">',
            '<small class="hp-version">',
            '<span class="' + (hp.Utils.getAmount() === 0 || hp.Utils.defaults.ignoreSubmission === true ? "hide" : "") + '">Transaction Amount: <span class="hp-version-amount">' + hp.Utils.formatCurrency(hp.Utils.getAmount()) + '</span></span><br />',
            'Hosted Payments ' + hp.Utils.getVersion(),
            '</small>',
            '</div>',
            '</div>',
            '<div class="hp-col hp-col-right">',
            '{{order}}',
            '<div class="hp-content hp-content-success">{{success}}</div>',
            '</div>',
            '</div>',
            '</div>'
        ].join("");

        hp.Utils.plugins.CreditCard = new hp.CreditCard($element);
        hp.Utils.plugins.BankAccount = new hp.BankAccount($element);
        hp.Utils.plugins.Code = new hp.Code($element);
        hp.Utils.plugins.Success = new hp.Success($element);
        hp.Utils.plugins.Transvault = new hp.Transvault($element);

        $element.html(
            $wrapper
            .replace("{{success}}", hp.Utils.plugins.Success
                .createTemplate()
                    .replace("{{redirectLabel}}", hp.Utils.defaults.defaultRedirectLabel)
                    .replace("{{successLabel}}", hp.Utils.defaults.defaultSuccessLabel)
            )
            .replace(/{{phone}}/gi, hp.Utils.defaults.defaultPhone)
            .replace("{{error}}", hp.Utils.defaults.defaultErrorLabel)
            .replace("{{order}}", hp.Utils.createOrder())
            .replace("{{nav}}", hp.Utils.createNav())
        );

        var $parent = $element.find(".hp"),
            $types = $parent.find(".hp-type"),
            activeClass = "hp-active";

        if (!$parent.length) {
            throw new Error("hosted-payments.js : Could not locate template.");
        }

        if (!$types.length) {
            throw new Error("hosted-payments.js : Could not locate template.");
        }

        $types.off("click").on("click", function(e) {

            e.preventDefault();

            var $this = $(this),
                currentIndex = $this.index();

            $types
                .removeClass(activeClass)
                .eq(currentIndex)
                .addClass(activeClass);

            // Wait for DOM to finish loading before querying
            $(function() {

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

            });


        }).eq(0).trigger("click");
    };

    // success page
    var showSuccessPage = function(delay) {
        var deferred = jQuery.Deferred();
        setTimeout(function() {
            hp.Utils.hideError();
            hp.Utils.hideLoader();
            hp.Utils.plugins.Success.init();
            
            $(".hp-col-left .hp-type")
                .off("click")
                .removeClass("hp-active");
                
            deferred.resolve();
        }, delay || 150);
        return deferred;
    };

    var setAmount = function(amount) {
        hp.Utils.defaults.amount = Math.round10(parseFloat(amount), -2);
        $(".hp.hp-form .hp-version-amount").text(formatCurrency(hp.Utils.defaults.amount));
    };

    var getAmount = function() {
        return hp.Utils.defaults.amount;
    };

    var createNav = function() {

        var defaultAreas = hp.Utils.defaults.paymentTypeOrder,
            html = '',
            creditCard = '',
            bankAccount = '',
            code = '',
            transvault = '';

        if (defaultAreas.indexOf(0) >= 0) {
            creditCard = '<li class="hp-type hp-cc"><a href="javascript:void(0);"><i></i> <span>Credit Card</span></a></li>';
        }

        if (defaultAreas.indexOf(1) >= 0) {
            bankAccount = '<li class="hp-type hp-bank"><a href="javascript:void(0);"><i></i> <span>Bank</span></a></li>';
        }

        if (defaultAreas.indexOf(2) >= 0) {
            code = '<li class="hp-type hp-code"><a href="javascript:void(0);"><i></i> <span>Scan</span></a></li>';
        }

        if (defaultAreas.indexOf(3) >= 0) {
            transvault = '<li class="hp-type hp-transvault"><a href="javascript:void(0);"><i></i> <span>Transvault</span></a></li>';
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
        }

        return html;

    };

    var createOrder = function() {

        var defaultAreas = hp.Utils.defaults.paymentTypeOrder,
            html = '',
            creditCard = '',
            bankAccount = '',
            code = '',
            transvault = '';

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
        }

        return html;
    };

    var setSession = function(session, isApiKey) {

        var currentSession = getSession();

        if (session.length >= 72 && !isApiKey) {
            currentSession.accessToken = session;
        }

        if (session.length <= 36 && !isApiKey) {
            currentSession.sessionToken = session;
        }

        if (isApiKey) {
            currentSession.apiKey = session;
        }

        hp.Utils.defaults.session = currentSession;

    };

    var getSession = function() {

        var currentSession = {};
        currentSession.sessionToken = "";
        currentSession.accessToken = "";
        currentSession.apiKey = "";

        currentSession.sessionToken = hp.Utils.defaults.session ? (hp.Utils.defaults.session.sessionToken ? hp.Utils.defaults.session.sessionToken : "") : "";
        currentSession.accessToken = hp.Utils.defaults.session ? (hp.Utils.defaults.session.accessToken ? hp.Utils.defaults.session.accessToken : "") : "";
        currentSession.apiKey = hp.Utils.defaults.session ? (hp.Utils.defaults.session.apiKey ? hp.Utils.defaults.session.apiKey : "") : "";

        return currentSession;
    };

    var isEMoneyCardNumber = function(cardNumber) {

        if (typeof String.prototype.startsWith != 'function') {
            String.prototype.startsWith = function(str) {
                return this.slice(0, str.length) == str;
            };
        }

        return cardNumber.startsWith("627571");

    };

    var buildResultObjectByType = function(response) {

        var deferred = jQuery.Deferred();

        var isBankAccount = function(req) {

            var isBank = false;

            if (typeof req.properties !== "undefined" && typeof req.properties.accountNumber !== "undefined") {
                isBank = true;
            }

            return isBank;

        };

        var isEMoney = function(req) {

            if (isBankAccount(req)) {
                return false;
            }

            if (typeof req.type !== "undefined" && ((req.type.toLowerCase() === "emoney") || (req.type.toLowerCase() === "creditcard") || (req.type.toLowerCase() === "ach"))) {
                return true;
            }

            return false;

        };

        var isCreditCard = function(req) {

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

        if (typeof response.splice === "function") {

            var responses = [],
                isCreateOnly = hp.Utils.getAmount() === 0;

            for (var i = 0; i < response.length; i++) {

                var res = response[i],
                    createdOn = (new Date()).toISOString(),
                    payment = res.request,
                    message = "Transaction processed.",
                    session = getSession(),
                    lastFour = "",
                    name = "",
                    type = "",
                    expirationDate = "",
                    isError = res.isException ? true : false,
                    status = "Success",
                    payload = payment.__request,
                    isAch = isBankAccount(payload),
                    isEm = isEMoney(payload),
                    isCC = isCreditCard(payload);

                // For BANK ACCOUNT objects
                if (isAch) {

                    message = "Transaction pending.";
                    lastFour = payload.properties.accountNumber.substr(payload.properties.accountNumber.length - 4) + "";
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
                    type = $.payment.cardType(payload.properties.cardNumber).toUpperCase();
                    expirationDate = payload.properties.expirationDate;

                }

                if (isError) {
                    status = "Error";
                }

                var successResponse = {
                    "status": status,
                    "amount": payment.amount,
                    "message": isCreateOnly ? "Payment instrument created." : (isError ? res.description : message),
                    "token": session.sessionToken,
                    "transaction_id": res.transactionId,
                    "transaction_approval_code": "",
                    "transaction_avs_street_passed": false,
                    "transaction_avs_postal_code_passed": false,
                    "transaction_currency": "USD$",
                    "transaction_status_indicator": "",
                    "correlation_id": getCorrelationId(),
                    "instrument_id": payment.instrumentId,
                    "instrument_type": type,
                    "instrument_last_four": lastFour,
                    "instrument_expiration_date": expirationDate,
                    "instrument_verification_method": "",
                    "instrument_entry_mode": "MANUAL",
                    "instrument_verification_results": "",
                    "created_on": createdOn,
                    "customer_name": name,
                    "customer_signature": "https://images.pmoney.com/00000000",
                    "anti_forgery_token": hp.Utils.defaults.antiForgeryToken,
                    "application_identifier": "Hosted Payments",
                    "application_response_code": "",
                    "application_issuer_data": ""
                };

                responses.push(successResponse);

            }

            if (isCreateOnly) {

                deferred.resolve(responses);

            } else {

                var responseCount = responses.length || 0,
                    currentCount = 0;

                $.each(responses, function(index) {

                    var statusRequest = {
                        "status": {
                            "statusRequest": {
                                "token": hp.Utils.getSession().sessionToken,
                                "transactionId": responses[index].transaction_id
                            }
                        }
                    };

                    hp.Utils.makeRequest(statusRequest).then(function(statusResponse) {

                        if (statusResponse.type === "Transaction" && typeof statusResponse.properties !== "undefined") {

                            var isACH = statusResponse.properties.accountType === "BankAccount";

                            responses[currentCount].transaction_approval_code = isACH ? "" : statusResponse.properties.approvalCode;
                            responses[currentCount].transaction_avs_postal_code_passed = isACH ? true : statusResponse.properties.postalCodeCheck;
                            responses[currentCount].transaction_avs_street_passed = isACH ? true : statusResponse.properties.addressLine1Check;
                            responses[currentCount].customer_signature = (statusResponse.properties.signatureRef === null || statusResponse.properties.signatureRef === undefined || statusResponse.properties.signatureRef === "") ? "https://images.pmoney.com/00000000" : statusResponse.properties.signatureRef;
                            responses[currentCount].message = (responses[currentCount].message + " " + (statusResponse.properties.message + ".")).toLowerCase().replace(" .", "");
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

    var requestTypes = {};

    requestTypes.SIGN_IN = "signIn";
    requestTypes.SIGN_IN_REQUEST = "signInRequest";
    requestTypes.SIGN_IN_RESPONSE = "signInResponse";

    requestTypes.CHARGE = "charge";
    requestTypes.CHARGE_REQUEST = "chargeRequest";
    requestTypes.CHARGE_RESPONSE = "chargeResponse";

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

    var getObjectResponseFromData = function(data) {

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

        if (requestTypes.CHARGE_RESPONSE in data) {
            memberName = requestTypes.CHARGE_RESPONSE;
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

    // basic http requests
    var makeRequest = function(data, isSync) {

        var deferred = jQuery.Deferred();

        var requestObject = {
            url: hp.Utils.defaults.baseUrl + encodeURI("?dt=" + new Date().getTime()),
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            crossDomain: true,
            data: JSON.stringify(data)
        };

        if (hp.Utils.defaults.paymentService.toLowerCase() === "emoney") {
            requestObject.headers = {
                'X-EMoney-Manager': generateGuild()
            };
        }

        if (isSync) {
            requestObject.async = false;
        }

        $.ajax(requestObject).success(function(res) {

            var requestData = getObjectResponseFromData(data);

            if (res.error) {
                res.error.request = requestData;
                deferred.resolve(res.error);
                return;
            }

            var result = getObjectResponseFromData(res);
            result.request = requestData;

            deferred.resolve(result);

        }).error(deferred.reject);

        return deferred;

    };

    var formatCurrency = function(amount) {
        var aDigits = amount.toFixed(2).split(".");
        aDigits[0] = aDigits[0].split("").reverse().join("").replace(/(\d{3})(?=\d)/g, "$1,").split("").reverse().join("");
        return "$" + aDigits.join(".");
    };

    var getBalance = function(sessionId, cardNumber) {

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

        if (hp.Utils.defaults.paymentService.toString().toLowerCase() === "emoney") {
            settings.headers = {
                'X-EMoney-Manager': generateGuild()
            };
        }

        $.ajax(settings).success(function(res) {

            if (res.balanceResponse)
                balance = res.balanceResponse.balance;

        }).error(function() {
            balance = 0;
        });

        return balance;

    };

    var isEmail = function(email) {
        return /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(email);
    };

    var validateEMoneyData = function(formData, callback) {

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

    var validateBankAccountData = function(formData, callback) {

        var errors = [];

        if (typeof formData.accountNumber === "undefined" || formData.accountNumber === "") {
            errors.push({
                type: "accountNumber",
                message: "Account number on card cannot be empty."
            });
        }

        if (typeof formData.accountNumber !== "undefined" && formData.accountNumber.length <= 8) {
            errors.push({
                type: "accountNumber",
                message: "The account number must be atleast 8 characters."
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

    var shouldErrorPostBack = function() {

        var options = hp.Utils.defaults;

        if (typeof options.errorCallback !== "function" && typeof options.errorCallback !== "undefined") {
            return true;
        }

        return false;
    };

    var shouldSuccessPostBack = function() {

        var options = hp.Utils.defaults;

        if (typeof options.successCallback !== "function" && typeof options.successCallback !== "undefined") {
            return true;
        }

        return false;

    };

    // Validate Credit Card Data
    var validateCreditCardData = function(formData, callback) {

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

    var buildAntiForgeryInput = function() {

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

    var buildFormFromObject = function(obj) {

        var deferred = jQuery.Deferred(),
            $antiForgeryInput = buildAntiForgeryInput();

        setTimeout(function() {

            var formId = "FRM" + (new Date()).getTime().toString(),
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

    var throttle = function(fn, delay) {
        var timeout;
        return function() {
            var args = arguments;
            var context = this;
            if (!timeout) {
                timeout = setTimeout(function() {
                    timeout = 0;
                    return fn.apply(context, args);
                }, delay);
            }
        };
    };

    var getTerminalId = function() {
        return hp.Utils.defaults.terminalId || "";
    };

    var getCorrelationId = function() {
        return hp.Utils.defaults.correlationId.length ? hp.Utils.defaults.correlationId : generateGuild();
    };

    var setContainerClass = function($instance) {

        var mobileClass = "hp-form-mobile",
            tabletClass = "hp-form-tablet",
            desktopClass = "hp-form-desktop";

        var currentWidth = $instance.outerWidth(true, true),
            containerElement = $instance.find(".hp");

        containerElement
            .removeClass(mobileClass)
            .removeClass(tabletClass)
            .removeClass(desktopClass);

        setTimeout(function() {

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
    hp.Utils.getAmount = getAmount;
    hp.Utils.setAmount = setAmount;
    hp.Utils.getSession = getSession;
    hp.Utils.setSession = setSession;
    hp.Utils.getBalance = getBalance;
    hp.Utils.formatCurrency = formatCurrency;
    hp.Utils.buildResultObjectByType = buildResultObjectByType;
    hp.Utils.generateGuild = generateGuild;
    hp.Utils.createOrder = createOrder;
    hp.Utils.createNav = createNav;
    hp.Utils.getCorrelationId = getCorrelationId;
    hp.Utils.setContainerClass = setContainerClass;
    hp.Utils.throttle = throttle;
    hp.Utils.shouldSuccessPostBack = shouldSuccessPostBack;
    hp.Utils.shouldErrorPostBack = shouldErrorPostBack;
    hp.Utils.getTerminalId = getTerminalId;
    hp.Utils.getVersion = getVersion;
    hp.Utils.setVersion = setVersion;
    hp.Utils.showLoader = showLoader;
    hp.Utils.hideLoader = hideLoader;
    hp.Utils.showError = showError;
    hp.Utils.hideError = hideError;
    hp.Utils.setPaymentInstrument = setPaymentInstrument;
    hp.Utils.log = log;
    hp.Utils.refresh = refresh;

})(jQuery, window, document);

(function($, window, document, undefined) {
	
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

        $parent
            .find(".icon.success")
            .addClass("animate")
            .show();

        this.context = context;
        this.$parent = $parent;
        this.$content = $content;

	};

	Success.prototype.createTemplate = function() {

		var $html = [
			'<div class="hp-success-visual"></div>',
			'<h2>{{successLabel}}</h2>',
			'<p class="text-muted">{{redirectLabel}}</p>'
		].join("");

		return $html;

	};

    Success.prototype.showSuccess = function(delay) {
        return hp.Utils.showSuccessPage(delay);
    };

    Success.prototype.isCreditCard = function() { return false; };

    Success.prototype.isBankAccount = function() { return false; };

    Success.prototype.isEMoney = function() { return false; };
    
    Success.prototype.isSuccessPage = function() { return true; };
    
    Success.prototype.isCode = function() { return false; };

    /*
     * Export "Credit Card"
     */
    hp.Success = Success;

})(jQuery, window, document);
(function($, window, document, undefined) {

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

        this.requestTypes = {};
        this.requestTypes.createPaymentInstrument = 0;
        this.requestTypes.charge = 1;
        this.requestTypes.error = 9;

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
        createdOn = (new Date()).toISOString();

    CreditCard.prototype.init = function() {

        sessionId = hp.Utils.getSession().sessionToken;

        // utils call
        var context = hp.Utils.handleLegacyCssClassApplication("cc", this.$element),
            $parent = context.parent,
            $content = context.content;

        // Clean parent, notify on complete.
        $parent
            .removeClass("hp-back")
            .trigger("hp.notify");

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

        $fancy.fancySelect();
    };

    CreditCard.prototype.clearInputs = function() {

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

    CreditCard.prototype.createTemplate = function(defaultCardCharacters, defaultNameOnCardName, defaultDateCharacters) {

        if (hp.Utils.defaults.paymentTypeOrder.indexOf(0) < 0) {
            return "";
        }

        if (typeof defaultCardCharacters === "undefined" || typeof defaultNameOnCardName === "undefined" || typeof defaultDateCharacters === "undefined") {
            throw new Error("hosted-payments.credit-card.js : Cannot create template. Arguments are null or undefined.");
        }

        var generateYearList = function(input) {

            var min = new Date().getFullYear(),
                max = (new Date().getFullYear()) + 10,
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

        var generateMonthList = function(input) {

            var min = 1,
                select = "";

            for (var i = min; i <= 12; i++) {

                if (i === (new Date().getMonth() + 1)) {
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

        var parseDatesTemplates = function(input) {
            return input
                .replace("{{monthList}}", generateMonthList())
                .replace("{{yearList}}", generateYearList());
        };

        var $html = [
            '<div class="hp-card-visual">',
                '<div class="hp-card-visual-number">' + defaultCardCharacters + '</div>',
                '<div class="hp-card-visual-name">' + defaultNameOnCardName + '</div>',
                '<div class="hp-card-visual-expiry">',
                    '<span class="hp-card-visual-expiry-label">Month/Year</span>',
                    '<span class="hp-card-visual-expiry-label-alt">Valid Thru</span>',
                    '<span class="hp-card-visual-expiry-value"><span class="hp-card-visual-expiry-month">' + defaultDateCharacters + '</span><span>/</span><span class="hp-card-visual-expiry-year">' + defaultDateCharacters + '</span></span>',
                '</div>',
            '</div>',
            '<div class="hp-input-wrapper">',
                '<div class="hp-input hp-input-cc">',
                '<input placeholder="Enter Card Number" autocomplete="on" type="text" pattern="\\d*">',
                '</div>',
                '<div class="hp-input hp-input-name">',
                '<input placeholder="Enter Full Name" value="' + hp.Utils.defaults.customerName + '" autocomplete="on" type="text">',
                '</div>',
                '<br class="hp-break" />',
                '<div class="hp-input-container hp-input-container-date">',
                '<div class="hp-input hp-input-month">',
                '<select autocomplete="on">',
                '{{monthList}}',
                '</select>',
                '</div>',
                '<div class="hp-input hp-input-year">',
                '<select autocomplete="on">',
                '{{yearList}}',
                '</select>',
                '</div>',
                '</div>',
                '<div class="hp-input hp-input-third hp-input-cvv">',
                '<input placeholder="Enter CVV" autocomplete="off" type="text" pattern="\\d*">',
                '<span class="hp-input-cvv-image"></span>',
                '</div>',
                '<br class="hp-break" />',
                '<button class="hp-submit">Submit Payment</button>',
            '</div>'
        ].join("");

        return parseDatesTemplates($html);

    };

    CreditCard.prototype.showSuccess = function(delay) {
        return hp.Utils.showSuccessPage(delay);
    };

    CreditCard.prototype.detachEvents = function() {
        $cc.off().val("");
        $cvv.off().val("");
        $name.off().val(hp.Utils.defaults.customerName);
        $submit.off();
        $fancy.trigger("disable.fs");
        this.$parent.trigger("hp.notify");
        this.handleNotify();
    };

    CreditCard.prototype.handleCreditCardInput = function(cardNumber) {

        if (cardNumber === "") {
            $visualcc.html(hp.Utils.defaults.defaultCardCharacters);
            return;
        }

        var cardType = $.payment.cardType(cardNumber);

        if (cardType === null && this.wasOnceEMoney) {
            var date = new Date();
            $name.val("").trigger("keyup").removeAttr("readonly");
            $month.removeAttr("readonly").val(date.getMonth() <= 9 ? "0" + date.getMonth() : date.getMonth()).trigger("change");
            $year.removeAttr("readonly").val(date.getFullYear()).trigger("change");
            $fancy.trigger("enable.fs");
            $cvv.val("").trigger("keyup").removeAttr("readonly");
        }

        if (cardType === "emoney") {
            $name.val("EMoney Card").trigger("keyup").attr("readonly", "readonly");
            $month.val("12").trigger("change").attr("readonly", "readonly");
            $year.val("2025").trigger("change").attr("readonly", "readonly");
            $cvv.val("999").trigger("keyup").attr("readonly", "readonly");
            $fancy.trigger("disable.fs");
            this.wasOnceEMoney = true;
        }

        this.formData.cardNumber = cardNumber.replace(/\s/gi, "");
        this.formData.cardType = cardType;
        $visualcc.text(cardNumber);

    };

    CreditCard.prototype.handleMonthInput = function(expiryMonth) {

        if (expiryMonth === "") {
            $visualmonth.html(hp.Utils.defaults.defaultDateCharacters);
            return;
        }

        this.formData._expiryMonth = $.trim(expiryMonth);
        $visualmonth.text(expiryMonth);

    };


    CreditCard.prototype.handleYearInput = function(expiryYear) {

        if (expiryYear === "") {
            $visualyear.html(hp.Utils.defaults.defaultDateCharacters);
            return;
        }

        this.formData._expiryYear = $.trim(expiryYear);
        $visualyear.text(expiryYear.substring(2));

    };

    CreditCard.prototype.handleNameInput = function(name) {

        if (name === "") {
            $visualname.text(hp.Utils.defaults.defaultNameOnCardName);
            return;
        }

        this.formData.name = $.trim(name);
        $visualname.text(name);

    };

    CreditCard.prototype.handleCVVInput = function(cvv) {
        this.formData.cvv = $.trim(cvv);
    };

    CreditCard.prototype.handleCharge = function(res) {

        var that = this,
            hasBalance = true,
            cardBalance = 0;

        var errorResponse = {
            "status": "Error",
            "message": "The payment instrument provided had no remaining funds and will not be applied to the split payment.",
            "created_on": createdOn,
            "token": sessionId
        };

        hp.Utils.makeRequest({
                "charge": {
                    "chargeRequest": {
                        "correlationId": hp.Utils.getCorrelationId(),
                        "token": hp.Utils.getSession().sessionToken,
                        "transactionId": this.transactionId,
                        "instrumentId": this.instrumentId,
                        "amount": hp.Utils.getAmount(),
                        "__request": res.request
                    }
                }
            })
            .then(hp.Utils.buildResultObjectByType)
            .then(function(promiseResponse) {

                that.$parent.trigger("hp.submit", {
                    "type": that.requestTypes.charge,
                    "res": promiseResponse
                });

            })
            .fail(function(promiseResponse) {

                if (typeof promiseResponse.responseJSON !== "undefined") {
                    promiseResponse = promiseResponse.responseJSON;
                }

                that.$parent.trigger("hp.submit", {
                    "type": that.requestTypes.error,
                    "res": promiseResponse
                });

            });

    };

    CreditCard.prototype.handleSubmit = function() {

        var that = this;

        if (!that.formData._isValid) {
            $visualcard.addClass("hp-card-invalid");
            setTimeout(function() {
                $visualcard.removeClass("hp-card-invalid");
            }, 2000);
            return;
        }

        $submit.attr("disabled", "disabled").text("Submitting...");
        hp.Utils.showLoader();

        hp.Utils.makeRequest({
            "createPaymentInstrument": {
                "createPaymentInstrumentRequest": {
                    "correlationId": hp.Utils.getCorrelationId(),
                    "token": hp.Utils.getSession().sessionToken,
                    "name": that.formData.name,
                    "properties": {
                        "cardNumber": that.formData.cardNumber,
                        "expirationDate": that.formData._expiryMonth + "/" + that.formData._expiryYear,
                        "cvv": that.formData.cvv,
                        "nameOnCard": that.formData.name
                    },
                    "billingAddress": {
                        "addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
                        "postalCode": hp.Utils.defaults.billingAddress.postalCode
                    }
                }
            }
        }).then(function(res) {

            if (res.isException) {

                that.$parent.trigger("hp.submit", {
                    "type": 9,
                    "res": res
                });

                return;
            }

            that.instrumentId = res.instrumentId;
            that.transactionId = res.transactionId;

            that.$parent.trigger("hp.submit", {
                "type": 0,
                "res": res
            });

            that.handleCharge(res);

        }).fail(function(err) {

            if (typeof err.responseJSON !== "undefined") {
                err = err.responseJSON;
            }

            that.$parent.trigger("hp.submit", {
                "type": 9,
                "res": err
            });

        });

    };

    CreditCard.prototype.handleSuccess = function(res) {

        var errorResponse = {
            "status": "Error",
            "message": "Your session is no longer valid. Please refresh your page and try again.",
            "created_on": createdOn,
            "token": sessionId
        };

        if (typeof res === "undefined") {

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            }

            return;

        }

        var response = res.length > 1 ? res : res[0];

        this.showSuccess();

        if (hp.Utils.shouldSuccessPostBack()) {
            hp.Utils.buildFormFromObject(response).then(function($form) {
                $form.attr("action", hp.Utils.defaults.successCallback).submit();
            });
        } else {
            hp.Utils.defaults.successCallback(response);
        }

    };

    CreditCard.prototype.handleError = function(res) {

        var errorResponse = {
            "status": "Error",
            "message": "Your session is no longer valid. Please refresh your page and try again.",
            "created_on": createdOn,
            "token": sessionId
        };

        if (typeof res === "undefined") {

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
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
            hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                $form.attr("action", hp.Utils.defaults.errorCallback).submit();
            });
        } else {
            hp.Utils.showError(errorResponse.message);
            hp.Utils.defaults.errorCallback(errorResponse);
        }

        this.clearInputs();
    };

    CreditCard.prototype.attachEvents = function() {

        this.detachEvents();

        var $this = this;

        $fancy.trigger("enable.fs");

        hp.Utils.setContainerClass($this.$element);

        $cc
            .payment('formatCardNumber')
            .on("keyup", function() {

                var cardNumber = $(this).val();
                var cardType = $.payment.cardType(cardNumber);

                $this.$parent.removeClass("hp-back");

                if (cardType) {
                    $this.$content
                        .removeClass()
                        .addClass("hp-content hp-content-cc hp-content-active")
                        .addClass("hp-content-card-" + cardType);
                }

                $this.handleCreditCardInput(cardNumber);
                $this.$parent.trigger("hp.cc", cardNumber);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            });

        $cvv
            .payment('formatCardCVC').on("focus", function() {

                $this.$parent.addClass("hp-back");
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            }).on("keyup", function(e) {

                var cvv = $(this).val();
                $this.handleCVVInput(cvv);
                $this.$parent.trigger("hp.cvv", cvv);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            });

        $name
            .on("focus", function() {

                $this.$parent.trigger("hp.notify");
                $this.handleNotify();
                $this.$parent.removeClass("hp-back");

            }).on("keyup", function(e) {

                var name = $(this).val();
                $this.handleNameInput(name);
                $this.$parent.trigger("hp.name", name);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            });

        if (hp.Utils.defaults.customerName !== "") {
            $name.trigger("keyup");
        }

        $month
            .on("change.fs", function(e) {

                var month = $(this).val();
                $this.handleMonthInput(month);
                $this.$parent.removeClass("hp-back");
                $this.$parent.trigger("hp.expiryMonth", month);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            }).trigger("change.fs");

        $year
            .on("change.fs", function(e) {

                var year = $(this).val();
                $this.handleYearInput(year);
                $this.$parent.removeClass("hp-back");
                $this.$parent.trigger("hp.expiryYear", year);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            }).trigger("change.fs");

        $submit
            .on("click", function(e) {
                e.preventDefault();
                $this.handleSubmit();
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();
            });

        this.$parent.trigger("hp.notify");
        this.handleNotify();

    };

    CreditCard.prototype.handleNotify = function() {

        if (typeof this.formData._expiryYear !== "undefined" && typeof this.formData._expiryMonth !== "undefined") {
            this.formData.expirationDate = $.trim(this.formData._expiryMonth + this.formData._expiryYear.substring(2));
        }

        var $this = this;

        hp.Utils.validateCreditCardData(this.formData, function(error, data) {

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

    CreditCard.prototype.isCreditCard = function() {
        return true;
    };

    CreditCard.prototype.isBankAccount = function() {
        return false;
    };

    CreditCard.prototype.isEMoney = function() {
        return false;
    };

    CreditCard.prototype.isCode = function() {
        return false;
    };

    CreditCard.prototype.isSuccessPage = function() {
        return false;
    };

    CreditCard.prototype.isTransvault = function() {
        return false;
    };

    /*
     * Export "Credit Card"
     */
    hp.CreditCard = CreditCard;

})(jQuery, window, document);

(function($, window, document, undefined) {

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

        this.requestTypes = {};
        this.requestTypes.createPaymentInstrument = 0;
        this.requestTypes.charge = 1;
        this.requestTypes.error = 9;
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
        createdOn = (new Date()).toISOString();

    BankAccount.prototype.init = function() {

        sessionId = hp.Utils.getSession().sessionToken;

        // utils call
        var context = hp.Utils.handleLegacyCssClassApplication("bank", this.$element),
            $parent = context.parent,
            $content = context.content;

        // Clean parent, notify on complete.
        $parent
            .trigger("hp.notify");

        this.context = context;
        this.$parent = $parent;
        this.$content = $content;

        $fullname = this.$content.find(".hp-input-fullname input");
        $accountNumber = this.$content.find(".hp-input-account input");
        $routingNumber = this.$content.find(".hp-input-routing input");
        $visualaccount = this.$content.find(".hp-bank-visual-account");
        $visualbank = this.$content.find(".hp-bank-visual");
        $visualrouting = this.$content.find(".hp-bank-visual-routing");
        $visualfullname = this.$content.find(".hp-bank-visual-name");
        $submit = this.$content.find(".hp-submit");
        $all = this.$content.find(".hp-input");

    };

    BankAccount.prototype.clearInputs = function() {

        this.formData = {
            _isValid: false
        };

        $all.each(function() {
            $(this).find("input").val("");
        });

        $visualfullname.html(hp.Utils.defaults.defaultName);
        $visualaccount.html(hp.Utils.defaults.defaultAccountNumberCharacters);
        $visualrouting.html(hp.Utils.defaults.defaultRoutingNumberCharacters);
        $visualbank.parent().removeClass().addClass("hp-content hp-content-bank hp-content-active");

    };

    BankAccount.prototype.createTemplate = function(defaultName, defaultAccountNumberCharacters, defaultRoutingNumberCharacters) {

        if (hp.Utils.defaults.paymentTypeOrder.indexOf(1) < 0) {
            return "";
        }

        if (typeof defaultAccountNumberCharacters === "undefined" || typeof defaultRoutingNumberCharacters === "undefined" || typeof defaultName === "undefined") {
            throw new Error("hosted-payments.bank-account.js : Cannot create template. Arguments are null or undefined.");
        }

        var $html = [
            '<div class="hp-bank-visual">',
            '<div class="hp-bank-visual-image"></div>',
            '<div class="hp-bank-visual-logo"></div>',
            '<div class="hp-bank-visual-name">' + defaultName + '</div>',
            '<div class="hp-bank-visual-account">' + defaultAccountNumberCharacters + '</div>',
            '<div class="hp-bank-visual-routing">' + defaultRoutingNumberCharacters + '</div>',
            '</div>',
            '<div class="hp-input-wrapper">',
            '<div class="hp-input hp-input-fullname">',
            '<input placeholder="Enter Full Name" value="' + hp.Utils.defaults.customerName + '" autocomplete="on" type="text">',
            '</div>',
            '<div class="hp-break" >',
            '<div class="hp-input hp-input-account">',
            '<input placeholder="Account Number" autocomplete="on" type="text" pattern="\\d*">',
            '</div>',
            '<div class="hp-input hp-input-routing">',
            '<input placeholder="Routing Number" autocomplete="on" type="text" pattern="\\d*">',
            '</div>',
            '</div>',
            '<button class="hp-submit">Submit Payment</button>',
            '<p class="info">* Please note that bank account (ACH) transactions may take up to 3 days to process. This time period varies depending on the your issuing bank. For more information please visit us at <a href="https://www.etsms.com/" target="_blank">https://etsms.com</a>.</p>',
            '</div>'
        ].join("");

        return $html;

    };


    BankAccount.prototype.detachEvents = function() {

        this.$content.find(".hp-input-account input").off().val("");
        this.$content.find(".hp-input-fullname input").off().val(hp.Utils.defaults.customerName);
        this.$content.find(".hp-input-routing input").off().val("");
        this.$content.find(".hp-submit").off();
        this.$parent.trigger("hp.notify");
        this.handleNotify();

    };

    BankAccount.prototype.handleRoutingInput = function(routingNumber) {

        if (routingNumber === "") {
            return $visualrouting.html(hp.Utils.defaults.defaultRoutingNumberCharacters);
        }

        this.formData.routingNumber = $.trim(routingNumber);
        $visualrouting.text(routingNumber);

    };

    BankAccount.prototype.handleAccountInput = function(accountNumber) {

        if (accountNumber === "") {
            return $visualaccount.html(hp.Utils.defaults.defaultAccountNumberCharacters);
        }

        this.formData.accountNumber = $.trim(accountNumber);
        $visualaccount.text(accountNumber);

    };

    BankAccount.prototype.handleNameInput = function(name) {

        if (name === "") {
            return $visualfullname.html(hp.Utils.defaults.defaultName);
        }

        this.formData.name = $.trim(name);
        $visualfullname.text(name);

    };

    BankAccount.prototype.attachEvents = function() {

        this.detachEvents();

        var $this = this;

        $this.$content.find(".hp-input-account input")
            .payment('restrictNumeric')
            .on("keyup, keydown, keypress, change, input", function() {

                var that = $(this),
                    count = that.val().length;

                if (count > 16) {
                    var value = that.val().substr(0, 16);
                    that.val(value);
                }

                var accountNumber = $(this).val();

                $this.$parent.removeClass("hp-back");

                $this.$content
                    .removeClass()
                    .addClass("hp-content hp-content-bank hp-content-active");


                $this.handleAccountInput(accountNumber);
                $this.$parent.trigger("hp.account", accountNumber);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            });

        $this.$content.find(".hp-input-fullname input")
            .on("keyup, keydown, keypress, change, input", function() {

                var name = $(this).val();

                $this.$parent.removeClass("hp-back");

                $this.handleNameInput(name);
                $this.$parent.trigger("hp.name", name);
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();

            });

        if (hp.Utils.defaults.customerName !== "") {
            setTimeout(function() {
                $this.$content.find(".hp-input-fullname input").val(hp.Utils.defaults.customerName);
                $this.$content.find(".hp-input-fullname input").trigger("keyup");
                $this.$parent.trigger("hp.name", hp.Utils.defaults.customerName);
                $this.handleNameInput(hp.Utils.defaults.customerName);
                $this.handleNotify();
            }, 0);
        }

        $this.$content.find(".hp-input-routing input")
            .payment('restrictNumeric')
            .on("keyup, keydown, keypress, change, input", function(e) {

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

        $this.$content.find(".hp-submit")
            .on("click", function(e) {
                e.preventDefault();
                $this.handleSubmit();
                $this.$parent.trigger("hp.notify");
                $this.handleNotify();
            });

        this.$parent.trigger("hp.notify");
        this.handleNotify();
    };

    BankAccount.prototype.handleNotify = function() {

        var $this = this;

        hp.Utils.validateBankAccountData(this.formData, function(error, data) {

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

    BankAccount.prototype.showSuccess = function(delay) {
        return hp.Utils.showSuccessPage(delay);
    };

    BankAccount.prototype.handleCharge = function(res) {

        var $this = this;

        hp.Utils.makeRequest({
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
            })
            .then(hp.Utils.buildResultObjectByType)
            .then(function(promiseResponse) {

                $this.$parent.trigger("hp.submit", {
                    "type": $this.requestTypes.charge,
                    "res": promiseResponse
                });

            })
            .fail(function(promiseResponse) {

                if (typeof promiseResponse.responseJSON !== "undefined") {
                    promiseResponse = promiseResponse.responseJSON;
                }

                $this.$parent.trigger("hp.submit", {
                    "type": $this.requestTypes.error,
                    "res": promiseResponse
                });

            });

    };

    BankAccount.prototype.handleSuccess = function(res) {

        if (typeof res === "undefined") {

            var errorResponse = {
                "status": "Error",
                "message": "Your session is no longer valid. Please refresh your page and try again.",
                "created_on": createdOn,
                "token": sessionId
            };

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            }

            return;

        }

        var response = res.length > 1 ? res : res[0];

        this.showSuccess();

        if (hp.Utils.shouldSuccessPostBack()) {
            hp.Utils.buildFormFromObject(response).then(function($form) {
                $form.attr("action", hp.Utils.defaults.successCallback).submit();
            });
        } else {
            hp.Utils.defaults.successCallback(response);
        }

    };

    BankAccount.prototype.handleError = function(res) {

        var errorResponse = {
            "status": "Error",
            "message": "Your session is no longer valid. Please refresh your page and try again.",
            "created_on": createdOn,
            "token": sessionId
        };

        if (typeof res === "undefined") {

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
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
            hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                $form.attr("action", hp.Utils.defaults.errorCallback).submit();
            });
        } else {
            hp.Utils.showError(Utils.message);
            hp.Utils.defaults.errorCallback(errorResponse);
        }

        this.clearInputs();
    };

    BankAccount.prototype.handleSubmit = function() {

        var $this = this;

        if (!$this.formData._isValid) {
            $visualbank.addClass("hp-bank-invalid");
            setTimeout(function() {
                $visualbank.removeClass("hp-bank-invalid");
            }, 2000);
            return;
        }

        $submit.attr("disabled", "disabled").text("Submitting...");
        hp.Utils.showLoader();

        $submit
            .attr("disabled", "disabled")
            .text("Processing payment...");

        hp.Utils.makeRequest({
            "createPaymentInstrument": {
                "createPaymentInstrumentRequest": {
                    "correlationId": hp.Utils.getCorrelationId(),
                    "token": hp.Utils.getSession().sessionToken,
                    "name": $this.formData.name,
                    "properties": {
                        "accountNumber": $this.formData.accountNumber,
                        "routingNumber": $this.formData.routingNumber,
                        "bankName": $this.formData.name
                    },
                    "billingAddress": {
                        "addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
                        "postalCode": hp.Utils.defaults.billingAddress.postalCode
                    }
                }
            }
        }).then(function(res) {

            if (res.isException) {

                $this.$parent.trigger("hp.submit", {
                    "type": 9,
                    "res": res
                });

                return;
            }

            $this.instrumentId = res.instrumentId;
            $this.transactionId = res.transactionId;

            $this.$parent.trigger("hp.submit", {
                "type": 0,
                "res": res
            });

            $this.handleCharge(res);

        }).fail(function(err) {

            if (typeof err.responseJSON !== "undefined") {
                err = err.responseJSON;
            }

            $this.$parent.trigger("hp.submit", {
                "type": 9,
                "res": err
            });

        });

    };

    BankAccount.prototype.isCreditCard = function() {
        return false; };

    BankAccount.prototype.isBankAccount = function() {
        return true; };

    BankAccount.prototype.isEMoney = function() {
        return false; };

    BankAccount.prototype.isSuccessPage = function() {
        return false; };

    BankAccount.prototype.isCode = function() {
        return false; };

    BankAccount.prototype.isTransvault = function() {
        return false; };

    /*
     * Export "Bank Account"
     */
    hp.BankAccount = BankAccount;

})(jQuery, window, document);

(function($, window, document, undefined) {

    "use strict";

    /*
     * Export "hp"
     */
    window.hp = hp || {};

    /*
     * Bank Account Class
     */
    function Code($element) {
        this.context = null;
        this.$parent = null;
        this.$content = null;
        this.$element = $element;

        this.requestTypes = {};
        this.requestTypes.createPaymentInstrument = 0;
        this.requestTypes.charge = 1;
        this.requestTypes.error = 9;

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
        createdOn = (new Date()).toISOString();

    Code.prototype.init = function() {

        sessionId = hp.Utils.getSession().sessionToken;

        // utils call
        var context = hp.Utils.handleLegacyCssClassApplication("code", this.$element),
            $parent = context.parent,
            $content = context.content;

        // Clean parent, notify on complete.
        $parent
            .trigger("hp.notify");

        this.context = context;
        this.$parent = $parent;
        this.$content = $content;

        $visualcodecc = this.$content.find(".hp-card-visual-number");
        $visualcodemonth = this.$content.find(".hp-card-visual-expiry-month");
        $visualcodeyear = this.$content.find(".hp-card-visual-expiry-year");
        $visualcodename = this.$content.find(".hp-card-visual-name");
        $visualcode = this.$content.find(".hp-card-visual.hp-card-visual-flat");
        $all = this.$content.find(".hp-input");

    };

    Code.prototype.clearInputs = function() {

        this.formData = {
            _isValid: false
        };

        $visualcode.removeClass("hp-card-visual-flat-active");
        $visualcodecc.html(hp.Utils.defaults.defaultCardCharacters);
        $visualcodemonth.html(hp.Utils.defaults.defaultDateCharacters);
        $visualcodeyear.html(hp.Utils.defaults.defaultDateCharacters);
        $visualcodename.html(hp.Utils.defaults.defaultNameOnCardNameSwipe);

    };

    Code.prototype.createTemplate = function(defaultCardCharacters, defaultNameOnCardName, defaultDateCharacters) {

        if (hp.Utils.defaults.paymentTypeOrder.indexOf(3) < 0) {
            return "";
        }

        if (typeof defaultCardCharacters === "undefined" || typeof defaultNameOnCardName === "undefined" || typeof defaultDateCharacters === "undefined") {
            throw new Error("hosted-payments.code.js : Cannot create template. Arguments are null or undefined.");
        }

        var $html = [
            '<div class="hp-code-title">To begin: Swipe a card or scan a barcode.</div>',
                '<div class="hp-code-image"></div>',
                '<div class="hp-card-visual hp-card-visual-flat">',
                    '<div class="hp-card-visual-number">' + defaultCardCharacters + '</div>',
                    '<div class="hp-card-visual-name">' + defaultNameOnCardName + '</div>',
                    '<div class="hp-card-visual-expiry">',
                    '<span class="hp-card-visual-expiry-label">Month/Year</span>',
                    '<span class="hp-card-visual-expiry-label-alt">Valid Thru</span>',
                    '<span class="hp-card-visual-expiry-value"><span class="hp-card-visual-expiry-month">' + defaultDateCharacters + '</span><span>/</span><span class="hp-card-visual-expiry-year">' + defaultDateCharacters + '</span></span>',
                '</div>',
            '</div>'
        ].join("");

        return $html;

    };

    Code.prototype.detachEvents = function() {

        this.$content.find(".hp-submit").off();
        this.$parent.off("hp.swipped");
        this.$parent.trigger("hp.notify");
        $(document).off("hp.global_swipped");

    };

    Code.prototype.attachEvents = function() {

        this.detachEvents();

        var $this = this;

        $(document).pos();

        $(document).on("hp.global_swipped_start", function(event, data) {
            hp.Utils.defaults.onSwipeStartCallback();
        });

        $(document).on("hp.global_swipped_end", function(event, data) {
            hp.Utils.defaults.onSwipeEndCallback(data);

            if (!hp.Utils.defaults.ignoreSubmission) {
                $this.handleSubmit(data);                
            }
        });

        // Kills spacebar page-down event
        window.onkeydown = function(e) {
            return e.keyCode != 32;
        };

    };

    Code.prototype.handleCharge = function(res) {

        var hasBalance = true,
            $this = this,
            cardBalance = 0;

        var errorResponse = {
            "status": "Error",
            "message": "The payment instrument provided had no remaining funds and will not be applied to the split payment.",
            "created_on": createdOn,
            "token": sessionId
        };

        hp.Utils.makeRequest({
                "charge": {
                    "chargeRequest": {
                        "correlationId": hp.Utils.getCorrelationId(),
                        "token": hp.Utils.getSession().sessionToken,
                        "transactionId": res.transactionId,
                        "instrumentId": res.instrumentId,
                        "amount": hp.Utils.getAmount(),
                        "__request": res.request
                    }
                }
            })
            .then(hp.Utils.buildResultObjectByType)
            .then(function(promiseResponse) {

                $this.$parent.trigger("hp.submit", {
                    "type": $this.requestTypes.charge,
                    "res": promiseResponse
                });

            })
            .fail(function(promiseResponse) {

                if (typeof promiseResponse.responseJSON !== "undefined") {
                    promiseResponse = promiseResponse.responseJSON;
                }

                $this.$parent.trigger("hp.submit", {
                    "type": $this.requestTypes.error,
                    "res": promiseResponse
                });

            });
    };

    Code.prototype.handleSubmit = function(data) {

        var $this = this;

        if (!data.is_valid) {
            $this.$parent.trigger("hp.submit", {
                "type": $this.requestTypes.error,
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
            $this.formData.cardNumber = $.payment.formatCardNumber(data.card_number);
            $this.formData.cardType = $.payment.cardType(data.card_number);
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

        hp.Utils.makeRequest({
            "createPaymentInstrument": {
                "createPaymentInstrumentRequest": {
                    "correlationId": hp.Utils.getCorrelationId(),
                    "token": hp.Utils.getSession().sessionToken,
                    "name": $this.formData.nameOnCard,
                    "properties": cardProperties,
                    "billingAddress": {
                        "addressLine1": hp.Utils.defaults.billingAddress.addressLine1,
                        "postalCode": hp.Utils.defaults.billingAddress.postalCode
                    }
                }
            }
        }).then(function(res) {

            if (res.isException) {

                $this.$parent.trigger("hp.submit", {
                    "type": $this.requestTypes.error,
                    "res": res
                });

                return;
            }

            $this.instrumentId = res.instrumentId;
            $this.transactionId = res.transactionId;

            hp.Utils.showLoader();

            $this.$parent.trigger("hp.submit", {
                "type": 0,
                "res": res
            });

            $this.handleCharge(res);

        }).fail(function(err) {

            if (typeof err.responseJSON !== "undefined") {
                err = err.responseJSON;
            }

            $this.$parent.trigger("hp.submit", {
                "type": $this.requestTypes.error,
                "res": err
            });

        });

    };



    Code.prototype.handleSuccess = function(res) {

        if (typeof res === "undefined") {

            var errorResponse = {
                "status": "Error",
                "message": "Your session is no longer valid. Please refresh your page and try again.",
                "created_on": createdOn,
                "token": sessionId
            };

            if (!hp.Utils.shouldErrorPostBack()) {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
            } else {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            }

            return;

        }

        var _response = res.length > 1 ? res : res[0];

        this.showSuccess();
        
        if (hp.Utils.shouldSuccessPostBack()) {
            hp.Utils.buildFormFromObject(_response).then(function($form) {
                var postUrl = hp.Utils.defaults.successCallback;
                $form.attr("action", postUrl.toString()).submit();
            });
        } else {
            hp.Utils.defaults.successCallback(_response);
        }

    };

    Code.prototype.handleError = function(res) {

        var errorResponse = {
            "status": "Error",
            "message": "Your session is no longer valid. Please refresh your page and try again.",
            "token": sessionId,
            "created_on": createdOn
        };

        if (typeof res === "undefined") {

            if (hp.Utils.shouldErrorPostBack()) {
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            } else {
                hp.Utils.showError(errorResponse.message);
                hp.Utils.defaults.errorCallback(errorResponse);
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
            hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                $form.attr("action", hp.Utils.defaults.errorCallback).submit();
            });
        } else {
            hp.Utils.showError(errorResponse.message);
            hp.Utils.defaults.errorCallback(errorResponse);
        }

        this.clearInputs();
    };

    Code.prototype.showSuccess = function(delay) {
        return hp.Utils.showSuccessPage(delay);
    };

    Code.prototype.isCreditCard = function() {
        return false;
    };

    Code.prototype.isCode = function() {
        return true;
    };

    Code.prototype.isBankAccount = function() {
        return false;
    };

    Code.prototype.isEMoney = function() {
        return false;
    };

    Code.prototype.isSuccessPage = function() {
        return false;
    };

    Code.prototype.isTransvault = function() {
        return false;
    };

    /*
     * Export "Bank Account"
     */
    hp.Code = Code;

})(jQuery, window, document);

(function($, window, document, undefined) {

    "use strict";

    /*
     * Export "hp"
     */
    window.hp = hp || {};

    var messages = {
        "AuthorizationResponse": "Authorizing",
        "BeginSale": "Terminal active",
        "LoginSuccess": "Terminal active",
        "ExecuteCommand": "Terminal active",
        "DisplayAmount": "Waiting for customer",
        "DisplayForm": "Waiting for customer",
        "FindTermsAndConditions": "Waiting for customer",
        "Idle": "Waiting for customer",
        "Offline": "Terminal offline",
        "ProcessingError": "Declined",
        "ReadCardRequest": "Waiting for customer",
        "SetEmvPaymentType": "Checking EMV card type",
        "Gratuity": "Waiting for tip/gratuity",
        "CardInserted": "Perfoming EMV",
        "CardRemoved": "EMV Complete",
        "WaitingForSignature" : "Waiting for signature",
        "DownloadingSignature" : "Waiting for signature",
        "Signature": "Waiting for signature",
        "SignatureBlocks": "Waiting for signature",
        "StopTransaction": "Authorizing",
        "TermsAndConditions": "Waiting for TOC acceptance"
    };

    var getMessage = function(eventName) {

        if (typeof eventName === "undefined") {
            eventName = "Idle";
        }

        var msg = messages[eventName];

        if (msg !== null && typeof message !== "undefined") {
            msg = messages.Idle;
        }

        return msg;
    };

    /*
     * Transvault Class
     */
    function Transvault($element) {
        this.context = null;
        this.$parent = null;
        this.$content = null;
        this.$element = $element;
        this.formData = {
            _isValid: false
        };
    }

    Transvault.prototype.init = function() {

        // utils call
        var context = hp.Utils.handleLegacyCssClassApplication("transvault", this.$element),
            $parent = context.parent,
            $content = context.content;

        // Clean parent, notify on complete.
        $parent
            .trigger("hp.notify");

        this.context = context;
        this.$parent = $parent;
        this.$content = $content;
        this.transvaultHub = $.connection.transvaultHub;
        this.shouldConnect = true;
        this.$btn = null;

        this.terminalId = hp.Utils.getTerminalId();
        this.connectionId = "0";
        this.correlationId = "";
        this.transactionId = hp.Utils.generateGuild();
    };

    Transvault.prototype.createTemplate = function() {

        if (hp.Utils.defaults.paymentTypeOrder.indexOf(3) < 0) {
            return "";
        }

        var $html = [
            '<div class="hp-transvault-visual">',
                '<div class="hp-transvault-visual-image {{isAlt}}">',
                    '<img class="event event-default" src="data:image/gif;base64,R0lGODlhkAEsAff/ALHQ7Be11nh56WaH5o5z541640mm11jFtkLWpmWZ3Ui3x0bGuFWk1jXLuo3X7LDn8+vo+1i2yCq44q/v1zfVp1uG5cq29dnJ+I7T0iap3o1r63DR7Or3+SjdmSjFyIeC4zWn3Wi0xKeI7matzISM3UfNrGZ17Ber3m7Q0YKozGPmjmO7vZXozpJy54yE4NzX+JKv7CO8znlo7zTYnXyb0wyz2YN85mRi8/v//1iW41TzdpbzsiS11UzHyfbz/2Wk1Xq0xF156kfkmkeY5MnI+Vq+vXi8vafW2za7y4uM3XuE5VnshXKmzlbWqHbFtoWa1Wjdm9vz+VHen72j8yjVpVqs0GST4inKvcXq9trn90ysznqO32Nr7wyt3W/nskW+v3OF5jTGxIOV18br6HSs5TjTtWnWo4xx6zjNrtn37FLLsJJl60zsinSi0WfFuObc+4Rr7FWU3cvY93GL41Ob3WRd84Nx61TH5bi4+Ixl7IWG4DWy1FfklXKd1nCU3sL32U2z5MTZ7Vub38n15nuT23Gqy7WY73ujz1Gd19To7od16JJt54OS25qK6INk74ai0XLNrluT37e67Lap76an6qeX60mg4FTjrUXTsqe66hu70ZWX9Tae43Bj8XDTppyZ532W11mO4px166mq+ESx04qV14iH9naZ6XVx7m+ux3yqzIOzx2XOr8PK76Sd9eP87WTbvJa64Imc7B7Ntom53HvlxVbYune84Jeo32qO45J444qS26PA4mW62p/h6qi183+uyHjYv3yK4YB59l6f2Zp66/D99jrE1h3ExSjQsHCb2jjjnpNy7ZWJ8lO00oqa1pOW345t59HW8ZR867CW83qM73me03qB84J5546d3pp+506Q58/x8jy/5YeQ8nqG8HWW2op943KO6o167qGM8YSf0m6A6JJp63ya10Hfo5R+8ZTE1CDdmTvAvwCu3z2h4JJt6wCq3wCu25Zp6xSy3fL5+wSu3wSw27zf44Ci55Zt6wSq3yi+3mHxgf///wAAACH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyOEZBNzg2OUZDMkJFNTExOTFFRUIyREY4RDVERkY1NCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDowRUVFNzBDOTJCRkUxMUU1ODk0QkJGODFFNzlGQTAxNiIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowRUVFNzBDODJCRkUxMUU1ODk0QkJGODFFNzlGQTAxNiIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M2IChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjJBRkE3ODY5RkMyQkU1MTE5MUVFQjJERjhENURGRjU0IiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjI4RkE3ODY5RkMyQkU1MTE5MUVFQjJERjhENURGRjU0Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+Af/+/fz7+vn49/b19PPy8fDv7u3s6+rp6Ofm5eTj4uHg397d3Nva2djX1tXU09LR0M/OzczLysnIx8bFxMPCwcC/vr28u7q5uLe2tbSzsrGwr66trKuqqainpqWko6KhoJ+enZybmpmYl5aVlJOSkZCPjo2Mi4qJiIeGhYSDgoGAf359fHt6eXh3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" alt="Status" />',
                '</div>',
                '<p class="hp-input-transvault-message {{isAlt}}">',
                    'Disconnected <span></span>',
                '</p>',
            '</div>'
        ].join("");

        $html = $html.replace(/{{isAlt}}/gi, (hp.Utils.getTerminalId().startsWith("1") || hp.Utils.getTerminalId().startsWith("3")) ? "alt" : "");

        return $html;

    };

    Transvault.prototype.detachEvents = function() {
        this.$parent.off("hp.transvaultSuccess");
        this.$parent.off("hp.transvaultError");
        this.$parent.off("hp.transvaultProgress");
        this.$parent.trigger("hp.notify");
    };

    Transvault.prototype.attachEvents = function() {

        this.detachEvents();

        var $this = this;

        $this.transvaultHub.connection.url = hp.Utils.defaults.baseUrl + "/transvault";
        $this.setupWebockets();

    };

    Transvault.prototype.onSuccess = function(response) {

        var $this = this,
            props = response.Properties;

        if (!props.ACCT) {
            props.ACCT = "";
        }

        if (!props.AN) {
            props.AN = "";
        }

        if (!props.SD) {
            props.SD = "";
        }

        if (!props.CRDT) {
            props.CRDT = "";
        }

        if (!props.RD) {
            props.RD = "";
        }

        if (!props.EMV_APAN) {
            props.EMV_APAN = "";
        }

        if (!props.EMV_APN) {
            props.EMV_APN = "";
        }

        if (!props.EMV_AID) {
            props.EMV_AID = "";
        }

        if (!props.EMV_TVR) {
            props.EMV_TVR = "";
        }

        if (!props.EMV_IAD) {
            props.EMV_IAD = "";
        }

        if (!props.EMV_TSI) {
            props.EMV_TSI = "";
        }

        if (!props.EMV_ARC) {
            props.EMV_ARC = "";
        }

        if (!props.EMV_TA) {
            props.EMV_TA = "";
        }

        if (!props.TCCT) {
            props.TCCT = "USD$";
        }

        if (!props.EMD) {
            props.EMD = "";
        }

        if (!props.CVMD) {
            props.CVMD = "";
        }

        if (!props.ED) {
            props.ED = "";
        } else {
            var year = (new Date().getFullYear().toString().substring(0,2)) + props.ED.substr(2);
            var month = props.ED.substr(0, 2);
            props.ED = month + "/" + year;
        }

        var successResponse = {
            "status": "Success",
            "message": $.trim(props.RD),
            "amount": props.TA,
            "token": hp.Utils.getSession().sessionToken,
            "anti_forgery_token": hp.Utils.defaults.antiForgeryToken,
            "transaction_id": props.ETT,
            "transaction_approval_code": props.AC,
            "transaction_avs_street_passed": true,
            "transaction_avs_postal_code_passed": true,
            "transaction_currency": props.TCCT,
            "transaction_status_indicator": props.EMV_TSI,
            "instrument_id": props.ACCT,
            "instrument_type": props.CRDT.toUpperCase().replace("ETS", ""),
            "instrument_last_four": props.EMV_APAN.replace(/\*|\X|\x/gi, ""),
            "instrument_expiration_date": props.ED,
            "instrument_verification_method": props.CVMD,
            "instrument_entry_mode": props.EMD,
            "instrument_verification_results": props.EMV_TVR,
            "created_on": (new Date()).toISOString(),
            "customer_name": props.EMV_APN,
            "customer_signature": props.SD === "" ? "https://images.pmoney.com/00000000" : props.SD.toLowerCase(),
            "correlation_id": $this.correlationId,
            "application_identifier": props.EMV_AID,
            "application_response_code": props.EMV_ARC,
            "application_issuer_data": props.EMV_IAD
        };

        $this.$parent.trigger("hp.transvaultSuccess", successResponse);
    };

    Transvault.prototype.onError = function(response) {
        var $this = this;
        $this.$parent.trigger("hp.transvaultError", response);
    };

    Transvault.prototype.onEvent = function(response) {

        var $this = this,
            $message = $this.$parent.find(".hp-input-transvault-message"),
            msg = getMessage(response);

        $message.text(msg);

        $this.$parent.trigger("hp.transvaultEvent", msg);

        if (response === "DownloadingSignature") {
            hp.Utils.showLoader();
        }

    };

    Transvault.prototype.setupWebockets = function(amount) {

        var $this = this,
            $message = $this.$parent.find(".hp-input-transvault-message");

        amount = amount || hp.Utils.getAmount();
        $this.correlationId = hp.Utils.getCorrelationId();

        if (!$this.shouldConnect) {

            $this.$btn = $message;

            $message.addClass("hp-input-transvault-message-btn").off("click").on("click", function(e) {
                e.preventDefault();
                $this.handleSplits();
            });

            return;
        }

        $message.off("click").removeClass("hp-input-transvault-message-btn").text("Connecting");

        setTimeout(function() {

            $this.transvaultHub.client.onSuccess = function(res) {
                $this.onSuccess(res);
            };

            $this.transvaultHub.client.onError = function(res) {
                $this.onError(res);
            };

            $this.transvaultHub.client.onEvent = function(res) {
                $this.onEvent(res);
            };

            $this.transvaultHub.connection.start({
                    withCredentials: false,
                    jsonp: true
                })
                .done(function() {

                    var token = hp.Utils.getSession().sessionToken;
                    
                    $this.transvaultHub.server.registerClientWithApiKey(token); 

                    hp.Utils.makeRequest({
                        "transvault": {
                            "transvaultRequest": {
                                "token": token,
                                "amount": amount,
                                "transactionId": $this.transactionId,
                                "correlationId": $this.correlationId,
                                "terminalId": $this.terminalId
                            }
                        }
                    }).then(function(res) {

                        $this.$parent.trigger("hp.transvaultProgress");

                    }, function(err) {

                        $this.$parent.trigger("hp.transvaultError", err.responseJSON);

                        $message.css("color", "#FC5F45").text("Could not connect!");

                    });

                })
                .fail(function(err) {

                    $message.css("color", "#FC5F45").text("Could not connect!");

                });

        }, 0);

        $this.$parent.trigger("hp.notify");

    };

    Transvault.prototype.showSuccess = function(delay) {
        return hp.Utils.showSuccessPage(delay);
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

// Generated by CoffeeScript 1.7.1
(function() {
  var $, cardFromNumber, cardFromType, cards, defaultFormat, formatBackCardNumber, formatBackExpiry, formatCardNumber, formatExpiry, formatForwardExpiry, formatForwardSlashAndSpace, hasTextSelected, luhnCheck, reFormatCardNumber, reFormatExpiry, restrictCVC, restrictCardNumber, restrictExpiry, restrictNumeric, setCardType,
    __slice = [].slice,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = jQuery;

  $.payment = {};

  $.payment.fn = {};

  $.fn.payment = function() {
    var args, method;
    method = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    return $.payment.fn[method].apply(this, args);
  };

  defaultFormat = /(\d{1,4})/g;

  cards = [
    {
      type: 'visaelectron',
      pattern: /^4(026|17500|405|508|844|91[37])/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'maestro',
      pattern: /^(5(018|0[23]|[68])|6(39|7))/,
      format: defaultFormat,
      length: [12, 13, 14, 15, 16, 17, 18, 19],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'forbrugsforeningen',
      pattern: /^600/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'dankort',
      pattern: /^5019/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'visa',
      pattern: /^4/,
      format: defaultFormat,
      length: [13, 16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'mastercard',
      pattern: /^5[0-5]/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'amex',
      pattern: /^3[47]/,
      format: /(\d{1,4})(\d{1,6})?(\d{1,5})?/,
      length: [15],
      cvcLength: [3, 4],
      luhn: true
    }, {
      type: 'dinersclub',
      pattern: /^3[0689]/,
      format: defaultFormat,
      length: [14],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'discover',
      pattern: /^6([045]|22)/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'jcb',
      pattern: /^35/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }, {
      type: 'emoney',
      pattern: /^627571/,
      format: defaultFormat,
      length: [16],
      cvcLength: [3],
      luhn: true
    }
  ];

  cardFromNumber = function(num) {
    var card, _i, _len;
    num = (num + '').replace(/\D/g, '');
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      card = cards[_i];
      if (card.pattern.test(num)) {
        return card;
      }
    }
  };

  cardFromType = function(type) {
    var card, _i, _len;
    for (_i = 0, _len = cards.length; _i < _len; _i++) {
      card = cards[_i];
      if (card.type === type) {
        return card;
      }
    }
  };

  luhnCheck = function(num) {
    var digit, digits, odd, sum, _i, _len;
    odd = true;
    sum = 0;
    digits = (num + '').split('').reverse();
    for (_i = 0, _len = digits.length; _i < _len; _i++) {
      digit = digits[_i];
      digit = parseInt(digit, 10);
      if ((odd = !odd)) {
        digit *= 2;
      }
      if (digit > 9) {
        digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  };

  hasTextSelected = function($target) {
    var _ref;
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== $target.prop('selectionEnd')) {
      return true;
    }
    if (typeof document !== "undefined" && document !== null ? (_ref = document.selection) != null ? typeof _ref.createRange === "function" ? _ref.createRange().text : void 0 : void 0 : void 0) {
      return true;
    }
    return false;
  };

  reFormatCardNumber = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = $.payment.formatCardNumber(value);
      return $target.val(value);
    });
  };

  formatCardNumber = function(e) {
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
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (card && card.type === 'amex') {
      re = /^(\d{4}|\d{4}\s\d{6})$/;
    } else {
      re = /(?:^|\s)(\d{4})$/;
    }
    if (re.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value + ' ' + digit);
      });
    } else if (re.test(value + digit)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value + digit + ' ');
      });
    }
  };

  formatBackCardNumber = function(e) {
    var $target, value;
    $target = $(e.currentTarget);
    value = $target.val();
    if (e.which !== 8) {
      return;
    }
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (/\d\s$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\d\s$/, ''));
      });
    } else if (/\s\d?$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\s\d?$/, ''));
      });
    }
  };

  reFormatExpiry = function(e) {
    return setTimeout(function() {
      var $target, value;
      $target = $(e.currentTarget);
      value = $target.val();
      value = $.payment.formatExpiry(value);
      return $target.val(value);
    });
  };

  formatExpiry = function(e) {
    var $target, digit, val;
    digit = String.fromCharCode(e.which);
    if (!/^\d+$/.test(digit)) {
      return;
    }
    $target = $(e.currentTarget);
    val = $target.val() + digit;
    if (/^\d$/.test(val) && (val !== '0' && val !== '1')) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val("0" + val + " / ");
      });
    } else if (/^\d\d$/.test(val)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val("" + val + " / ");
      });
    }
  };

  formatForwardExpiry = function(e) {
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

  formatForwardSlashAndSpace = function(e) {
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

  formatBackExpiry = function(e) {
    var $target, value;
    $target = $(e.currentTarget);
    value = $target.val();
    if (e.which !== 8) {
      return;
    }
    if (($target.prop('selectionStart') != null) && $target.prop('selectionStart') !== value.length) {
      return;
    }
    if (/\s\/\s\d?$/.test(value)) {
      e.preventDefault();
      return setTimeout(function() {
        return $target.val(value.replace(/\s\/\s\d?$/, ''));
      });
    }
  };

  restrictNumeric = function(e) {
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

  restrictCardNumber = function(e) {
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

  restrictExpiry = function(e) {
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

  restrictCVC = function(e) {
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

  setCardType = function(e) {
    var $target, allTypes, card, cardType, val;
    $target = $(e.currentTarget);
    val = $target.val();
    cardType = $.payment.cardType(val) || 'unknown';
    if (!$target.hasClass(cardType)) {
      allTypes = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = cards.length; _i < _len; _i++) {
          card = cards[_i];
          _results.push(card.type);
        }
        return _results;
      })();
      $target.removeClass('unknown');
      $target.removeClass(allTypes.join(' '));
      $target.addClass(cardType);
      $target.toggleClass('identified', cardType !== 'unknown');
      return $target.trigger('payment.cardType', cardType);
    }
  };

  $.payment.fn.formatCardCVC = function() {
    this.payment('restrictNumeric');
    this.on('keypress', restrictCVC);
    return this;
  };

  $.payment.fn.formatCardExpiry = function() {
    this.payment('restrictNumeric');
    this.on('keypress', restrictExpiry);
    this.on('keypress', formatExpiry);
    this.on('keypress', formatForwardSlashAndSpace);
    this.on('keypress', formatForwardExpiry);
    this.on('keydown', formatBackExpiry);
    this.on('change', reFormatExpiry);
    this.on('input', reFormatExpiry);
    return this;
  };

  $.payment.fn.formatCardNumber = function() {
    this.payment('restrictNumeric');
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

  $.payment.fn.restrictNumeric = function() {
    this.on('keypress', restrictNumeric);
    return this;
  };

  $.payment.fn.cardExpiryVal = function() {
    return $.payment.cardExpiryVal($(this).val());
  };

  $.payment.cardExpiryVal = function(value) {
    var month, prefix, year, _ref;
    value = value.replace(/\s/g, '');
    _ref = value.split('/', 2), month = _ref[0], year = _ref[1];
    if ((year != null ? year.length : void 0) === 2 && /^\d+$/.test(year)) {
      prefix = (new Date).getFullYear();
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

  $.payment.validateCardNumber = function(num) {
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

  $.payment.validateCardExpiry = function(month, year) {
    var currentTime, expiry, _ref;
    if (typeof month === 'object' && 'month' in month) {
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
    if (!((1 <= month && month <= 12))) {
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
    currentTime = new Date;
    expiry.setMonth(expiry.getMonth() - 1);
    expiry.setMonth(expiry.getMonth() + 1, 1);
    return expiry > currentTime;
  };

  $.payment.validateCardCVC = function(cvc, type) {
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

  $.payment.cardType = function(num) {
    var _ref;
    if (!num) {
      return null;
    }
    return ((_ref = cardFromNumber(num)) != null ? _ref.type : void 0) || null;
  };

  $.payment.formatCardNumber = function(num) {
    var card, groups, upperLength, _ref;
    card = cardFromNumber(num);
    if (!card) {
      return num;
    }
    upperLength = card.length[card.length.length - 1];
    num = num.replace(/\D/g, '');
    num = num.slice(0, upperLength);
    if (card.format.global) {
      return (_ref = num.match(card.format)) != null ? _ref.join(' ') : void 0;
    } else {
      groups = card.format.exec(num);
      if (groups == null) {
        return;
      }
      groups.shift();
      groups = $.grep(groups, function(n) {
        return n;
      });
      return groups.join(' ');
    }
  };

  $.payment.formatExpiry = function(expiry) {
    var mon, parts, sep, year;
    parts = expiry.match(/^\D*(\d{1,2})(\D+)?(\d{1,4})?/);
    if (!parts) {
      return '';
    }
    mon = parts[1] || '';
    sep = parts[2] || '';
    year = parts[3] || '';
    if (year.length > 0 || (sep.length > 0 && !(/\ \/?\ ?/.test(sep)))) {
      sep = ' / ';
    }
    if (mon.length === 1 && (mon !== '0' && mon !== '1')) {
      mon = "0" + mon;
      sep = ' / ';
    }
    return mon + sep + year;
  };

}).call(this);

(function($) {

    var defaults = {}

    $.fn.pos = function(options) {

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
            swipe: true
        };

        // helper
        var hasValue = function(match, index) {
            var result = false;

            try {
                result = typeof match[index] !== "undefined";
            } catch (err) {}

            return result;
        }

        //extend options
        $this.options = $.extend(true, {}, defaults, options);

        $this.off("keypress").on("keypress", function(event) {

            if ($this.options.swipe) {

                if (event.which != 13) {

                    data.swipe += String.fromCharCode(event.which);

                    if (data.swipe.length == 2 && data.swipe == "%B") {
                        $this.trigger("hp.global_swipped_start");
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

                    parsedTrackResult = parsedTrackResult.map(function(match) {
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
                        result.card_exp_date_year = (+(new Date().getFullYear().toString().substring(2)) + 9).toString();
                        result.card_exp_date_month = "12";
                    }

                    if (data.swipe.indexOf("%E?") !== -1 || data.swipe.indexOf("+E?") !== -1 || data.swipe.indexOf(";E?") !== -1) {
                        result.is_valid = false;
                    }

                    if (result.name_on_card === "") {
                        result.name_on_card = "Unknown Card";
                    }

                    result.name_on_card = $.trim(result.name_on_card.replace("undefined", ""));

                    $this.trigger("hp.global_swipped_end", result);
                    data.swipe = '';
                }

            }

        });
    };

})(jQuery);

// Generated by CoffeeScript 1.4.0
(function() {
  var $;

  $ = window.jQuery || window.Zepto || window.$;

  $.fn.fancySelect = function(opts) {
    var isiOS, settings;
    if (opts == null) {
      opts = {};
    }
    settings = $.extend({
      forceiOS: false,
      includeBlank: false,
      optionTemplate: function(optionEl) {
        return optionEl.text();
      },
      triggerTemplate: function(optionEl) {
        return optionEl.text();
      }
    }, opts);
    isiOS = !!navigator.userAgent.match(/iP(hone|od|ad)/i);
    return this.each(function() {
      var copyOptionsToList, disabled, options, sel, trigger, updateTriggerText, wrapper;
      sel = $(this);
      if (sel.hasClass('fancified') || sel[0].tagName !== 'SELECT') {
        return;
      }
      sel.addClass('fancified');
      sel.css({
        width: 1,
        height: 1,
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        opacity: 0
      });
      sel.wrap('<div class="fancy-select">');
      wrapper = sel.parent();
      if (sel.data('class')) {
        wrapper.addClass(sel.data('class'));
      }
      wrapper.append('<div class="trigger">');
      if (!(isiOS && !settings.forceiOS)) {
        wrapper.append('<ul class="options">');
      }
      trigger = wrapper.find('.trigger');
      options = wrapper.find('.options');
      disabled = sel.prop('disabled');
      if (disabled) {
        wrapper.addClass('disabled');
      }
      updateTriggerText = function() {
        var triggerHtml;
        triggerHtml = settings.triggerTemplate(sel.find(':selected'));
        return trigger.html(triggerHtml);
      };
      sel.on('blur.fs', function() {
        if (trigger.hasClass('open')) {
          return setTimeout(function() {
            return trigger.trigger('close.fs');
          }, 120);
        }
      });
      trigger.on('close.fs', function() {
        trigger.removeClass('open');
        return options.removeClass('open');
      });
      trigger.on('click.fs', function() {
        var offParent, parent;
        if (!disabled) {
          trigger.toggleClass('open');
          if (isiOS && !settings.forceiOS) {
            if (trigger.hasClass('open')) {
              return sel.focus();
            }
          } else {
            if (trigger.hasClass('open')) {
              parent = trigger.parent();
              offParent = parent.offsetParent();
              if ((parent.offset().top + parent.outerHeight() + options.outerHeight() + 20) > $(window).height() + $(window).scrollTop()) {
                options.addClass('overflowing');
              } else {
                options.removeClass('overflowing');
              }
            }
            options.toggleClass('open');
            if (!isiOS) {
              return sel.focus();
            }
          }
        }
      });
      sel.on('enable', function() {
        sel.prop('disabled', false);
        wrapper.removeClass('disabled');
        disabled = false;
        return copyOptionsToList();
      });
      sel.on('disable', function() {
        sel.prop('disabled', true);
        wrapper.addClass('disabled');
        return disabled = true;
      });
      sel.on('change.fs', function(e) {
        if (e.originalEvent && e.originalEvent.isTrusted) {
          return e.stopPropagation();
        } else {
          return updateTriggerText();
        }
      });
      sel.on('keydown', function(e) {
        var hovered, newHovered, w;
        w = e.which;
        hovered = options.find('.hover');
        hovered.removeClass('hover');
        if (!options.hasClass('open')) {
          if (w === 13 || w === 32 || w === 38 || w === 40) {
            e.preventDefault();
            return trigger.trigger('click.fs');
          }
        } else {
          if (w === 38) {
            e.preventDefault();
            if (hovered.length && hovered.index() > 0) {
              hovered.prev().addClass('hover');
            } else {
              options.find('li:last-child').addClass('hover');
            }
          } else if (w === 40) {
            e.preventDefault();
            if (hovered.length && hovered.index() < options.find('li').length - 1) {
              hovered.next().addClass('hover');
            } else {
              options.find('li:first-child').addClass('hover');
            }
          } else if (w === 27) {
            e.preventDefault();
            trigger.trigger('click.fs');
          } else if (w === 13 || w === 32) {
            e.preventDefault();
            hovered.trigger('mousedown.fs');
          } else if (w === 9) {
            if (trigger.hasClass('open')) {
              trigger.trigger('close.fs');
            }
          }
          newHovered = options.find('.hover');
          if (newHovered.length) {
            options.scrollTop(0);
            return options.scrollTop(newHovered.position().top - 12);
          }
        }
      });
      options.on('mousedown.fs', 'li', function(e) {
        var clicked;
        clicked = $(this);
        sel.val(clicked.data('raw-value'));
        if (!isiOS) {
          sel.trigger('blur.fs').trigger('focus.fs');
        }
        options.find('.selected').removeClass('selected');
        clicked.addClass('selected');
        trigger.addClass('selected');
        return sel.val(clicked.data('raw-value')).trigger('change.fs').trigger('blur.fs').trigger('focus.fs');
      });
      options.on('mouseenter.fs', 'li', function() {
        var hovered, nowHovered;
        nowHovered = $(this);
        hovered = options.find('.hover');
        hovered.removeClass('hover');
        return nowHovered.addClass('hover');
      });
      options.on('mouseleave.fs', 'li', function() {
        return options.find('.hover').removeClass('hover');
      });
      copyOptionsToList = function() {
        var selOpts;
        updateTriggerText();
        if (isiOS && !settings.forceiOS) {
          return;
        }
        selOpts = sel.find('option');
        return sel.find('option').each(function(i, opt) {
          var optHtml;
          opt = $(opt);
          if (!opt.prop('disabled') && (opt.val() || settings.includeBlank)) {
            optHtml = settings.optionTemplate(opt);
            if (opt.prop('selected')) {
              return options.append("<li data-raw-value=\"" + (opt.val()) + "\" class=\"selected\">" + optHtml + "</li>");
            } else {
              return options.append("<li data-raw-value=\"" + (opt.val()) + "\">" + optHtml + "</li>");
            }
          }
        });
      };
      sel.on('update.fs', function() {
        wrapper.find('.options').empty();
        return copyOptionsToList();
      });
      return copyOptionsToList();
    });
  };

}).call(this);
/*
 *  jQuery Hosted Payments - v3.1.0
 *
 *  Made by Erik Zettersten
 *  Under MIT License
 */
(function($, window, document, undefined) {

    var pluginName = "hp",
        defaults = {};

    defaults.version = "v3.2.0";
    defaults.amount = 0;
    defaults.baseUrl = "https://www.etsemoney.com/hp/v3/adapters";
    defaults.defaultCardCharacters = "&middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot; &middot;&middot;&middot;&middot;";
    defaults.defaultDateCharacters = "&middot;&middot;";
    defaults.defaultNameOnCardName = "Name On Card";
    defaults.defaultNameOnCardNameSwipe = "Swipe/Scan Card";
    defaults.defaultName = "Full Name";
    defaults.defaultPhone = "800-834-7790";
    defaults.defaultErrorLabel = "Declined";
    defaults.defaultRedirectLabel = "You are being redirected...";
    defaults.defaultSuccessLabel = "Transaction Complete!";
    defaults.paymentTypeOrder = [0, 1];
    defaults.paymentService = "EFT";
    defaults.defaultAccountNumberCharacters = "&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;";
    defaults.defaultRoutingNumberCharacters = "&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;&middot;";
    defaults.correlationId = "";
    defaults.successCallback = $.noop;
    defaults.errorCallback = $.noop;
    defaults.onSwipeStartCallback = $.noop;
    defaults.onSwipeEndCallback = $.noop;
    defaults.ignoreSubmission = false;
    defaults.terminalId = "";
    defaults.instrumentId = "";
    defaults.apiKey = "";
    defaults.billingAddress = {};
    defaults.billingAddress.addressLine1 = "";
    defaults.billingAddress.postalCode = "";
    defaults.antiForgeryToken = "";
    defaults.antiForgeryName = "__RequestVerificationToken";
    defaults.customerName = "";

    function Plugin(element, options) {
        this._name = pluginName;
        this.element = element;
        hp.Utils.__options = jQuery.extend(true, {}, options);
        hp.Utils.defaults = jQuery.extend({}, defaults, options);
        hp.Utils.__original = jQuery.extend(true, {}, hp.Utils.defaults);
        this.init();
    }

    /*
     * Main
     */
    var intialize = function() {

        var that = this,
            $element = $(that.element),
            sessionId = "",
            apiKey = "",
            createdOn = (new Date()).toISOString();

        if (typeof $element.data("etsKey") !== "undefined") {
            apiKey = $element.data("etsKey").toString();
            hp.Utils.defaults.apiKey = apiKey;
        } else {
            apiKey = hp.Utils.defaults.apiKey;
        }

        if (typeof $element.data("avsStreet") !== "undefined") {
            hp.Utils.defaults.billingAddress.addressLine1 = $element.data("avsStreet").toString();
        }

        if (typeof $element.data("avsZip") !== "undefined") {
            hp.Utils.defaults.billingAddress.postalCode = $element.data("avsZip").toString();
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

        if (typeof $element.data("ignoreSubmission") !== "undefined") {
            hp.Utils.defaults.ignoreSubmission = $element.data("ignoreSubmission").toString().toLowerCase() === "true";
        }

        if (typeof $element.data("paymentTypeOrder") !== "undefined") {
            hp.Utils.defaults.paymentTypeOrder = $.trim($element.data("paymentTypeOrder").toString().replace(" ", "")).split(",").map(function(item) {
                return +item;
            });
        }

        if (typeof $element.data("amount") !== "undefined") {
            hp.Utils.setAmount($element.data("amount"));
        }

        if (typeof $element.data("antiForgeryToken") !== "undefined") {
            hp.Utils.defaults.antiForgeryToken = $element.data("antiForgeryToken").toString();
        } else {
            hp.Utils.defaults.antiForgeryToken = hp.Utils.generateGuild();
        }

        if (typeof $element.data("antiForgeryName") !== "undefined") {
            hp.Utils.defaults.antiForgeryName = $element.data("antiForgeryName").toString();
        }

        $element.attr("data-ets-key", hp.Utils.generateGuild());

        hp.Utils.setSession(apiKey, true);
        hp.Utils.setPaymentInstrument();

        hp.Utils.makeRequest({
            "signIn": {
                "signInRequest": {
                    "apiKey": apiKey
                }
            }
        }).then(function(res) {

            sessionId = res.token;
            hp.Utils.setSession(res.token);

            setupInstances();

        }, function(res) {

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
                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
                });
            }

        });

        var setupInstances = function() {

            // Handle instance
            hp.Utils.createInstance($element, function(instance) {

                if (sessionId === "") {
                    return;
                }

                // So that a new instance is forced (this will change in the future).
                if (that.hasRun) {
                    location.href = location.href;
                    return;
                }

                // The same elements across many instances
                var $this = $element,
                    $submit = $this.find(".hp-submit"),
                    $all = $this.find(".hp-input"),
                    clearInputs = $.noop();

                instance.init();
                instance.attachEvents();

                /*
                 * Transvault 
                 *      Methods for handling swipes through a terminal
                 * @description:
                 *      Invoke terminal and communicate to this instance unqiuely
                 */
                if (instance.isTransvault()) {

                    $this
                        .off()
                        .on("hp.transvaultSuccess", function(e, data) {

                            var _response = data;

                            instance.showSuccess();
                            hp.Utils.hideLoader();

                            if (!hp.Utils.shouldSuccessPostBack()) {
                                hp.Utils.defaults.successCallback(_response);
                            } else {
                                hp.Utils.buildFormFromObject(_response).then(function($form) {
                                    $form.attr("action", hp.Utils.defaults.successCallback).submit();
                                });
                            }

                        })
                        .on("hp.transvaultError", function(e, data) {

                            var message = "";
                            var bypass = false;

                            if (typeof data !== "undefined" && typeof data.error !== "undefined") {
                                message = data.error.description;
                            } else if (typeof data !== "undefined" && typeof data.error === "undefined") {
                                message = data;
                            } else {
                                message = "Unable to parse message from server. Most likely an unhandled event.";
                                bypass = true;
                            }

                            var errorResponse = {
                                "status": bypass ? "Warning" : "Error",
                                "message": message,
                                "created_on": createdOn,
                                "token": sessionId
                            };

                            if (bypass) {
                                console.warn(errorResponse);
                                console.dir(data);
                                return;
                            }

                            if (!hp.Utils.shouldErrorPostBack()) {
                                hp.Utils.showError(errorResponse.message);
                                hp.Utils.defaults.errorCallback(errorResponse);
                            } else {
                                hp.Utils.buildFormFromObject(errorResponse).then(function($form) {
                                    $form.attr("action", hp.Utils.defaults.errorCallback).submit();
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
                if (instance.isCode() || instance.isBankAccount() || instance.isCreditCard()) {

                    $this
                        .off()
                        .on("hp.submit", function(e, eventResponse) {

                            if (eventResponse.type === instance.requestTypes.charge) {
                                instance.handleSuccess(eventResponse.res);
                                hp.Utils.hideLoader();
                            }

                            if (eventResponse.type === instance.requestTypes.error) {
                                instance.handleError(eventResponse.res);
                                hp.Utils.hideLoader();
                            }

                            instance.clearInputs();

                        });

                }

            });

        };

    };

    $.extend(Plugin.prototype, {

        init: function() {

            var $element = $(this.element),
                name = "",
                type = hp.types.Adapter;

            if ($element.data("event") !== null && typeof $element.data("event") !== "undefined") {
                type = hp.types.Event;
                name = $element.data("event");
            }

            if ($element.data("inventory") !== null && typeof $element.data("inventory") !== "undefined") {
                type = hp.types.Product;
                name = $element.data("inventory");
            }

            // Get outer wrapper width and set css class for mobile purposes
            hp.Utils.setContainerClass($element);

            if (type === hp.types.Event) {

                name = $element.data("event");

            } else if (type === hp.types.Product) {

                name = $element.data("inventory");

            } else if (type === hp.types.Adapter) {

                intialize.call(this);

                hp.Utils.__instances.push(this);

                return;
            }

            var email = $element.data("email"),
                bcc = $element.data("bcc"),
                clientId = $element.data("client"),
                showMemoField = typeof $element.data("memo") === "undefined" ? false : true,
                ga = $element.data("ga"),
                orderId = $element.data("order"),
                subject = $element.data("subject");

            var setup = new hp.Setup(type, new hp.models.Options(clientId, email, bcc, showMemoField, ga, orderId, name, subject));

            $element.find("[data-item]").each(function() {
                var item = new hp.models.Item($(this).data("item"), $(this).data("price"));
                setup.addItem(item);
            });

            $element.empty();

            setup.createForm(this.element, hp.Utils.defaults.baseUrl).then(function(iframe) {
                $element
                    .width(iframe.width)
                    .height(iframe.height)
                    .css("margin", "0 auto");
            });

        }
    });

    $.fn[pluginName] = function(options) {
        this.each(function() {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
        return this;
    };

})(jQuery, window, document);
