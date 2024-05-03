"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$menu = exports.$message = exports.$modal = exports.RenderScript = exports.createRenderScript = void 0;
const script_1 = require("../interfaces/script");
const creator_1 = require("../utils/creator");
const dom_1 = require("../utils/dom");
const start_1 = require("../utils/start");
const interfaces_1 = require("../interfaces");
/**
 * 内置的渲染脚本，包含在内置的 RenderProject 类中。搭配 start 函数进行整个脚本的悬浮窗构成创建
 *
 * 可以不用悬浮窗也能执行脚本的生命周期，但是不会执行 render 这个生命周期
 */
const createRenderScript = (config) => new script_1.Script({
    name: (config === null || config === void 0 ? void 0 : config.name) || '🖼️ 窗口设置',
    matches: (config === null || config === void 0 ? void 0 : config.matches) || [['所有', /.*/]],
    namespace: (config === null || config === void 0 ? void 0 : config.namespace) || 'render.panel',
    configs: (config === null || config === void 0 ? void 0 : config.configs) || {
        notes: {
            defaultValue: creator_1.$creator.notes([
                [
                    '如果需要隐藏整个窗口，可以点击下方隐藏按钮，',
                    '隐藏后可以快速三击屏幕中的任意地方',
                    '来重新在鼠标位置显示窗口。'
                ],
                '窗口连续点击显示的次数可以自定义，默认为三次',
                ['窗口快捷键列表：', 'ctrl + o : 隐藏/打开 面板']
            ]).outerHTML
        },
        x: { defaultValue: window.innerWidth * 0.1 },
        y: { defaultValue: window.innerWidth * 0.1 },
        /**
         * - minimize: 最小化
         * - close: 关闭
         * - normal: 正常
         */
        visual: { defaultValue: 'normal' },
        // 首次关闭时警告
        firstCloseAlert: {
            defaultValue: true
        },
        fontsize: {
            label: '字体大小（像素）',
            attrs: { type: 'number', min: 12, max: 24, step: 1 },
            defaultValue: 14
        },
        switchPoint: {
            label: '窗口显示连点（次数）',
            attrs: {
                type: 'number',
                min: 3,
                max: 10,
                step: 1,
                title: '设置当连续点击屏幕 N 次时，可以进行面板的 隐藏/显示 切换，默认连续点击屏幕三下'
            },
            defaultValue: 3
        },
        /** 锁定配置，防止用户改动 */
        lockConfigs: {
            defaultValue: false
        },
        /** 锁定配置时的提示信息 */
        lockMessage: {
            defaultValue: '当前脚本已锁定配置，无法修改'
        }
    },
    // 暴露给外部的方法
    methods() {
        return {
            /**
             * 判断当前脚本是否置顶
             * 因为在 4.2.x 版本之后，所有面板都会进行显示，某些脚本可以根据这个方法是否已显示在页面中
             * @param script 脚本
             */
            isPinned: (script) => start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.isPinned(script),
            /**
             * 将当前的脚本置顶
             * @param script 脚本
             */
            pin: (script) => start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.pin(script),
            /**
             * 最小化窗口
             */
            minimize: () => start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.minimize(),
            /**
             * 将窗口最小化，并移动至窗口边缘
             */
            moveToEdge: () => start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.moveToEdge(),
            normal: () => {
                start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.normal();
            }
        };
    },
    onrender({ panel }) {
        const closeBtn = (0, dom_1.el)('button', { className: 'base-style-button' }, '隐藏窗口');
        closeBtn.onclick = () => {
            if (this.cfg.firstCloseAlert) {
                start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.modal('confirm', {
                    content: creator_1.$creator.notes([
                        '隐藏脚本页面后，快速点击页面三下（可以在悬浮窗设置中调整次数）即可重新显示脚本。如果三下无效，可以尝试删除脚本重新安装。',
                        '请确认是否关闭。（此后不再显示此弹窗）'
                    ]),
                    onConfirm: () => {
                        this.cfg.visual = 'close';
                        this.cfg.firstCloseAlert = false;
                    }
                });
            }
            else {
                this.cfg.visual = 'close';
            }
        };
        panel.body.replaceChildren((0, dom_1.el)('hr'), closeBtn);
    },
    oncomplete(...args) {
        setTimeout(() => {
            console.log('$win', start_1.$win);
        }, 3000);
    }
});
exports.createRenderScript = createRenderScript;
exports.RenderScript = (0, exports.createRenderScript)();
function $modal(type, attrs) {
    if (self === top) {
        return start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.modal(type, attrs);
    }
    else {
        interfaces_1.cors.emit('modal', [type, attrs], (args) => {
            var _a, _b, _c;
            if (args) {
                (_a = attrs.onConfirm) === null || _a === void 0 ? void 0 : _a.call(attrs, args);
            }
            else {
                (_b = attrs.onCancel) === null || _b === void 0 ? void 0 : _b.call(attrs);
            }
            (_c = attrs.onClose) === null || _c === void 0 ? void 0 : _c.call(attrs, args);
        });
    }
}
exports.$modal = $modal;
function $message(type, attrs) {
    if (self === top) {
        return start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.message(type, attrs);
    }
    else {
        // 跨域无法传递 HTMLElement，所以这里需要将 HTMLElement 转换为字符串
        if (typeof attrs.content !== 'string') {
            attrs.content = attrs.content.innerHTML;
        }
        interfaces_1.cors.emit('message', [type, attrs]);
    }
}
exports.$message = $message;
function $menu(label, config) {
    if (self !== top) {
        return;
    }
    return start_1.$win === null || start_1.$win === void 0 ? void 0 : start_1.$win.menu(label, config);
}
exports.$menu = $menu;
