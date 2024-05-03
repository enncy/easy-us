"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFunctionEventListener = exports.start = exports.$win = void 0;
/* global */
const custom_window_1 = require("../interfaces/custom-window");
const render_1 = require("../render/render");
const common_1 = require("./common");
const const_1 = require("./const");
const store_1 = require("./store");
const debounce_1 = __importDefault(require("lodash/debounce"));
let mounted = false;
/**
 * 启动项目
 * @param startConfig 启动配置
 */
function start(startConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // 添加当前标签唯一id
        const uid = yield store_1.$store.getTab(const_1.$const.TAB_UID);
        if (uid === undefined) {
            yield store_1.$store.setTab(const_1.$const.TAB_UID, common_1.$.uuid());
        }
        /** 为对象添加响应式特性，在设置值的时候同步到本地存储中 */
        startConfig.projects = startConfig.projects.map((p) => {
            for (const key in p.scripts) {
                if (Object.prototype.hasOwnProperty.call(p.scripts, key)) {
                    p.scripts[key].cfg = common_1.$.createConfigProxy(p.scripts[key]);
                }
            }
            return p;
        });
        const scripts = common_1.$.getMatchedScripts(startConfig.projects, [location.href]).sort((a, b) => b.priority - a.priority);
        /** 执行脚本 */
        scripts.forEach((script) => {
            var _a;
            script.startConfig = startConfig;
            script.emit('start', startConfig);
            (_a = script.onstart) === null || _a === void 0 ? void 0 : _a.call(script, startConfig);
        });
        /** 防止 onactive 执行两次 */
        let active = false;
        /**
         * 如果页面加载元素较少，或者网速极快的情况下
         * 存在一开始就是 active 或者 complete 的情况
         */
        if (document.readyState === 'interactive') {
            active = true;
            /** 挂载悬浮窗 */
            mount(startConfig);
            scripts.forEach((script) => { var _a; return (_a = script.onactive) === null || _a === void 0 ? void 0 : _a.call(script, startConfig); });
        }
        else if (document.readyState === 'complete') {
            /** 挂载悬浮窗 */
            mount(startConfig);
            scripts.forEach((script) => { var _a; return (_a = script.onactive) === null || _a === void 0 ? void 0 : _a.call(script, startConfig); });
            scripts.forEach((script) => { var _a; return (_a = script.oncomplete) === null || _a === void 0 ? void 0 : _a.call(script, startConfig); });
        }
        /**
         * 监听 readystatechange
         */
        document.addEventListener('readystatechange', () => {
            /** 挂载悬浮窗 */
            mount(startConfig);
            if (document.readyState === 'interactive' &&
                /** 防止执行两次 */
                active === false) {
                /** 运行脚本 */
                scripts.forEach((script) => {
                    var _a;
                    script.emit('active', startConfig);
                    (_a = script.onactive) === null || _a === void 0 ? void 0 : _a.call(script, startConfig);
                });
            }
            if (document.readyState === 'complete') {
                scripts.forEach((script) => {
                    var _a;
                    script.emit('complete');
                    (_a = script.oncomplete) === null || _a === void 0 ? void 0 : _a.call(script, startConfig);
                });
                /**
                 * 每个脚本加载之后，统计每个脚本当前所运行的页面链接，链接不会重复
                 * 初始化页面的脚本可以根据此链接列表，进行脚本页面的生成
                 */
                store_1.$store.getTab(const_1.$const.TAB_URLS).then((urls) => {
                    store_1.$store.setTab(const_1.$const.TAB_URLS, Array.from(new Set(urls || [])).concat(location.href));
                });
            }
        });
        /**
         * 监听路由更改
         */
        window.addEventListener('hashchange', () => {
            scripts.forEach((script) => {
                var _a;
                script.emit('hashchange', startConfig);
                (_a = script.onhashchange) === null || _a === void 0 ? void 0 : _a.call(script, startConfig);
            });
        });
        /**
         * 监听 history 更改
         */
        history.pushState = addFunctionEventListener(history, 'pushState');
        history.replaceState = addFunctionEventListener(history, 'replaceState');
        window.addEventListener('pushState', () => {
            scripts.forEach((script) => {
                var _a;
                script.emit('historychange', 'push', startConfig);
                (_a = script.onhistorychange) === null || _a === void 0 ? void 0 : _a.call(script, 'push', startConfig);
            });
        });
        window.addEventListener('replaceState', () => {
            scripts.forEach((script) => {
                var _a;
                script.emit('historychange', 'replace', startConfig);
                (_a = script.onhistorychange) === null || _a === void 0 ? void 0 : _a.call(script, 'replace', startConfig);
            });
        });
        /**
         * 监听页面离开
         */
        window.addEventListener('beforeunload', (e) => {
            var _a;
            let prevent;
            for (const script of scripts) {
                script.emit('beforeunload');
                if ((_a = script.onbeforeunload) === null || _a === void 0 ? void 0 : _a.call(script, startConfig)) {
                    prevent = true;
                }
            }
            if (prevent) {
                e.preventDefault();
                e.returnValue = true;
                return true;
            }
        });
    });
}
exports.start = start;
/**
 * 添加事件调用监听器
 */
function addFunctionEventListener(obj, type) {
    const origin = obj[type];
    return function (...args) {
        // @ts-ignore
        const res = origin.apply(this, args);
        const e = new Event(type.toString());
        // @ts-ignore
        e.arguments = args;
        window.dispatchEvent(e);
        return res;
    };
}
exports.addFunctionEventListener = addFunctionEventListener;
function mount(startConfig) {
    if (mounted === true) {
        return;
    }
    mounted = true;
    /** 移除上一次加载页面时遗留下来的 url 加载数据 */
    store_1.$store.setTab(const_1.$const.TAB_URLS, []);
    if (self === top) {
        const { projects, renderConfig } = startConfig;
        const scripts = common_1.$.getMatchedScripts(projects, [location.href]).filter((s) => !!s.hideInPanel === false);
        if (scripts.length <= 0) {
            return;
        }
        const win = new custom_window_1.CustomWindow(startConfig.projects, store_1.$store, {
            render: {
                title: renderConfig.title,
                styles: renderConfig.styles,
                defaultPanelName: renderConfig.defaultPanelName,
                fontsize: render_1.RenderScript.cfg.fontsize,
                switchPoint: render_1.RenderScript.cfg.switchPoint
            },
            store: {
                getPosition: () => {
                    return { x: render_1.RenderScript.cfg.x, y: render_1.RenderScript.cfg.y };
                },
                setPosition: (x, y) => {
                    render_1.RenderScript.cfg.x = x;
                    render_1.RenderScript.cfg.y = y;
                },
                getVisual: () => {
                    return render_1.RenderScript.cfg.visual;
                },
                setVisual: (size) => {
                    render_1.RenderScript.cfg.visual = size;
                },
                getRenderURLs() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return yield store_1.$store.getTab(const_1.$const.TAB_URLS);
                    });
                },
                setRenderURLs(urls) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return yield store_1.$store.setTab(const_1.$const.TAB_URLS, urls);
                    });
                },
                getCurrentPanelName() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return yield store_1.$store.getTab(const_1.$const.TAB_CURRENT_PANEL_NAME);
                    });
                },
                setCurrentPanelName(name) {
                    return __awaiter(this, void 0, void 0, function* () {
                        return yield store_1.$store.setTab(const_1.$const.TAB_CURRENT_PANEL_NAME, name);
                    });
                }
            }
        });
        render_1.RenderScript.onConfigChange('fontsize', (fs) => {
            win.setFontSize(fs);
        });
        render_1.RenderScript.onConfigChange('visual', (v) => {
            win.setVisual(v);
        });
        store_1.$store.addTabChangeListener(const_1.$const.TAB_URLS, (0, debounce_1.default)((urls) => {
            win.changeRenderURLs(urls);
        }, 2000));
        store_1.$store.addTabChangeListener(const_1.$const.TAB_CURRENT_PANEL_NAME, (name) => {
            win.changePanel(name);
        });
        win.mount(document.body);
        exports.$win = win;
    }
}
