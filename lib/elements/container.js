"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContainerElement = void 0;
const common_1 = require("../utils/common");
const creator_1 = require("../utils/creator");
const dom_1 = require("../utils/dom");
const interface_1 = require("./interface");
/** 面板主体元素 */
class ContainerElement extends interface_1.IElement {
    constructor() {
        super(...arguments);
        /** 头部 */
        this.header = creator_1.$creator.tooltip((0, dom_1.el)('header-element', { title: '菜单栏-可拖动区域' }));
        /** 内容 */
        this.body = (0, dom_1.el)('div', { className: 'body', clientHeight: window.innerHeight / 2 });
        /** 底部 */
        this.footer = (0, dom_1.el)('div', { className: 'footer' });
    }
    connectedCallback() {
        this.append(this.header, this.body, this.footer);
        common_1.$.onresize(this, (cont) => {
            cont.body.style.maxHeight = window.innerHeight - this.header.clientHeight - 100 + 'px';
            cont.body.style.maxWidth = window.innerWidth - 50 + 'px';
        });
    }
}
exports.ContainerElement = ContainerElement;
