/// <reference types="node" />
import { HeaderElement } from '../elements/header';
import { ScriptPanelElement } from '../elements/script.panel';
import { StartConfig } from '../utils/start';
import { CommonEventEmitter } from './common';
import { Config } from './config';
import EventEmitter from 'events';
export type ScriptConfigsProvider<T extends Record<string, Config>> = T | {
    (): T;
};
export interface ScriptOptions<C extends Record<string, Config>> {
    name: string;
    /** 运行的链接，如果是 string 类型，可以提供用户跳转功能 [链接的解释,链接/正则表达式][] */
    matches: (string | RegExp)[] | [string, string | RegExp][];
    /** 排除的链接 [链接的解释,链接/正则表达式][] */
    excludes?: (string | RegExp)[] | [string, string | RegExp][];
    /** 脚本唯一命名空间 */
    namespace?: string;
    /** 脚本提示 */
    notes?: string[];
    /** 脚本配置 */
    configs?: ScriptConfigsProvider<C>;
    /** 不显示脚本页 */
    hideInPanel?: boolean;
    /** 运行优先级 */
    priority?: number;
}
export type ScriptConfigs = {
    /** 脚本提示 */
    readonly notes?: {
        defaultValue: string;
    };
} & Record<string, Config>;
export type ScriptMethods = Record<string, (...args: any[]) => any>;
type ScriptEvent = {
    /** 在脚本加载时立即运行的事件 */
    start: (...args: any[]) => any;
    /** 在页面初始化完成时（元素可被访问）时运行的事件 */
    active: (...args: any[]) => any;
    /** 在页面完全加载时运行的事件 */
    complete: (...args: any[]) => any;
    /** 当路由修改时运行的事件 */
    hashchange: (...args: any[]) => any;
    /** 当 history 被 push 或者 replace 修改时运行的事件 */
    historychange: (type: 'push' | 'replace', ...args: any[]) => any;
    /** 在渲染的时候执行的事件，（面板之间切换时会重复渲染） */
    render: (elements: {
        panel: ScriptPanelElement;
        header: HeaderElement;
    }) => any;
    /** 在页面离开时执行的事件 */
    beforeunload: (...args: any[]) => undefined | boolean;
    /** 发生错误时 */
    scripterror: (err: string) => void;
};
export declare class BaseScript<E extends ScriptEvent = ScriptEvent> extends CommonEventEmitter<E> {
    /** 在脚本加载时立即运行的钩子 */
    onstart?: (...args: any[]) => any;
    /** 在页面初始化完成时（元素可被访问）时运行的钩子 */
    onactive?: (...args: any[]) => any;
    /** 在页面完全加载时运行的钩子 */
    oncomplete?: (...args: any[]) => any;
    /** 当路由修改时运行的钩子 */
    onhashchange?: (...args: any[]) => any;
    /** 当 history 被 push 或者 replace 修改时运行的钩子 */
    onhistorychange?: (type: 'push' | 'replace', ...args: any[]) => any;
    /** 在渲染的时候执行的钩子，（面板之间切换时会重复渲染） */
    onrender?: (elements: {
        panel: ScriptPanelElement;
        header: HeaderElement;
    }) => any;
    /** 在页面离开时执行的钩子 */
    onbeforeunload?: (...args: any[]) => undefined | boolean;
    /** 发生错误时 */
    onerror?: (err: string) => void;
}
/**
 * 脚本
 */
export declare class Script<C extends ScriptConfigs = ScriptConfigs, M extends ScriptMethods = ScriptMethods> extends BaseScript<ScriptEvent> {
    /** 未经处理的 configs 原对象 */
    private _configs?;
    /** 存储已经处理过的 configs 对象，避免重复调用方法 */
    private _resolvedConfigs?;
    /** 启动参数，由外部方法统一赋值 */
    startConfig?: StartConfig;
    /** 名字 */
    name: string;
    /** 工程名，如果是独立脚本则为空 */
    projectName?: string;
    /** 运行的链接 [链接的解释,链接/正则表达式][] */
    matches: (string | RegExp)[] | [string, string | RegExp][];
    /** 排除的链接 [链接的解释,链接/正则表达式][] */
    excludes?: (string | RegExp)[] | [string, string | RegExp][];
    /** 唯一命名空间，用于避免 config 重名 */
    namespace?: string;
    /** 后台脚本（不提供管理页面） */
    hideInPanel?: boolean;
    /** 通过 configs 映射并经过解析后的配置对象 */
    cfg: {
        [K in keyof C]: C[K]['defaultValue'];
    } & {
        notes?: string;
    };
    /** 经过初始化页面脚本注入的页面元素，如果初始化脚本未运行，则此元素为空 */
    panel?: ScriptPanelElement;
    /** 操作面板头部元素 */
    header?: HeaderElement;
    /** 脚本暴露给外部调用的方法 */
    methods: M;
    /** 自定义事件触发器，避免使用 script.emit , script.on 导致与原有的事件冲突，使用 script.event.emit 和 script.event.on */
    event: EventEmitter;
    /** 运行优先级，默认0 */
    priority: number;
    get configs(): C | undefined;
    set configs(c: C | undefined);
    constructor({ name, namespace, matches, excludes, configs, hideInPanel, onstart, onactive, oncomplete, onbeforeunload, onrender, onhistorychange, methods, priority }: ScriptOptions<C> & {
        onstart?: (this: Script<C, M>, ...args: any) => any;
        onactive?: (this: Script<C, M>, ...args: any) => any;
        oncomplete?: (this: Script<C, M>, ...args: any) => any;
        onhashchange?: (this: Script<C, M>, ...args: any) => any;
        onbeforeunload?: (this: Script<C, M>, ...args: any) => any;
        onrender?: (this: Script<C, M>, elements: {
            panel: ScriptPanelElement;
            header: HeaderElement;
        }) => any;
        onhistorychange?: (this: Script<C, M>, type: 'push' | 'replace', ...args: any[]) => any;
        methods?: (this: Script<C>) => M;
    });
    onConfigChange<K extends keyof C>(key: K, handler: (curr: C[K]['defaultValue'], pre: C[K]['defaultValue'], remote: boolean) => any): number | void;
    offConfigChange(listener: number | void | EventListener): void;
    /**
     * 获取全路径名
     */
    fullName(): string;
    private errorHandler;
}
export {};
