"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableElementDraggable = exports.$$el = exports.$el = exports.el = void 0;
function el(tagName, attrsOrChildren, childrenOrHandler) {
    const element = document.createElement(tagName);
    if (attrsOrChildren) {
        if (Array.isArray(attrsOrChildren)) {
            element.append(...attrsOrChildren);
        }
        else if (typeof attrsOrChildren === 'string') {
            element.append(attrsOrChildren);
        }
        else {
            const attrs = attrsOrChildren;
            /** 设置属性 */
            for (const key in attrs) {
                if (Object.prototype.hasOwnProperty.call(attrs, key)) {
                    if (key === 'style') {
                        Object.assign(element.style, attrs[key]);
                    }
                    else {
                        const value = attrs[key];
                        Reflect.set(element, key, value);
                    }
                }
            }
        }
    }
    if (childrenOrHandler) {
        if (typeof childrenOrHandler === 'function') {
            childrenOrHandler.call(element, element);
        }
        else if (Array.isArray(childrenOrHandler)) {
            element.append(...childrenOrHandler);
        }
        else if (typeof childrenOrHandler === 'string') {
            element.append(childrenOrHandler);
        }
    }
    return element;
}
exports.el = el;
/**
 * 选择元素，效果等同于 document.querySelector(selector)
 */
function $el(selector, root = window.document) {
    const el = root.querySelector(selector);
    return el === null ? undefined : el;
}
exports.$el = $el;
/**
 * 选择元素列表，效果等同于 document.querySelectorAll(selector)
 */
function $$el(selector, root = window.document) {
    return Array.from(root.querySelectorAll(selector));
}
exports.$$el = $$el;
/**
 * 使元素可以被拖动
 * @param header 拖动块
 * @param target 移动块
 */
function enableElementDraggable(header, target, ondrag) {
    let pos1 = 0;
    let pos2 = 0;
    let pos3 = 0;
    let pos4 = 0;
    header.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e = e || window.event;
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event;
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        target.style.top = Math.max(target.offsetTop - pos2, 10) + 'px';
        target.style.left = target.offsetLeft - pos1 + 'px';
    }
    function closeDragElement() {
        ondrag === null || ondrag === void 0 ? void 0 : ondrag();
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
exports.enableElementDraggable = enableElementDraggable;
