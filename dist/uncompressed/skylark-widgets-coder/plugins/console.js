define(['../util'], function (util) {
    'use strict';
    return class PluginConsole {
        constructor(coder, options) {
            options = util.extend(options, { autoClear: false });
            var priority = 30;
            var history = [];
            var historyIndex = 0;
            var logCaptureSnippet = `(function ${ this.capture.toString() })();`;
            var contentCache = {
                html: '',
                css: '',
                js: ''
            };
            var $nav = document.createElement('li');
            util.addClass($nav, 'coder-nav-item coder-nav-item-console');
            $nav.innerHTML = '<a href="#" data-coder-type="console">JS Console</a>';
            var $pane = document.createElement('div');
            util.addClass($pane, 'coder-pane coder-pane-console');
            $pane.innerHTML = `
      <div class="coder-console-container">
        <ul class="coder-console-output"></ul>
        <form class="coder-console-input">
          <input type="text">
        </form>
      </div>
      <button class="coder-button coder-console-clear">Clear</button>
    `;
            coder.$container.appendChild($pane);
            coder.$container.querySelector('.coder-nav').appendChild($nav);
            var $container = coder.$container.querySelector('.coder-console-container');
            var $output = coder.$container.querySelector('.coder-console-output');
            var $input = coder.$container.querySelector('.coder-console-input input');
            var $inputForm = coder.$container.querySelector('.coder-console-input');
            var $clear = coder.$container.querySelector('.coder-console-clear');
            $inputForm.addEventListener('submit', this.submit.bind(this));
            $input.addEventListener('keydown', this.history.bind(this));
            $clear.addEventListener('click', this.clear.bind(this));
            if (options.autoClear === true) {
                coder.on('change', this.autoClear.bind(this), priority - 1);
            }
            coder.on('change', this.change.bind(this), priority);
            window.addEventListener('message', this.getMessage.bind(this));
            this.$coderContainer = coder.$container;
            this.$container = $container;
            this.$input = $input;
            this.$output = $output;
            this.history = history;
            this.historyIndex = historyIndex;
            this.logCaptureSnippet = logCaptureSnippet;
            this.contentCache = contentCache;
            this.getIframe = this.getIframe.bind(this);
        }
        getIframe() {
            return this.$coderContainer.querySelector('.coder-pane-result iframe');
        }
        getMessage(e) {
            if (e.source !== this.getIframe().contentWindow) {
                return;
            }
            var data = {};
            try {
                data = JSON.parse(e.data);
            } catch (err) {
            }
            if (data.type === 'coder-console-log') {
                this.log(data.message);
            }
        }
        autoClear(params, callback) {
            var snippetlessContent = params.content;
            if (params.type === 'js') {
                snippetlessContent = snippetlessContent.replace(this.logCaptureSnippet, '');
            }
            if (params.forceRender === true || this.contentCache[params.type] !== snippetlessContent) {
                this.clear();
            }
            this.contentCache[params.type] = snippetlessContent;
            callback(null, params);
        }
        change(params, callback) {
            if (params.type !== 'js') {
                return callback(null, params);
            }
            if (params.content.indexOf(this.logCaptureSnippet) === -1) {
                params.content = `${ this.logCaptureSnippet }${ params.content }`;
            }
            callback(null, params);
        }
        capture() {
            if (typeof window.console === 'undefined' || typeof window.console.log === 'undefined') {
                window.console = {
                    log: function () {
                    }
                };
            }
            var oldConsoleLog = Function.prototype.bind.call(window.console.log, window.console);
            window.console.log = function () {
                [].slice.call(arguments).forEach(function (message) {
                    window.parent.postMessage(JSON.stringify({
                        type: 'coder-console-log',
                        message: message
                    }), '*');
                });
                oldConsoleLog.apply(oldConsoleLog, arguments);
            };
        }
        log(message = '', type) {
            var $log = document.createElement('li');
            util.addClass($log, 'coder-console-log');
            if (typeof type !== 'undefined') {
                util.addClass($log, `coder-console-log-${ type }`);
            }
            $log.innerHTML = message;
            this.$output.appendChild($log);
        }
        submit(e) {
            var inputValue = this.$input.value.trim();
            if (inputValue === '') {
                return e.preventDefault();
            }
            this.history.push(inputValue);
            this.historyIndex = this.history.length;
            this.log(inputValue, 'history');
            if (inputValue.indexOf('return') !== 0) {
                inputValue = 'return ' + inputValue;
            }
            try {
                var scriptOutput = this.getIframe().contentWindow.eval(`(function() {${ inputValue }})()`);
                this.log(scriptOutput);
            } catch (err) {
                this.log(err, 'error');
            }
            this.$input.value = '';
            this.$container.scrollTop = this.$container.scrollHeight;
            e.preventDefault();
        }
        clear() {
            this.$output.innerHTML = '';
        }
        history(e) {
            var UP = 38;
            var DOWN = 40;
            var gotHistory = false;
            var selectionStart = this.$input.selectionStart;
            if (e.keyCode === UP && this.historyIndex !== 0 && selectionStart === 0) {
                this.historyIndex--;
                gotHistory = true;
            }
            if (e.keyCode === DOWN && this.historyIndex !== this.history.length - 1 && selectionStart === this.$input.value.length) {
                this.historyIndex++;
                gotHistory = true;
            }
            if (gotHistory) {
                this.$input.value = this.history[this.historyIndex];
            }
        }
    };
});