/* eslint-disable no-undef */
import { CustomElementTagMap } from '../elements/interface';
import { resolveCustomElementName } from './common';

/**
 * 可自定义元素样式的属性
 */
export type CustomElementStyleAttrs<E extends Record<string, any>> = {
	[K in keyof E]: K extends 'style' ? Partial<CSSStyleDeclaration> : E[K];
};

export type AllElementTagMaps = HTMLElementTagNameMap & CustomElementTagMap;
export type AllElementTagKeys = keyof AllElementTagMaps;
/** 子元素 */
export type ElementChildren = (string | Node | { new (): HTMLElement })[] | string;
/** 元素属性 */
export type ElementAttrs<K extends AllElementTagKeys> = CustomElementStyleAttrs<Partial<AllElementTagMaps[K]>>;

/** 元素处理回调 */
export type ElementHandler<K extends AllElementTagKeys | CustomElementConstructor> = (
	this: K extends AllElementTagKeys ? AllElementTagMaps[K] : AllElementTagMaps['div'],
	el: K extends AllElementTagKeys ? AllElementTagMaps[K] : AllElementTagMaps['div']
) => void;

type CustomElementConstructor = { new (): HTMLElement };

/**
 * ==================== 两个参数的情况 ====================
 */
/**
 * 创建元素，效果等同于 document.createElement
 * @param element  	标签名或者自定义元素构造函数
 * @param attrs  	元素属性
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	attrs: K extends AllElementTagKeys
		? ElementAttrs<K>
		: K extends abstract new () => any
		? Partial<CustomElementStyleAttrs<InstanceType<K>>>
		: unknown
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * 创建元素，效果等同于 document.createElement
 * @param element	标签名或者自定义元素构造函数
 * @param children	子元素列表
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	children?: ElementChildren
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * 创建元素，效果等同于 document.createElement
 * @param element  				标签名或者自定义元素构造函数
 * @param attrsOrChildren 		元素属性，或者子元素列表，或者字符串
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	attrsOrChildren?:
		| (K extends AllElementTagKeys
				? ElementAttrs<K>
				: K extends abstract new () => any
				? Partial<CustomElementStyleAttrs<InstanceType<K>>>
				: unknown)
		| ElementChildren
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * ==================== 三个参数的情况 ====================
 */
/**
 * 创建元素，效果等同于 document.createElement
 * @param element 	标签名或者自定义元素构造函数
 * @param attrs 	元素属性
 * @param children 	子元素列表
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	attrs?: K extends AllElementTagKeys
		? ElementAttrs<K>
		: K extends abstract new () => any
		? Partial<CustomElementStyleAttrs<InstanceType<K>>>
		: unknown,
	children?: ElementChildren
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * 创建元素，效果等同于 document.createElement
 * @param element  	标签名或者自定义元素构造函数
 * @param attrs  	元素属性
 * @param handler  	元素生成的回调函数
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	attrs?: K extends AllElementTagKeys
		? ElementAttrs<K>
		: K extends abstract new () => any
		? Partial<CustomElementStyleAttrs<InstanceType<K>>>
		: unknown,
	handler?: ElementHandler<K extends AllElementTagKeys ? K : typeof HTMLDivElement>
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * 创建元素，效果等同于 document.createElement
 * @param element  	标签名或者自定义元素构造函数
 * @param children 	子元素列表
 * @param handler 	元素生成的回调函数
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	children?: ElementChildren,
	handler?: ElementHandler<K extends AllElementTagKeys ? K : typeof HTMLDivElement>
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
/**
 * 创建元素，效果等同于 document.createElement(tagName, options)
 * @param element 标签名或者自定义元素构造函数
 * @param attrsOrChildren 元素属性，或者子元素列表，或者字符串
 * @param childrenOrHandler 子元素列表，或者元素生成的回调函数
 */
export function h<K extends AllElementTagKeys | CustomElementConstructor>(
	element: K,
	attrsOrChildren?:
		| (K extends AllElementTagKeys
				? ElementAttrs<K>
				: K extends abstract new () => any
				? Partial<CustomElementStyleAttrs<InstanceType<K>>>
				: unknown)
		| ElementChildren,
	childrenOrHandler?: ElementChildren | ElementHandler<K extends AllElementTagKeys ? K : typeof HTMLDivElement>
): K extends AllElementTagKeys ? AllElementTagMaps[K] : K {
	let name = '';
	if (typeof element === 'function') {
		name = resolveCustomElementName(element, '-');
	} else {
		name = element;
	}
	const el = document.createElement(name) as HTMLElement;
	if (attrsOrChildren) {
		if (Array.isArray(attrsOrChildren)) {
			for (const child of attrsOrChildren) {
				if (typeof child === 'function') {
					el.append(document.createElement(child.name));
				} else {
					el.append(child);
				}
			}
		} else if (typeof attrsOrChildren === 'string') {
			el.append(attrsOrChildren);
		} else {
			const attrs = attrsOrChildren;
			/** 设置属性 */
			for (const key in attrs) {
				if (Object.prototype.hasOwnProperty.call(attrs, key)) {
					if (key === 'style') {
						Object.assign(el.style, attrs[key]);
					} else {
						const value = attrs[key];
						Reflect.set(el, key, value);
					}
				}
			}
		}
	}
	if (childrenOrHandler) {
		if (typeof childrenOrHandler === 'function') {
			childrenOrHandler.call(el as any, el as any);
		} else if (Array.isArray(childrenOrHandler)) {
			for (const child of childrenOrHandler) {
				if (typeof child === 'function') {
					el.append(document.createElement(child.name));
				} else {
					el.append(child);
				}
			}
		} else if (typeof childrenOrHandler === 'string') {
			el.append(childrenOrHandler);
		}
	}
	return el as K extends AllElementTagKeys ? AllElementTagMaps[K] : K;
}

/**
 * 选择元素，效果等同于 document.querySelector(selector)
 */
export function $el<T extends HTMLElement>(selector: string, root: HTMLElement | Document = window.document) {
	const el = root.querySelector(selector);
	return el === null ? undefined : (el as (T & { [x: string]: any }) | undefined);
}

/**
 * 选择元素列表，效果等同于 document.querySelectorAll(selector)
 */
export function $$el<T extends HTMLElement>(selector: string, root: HTMLElement | Document = window.document) {
	return Array.from(root.querySelectorAll(selector) as unknown as (T & { [x: string]: any })[]);
}

/**
 * 使元素可以被拖动
 * @param header 拖动块
 * @param target 移动块
 */
export function enableElementDraggable(header: HTMLElement, target: HTMLElement, ondrag?: () => void) {
	let pos1 = 0;
	let pos2 = 0;
	let pos3 = 0;
	let pos4 = 0;

	header.onmousedown = dragMouseDown;

	function dragMouseDown(e: MouseEvent) {
		e = e || window.event;

		// get the mouse cursor position at startup:
		pos3 = e.clientX;
		pos4 = e.clientY;
		document.onmouseup = closeDragElement;
		// call a function whenever the cursor moves:
		document.onmousemove = elementDrag;
	}

	function elementDrag(e: MouseEvent) {
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
		ondrag?.();
		// stop moving when mouse button is released:
		document.onmouseup = null;
		document.onmousemove = null;
	}
}
