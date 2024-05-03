"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigElement = void 0;
const creator_1 = require("../utils/creator");
const dom_1 = require("../utils/dom");
const interface_1 = require("./interface");
/**
 * 配置表单元素
 *
 * 可以根据 {@link Script.configs} 在面板中生成设置表单，并对数据进行双向绑定。
 *
 */
class ConfigElement extends interface_1.IElement {
    constructor(store) {
        super();
        /** 描述 */
        this.label = (0, dom_1.el)('label');
        /** 外层 */
        this.wrapper = (0, dom_1.el)('div', { className: 'config-wrapper' });
        this.key = '';
        this.store = store;
    }
    /**
     * 注意这里的 value 和 provider.value 是不同的，provider 是真正的输入元素，而 ConfigElement 只是外层元素。
     */
    get value() {
        return this.store.get(this.key, this.defaultValue);
    }
    set value(value) {
        this.provider.value = value;
        this.store.set(this.key, value);
    }
    connectedCallback() {
        var _a, _b, _c;
        switch (this.tag) {
            case 'select': {
                this.provider = (0, dom_1.el)('select');
                // select 表情不能直接设置 value ，需要根据子元素 selected
                const value = this.store.get(this.key, this.defaultValue);
                // 创建选项
                for (const item of this.options || []) {
                    const option = (0, dom_1.el)('option');
                    if (Array.isArray(item)) {
                        option.value = item[0];
                        option.textContent = (_a = item[1]) !== null && _a !== void 0 ? _a : item[0];
                        if (item[2]) {
                            option.title = item[2];
                        }
                        if (item[0] === value) {
                            option.selected = true;
                            option.toggleAttribute('selected');
                        }
                        this.provider.add(option);
                    }
                    else {
                        option.value = item.value;
                        option.textContent = (_b = item.label) !== null && _b !== void 0 ? _b : item.value;
                        if (item.title) {
                            option.title = item.title;
                        }
                        if (item.value === value) {
                            option.selected = true;
                            option.toggleAttribute('selected');
                        }
                        this.provider.add(option);
                    }
                }
                this.provider.onchange = () => {
                    this.store.set(this.key, this.provider.value);
                };
                break;
            }
            case 'textarea': {
                this.provider = (0, dom_1.el)('textarea');
                this.provider.value = this.store.get(this.key, this.defaultValue);
                this.provider.onchange = () => {
                    this.store.set(this.key, this.provider.value);
                };
                break;
            }
            default: {
                this.provider = (0, dom_1.el)('input');
                if (['checkbox', 'radio'].some((t) => { var _a; return t === ((_a = this.attrs) === null || _a === void 0 ? void 0 : _a.type); })) {
                    this.provider.checked = this.store.get(this.key, this.defaultValue);
                    const provider = this.provider;
                    provider.onchange = () => {
                        this.store.set(this.key, provider.checked);
                    };
                }
                else {
                    this.provider.value = this.store.get(this.key, this.defaultValue);
                    this.provider.setAttribute('value', this.provider.value);
                    this.provider.onchange = () => {
                        const { min, max, type } = (this.attrs || {});
                        /** 计算属性，不能超过 min 和 max */
                        if (type === 'number') {
                            if (this.provider.value.trim() === '') {
                                this.provider.value = this.defaultValue;
                                this.store.set(this.key, this.defaultValue);
                                return;
                            }
                            const val = parseFloat(this.provider.value);
                            const _min = min ? parseFloat(min) : undefined;
                            const _max = max ? parseFloat(max) : undefined;
                            if (_min && val < _min) {
                                this.provider.value = _min.toString();
                                this.store.set(this.key, parseFloat(this.provider.value));
                            }
                            else if (_max && val > _max) {
                                this.provider.value = _max.toString();
                                this.store.set(this.key, parseFloat(this.provider.value));
                            }
                            else {
                                this.store.set(this.key, val);
                            }
                        }
                        else {
                            this.store.set(this.key, this.provider.value);
                        }
                    };
                }
                break;
            }
        }
        this.wrapper.replaceChildren(this.provider);
        this.append(this.label, this.wrapper);
        // 合并元素属性
        for (const key in this.attrs) {
            if (key === 'style') {
                Object.assign(this.provider.style, this.attrs[key]);
                continue;
            }
            if (Object.prototype.hasOwnProperty.call(this.attrs, key)) {
                Reflect.set(this.provider, key, Reflect.get(this.attrs, key));
            }
        }
        // 处理跨域
        if (this.sync) {
            this.store.addChangeListener(this.key, (pre, curr, remote) => {
                this.provider.value = curr;
            });
        }
        // 处理提示
        creator_1.$creator.tooltip(this.provider);
        /**
         * 触发输入组件的加载回调
         * 可用于高度定制化组件
         */
        (_c = this._onload) === null || _c === void 0 ? void 0 : _c.call(this.provider, this);
    }
}
exports.ConfigElement = ConfigElement;
