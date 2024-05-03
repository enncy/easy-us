import { ConfigElement } from '../elements/config';
import { Script, StoreProvider } from '../interfaces';
import { Config } from '../interfaces/config';
import { $ } from './common';
import { h } from './dom';
import { $elements } from './elements';
import { $gm } from './tampermonkey';

/**
 * 元素创建器
 */
export const $creator = {
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
	 * 启动元素提示气泡，根据元素 title 即时显示，（兼容手机端的提示）
	 * @param target
	 */
	tooltip<T extends HTMLElement>(target: T) {
		target.setAttribute('data-title', target.title);
		// 油猴环境下，取消默认title，避免系统默认事件重复显示
		if ($gm.isInGMContext()) {
			target.removeAttribute('title');
		}

		const onMouseMove = (e: MouseEvent) => {
			if ($elements.tooltipContainer.style.display !== 'none') {
				$elements.tooltipContainer.style.top = e.y + 'px';
				$elements.tooltipContainer.style.left = e.x + 'px';
			}
		};
		const showTitle = (e: MouseEvent) => {
			const dataTitle = target.getAttribute('data-title');
			if (dataTitle) {
				$elements.tooltipContainer.innerHTML = dataTitle.split('\n').join('<br>') || '';
				$elements.tooltipContainer.style.top = e.y + 'px';
				$elements.tooltipContainer.style.left = e.x + 'px';
				$elements.tooltipContainer.style.display = 'block';
			} else {
				$elements.tooltipContainer.style.display = 'none';
			}

			window.addEventListener('mousemove', onMouseMove);
		};
		const hideTitle = () => {
			$elements.tooltipContainer.style.display = 'none';
			window.removeEventListener('mousemove', onMouseMove);
		};
		hideTitle();
		target.addEventListener('mouseenter', showTitle as any);
		target.addEventListener('click', showTitle as any);
		target.addEventListener('mouseout', hideTitle);
		target.addEventListener('mouseleave', hideTitle);
		target.addEventListener('blur', hideTitle);

		return target;
	},
	// 创建脚本面板
	scriptPanel(script: Script, store: StoreProvider, opts?: { onload?: (el: ConfigElement) => void }) {
		const scriptPanel = h('script-panel-element', { name: script.name });

		// 监听提示内容改变
		script.onConfigChange('notes', (pre, curr) => {
			scriptPanel.notesContainer.innerHTML = script.cfg.notes || '';
		});
		// 注入 panel 对象 ， 脚本可修改 panel 对象进行面板的内容自定义
		script.panel = scriptPanel;

		scriptPanel.notesContainer.innerHTML = script.configs?.notes?.defaultValue || '';

		let configs = Object.create({});
		const elList = [];
		for (const key in script.configs) {
			if (Object.prototype.hasOwnProperty.call(script.configs, key)) {
				const cfg = script.configs[key];
				// 如果存在分隔符
				if (cfg.separator) {
					// 将之前的配置项生成配置区域，并添加到列表中
					elList.push($creator.configsArea($creator.configs(script.namespace, store, configs || {}, opts?.onload)));
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
			elList.push($creator.configsArea($creator.configs(script.namespace, store, configs || {}, opts?.onload)));
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
		onload?: (el: ConfigElement) => void
	) {
		const elements: { [K in keyof T]: ConfigElement<T[K]['tag']> } = Object.create({});
		for (const key in configs) {
			if (Object.prototype.hasOwnProperty.call(configs, key)) {
				const config = configs[key];
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
						options: config.options
					});
					element.store = store;
					element.label.textContent = config.label;
					elements[key] = element;
				}
			}
		}

		return elements;
	}
};
