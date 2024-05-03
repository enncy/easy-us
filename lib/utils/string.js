"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringUtils = exports.$string = void 0;
/**
 * 字符串工具库
 */
exports.$string = {
    /**
     * 驼峰转目标字符串
     * @param value
     */
    humpToTarget(value, target) {
        return value
            .replace(/([A-Z])/g, target + '$1')
            .toLowerCase()
            .split(target)
            .slice(1)
            .join(target);
    }
};
class StringUtils {
    constructor(_text) {
        this._text = _text;
    }
    /** 删除换行符 */
    static nowrap(str) {
        return (str === null || str === void 0 ? void 0 : str.replace(/\n/g, '')) || '';
    }
    /** 删除换行符 */
    nowrap() {
        this._text = StringUtils.nowrap(this._text);
        return this;
    }
    /** 删除空格，多个空格只留一个 */
    static nospace(str) {
        return (str === null || str === void 0 ? void 0 : str.replace(/ +/g, ' ')) || '';
    }
    /** 删除空格，多个空格只留一个 */
    nospace() {
        this._text = StringUtils.nospace(this._text);
        return this;
    }
    /** 删除特殊字符 */
    static noSpecialChar(str) {
        return (str === null || str === void 0 ? void 0 : str.replace(/[^\w\s]/gi, '')) || '';
    }
    /** 删除特殊字符 */
    noSpecialChar() {
        this._text = StringUtils.noSpecialChar(this._text);
        return this;
    }
    /** 最大长度，剩余显示省略号 */
    static max(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    }
    /** 最大长度，剩余显示省略号 */
    max(len) {
        this._text = StringUtils.max(this._text, len);
        return this;
    }
    /** 隐藏字符串 */
    static hide(str, start, end, replacer = '*') {
        // 从 start 到 end 中间的字符串全部替换成 replacer
        return str.substring(0, start) + str.substring(start, end).replace(/./g, replacer) + str.substring(end);
    }
    /** 隐藏字符串 */
    hide(start, end, replacer = '*') {
        this._text = StringUtils.hide(this._text, start, end, replacer);
        return this;
    }
    /**
     * 根据字符串创建 StringUtils 对象
     * @param text  字符串
     */
    static of(text) {
        return new StringUtils(text);
    }
    toString() {
        return this._text;
    }
}
exports.StringUtils = StringUtils;
