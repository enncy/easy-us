/* global GM_getValue GM_setValue GM_deleteValue GM_listValues GM_getTab GM_addValueChangeListener GM_saveTab EventListener  */

import { $const } from '../utils/const';

/**
 * 存储器提供类
 *
 * 在油猴环境下 getTab 指的是获取当前标签页的唯一全局对象，如果在普通浏览器环境中， getTab 则为 localStorage 里的一个对象
 */
export interface StoreProvider {
	/**
	 * 获取存储的值
	 * @param key 			键
	 * @param defaultValue	默认值
	 */
	get(key: string, defaultValue?: any): any;
	/**
	 * 设置存储的值
	 * @param key 	键
	 * @param value	值
	 */
	set(key: string, value: any): void;
	/**
	 * 删除存储的值
	 * @param key 键
	 */
	delete(key: string): any;
	/**
	 * 获取所有存储的键
	 */
	list(): string[];
	/**
	 * 获取当前标签页的存储数据
	 * @param key 键
	 */
	getTab(key: string): Promise<any>;
	/**
	 * 设置当前标签页的存储数据
	 * @param key	键
	 * @param value	值
	 */
	setTab(key: string, value: any): Promise<any>;
	addChangeListener(key: string, listener: (curr: any, pre: any, remote?: boolean) => void): number | void;
	removeChangeListener(listener: number | void | EventListener): void;
	/**
	 * 原理：在使用 OCS.start 后，每个页面会自动分配一个 uid，存储监听器的Key到油猴的本地存储中，通过改变这个的值，可以触发监听
	 */
	addTabChangeListener(key: string, listener: (curr: any, pre: any) => void): void | Promise<number>;
	removeTabChangeListener(key: string, listener: number | EventListener): void;
}

export type StoreListenerType = number | void | EventListener;

export class LocalStoreChangeEvent extends Event {
	key: string = '';
	value: any;
	previousValue: any;
}

/**
 * 内存存储提供器
 */
export class MemoryStoreProvider implements StoreProvider {
	static _source: { store: object; tab: object } = { store: {}, tab: {} };
	static storeListeners = new Map<string, { (curr: any, pre: any): void }[]>();
	static tabListeners = new Map<string, { (curr: any, pre: any): void }[]>();

	get(key: string, defaultValue?: any) {
		return Reflect.get(MemoryStoreProvider._source.store, key) ?? defaultValue;
	}

	set(key: string, value: any) {
		const pre = Reflect.get(MemoryStoreProvider._source.store, key);
		Reflect.set(MemoryStoreProvider._source.store, key, value);
		MemoryStoreProvider.storeListeners.get(key)?.forEach((lis) => lis(value, pre));
	}

	delete(key: string) {
		Reflect.deleteProperty(MemoryStoreProvider._source.store, key);
	}

	list(): string[] {
		return Object.keys(MemoryStoreProvider._source.store);
	}

	async getTab(key: string) {
		return Reflect.get(MemoryStoreProvider._source.tab, key);
	}

	async setTab(key: string, value: any) {
		Reflect.set(MemoryStoreProvider._source.tab, key, value);
		MemoryStoreProvider.tabListeners.get(key)?.forEach((lis) => lis(value, this.getTab(key)));
	}

	addChangeListener(key: string, listener: (curr: any, pre: any, remote?: boolean | undefined) => void): void {
		const listeners = MemoryStoreProvider.storeListeners.get(key) || [];
		listeners.push(listener);
		MemoryStoreProvider.storeListeners.set(key, listeners);
	}

	removeChangeListener(listener: EventListener): void {
		MemoryStoreProvider.tabListeners.forEach((lis, key) => {
			const index = lis.findIndex((l) => l === listener);
			if (index !== -1) {
				lis.splice(index, 1);
				MemoryStoreProvider.tabListeners.set(key, lis);
			}
		});
	}

	addTabChangeListener(key: string, listener: (curr: any, pre: any) => void) {
		const listeners = MemoryStoreProvider.tabListeners.get(key) || [];
		listeners.push(listener);
		MemoryStoreProvider.tabListeners.set(key, listeners);
	}

	removeTabChangeListener(key: string, listener: EventListener): void {
		const listeners = MemoryStoreProvider.tabListeners.get(key) || [];
		const index = listeners.findIndex((l) => l === listener);
		if (index !== -1) {
			listeners.splice(index, 1);
			MemoryStoreProvider.tabListeners.set(key, listeners);
		}
	}
}

/**
 * 油猴存储器
 */
export class GMStoreProvider implements StoreProvider {
	constructor() {
		// 当页面首次加载时删除之前的监听数据
		if (self === top && typeof globalThis.GM_listValues !== 'undefined') {
			for (const val of GM_listValues()) {
				if (val.startsWith('_tab_change_')) {
					GM_deleteValue(val);
				}
			}
		}
	}

	/** 获取本地能够触发 tab 监听的key */
	getTabChangeHandleKey(tabUid: string, key: string) {
		return `_tab_change_${tabUid}_${key}`;
	}

	get(key: string, defaultValue?: any) {
		return GM_getValue(key, defaultValue);
	}

	set(key: string, value: any) {
		GM_setValue(key, value);
	}

	delete(key: string) {
		GM_deleteValue(key);
	}

	list(): string[] {
		return GM_listValues();
	}

	getTab(key: string) {
		return new Promise((resolve, reject) => {
			GM_getTab((tab = {}) => resolve(Reflect.get(tab, key)));
		});
	}

	setTab(key: string, value: any) {
		return new Promise<void>((resolve, reject) => {
			GM_getTab((tab = {}) => {
				Reflect.set(tab, key, value);
				GM_saveTab(tab);
				this.set(this.getTabChangeHandleKey(Reflect.get(tab, $const.TAB_UID), key), value);
				resolve();
			});
		});
	}

	addChangeListener(key: string, listener: (curr: any, pre: any, remote?: boolean) => void): number {
		return GM_addValueChangeListener(key, (_, pre, curr, remote) => {
			listener(pre, curr, remote);
		});
	}

	removeChangeListener(listenerId: number | void): void {
		if (typeof listenerId === 'number') {
			// eslint-disable-next-line no-undef
			GM_removeValueChangeListener(listenerId);
		}
	}

	async addTabChangeListener(key: string, listener: (curr: any, pre: any) => void) {
		const uid: string = (await this.getTab($const.TAB_UID)) as string;
		return GM_addValueChangeListener(this.getTabChangeHandleKey(uid, key), (_, pre, curr) => {
			listener(curr, pre);
		});
	}

	removeTabChangeListener(key: string, listener: number): void {
		return this.removeChangeListener(listener);
	}
}
