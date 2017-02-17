/**
 * deep-links v0.1
 *
 * Author: Rashin Sergey
 * GitHub: https://github.com/SerRashin/deep-links
 *
 */

(function (root, factory) {
    if ( typeof define === 'function' && define.amd ) {
        define('deeplink', factory(root));
    } else if ( typeof exports === 'object' ) {
        module.exports = factory(root);
    } else {
        root['deeplink'] = factory(root);
    }
})(window || this, function(root) {
    "use strict";

    if (!root.document || !root.navigator) {
        return;
    }

    /**
     * Set up scope variables and settings
     */
    var timeout,
        defaults = {
            iOS: {},
            android: {},
            windows: {},
            desktop: {},
            delay: 1000,
            delta: 500
        },
        links = {
            android:{},
            windows:{},
            iOS:{},
            desktop:''
        },
        OSStore = {
            windows: {
                store: {
                    app: 'zune:navigate?appid={id}',
                    web: 'https://www.microsoft.com/ru-ru/store/p/{name}/{id}'
                },
                test: /Windows\s+Phone|IEMobile/i
            },

            android: {
                store: {
                    app: 'market://details?id={id}',
                    web: 'https://play.google.com/store/apps/details?id={id}'
                },
                test: /Android/i
            },

            iOS: {
                store: {
                    app: 'itms-apps://itunes.apple.com/app/{name}/id{id}?mt=8',
                    web: 'https://itunes.apple.com/en/app/id{id}'
                },
                test: /iPhone|iPad|iPod/i
            }
        };

    if (!Object.keys) {
        Object.keys = function(obj) {
            var keys = [];

            for (var i in obj) {
                if (obj.hasOwnProperty(i)) {
                    keys.push(i);
                }
            }

            return keys;
        };
    }

    // Get user agent
    var getOSStoreAgent = function() {
        for(var k in OSStore) {
            if(navigator.userAgent.match(OSStore[k].test)) {
                return k;
            }
        }

        return 'desktop';
    };

    var openURI = function(url) {
        window.location.href = url;
    };

    function browser() {
        var ua = navigator.userAgent;

        if (ua.search(/Edge/) > -1) return 'edge';
        if (ua.search(/MSIE/) > -1) return 'ie';
        if (ua.search(/Trident/) > -1) return 'ie11';
        if (ua.search(/Firefox/) > -1) return 'firefox';
        if (ua.search(/Opera/) > -1) return 'opera';
        if (ua.search(/OPR/) > -1) return 'operaWebkit';
        if (ua.search(/YaBrowser/) > -1) return 'yabrowser';
        if (ua.search(/Chrome/) > -1) return 'chrome';
        if (ua.search(/Safari/) > -1) return 'safari';
        if (ua.search(/Maxthon/) > -1) return 'maxthon';

        return "browser";
    }

    /**
     * Merge defaults with user options
     * @private
     * @param {Object} defaults Default settings
     * @param {Object} options User options
     * @returns {Object} Merged values of defaults and options
     */
    var extend = function(defaults, options) {
        var key, extended = {};
        for(key in defaults) {
            extended[key] = defaults[key];
        }
        for(key in options) {
            extended[key] = options[key];
        }
        return extended;
    };

    var setStoreLinks = function() {
        var os, params, appId, appName;

        for(os in defaults) {
            if (defaults.hasOwnProperty(os)) {
                params = defaults[os];
                var store = OSStore[os];

                if (typeof store !== 'undefined') {
                    store = store.store;
                    if (
                        typeof params === 'object' &&
                        typeof store === 'object' &&
                        Object.keys(store).length > 0
                    ) {
                        appId = params.appId;
                        appName = params.appName;

                        links[os].app = store.app.replace('{id}', appId).replace('{name}', appName);
                        links[os].web = store.web.replace('{id}', appId).replace('{name}', appName);
                    }
                } else if (os === 'desktop') {
                    links[os] = params['appUrl'];
                }
            }
        }
    };

    var isDesktop = function () {
        return getOSStoreAgent() === 'desktop';
    };

    var isAndroid = function () {
        return getOSStoreAgent() === 'android';
    };

    var isIOS = function () {
        return getOSStoreAgent() === 'iOS';
    };

    function _createHiddenIframe(target, uri) {
        var iframe = document.createElement('iframe');
        iframe.src = uri;
        iframe.id = 'hiddenIframe';
        iframe.style.display = 'none';
        target.appendChild(iframe);
        return iframe;
    }

    /**************************
     *          IE
     **************************/
    function openUriWithMsLaunchUri(uri) {
        navigator.msLaunchUri(uri,
            function(){},
            function(){
                openNewTab(links.desktop);
            }
        );
    }

    function getIEVersion() {
        var rv = -1, ua = navigator.userAgent, re;
        if (navigator.appName === 'Microsoft Internet Explorer') {
            re = new RegExp('MSIE ([0-9]{1,}[\.0-9]{0,})');
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        } else if (navigator.appName === 'Netscape') {
            re = new RegExp('Trident/.*rv:([0-9]{1,}[\.0-9]{0,})');
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        }
        return rv;
    }

    function openUriUsingIEInOlderWindows(uri) {
        if (getIEVersion() === 10) {
            openUriUsingIE10InWindows7(uri);
        } else if (getIEVersion() === 9 || getIEVersion() === 11) {
            openUriWithHiddenFrame(uri);
        } else {
            openUriInNewWindowHack(uri);
        }
    }

    function openUriUsingIE10InWindows7(uri) {
        var timeout = setTimeout(function(){
            openNewTab(links.desktop);
        }, 1000);
        window.addEventListener('blur', function () {
            clearTimeout(timeout);
        });

        var iframe = document.querySelector('#hiddenIframe');
        if (!iframe) {
            iframe = _createHiddenIframe(document.body, "about:blank");
        }
        try {
            iframe.contentWindow.location.href = uri;
        } catch (e) {
            openNewTab(links.desktop);
            clearTimeout(timeout);
        }
    }

    function openUriWithHiddenFrame(uri) {
        var timeout = setTimeout(function () {
            openNewTab(links.desktop);
            handler.remove();
        }, 1000);

        var iframe = document.querySelector('#hiddenIframe');
        if (!iframe) {
            iframe = _createHiddenIframe(document.body, 'about:blank');
        }

        var handler = _registerEvent(window, 'blur', onBlur);

        function onBlur() {
            clearTimeout(timeout);
            handler.remove();
        }

        iframe.contentWindow.location.href = uri;
    }

    function openUriInNewWindowHack(uri) {
        var myWindow = window.open('', '', 'width=0,height=0');

        myWindow.document.write("<iframe src='" + uri + "'></iframe>");

        setTimeout(function () {
            try {
                myWindow.location.href;
                myWindow.setTimeout('window.close()', 1000);
            } catch (e) {
                myWindow.close();
                openNewTab(links.desktop);
            }
        }, 1000);
    }
    /**************************
     *          IE
     **************************/

    function openUsingFirefox(uri) {
        var iframe = document.querySelector('#hiddenIframe');

        if (!iframe) {
            iframe = _createHiddenIframe(document.body, 'about:blank');
        }

        try {
            iframe.contentWindow.location.href = uri;
        } catch (e) {
            if (e.name == 'NS_ERROR_UNKNOWN_PROTOCOL') {
                openNewTab(links.desktop);
            }
        }
    }

    function openUriWithTimeoutHack(uri) {
        var target = window;
        while (target != target.parent) {
            target = target.parent;
        }

        var handler = _registerEvent(target, 'blur', onBlur);

        var timeout = setTimeout(function () {
            openNewTab(links.desktop);
            handler.remove();
        }, 1000);

        function onBlur() {
            clearTimeout(timeout);
            handler.remove();
        }

        openURI(uri);
    }

    function _registerEvent(target, eventType, cb) {
        if (target.addEventListener) {
            target.addEventListener(eventType, cb);
            return {
                remove: function () {
                    target.removeEventListener(eventType, cb);
                }
            };
        } else {
            target.attachEvent(eventType, cb);
            return {
                remove: function () {
                    target.detachEvent(eventType, cb);
                }
            };
        }
    }

    function openNewTab(url) {
        if (url) {
            var form = document.createElement("form");

            form.id = 'open-tab-fake-form';
            form.method = 'GET';
            form.action = url;
            form.target = '_blank';
            document.body.appendChild(form);
            form.submit();

            if (typeof Element.prototype.remove === 'undefined') {
                document.body.removeChild(form);
            } else {
                form.remove();
            }
        }
    }

    var setup = function(options) {
        defaults = extend(defaults, options);
        setStoreLinks();
    };

    var openFallback = function(ts) {
        return function() {
            var uri = links[getOSStoreAgent()].app;

            if (typeof uri === "string" && (Date.now() - ts) < (defaults.delay + defaults.delta)) {
                openURI(uri);
            }
        }
    }

    /**
     * Open deep-links
     * @param uri
     * @param options
     * @returns {boolean}
     */
    var open = function(uri, options) {
        if (options) {
            setup(options);
        }

        if (!isDesktop()) {

            if (isAndroid() && !navigator.userAgent.match(/Firefox/)) {
                var matches = uri.match(/([^:]+):\/\/(.+)$/i);
                uri = 'intent://' + matches[2] + '#Intent;scheme=' + matches[1];
                uri += ';package=' + defaults.android.appId + ';end';
            }

            if (navigator.userAgent.match(/Chrome/)) {
                clearTimeout(timeout);
                openURI(uri);
            } else if (isIOS()) {
                var time = (new Date()).getTime();
                setTimeout(function(){
                    if(confirm('Мы не смогли определить есть ли у вас приложение. Если у вас нет приложения нажмите "ОК", для начала установки.')){
                        document.location = links.iOS.app;
                    }
                }, 2500);

                document.location=uri;
            } else {
                timeout = setTimeout(openFallback(Date.now()), defaults.delay);

                var iframe = document.createElement('iframe');
                iframe.onload = function() {
                    clearTimeout(timeout);
                    iframe.parentNode.removeChild(iframe);
                    openURI(uri);
                };

                iframe.src = uri;
                iframe.setAttribute('style', 'display:none;');
                document.body.appendChild(iframe);
            }
        } else {
            if (navigator.msLaunchUri) {
                openUriWithMsLaunchUri(uri)
            } else {
                var br = browser();

                if (br === 'firefox') {
                    openUsingFirefox(uri);
                } else if (br === 'chrome') {
                    openUriWithTimeoutHack(uri);
                } else if (br === 'ie') {
                    openUriUsingIEInOlderWindows(uri);
                } else if (br === 'safari') {
                    /* хоть как-то !!! */
                    openUriWithTimeoutHack(uri);
                }
            }
        }

        return true;
    };

    // Public API
    return {
        setup: setup,
        open: open
    };
});
