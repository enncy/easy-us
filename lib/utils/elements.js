"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$elements = void 0;
const dom_1 = require("./dom");
const wrapper = (0, dom_1.el)('div');
const root = wrapper.attachShadow({ mode: 'closed' });
const tooltipContainer = (0, dom_1.el)('div', { className: 'tooltip-container' });
root.append(tooltipContainer);
/**
 * 全局元素
 */
exports.$elements = {
    /** 整个悬浮窗的 div 包裹元素 */
    wrapper,
    /** ShadowRoot 根元素 */
    root,
    tooltipContainer
};
