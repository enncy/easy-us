import { ConfigElement } from '../elements/config';
import { Script, StoreProvider } from '../interfaces';
import { Config } from '../interfaces/config';
import { $ } from './common';
import { CustomElementStyleAttrs, ElementHandler, h } from './dom';
import { $elements } from './elements';
import { $gm } from './tampermonkey';
export interface PreventTextOptions {
	/** 按钮文字 */
	name: string;
	/**
	 * 执行的延时
	 * @default 5
	 */
	delay?: number;
	/**
	 * 时间到后是否自动删除该文本按钮元素
	 * @default true
	 */
	autoRemove?: boolean;
	/** 执行的回调 */
	ondefault: (span: HTMLSpanElement) => void;
	/** 不执行的回调 */
	onprevent?: (span: HTMLSpanElement) => void;
}
/**
 * 获取页面 zoom 缩放比例。
 * 平台脚本（如智慧树）会通过 html{zoom} 调整界面缩放，
 * zoom 会同步缩放 position:fixed 的定位坐标，但鼠标事件 clientX/Y 为未缩放值，
 * 定位 tooltip 等鼠标跟随元素时需要反向补偿，否则会错位。
 */
function getPageZoom(): number {
	const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('zoom') || '1');
	return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
}

/** tooltip 气泡显示位置：top/bottom 为居中，top-left/top-right/bottom-left/bottom-right 为与目标左/右边缘对齐 */
export type TooltipPosition = 'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';

/**
 * 元素创建器
 */
export const $ui = {
	/**
	 * 启动元素提示气泡，根据元素 title 即时显示（兼容移动端）。
	 * 气泡锚定目标元素：根据内容大小与遮挡算法自适应出现位置（默认下方，空间不足自动翻转上方），
	 * 不再跟随鼠标。
	 * @param target
	 * @param position 指定气泡优先显示位置，默认 'bottom'；指定方向空间不足时仍自动翻转兜底
	 */
	tooltip<T extends HTMLElement>(target: T, position?: TooltipPosition) {
		target.setAttribute('data-title', target.title);
		// 油猴环境下，取消默认title，避免系统默认事件重复显示
		if ($gm.isInGMContext()) {
			target.removeAttribute('title');
		}

		const container = () => $elements.tooltipContainer as (HTMLDivElement & { __owner?: HTMLElement }) | undefined;
		const isVisible = () => container()?.classList.contains('show');
		/** 桌面端显示延迟（防抖） */
		let showTimer: ReturnType<typeof setTimeout> | undefined;
		/** 移动端自动隐藏定时器 */
		let autoHideTimer: ReturnType<typeof setTimeout> | undefined;
		/** 最近一次触摸时间（用于忽略触屏模拟的 mouseenter） */
		let lastTouchTime = 0;

		/** 计算气泡位置：锚定目标 + 遮挡翻转 + 视口钳制 */
		const computePlacement = () => {
			const el = container();
			if (!el) {
				return;
			}
			const zoom = getPageZoom();
			const margin = 8;
			const rect = target.getBoundingClientRect();
			// 元素已渲染（visibility: hidden 不影响尺寸测量），直接读取内容实际宽高
			const tipRect = el.getBoundingClientRect();
			const vw = document.documentElement.clientWidth;
			const vh = document.documentElement.clientHeight;

			// 垂直方向：优先使用指定位置（默认 bottom），空间不足时自动翻转兜底
			let placement: 'top' | 'bottom' = position?.startsWith('top') ? 'top' : 'bottom';
			const fits =
				placement === 'bottom'
					? rect.bottom + margin + tipRect.height <= vh - margin
					: rect.top - margin - tipRect.height >= margin;
			if (!fits) {
				placement = placement === 'bottom' ? 'top' : 'bottom';
			}
			const top = placement === 'bottom' ? rect.bottom + margin : rect.top - margin - tipRect.height;

			// 水平方向：center 居中于目标，left/right 与目标左/右边缘对齐，越界时向视口内钳制
			const align = position?.endsWith('left') ? 'left' : position?.endsWith('right') ? 'right' : 'center';
			let left: number;
			if (align === 'left') {
				left = rect.left;
			} else if (align === 'right') {
				left = rect.right - tipRect.width;
			} else {
				left = rect.left + rect.width / 2 - tipRect.width / 2;
			}
			left = Math.max(margin, Math.min(left, vw - margin - tipRect.width));

			// 箭头始终对准目标中心
			const arrowLeft = Math.max(6, Math.min(rect.left + rect.width / 2 - left - 4, tipRect.width - 14));

			el.classList.remove('tooltip-top', 'tooltip-bottom');
			el.classList.add(placement === 'bottom' ? 'tooltip-bottom' : 'tooltip-top');
			el.style.setProperty('--tooltip-arrow-left', arrowLeft + 'px');
			el.style.top = top / zoom + 'px';
			el.style.left = left / zoom + 'px';
		};

		const onScrollOrResize = () => {
			// 目标已脱离文档时直接隐藏
			if (!target.isConnected) {
				hide();
				return;
			}
			computePlacement();
		};
		// 兜底：鼠标落在目标子树以外时隐藏（覆盖目标后代为浮层、mouseleave 不触发的场景）
		const onDocumentMouseOver = (e: Event) => {
			if (!target.contains(e.target as Node)) {
				hide();
			}
		};
		// 移动端：点按气泡与目标以外的区域时隐藏
		const onDocumentTouchStart = (e: Event) => {
			const el = container();
			const path = e.composedPath();
			if (!path.includes(target) && !(el && path.includes(el))) {
				hide();
			}
		};

		const bindWhileVisible = () => {
			window.addEventListener('scroll', onScrollOrResize, true);
			window.addEventListener('resize', onScrollOrResize);
			document.addEventListener('mouseover', onDocumentMouseOver, true);
			document.addEventListener('touchstart', onDocumentTouchStart, true);
		};
		const unbindWhileVisible = () => {
			window.removeEventListener('scroll', onScrollOrResize, true);
			window.removeEventListener('resize', onScrollOrResize);
			document.removeEventListener('mouseover', onDocumentMouseOver, true);
			document.removeEventListener('touchstart', onDocumentTouchStart, true);
		};

		const show = () => {
			const el = container();
			const dataTitle = target.getAttribute('data-title');
			if (!el || !dataTitle) {
				hide();
				return;
			}
			el.innerHTML = dataTitle.split('\n').join('<br>') || '';
			// 记录归属，仅所属目标可以关闭，避免共享气泡互相误关
			el.__owner = target;
			computePlacement();
			// 强制 reflow，确保从隐藏态开始播放入场过渡动画
			void el.offsetWidth;
			el.classList.add('show');
			bindWhileVisible();
		};

		function hide(owner?: HTMLElement) {
			const el = container();
			if (!el) {
				return;
			}
			// 指定 owner 时仅允许所属目标关闭
			if (owner && el.__owner !== owner) {
				return;
			}
			el.classList.remove('show');
			el.__owner = undefined;
			clearTimeout(autoHideTimer);
			unbindWhileVisible();
		}

		// 桌面端：悬浮显示（100ms 防抖），移出隐藏
		target.addEventListener('mouseenter', () => {
			// 忽略触屏模拟的 mouseenter
			if (Date.now() - lastTouchTime < 500) {
				return;
			}
			clearTimeout(showTimer);
			showTimer = setTimeout(show, 100);
		});
		target.addEventListener('mouseleave', () => {
			clearTimeout(showTimer);
			hide(target);
		});
		target.addEventListener('click', show);
		target.addEventListener('blur', () => hide(target));

		// 移动端：点按切换显隐，3s 自动隐藏，不再跟随手指
		target.addEventListener('touchstart', () => {
			lastTouchTime = Date.now();
			clearTimeout(autoHideTimer);
			if (isVisible() && container()?.__owner === target) {
				hide(target);
			} else {
				show();
				autoHideTimer = setTimeout(() => hide(target), 3000);
			}
		});

		return target;
	},
	// 创建脚本面板
	scriptPanel(script: Script, store: StoreProvider, opts?: { onload?: (el: ConfigElement) => void }) {
		const scriptPanel = h('script-panel-element', { name: script.name });

		// notes 提示板块收缩状态持久化键（按脚本独立记忆）
		const notesExpandedKey = `_notes_expanded_${script.fullName()}`;
		// 读取持久化状态，默认展开
		scriptPanel.setNotesExpanded(store.get(notesExpandedKey, true));
		// 点击头部切换收缩/展开，并持久化状态
		scriptPanel.notesHeader.addEventListener('click', () => {
			const expanded = !scriptPanel.isNotesExpanded();
			scriptPanel.setNotesExpanded(expanded);
			store.set(notesExpandedKey, expanded);
		});
		// 为头部绑定提示气泡
		scriptPanel.notesHeader.title = '点击收缩 / 展开';
		this.tooltip(scriptPanel.notesHeader);

		// 提示内容为空时隐藏整个提示区域
		const updateNotesVisibility = (content?: string) => {
			scriptPanel.notesContainer.style.display = content?.trim() ? '' : 'none';
		};

		// 监听提示内容改变
		script.onConfigChange('notes', (pre, curr) => {
			scriptPanel.notesBody.innerHTML = script.cfg.notes || '';
			updateNotesVisibility(script.cfg.notes);
		});
		// 注入 panel 对象 ， 脚本可修改 panel 对象进行面板的内容自定义
		script.panel = scriptPanel;

		scriptPanel.notesBody.innerHTML = script.configs?.notes?.defaultValue || '';
		updateNotesVisibility(script.configs?.notes?.defaultValue);

		let configs = Object.create({});
		const elList = [];
		for (const key in script.configs) {
			if (Object.prototype.hasOwnProperty.call(script.configs, key)) {
				const cfg = script.configs[key];
				// 如果存在分隔符
				if (cfg.separator) {
					// 将之前的配置项生成配置区域，并添加到列表中
					elList.push(this.configsArea(this.configs(script.namespace, store, configs || {}, opts?.onload, script)));
					// 添加分隔符
					elList.push(h('div', { className: 'separator', style: { margin: '0px 8px' } }, cfg.separator));
					// 清空配置项
					configs = Object.create({});
				}

				configs[key] = cfg;
			}
		}
		// 如果还有剩余的配置项，生成配置区域，并添加到列表中
		if (Object.keys(configs).length > 0) {
			elList.push(this.configsArea(this.configs(script.namespace, store, configs || {}, opts?.onload, script)));
		}

		scriptPanel.configsContainer.replaceChildren(...elList);

		return scriptPanel;
	},
	/** 创建独立的设置区域 */
	configsArea(configElements: Record<string, ConfigElement<any>>) {
		/** 创建设置板块 */
		const configsContainer: HTMLDivElement = h('div', { className: 'configs card' });
		/** 设置区域主体 */
		const configsBody: HTMLDivElement = h('div', { className: 'configs-body' });
		configsBody.append(...Object.entries(configElements).map(([key, el]) => el));
		configsContainer.append(configsBody);
		return configsContainer;
	},
	/** 创建设置元素 */
	configs<T extends Record<string, Config<any>>>(
		namespace: string | undefined,
		store: StoreProvider,
		configs: T,
		onload?: (el: ConfigElement) => void,
		script?: Script
	) {
		/** 解析插槽内容，支持函数懒加载（this 绑定 script，参数传 cfg） */
		const resolveSlot = (slot: any) => (typeof slot === 'function' ? slot.call(script, script?.cfg) : slot);
		const elements: { [K in keyof T]: ConfigElement<T[K]['tag']> } = Object.create({});
		for (const key in configs) {
			if (Object.prototype.hasOwnProperty.call(configs, key)) {
				const config: Record<any, any> = configs[key];
				if (config.label !== undefined) {
					const element = h('config-element', {
						key: $.namespaceKey(namespace, key),
						tag: config.tag,
						sync: config.sync,
						attrs: config.attrs,
						_onload: function (el) {
							config.onload?.call(this, el);
							onload?.(el);
						},
						defaultValue: config.defaultValue,
						options: config.options,
						showIf: config.showIf,
						elementClassName: config.elementClassName,
						labelClassName: config.labelClassName,
						providerClassName: config.providerClassName,
						enableForAttribute: config.enableForAttribute,
						prefixSlot: resolveSlot(config.prefixSlot),
						suffixSlot: resolveSlot(config.suffixSlot)
					});
					element.store = store;
					element.label.textContent = config.label;
					elements[key] = element;
				}
			}
		}

		return elements;
	},
	/** 创建多行的文本，支持 字符串，元素，以及包含字符串元素的列表，最多二维数组 */
	notes(lines: (string | HTMLElement | (string | HTMLElement)[])[], tag: 'ul' | 'ol' = 'ul') {
		return h(
			tag,
			lines.map((line) =>
				h(
					'li',
					Array.isArray(line)
						? line.map((node) => (typeof node === 'string' ? h('div', { innerHTML: node }) : node))
						: [typeof line === 'string' ? h('div', { innerHTML: line }) : line]
				)
			)
		);
	},
	/**
	 * 生成一个复制按钮
	 * @param name 按钮名
	 * @param value 复制内容
	 */
	copy(name: string, value: string) {
		return h('span', '📄' + name, (btn) => {
			btn.className = 'copy';

			btn.addEventListener('click', () => {
				btn.innerText = '已复制√';
				navigator.clipboard.writeText(value);
				setTimeout(() => {
					btn.innerText = '📄' + name;
				}, 500);
			});
		});
	},
	/**
	 * 创建一个取消默认事件的文字按钮，如果不点击，则执行默认事件
	 * @param  opts 参数
	 */
	preventText(opts: PreventTextOptions) {
		const { name, delay = 3, autoRemove = true, ondefault, onprevent } = opts;
		const span = h('span', name);

		span.style.textDecoration = 'underline';
		span.style.cursor = 'pointer';
		span.onclick = () => {
			clearTimeout(id);
			if (autoRemove) {
				span.remove();
			}
			onprevent?.(span);
		};
		const id = setTimeout(() => {
			if (autoRemove) {
				span.remove();
			}
			ondefault(span);
		}, delay * 1000);

		return span;
	},

	/**
	 * 将所有子元素隔开
	 * x: 默认 12
	 * y: 默认 0
	 * separator: 默认 ' '
	 */
	space(children: HTMLElement[], options?: { x?: number; y?: number; separator?: string }) {
		return h('div', { className: 'space' }, (div) => {
			for (let index = 0; index < children.length; index++) {
				const child = h('span', { className: 'space-item' }, [children[index]]);
				child.style.display = 'inline-block';
				const x = options?.x ?? 12;
				const y = options?.y ?? 0;
				if (index > 0) {
					child.style.marginLeft = x / 2 + 'px';
					child.style.marginRight = x / 2 + 'px';
					child.style.marginTop = y / 2 + 'px';
					child.style.marginBottom = y / 2 + 'px';
				} else {
					child.style.marginRight = x / 2 + 'px';
					child.style.marginBottom = y / 2 + 'px';
				}

				div.append(child);
				if (index !== children.length - 1) {
					div.append(h('span', [options?.separator ?? ' ']));
				}
			}
		});
	},
	button(
		text?: string,
		attrs?: CustomElementStyleAttrs<Omit<Partial<HTMLInputElement>, 'type'>> | undefined,
		handler?: ElementHandler<'input'> | undefined
	) {
		return h('input', { type: 'button', ...attrs }, function (btn) {
			btn.value = text || '';
			btn.classList.add('base-style-button');
			handler?.apply(this, [btn]);
		});
	}
};
