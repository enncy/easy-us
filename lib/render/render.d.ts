import { ModalElement } from '../elements';
import { Script, ScriptConfigsProvider } from '../interfaces/script';
import { MessageAttrs, ModalAttrs, ScriptIdentify } from '../interfaces/custom-window';
/**
 * 内置的渲染脚本，包含在内置的 RenderProject 类中。搭配 start 函数进行整个脚本的悬浮窗构成创建
 *
 * 可以不用悬浮窗也能执行脚本的生命周期，但是不会执行 render 这个生命周期
 */
export declare const createRenderScript: (config?: {
    name?: string;
    matches?: (string | RegExp)[];
    namespace?: string;
    configs?: ScriptConfigsProvider<any>;
}) => Script<any, {
    /**
     * 判断当前脚本是否置顶
     * 因为在 4.2.x 版本之后，所有面板都会进行显示，某些脚本可以根据这个方法是否已显示在页面中
     * @param script 脚本
     */
    isPinned: (script: any) => Promise<boolean> | undefined;
    /**
     * 将当前的脚本置顶
     * @param script 脚本
     */
    pin: (script: any) => Promise<void> | undefined;
    /**
     * 最小化窗口
     */
    minimize: () => void | undefined;
    /**
     * 将窗口最小化，并移动至窗口边缘
     */
    moveToEdge: () => void | undefined;
    normal: () => void;
}>;
export declare const RenderScript: Script<any, {
    /**
     * 判断当前脚本是否置顶
     * 因为在 4.2.x 版本之后，所有面板都会进行显示，某些脚本可以根据这个方法是否已显示在页面中
     * @param script 脚本
     */
    isPinned: (script: any) => Promise<boolean> | undefined;
    /**
     * 将当前的脚本置顶
     * @param script 脚本
     */
    pin: (script: any) => Promise<void> | undefined;
    /**
     * 最小化窗口
     */
    minimize: () => void | undefined;
    /**
     * 将窗口最小化，并移动至窗口边缘
     */
    moveToEdge: () => void | undefined;
    normal: () => void;
}>;
export declare function $modal(type: ModalElement['type'], attrs: ModalAttrs): HTMLDivElement | undefined;
export declare function $message(type: 'info' | 'success' | 'warn' | 'error', attrs: MessageAttrs): import("../elements").MessageElement | undefined;
export declare function $menu(label: string, config: {
    scriptPanelLink?: ScriptIdentify;
}): HTMLButtonElement | undefined;
