"use strict";

(function($, window, document, undefined) {
    var pluginName = "eshop";
    var version = "v4.2.1";
    var defaults = {
        issuerId: null,
        apiKey: null,
        publicKey: null,
        baseUrl: "https://app.emoney.com/store/",
        slug: null
    };
    var $outerWrap = $("<div />", {
        id: "hp-eshop-wrapper"
    });
    var $iframe = $("<iframe />", {
        "class": "hp-eshop-iframe"
    });
    $iframe.attr("frameborder", 0);
    $iframe.attr("scrolling", "no"); // The actual plugin constructor

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
        },
        listenForMessage: function listenForMessage() {
            (function(a, b) {
                a.addEventListener("message", function(a) {
                    b.getElementById("hp-eshop-wrapper").setAttribute("style", "padding-bottom:" + a.data[1] + "px;");
                }, !1);
            })(window, document);
        },
        addElementToPluginElement: function addElementToPluginElement() {
            var _this = this;

            this.element.hide();
            $outerWrap.append($iframe);
            this.element.append($outerWrap);
            this.getSlug().then(function(slug) {
                $iframe.attr("src", _this.options.baseUrl + slug);
                $iframe.ready(function() {
                    _this.element.fadeIn();

                    _this.listenForMessage();
                });
            });
        },
        getSlug: function getSlug() {
            var deferred = $.Deferred();
            var slug = this.options.slug;
            setTimeout(function() {
                deferred.resolve(slug);
            }, 5000);
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
})(jQuery, window, document);