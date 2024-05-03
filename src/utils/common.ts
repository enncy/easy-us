import debounce from 'lodash/debounce';
import { Config } from '../interfaces/config';
import { Project } from '../interfaces/project';
import { Script } from '../interfaces/script';
import { $store } from './store';

/**
 * 公共的工具库
 */
export const $ = {
	/**
	 * 构造 config 配置对象， 可进行响应式存储
	 * @param script 脚本
	 */
	createConfigProxy(script: Script) {
		const proxy = new Proxy(script.cfg, {
			set(target, propertyKey, value) {
				const key = $.namespaceKey(script.namespace, propertyKey);
				$store.set(key, value);
				return Reflect.set(target, propertyKey, value);
			},
			get(target, propertyKey) {
				const value = $store.get($.namespaceKey(script.namespace, propertyKey));
				Reflect.set(target, propertyKey, value);
				return value;
			}
		});

		// 为 proxy 创建属性，并设置默认值
		for (const key in script.configs) {
			if (Object.prototype.hasOwnProperty.call(script.configs, key)) {
				const element = Reflect.get(script.configs, key);
				Reflect.set(proxy, key, $store.get($.namespaceKey(script.namespace, key), element.defaultValue));
			}
		}

		if (script.namespace) {
			// 重置特殊的 notes 对象
			proxy.notes = script.configs?.notes?.defaultValue;
		}

		return proxy;
	},

	/**
	 * 获取所有原生（未处理的）脚本配置
	 * @param scripts 脚本列表
	 */
	getAllRawConfigs(scripts: Script[]): Record<string, Config> {
		const object = {};
		for (const script of scripts) {
			for (const key in script.configs) {
				if (Object.prototype.hasOwnProperty.call(script.configs, key)) {
					const { label, ...element } = script.configs[key];
					Reflect.set(object, $.namespaceKey(script.namespace, key), {
						label: $.namespaceKey(script.namespace, key),
						...element
					} as Config);
				}
			}
		}
		return object;
	},

	/**
	 * 获取匹配到的脚本
	 * @param projects 程序列表
	 */
	getMatchedScripts(projects: Project[], urls: string[]) {
		const scripts = [];

		for (const project of projects) {
			for (const key in project.scripts) {
				if (Object.prototype.hasOwnProperty.call(project.scripts, key)) {
					const script = project.scripts[key];
					const script_matches_urls = script.matches.map((u) => (Array.isArray(u) ? u[1] : u));
					const script_excludes_urls = (script.excludes || []).map((u) => (Array.isArray(u) ? u[1] : u));
					// 平台域名是否匹配
					if (
						project.domains === undefined ||
						project.domains.length === 0 ||
						project.domains.some((d) => urls.some((url) => new URL(url).origin.includes(d)))
					) {
						// 被排除的网页
						if (script_excludes_urls.some((u) => urls.some((url) => RegExp(u).test(url)))) {
							continue;
						}

						if (script_matches_urls.some((u) => urls.some((url) => RegExp(u).test(url)))) {
							scripts.push(script);
						}
					}
				}
			}
		}
		return scripts;
	},

	/**
	 * 获取具名键
	 * @param namespace 命名空间
	 * @param key 键
	 */
	namespaceKey(namespace: string | undefined, key: any) {
		return namespace ? namespace + '.' + key.toString() : key.toString();
	},

	/** 创建唯一id ， 不带横杠 */
	uuid() {
		return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			const r = (Math.random() * 16) | 0;
			const v = c === 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	},

	/**
	 * 生成随机数， 使用 Math.round 取整
	 * @param min 最小值
	 * @param max 最大值
	 */
	random(min: number, max: number) {
		return Math.round(Math.random() * (max - min)) + min;
	},
	/**
	 * 暂停
	 * @param period 毫秒
	 */
	async sleep(period: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(resolve, period);
		});
	},
	/**
	 * 当前是否处于浏览器环境
	 */
	isInBrowser(): boolean {
		return typeof window !== 'undefined' && typeof window.document !== 'undefined';
	},
	/**
	 * 监听页面宽度变化
	 * @param el 任意元素，如果此元素被移除，则不执行 resize 回调
	 * @param handler resize 回调
	 */
	onresize<E extends HTMLElement>(el: E, handler: (el: E) => void) {
		const resize = debounce(() => {
			/**
			 * 如果元素被删除，则移除监听器
			 * 不使用 el.parentElement 是因为如果是顶级元素，例如 shadowRoot 中的一级子元素， el.parentNode 不为空，但是 el.parentElement 为空
			 */
			if (el.parentNode === null) {
				window.removeEventListener('resize', resize);
			} else {
				handler(el);
			}
		}, 200);
		resize();
		window.addEventListener('resize', resize);
	},

	/** 加载自定义元素 */
	loadCustomElements(elements: { new (): HTMLElement }[]) {
		for (const element of elements) {
			const name = resolveCustomElementName(element, '-');
			// 不能重复加载
			if (customElements.get(name) === undefined) {
				customElements.define(name, element);
			}
		}
	},
	/** 是否处于顶级 window ，而不是子 iframe */
	isInTopWindow() {
		return self === top;
	},
	/**
	 * 创建弹出窗口
	 * @param url 地址
	 * @param winName 窗口名
	 * @param w 宽
	 * @param h 高
	 * @param scroll 滚动条
	 */
	createCenteredPopupWindow(
		url: string,
		winName: string,
		opts: {
			width: number;
			height: number;
			scrollbars: boolean;
			resizable: boolean;
		}
	) {
		const { width, height, scrollbars, resizable } = opts;
		const LeftPosition = screen.width ? (screen.width - width) / 2 : 0;
		const TopPosition = screen.height ? (screen.height - height) / 2 : 0;

		const settings =
			'height=' +
			height +
			',width=' +
			width +
			',top=' +
			TopPosition +
			',left=' +
			LeftPosition +
			',scrollbars=' +
			(scrollbars ? 'yes' : 'no') +
			',resizable=' +
			(resizable ? 'yes' : 'no');

		return window.open(url, winName, settings);
	}
};

/**
 * 将每个驼峰前面添加目标字符串，用于自定义元素名的转换
 * @param el  自定义元素
 * @param target 目标字符串
 */
export function resolveCustomElementName<T extends HTMLElement = HTMLElement>(el: { new (): T }, target: string) {
	return el.name
		.replace(/([A-Z])/g, target + '$1')
		.toLowerCase()
		.split(target)
		.slice(1)
		.join(target);
}
