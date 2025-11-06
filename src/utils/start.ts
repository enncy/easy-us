/* global */
import { Script } from '../interfaces';
import { CustomWindow } from '../interfaces/custom-window';
import { Project } from '../interfaces/project';
import { $ } from './common';
import { $const } from './const';
import { h } from './dom';
import { $elements } from './elements';
import { $store } from './store';
import debounce from 'lodash/debounce';

let mounted = false;
export let $win: CustomWindow | undefined;

/**
 * 启动配置
 */
export interface StartConfig {
	/** 项目列表 */
	projects: Project[];
	renderConfig?: {
		renderScript: Script;
		title: string;
		styles: string[];
		defaultPanelName: string;
	};
	onRender?: () => CustomWindow;
	[x: string]: any;
}

/**
 * 启动项目
 * @param startConfig 启动配置
 */
export async function start(startConfig: StartConfig) {
	/** 为对象添加响应式特性，在设置值的时候同步到本地存储中 */
	startConfig.projects = startConfig.projects.map((p) => {
		for (const key in p.scripts) {
			if (Object.prototype.hasOwnProperty.call(p.scripts, key)) {
				p.scripts[key].cfg = $.createConfigProxy(p.scripts[key]);
			}
		}
		return p;
	});

	const scripts = $.getMatchedScripts(startConfig.projects, [location.href]).sort((a, b) => b.priority - a.priority);

	/** 执行脚本 */
	scripts.forEach((script) => {
		script.startConfig = startConfig;
		script.emit('start', startConfig);
		script.onstart?.(startConfig);
	});

	// 添加当前标签唯一id
	const uid = await $store.getTab($const.TAB_UID);
	if (uid === undefined) {
		await $store.setTab($const.TAB_UID, $.uuid());
	}

	/**
	 * 每个脚本加载之后，统计每个脚本当前所运行的页面链接，链接不会重复
	 * 初始化页面的脚本可以根据此链接列表，进行脚本页面的生成
	 */
	const urls = await $store.getTab($const.TAB_URLS);
	await $store.setTab($const.TAB_URLS, Array.from(new Set((urls || []).concat(location.href))));

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
		scripts.forEach((script) => script.onactive?.(startConfig));
	} else if (document.readyState === 'complete') {
		/** 挂载悬浮窗 */
		mount(startConfig);
		scripts.forEach((script) => script.onactive?.(startConfig));
		scripts.forEach((script) => script.oncomplete?.(startConfig));
	}

	/**
	 * 监听 readystatechange
	 */
	document.addEventListener('readystatechange', () => {
		/** 挂载悬浮窗 */
		mount(startConfig);

		if (
			document.readyState === 'interactive' &&
			/** 防止执行两次 */
			active === false
		) {
			/** 运行脚本 */
			scripts.forEach((script) => {
				script.emit('active', startConfig);
				script.onactive?.(startConfig);
			});
		}
		if (document.readyState === 'complete') {
			scripts.forEach((script) => {
				script.emit('complete');
				script.oncomplete?.(startConfig);
			});
		}
	});

	/**
	 * 监听路由更改
	 */
	window.addEventListener('hashchange', () => {
		scripts.forEach((script) => {
			script.emit('hashchange', startConfig);
			script.onhashchange?.(startConfig);
		});
	});

	/**
	 * 监听 history 更改
	 */
	history.pushState = addFunctionEventListener(history, 'pushState');
	history.replaceState = addFunctionEventListener(history, 'replaceState');
	window.addEventListener('pushState', () => {
		scripts.forEach((script) => {
			script.emit('historychange', 'push', startConfig);
			script.onhistorychange?.('push', startConfig);
		});
	});
	window.addEventListener('replaceState', () => {
		scripts.forEach((script) => {
			script.emit('historychange', 'replace', startConfig);
			script.onhistorychange?.('replace', startConfig);
		});
	});

	/**
	 * 监听页面离开
	 */
	window.addEventListener('beforeunload', (e) => {
		let prevent;
		for (const script of scripts) {
			script.emit('beforeunload');
			if (script.onbeforeunload?.(startConfig)) {
				prevent = true;
			}
		}

		if (prevent) {
			e.preventDefault();
			e.returnValue = true;
			return true;
		}
	});
}

/**
 * 添加事件调用监听器
 */
export function addFunctionEventListener(obj: any, type: string) {
	const origin = obj[type];
	return function (...args: any[]) {
		// @ts-ignore
		const res = origin.apply(this, args);
		const e = new Event(type.toString());
		// @ts-ignore
		e.arguments = args;
		window.dispatchEvent(e);
		return res;
	};
}

async function mount(startConfig: StartConfig) {
	if (mounted === true) {
		return;
	}
	mounted = true;
	if (startConfig === undefined || startConfig.renderConfig === undefined) {
		console.warn('the script will not have ui because the renderConfig is not defined.');
		return;
	}

	if (self === top) {
		const { projects, renderConfig } = startConfig;
		if (typeof renderConfig.renderScript === 'undefined') {
			console.warn('the script will not have ui because the RenderScript is not defined.');
			return;
		}
		const scripts = $.getMatchedScripts(projects, [location.href]).filter((s) => !!s.hideInPanel === false);
		if (scripts.length <= 0) {
			return;
		}

		const RenderScript = renderConfig.renderScript;

		const win = new CustomWindow(startConfig.projects, $store, {
			render: {
				title: renderConfig.title,
				styles: renderConfig.styles,
				defaultPanelName: renderConfig.defaultPanelName,
				fontsize: RenderScript.cfg.fontsize,
				switchPoint: RenderScript.cfg.switchPoint,
				switchKey: 'o'
			},
			store: {
				getPosition: () => {
					return { x: RenderScript.cfg.x, y: RenderScript.cfg.y };
				},
				setPosition: (x, y) => {
					RenderScript.cfg.x = x;
					RenderScript.cfg.y = y;
				},
				getVisual: () => {
					return RenderScript.cfg.visual;
				},
				setVisual: (size) => {
					RenderScript.cfg.visual = size;
				},
				async getRenderURLs() {
					return await $store.getTab($const.TAB_URLS);
				},
				async setRenderURLs(urls) {
					return await $store.setTab($const.TAB_URLS, urls);
				},
				async getCurrentPanelName() {
					return await $store.getTab($const.TAB_CURRENT_PANEL_NAME);
				},
				async setCurrentPanelName(name) {
					return await $store.setTab($const.TAB_CURRENT_PANEL_NAME, name);
				}
			}
		});

		RenderScript.onConfigChange('fontsize', (fs) => {
			win.setFontSize(fs);
		});

		$store.addTabChangeListener(
			$const.TAB_URLS,
			debounce((curr: string[], pre: string[]) => {
				if (JSON.stringify(curr) === JSON.stringify(pre)) {
					return;
				}
				win.changeRenderURLs(curr);
			}, 2000)
		);

		$store.addTabChangeListener($const.TAB_CURRENT_PANEL_NAME, (curr, pre) => {
			if (curr === pre) {
				return;
			}

			win.changePanel(curr);
			// 同步菜单状态
			updateMenusState(win, curr);
		});
		win.mount(document.body);

		// 挂载全局元素
		$elements.tooltipContainer = h('div', { className: 'tooltip-container' });
		$elements.root = win.root;
		// 挂载全局提示元素
		win.container.append($elements.tooltipContainer);

		$win = win;
	}
}

function updateMenusState(win: CustomWindow, name: string) {
	win.root.querySelectorAll('.extra-menu-bar .script-panel-link').forEach((el) => el.classList.remove('active'));
	win.root.querySelector('.extra-menu-bar [data-name="' + name.replace(/\s/g, '_') + '"]')?.classList.add('active');
}
