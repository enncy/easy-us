import { CustomElementTagMap } from '../elements/interface';
/**
 * 可自定义元素样式的属性
 */
export type CustomElementStyleAttrs<E extends Record<string, any>> = {
    [K in keyof E]: K extends 'style' ? Partial<CSSStyleDeclaration> : E[K];
};
export type AllElementTagMaps = HTMLElementTagNameMap & CustomElementTagMap;
export type AllElementTagKeys = keyof AllElementTagMaps;
/** 子元素 */
export type ElementChildren = (string | Node)[] | string;
/** 元素属性 */
export type ElementAttrs<K extends AllElementTagKeys> = CustomElementStyleAttrs<Partial<AllElementTagMaps[K]>>;
/** 元素处理回调 */
export type ElementHandler<K extends AllElementTagKeys> = (this: AllElementTagMaps[K], el: AllElementTagMaps[K]) => void;
/**
 * 创建元素，效果等同于 document.createElement(tagName, options)
 * @param tagName 标签名
 * @param attrsOrChildren 元素属性，或者子元素列表，或者字符串
 * @param childrenOrHandler 子元素列表，或者元素生成的回调函数
 */
export declare function el<K extends AllElementTagKeys>(tagName: K, children?: ElementChildren): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, attrs?: ElementAttrs<K>): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, attrsOrChildren?: ElementAttrs<K> | ElementChildren): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, attrs?: ElementAttrs<K>, children?: (string | HTMLElement)[] | string): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, attrs?: ElementAttrs<K>, handler?: ElementHandler<K>): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, children?: ElementChildren, handler?: ElementHandler<K>): AllElementTagMaps[K];
export declare function el<K extends AllElementTagKeys>(tagName: K, attrs?: ElementAttrs<K>, childrenOrHandler?: ElementChildren | ElementHandler<K>): AllElementTagMaps[K];
/**
 * 选择元素，效果等同于 document.querySelector(selector)
 */
export declare function $el<T extends HTMLElement>(selector: string, root?: HTMLElement | Document): (T & {
    [x: string]: any;
}) | undefined;
/**
 * 选择元素列表，效果等同于 document.querySelectorAll(selector)
 */
export declare function $$el<T extends HTMLElement>(selector: string, root?: HTMLElement | Document): (T & {
    [x: string]: any;
})[];
/**
 * 使元素可以被拖动
 * @param header 拖动块
 * @param target 移动块
 */
export declare function enableElementDraggable(header: HTMLElement, target: HTMLElement, ondrag?: () => void): void;
