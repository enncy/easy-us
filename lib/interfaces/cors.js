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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cors = exports.CorsEventEmitter = void 0;
const common_1 = require("../utils/common");
const const_1 = require("../utils/const");
const store_1 = require("../utils/store");
/**
 * 跨域脚本事件通讯
 */
class CorsEventEmitter {
    constructor() {
        this.eventMap = new Map();
    }
    eventKey(name) {
        return 'cors.events.' + name;
    }
    tempKey(...args) {
        return ['_temp_', ...args].join('.');
    }
    keyOfReturn(id) {
        return this.tempKey('event', id, 'return');
    }
    keyOfArguments(id) {
        return this.tempKey('event', id, 'arguments');
    }
    keyOfState(id) {
        return this.tempKey('event', id, 'state');
    }
    /**
     * 提交事件
     * @param name 事件名
     * @param args 事件参数
     * @param callback 事件回调，可以接收返回值
     */
    emit(name, args = [], callback) {
        store_1.$store
            .getTab(const_1.$const.TAB_UID)
            .then((uid) => {
            const id = common_1.$.uuid().replace(/-/g, '');
            const key = uid + '.' + this.eventKey(name);
            /** 状态, 0 等待交互 ， 1 确定 , 2 取消 ， 后面紧跟着模态框中获取到的值，如果模态框类型是 prompt 则有值，否则为空字符串 */
            store_1.$store.set(this.keyOfState(id), 0);
            /** 模态框所需参数 */
            store_1.$store.set(this.keyOfArguments(id), args);
            const listenerId = store_1.$store.addChangeListener(this.keyOfState(id), (pre, curr, remote) => {
                // 移除此监听器
                store_1.$store.removeChangeListener(listenerId);
                // 执行回调
                callback === null || callback === void 0 ? void 0 : callback(store_1.$store.get(this.keyOfReturn(id)), !!remote);
                // 移除冗余的本地临时存储变量
                store_1.$store.delete(this.keyOfState(id));
                store_1.$store.delete(this.keyOfReturn(id));
                store_1.$store.delete(this.keyOfArguments(id));
            }) || 0;
            /** 添加 id 到监听队列 */
            store_1.$store.set(key, (store_1.$store.get(key) ? String(store_1.$store.get(key)).split(',') : []).concat(id).join(','));
        })
            .catch(console.error);
    }
    /**
     * 监听跨域事件
     * @param name 事件名，全局唯一
     * @param handler 处理器，可以通过处理器返回任意值作为另外一端的回调值
     * @returns
     */
    on(name, handler) {
        return new Promise((resolve) => {
            store_1.$store
                .getTab(const_1.$const.TAB_UID)
                .then((uid) => {
                const key = uid + '.' + this.eventKey(name);
                const originId = this.eventMap.get(key);
                if (originId) {
                    resolve(originId);
                }
                else {
                    const id = store_1.$store.addChangeListener(key, (pre, curr, remote) => __awaiter(this, void 0, void 0, function* () {
                        if (remote) {
                            // 删除当前 key 也会导致触发监听。
                            if (curr === undefined) {
                                return;
                            }
                            const list = String(curr).split(',');
                            // 处理队列
                            const id = list.pop();
                            if (id) {
                                // 设置返回参数
                                store_1.$store.set(this.keyOfReturn(id), yield handler(store_1.$store.get(this.keyOfArguments(id))));
                                // 更新队列
                                setTimeout(() => {
                                    // 这里改变参数，可以触发另一端的监听
                                    store_1.$store.set(this.keyOfState(id), 1);
                                    // 完成监听，删除id
                                    store_1.$store.set(key, list.join(','));
                                }, 100);
                            }
                        }
                    })) || 0;
                    this.eventMap.set(key, id);
                    resolve(id);
                }
            })
                .catch(console.error);
        });
    }
    off(name) {
        const key = this.eventKey(name);
        const originId = this.eventMap.get(key);
        if (originId) {
            this.eventMap.delete(key);
            store_1.$store.removeChangeListener(originId);
        }
    }
}
exports.CorsEventEmitter = CorsEventEmitter;
if (typeof GM_listValues !== 'undefined' && self === top) {
    // 加载页面后
    window.onload = () => {
        // 删除全部未处理的模态框临时变量，以及监听队列
        store_1.$store.list().forEach((key) => {
            if (/_temp_.event.[0-9a-z]{32}.(state|return|arguments)/.test(key)) {
                store_1.$store.delete(key);
            }
            if (/[0-9a-z]{32}.cors.events/.test(key)) {
                store_1.$store.delete(key);
            }
        });
    };
}
/**
 * 全局跨域对象
 */
exports.cors = new CorsEventEmitter();
