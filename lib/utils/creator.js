"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$creator = void 0;
const common_1 = require("./common");
const dom_1 = require("./dom");
const elements_1 = require("./elements");
const tampermonkey_1 = require("./tampermonkey");
let popupWin;
window.addEventListener('beforeunload', () => {
    popupWin === null || popupWin === void 0 ? void 0 : popupWin.close();
});
/**
 * 元素创建器
 */
exports.$creator = {
    /** 创建多行的文本，支持 字符串，元素，以及包含字符串元素的列表，最多二维数组 */
    notes(lines, tag = 'ul') {
        return (0, dom_1.el)(tag, lines.map((line) => (0, dom_1.el)('li', Array.isArray(line)
            ? line.map((node) => (typeof node === 'string' ? (0, dom_1.el)('div', { innerHTML: node }) : node))
            : [typeof line === 'string' ? (0, dom_1.el)('div', { innerHTML: line }) : line])));
    },
    /**
     * 启动元素提示气泡，根据元素 title 即时显示，（兼容手机端的提示）
     * @param target
     */
    tooltip(target) {
        target.setAttribute('data-title', target.title);
        // 油猴环境下，取消默认title，避免系统默认事件重复显示
        if (typeof tampermonkey_1.$gm.getInfos() !== 'undefined') {
            target.removeAttribute('title');
        }
        const onMouseMove = (e) => {
            if (elements_1.$elements.tooltipContainer.style.display !== 'none') {
                elements_1.$elements.tooltipContainer.style.top = e.y + 'px';
                elements_1.$elements.tooltipContainer.style.left = e.x + 'px';
            }
        };
        const showTitle = (e) => {
            const dataTitle = target.getAttribute('data-title');
            if (dataTitle) {
                elements_1.$elements.tooltipContainer.innerHTML = dataTitle.split('\n').join('<br>') || '';
                elements_1.$elements.tooltipContainer.style.top = e.y + 'px';
                elements_1.$elements.tooltipContainer.style.left = e.x + 'px';
                elements_1.$elements.tooltipContainer.style.display = 'block';
            }
            else {
                elements_1.$elements.tooltipContainer.style.display = 'none';
            }
            window.addEventListener('mousemove', onMouseMove);
        };
        const hideTitle = () => {
            elements_1.$elements.tooltipContainer.style.display = 'none';
            window.removeEventListener('mousemove', onMouseMove);
        };
        hideTitle();
        target.addEventListener('mouseenter', showTitle);
        target.addEventListener('click', showTitle);
        target.addEventListener('mouseout', hideTitle);
        target.addEventListener('mouseleave', hideTitle);
        target.addEventListener('blur', hideTitle);
        return target;
    },
    input(attrs, children, handler) {
        return (0, dom_1.el)('input', attrs, function (input) {
            input.append(...(children || []));
            input.classList.add('base-style-input');
            handler === null || handler === void 0 ? void 0 : handler.apply(this, [input]);
        });
    },
    button(text, attrs, handler) {
        return (0, dom_1.el)('input', Object.assign({ type: 'button' }, attrs), function (btn) {
            btn.value = text || '';
            btn.classList.add('base-style-button');
            handler === null || handler === void 0 ? void 0 : handler.apply(this, [btn]);
        });
    },
    // 创建脚本面板
    scriptPanel(script, store, opts) {
        var _a, _b;
        const scriptPanel = (0, dom_1.el)('script-panel-element', { name: script.name });
        // 监听提示内容改变
        script.onConfigChange('notes', (pre, curr) => {
            scriptPanel.notesContainer.innerHTML = script.cfg.notes || '';
        });
        // 注入 panel 对象 ， 脚本可修改 panel 对象进行面板的内容自定义
        script.panel = scriptPanel;
        scriptPanel.notesContainer.innerHTML = ((_b = (_a = script.configs) === null || _a === void 0 ? void 0 : _a.notes) === null || _b === void 0 ? void 0 : _b.defaultValue) || '';
        let configs = Object.create({});
        const elList = [];
        for (const key in script.configs) {
            if (Object.prototype.hasOwnProperty.call(script.configs, key)) {
                const cfg = script.configs[key];
                // 如果存在分隔符
                if (cfg.separator) {
                    // 将之前的配置项生成配置区域，并添加到列表中
                    elList.push(exports.$creator.configsArea(exports.$creator.configs(script.namespace, store, configs || {}, opts === null || opts === void 0 ? void 0 : opts.onload)));
                    // 添加分隔符
                    elList.push((0, dom_1.el)('div', { className: 'separator', style: { margin: '0px 8px' } }, cfg.separator));
                    // 清空配置项
                    configs = Object.create({});
                }
                configs[key] = cfg;
            }
        }
        // 如果还有剩余的配置项，生成配置区域，并添加到列表中
        if (Object.keys(configs).length > 0) {
            elList.push(exports.$creator.configsArea(exports.$creator.configs(script.namespace, store, configs || {}, opts === null || opts === void 0 ? void 0 : opts.onload)));
        }
        scriptPanel.configsContainer.replaceChildren(...elList);
        return scriptPanel;
    },
    /** 创建独立的设置区域 */
    configsArea(configElements) {
        /** 创建设置板块 */
        const configsContainer = (0, dom_1.el)('div', { className: 'configs card' });
        /** 设置区域主体 */
        const configsBody = (0, dom_1.el)('div', { className: 'configs-body' });
        configsBody.append(...Object.entries(configElements).map(([key, el]) => el));
        configsContainer.append(configsBody);
        return configsContainer;
    },
    /** 创建设置元素 */
    configs(namespace, store, configs, onload) {
        const elements = Object.create({});
        for (const key in configs) {
            if (Object.prototype.hasOwnProperty.call(configs, key)) {
                const config = configs[key];
                if (config.label !== undefined) {
                    const element = (0, dom_1.el)('config-element', {
                        key: common_1.$.namespaceKey(namespace, key),
                        tag: config.tag,
                        sync: config.sync,
                        attrs: config.attrs,
                        _onload: function (el) {
                            var _a;
                            (_a = config.onload) === null || _a === void 0 ? void 0 : _a.call(this, el);
                            onload === null || onload === void 0 ? void 0 : onload(el);
                        },
                        defaultValue: config.defaultValue,
                        options: config.options
                    });
                    element.store = store;
                    element.label.textContent = config.label;
                    elements[key] = element;
                }
            }
        }
        return elements;
    },
    /**
     * 生成一个复制按钮
     * @param name 按钮名
     * @param value 复制内容
     */
    copy(name, value) {
        return (0, dom_1.el)('span', '📄' + name, (btn) => {
            btn.className = 'copy';
            btn.addEventListener('click', () => {
                btn.innerText = '已复制√';
                navigator.clipboard.writeText(value);
                setTimeout(() => {
                    btn.innerText = '📄' + name;
                }, 500);
            });
        });
    },
    /**
     * 创建一个取消默认事件的文字按钮，如果不点击，则执行默认事件
     * @param  opts 参数
     */
    preventText(opts) {
        const { name, delay = 3, autoRemove = true, ondefault, onprevent } = opts;
        const span = (0, dom_1.el)('span', name);
        span.style.textDecoration = 'underline';
        span.style.cursor = 'pointer';
        span.onclick = () => {
            clearTimeout(id);
            if (autoRemove) {
                span.remove();
            }
            onprevent === null || onprevent === void 0 ? void 0 : onprevent(span);
        };
        const id = setTimeout(() => {
            if (autoRemove) {
                span.remove();
            }
            ondefault(span);
        }, delay * 1000);
        return span;
    },
    /**
     * 创建关于问题题目的拓展功能按钮，包括复制和百度一下
     * @param question 问题
     */
    createQuestionTitleExtra(question) {
        const space = exports.$creator.space([
            exports.$creator.copy('复制', question),
            (0, dom_1.el)('span', { className: 'question-title-extra-btn', innerText: '🌏百度一下' }, (btn) => {
                btn.onclick = () => {
                    popupWin === null || popupWin === void 0 ? void 0 : popupWin.close();
                    popupWin = common_1.$.createCenteredPopupWindow(`https://www.baidu.com/s?wd=${question}`, '百度搜索', {
                        width: 1000,
                        height: 800,
                        resizable: true,
                        scrollbars: true
                    });
                };
            })
        ], { x: 4 });
        space.style.marginTop = '6px';
        space.style.textAlign = 'right';
        return (0, dom_1.el)('div', { style: { textAlign: 'right' } }, [space]);
    },
    /**
     * 将所有子元素隔开
     * x: 默认 12
     * y: 默认 0
     * separator: 默认 ' '
     */
    space(children, options) {
        return (0, dom_1.el)('div', { className: 'space' }, (div) => {
            var _a, _b, _c;
            for (let index = 0; index < children.length; index++) {
                const child = (0, dom_1.el)('span', { className: 'space-item' }, [children[index]]);
                child.style.display = 'inline-block';
                const x = (_a = options === null || options === void 0 ? void 0 : options.x) !== null && _a !== void 0 ? _a : 12;
                const y = (_b = options === null || options === void 0 ? void 0 : options.y) !== null && _b !== void 0 ? _b : 0;
                if (index > 0) {
                    child.style.marginLeft = x / 2 + 'px';
                    child.style.marginRight = x / 2 + 'px';
                    child.style.marginTop = y / 2 + 'px';
                    child.style.marginBottom = y / 2 + 'px';
                }
                else {
                    child.style.marginRight = x / 2 + 'px';
                    child.style.marginBottom = y / 2 + 'px';
                }
                div.append(child);
                if (index !== children.length - 1) {
                    div.append((0, dom_1.el)('span', [(_c = options === null || options === void 0 ? void 0 : options.separator) !== null && _c !== void 0 ? _c : ' ']));
                }
            }
        });
    }
};
