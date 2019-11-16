define(['../util'], function (util) {
    'use strict';
    return class PluginLess {
        constructor(coder, options) {
            var priority = 20;
            options = util.extend(options, {});
            if (typeof window.less === 'undefined') {
                return;
            }
            coder.$container.querySelector('a[data-coder-type="css"]').innerHTML = 'Less';
            coder.on('change', this.change.bind(this), priority);
        }
        isLess(params) {
            if (params.type !== 'css') {
                return false;
            }
            return params.file.indexOf('.less') !== -1 || params.file === '';
        }
        change(params, callback) {
            if (this.isLess(params)) {
                window.less.render(params.content, this.options, (err, res) => {
                    if (err) {
                        return callback(err, params);
                    } else {
                        params.content = res.css;
                    }
                    callback(null, params);
                });
            } else {
                callback(null, params);
            }
        }
    };
});