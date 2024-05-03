import { cors, Project, Script, StoreProvider } from '.';
import { ContainerElement, definedCustomElements, MessageElement, ModalElement } from '../elements';
import { DropdownElement } from '../elements/dropdown';
import { $, $creator, $gm, h, enableElementDraggable } from '../utils';

const minimizeSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13H5v-2h14v2z"/></svg>';
const expandSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 4H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H6V6h12v12z"/></svg>';

export type ModalAttrs = Pick<
	ModalElement,
	| 'content'
	| 'onConfirm'
	| 'onCancel'
	| 'onClose'
	| 'cancelButtonText'
	| 'confirmButtonText'
	| 'placeholder'
	| 'width'
	| 'cancelButton'
	| 'confirmButton'
	| 'inputDefaultValue'
	| 'profile'
	| 'modalInputType'
	| 'modalStyle'
> & {
	/** 点击遮罩层是否可以关闭弹窗，默认 true */
	maskCloseable?: boolean;
	/** 弹窗标题 */
	title?: ModalElement['title'];
	/** 伴随系统通知一起弹出 */
	notification?: boolean;
	notificationOptions?: {
		/** 是否为重要通知 */
		important?: boolean;
		/** 消息显示时间（秒） */
		duration?: number;
	};
	footer?: HTMLDivElement;
	/** 持续时间，单位秒 */
	duration?: number;
};

export type MessageAttrs =  string | Pick<MessageElement, 'duration' | 'onClose' | 'content' | 'closeable'>;

/**
 * Script唯一识别码，通过 namespace 或者 projectName-name 来进行判断
 */
export type ScriptIdentify = { namespace?: string; projectName?: string; name?: string } | Script;

export type VisualType = 'normal' | 'minimize' | 'close';

export type CustomWindowRenderConfig = {
	render: {
		title: string;
		defaultPanelName: string;
		styles: string[];
		switchPoint: number;
		fontsize: number;
	};
	store: {
		getVisual(): VisualType;
		setVisual(value: VisualType): void;
		setPosition: (x: number, y: number) => void;
		getPosition: () => { x: number; y: number };
		getRenderURLs: () => string[] | Promise<string[]>;
		setRenderURLs: (urls: string[]) => void | Promise<void>;
		getCurrentPanelName: () => string | Promise<string>;
		setCurrentPanelName: (name: string) => void | Promise<void>;
	};
};

export class CustomWindow {
	projects: Project[];
	config: CustomWindowRenderConfig;
	inputStoreProvider: StoreProvider;
	/** 外部面板元素 */
	wrapper: HTMLDivElement;
	/** ShadowRoot 根元素 */
	root: ShadowRoot;
	/** 内部容器元素 */
	container: ContainerElement;

	/** 消息内容元素 */
	messageContainer = h('div', { className: 'message-container' });
	/** 额外的菜单栏 */
	extraMenuBar = h('div', { className: 'extra-menu-bar' });

	/** 默认值 */
	defaults = {
		/** 当前页面存在默认页面 */
		urls: (urls: string[]) => (urls && urls.length ? urls : [location.href]),
		/** 默认面板名 */
		panelName: (name: string) => name || this.config.render.defaultPanelName || ''
	};

	constructor(projects: Project[], inputStoreProvider: StoreProvider, config: CustomWindowRenderConfig) {
		this.projects = projects;
		this.inputStoreProvider = inputStoreProvider;
		this.config = config;

		/** 兼容低版本浏览器 */
		handleLowLevelBrowser();

		/** 加载自定义元素 */
		$.loadCustomElements(definedCustomElements as { new (): any }[]);

		this.wrapper = h('div');
		this.root = this.wrapper.attachShadow({ mode: 'closed' });
		/** 根元素 */
		this.container = h('container-element');
		this.root.append(this.container);

		const styles = config.render.styles.map((s: string) => h('style', s));
		// 创建样式元素
		this.container.append(...styles, this.messageContainer);

		/** 处理面板位置 */
		const handlePosition = () => {
			const pos = config.store.getPosition();

			if (pos.x > document.documentElement.clientWidth || pos.x < 0) {
				config.store.setPosition(10, 10);
			}

			if (pos.y > document.documentElement.clientHeight || pos.y < 0) {
				config.store.setPosition(10, 10);
			}

			this.container.style.left = pos.x + 'px';
			this.container.style.top = pos.y + 'px';
			const positionHandler = () => {
				config.store.setPosition(this.container.offsetLeft, this.container.offsetTop);
			};

			enableElementDraggable(this.container.header, this.container, positionHandler);
		};

		/** 处理面板可视状态 */
		const handleVisible = () => {
			window.addEventListener('click', (e) => {
				// 三击以上重置位置
				if (e.detail === Math.max(config.render.switchPoint, 3)) {
					this.container.style.top = e.y + 'px';
					this.container.style.left = e.x + 'px';

					config.store.setPosition(e.x, e.y);
					this.setVisual('normal');
				}
			});
		};

		/** 初始化跨域模态框系统 */
		const initCorsModalSystem = () => {
			// 添加 modals 监听队列
			cors.on('modal', async (args) => {
				const [type, _attrs] = args || [];

				return new Promise((resolve, reject) => {
					const attrs = _attrs as ModalAttrs;
					attrs.onCancel = () => resolve('');
					attrs.onConfirm = resolve;
					attrs.onClose = resolve;
					this.modal(type, attrs);
				});
			});
		};
		/** 初始化跨域消息框系统 */
		const initCorsMessageSystem = () => {
			// 添加 modals 监听队列
			cors.on('message', async (args) => {
				const [type, attrs] = args || [];
				console.log('message', type, attrs);

				this.message(type, attrs);
			});
		};

		// 监听快捷键
		window.addEventListener(
			'keydown',
			(e) => {
				if (e.ctrlKey && e.key === 'o') {
					e.stopPropagation();
					e.preventDefault();

					this.setVisual(config.store.getVisual() === 'close' ? 'normal' : 'close');
				}
			},
			{ capture: true }
		);

		// 首先处理窗口状态，防止下方的IO速度过慢可能导致窗口闪烁
		handleVisible();
		// 初始化面板可视状态
		this.setVisual(config.store.getVisual());

		(async () => {
			const urls = await config.store.getRenderURLs();
			const currentPanelName = await config.store.getCurrentPanelName();

			await this.rerender(this.defaults.urls(urls), this.defaults.panelName(currentPanelName));
		})();

		// 初始化跨域模态框系统
		initCorsModalSystem();
		// 初始化跨域消息框系统
		initCorsMessageSystem();
		// 处理面板位置
		handlePosition();
		// 初始化字体大小
		this.setFontSize(config.render.fontsize);
	}

	private async rerender(urls: string[], currentPanelName: string) {
		this.initHeader(urls, currentPanelName);
		await this.renderBody(currentPanelName);
	}

	private initHeader(urls: string[], currentPanelName: string) {
		/** 版本  */
		const profile = $creator.tooltip(
			h('div', { className: 'profile', title: '菜单栏（可拖动区域）' }, this.config.render.title || '无标题')
		);

		const scriptDropdowns: DropdownElement[] = [];

		for (const project of this.projects) {
			const dropdown = h('dropdown-element');

			let selected = false;

			const options: HTMLDivElement[] = [];

			// 如果整个工程下面有一个需要显示的脚本，那此工程就添加到头部
			const scripts = $.getMatchedScripts([project], urls).filter((s) => !s.hideInPanel);

			if (scripts.length) {
				for (const key in project.scripts) {
					if (Object.prototype.hasOwnProperty.call(project.scripts, key)) {
						const script = project.scripts[key];
						// 只显示需要显示的面板
						if (!script.hideInPanel) {
							const optionSelected = isCurrentPanel(project.name, script, currentPanelName);
							const option = h('div', { className: 'dropdown-option' }, script.name);

							if (optionSelected) {
								option.classList.add('active');
							}

							if (selected !== true && optionSelected) {
								selected = true;
							}

							option.onclick = async () => {
								await this.config.store.setCurrentPanelName(project.name + '-' + script.name);
								// $store.setTab($const.TAB_CURRENT_PANEL_NAME, project.name + '-' + script.name);
							};

							options.push(option);
						}
					}
				}

				if (selected) {
					dropdown.classList.add('active');
				}

				dropdown.triggerElement = h('div', { className: 'dropdown-trigger-element ' }, project.name);
				dropdown.triggerElement.style.padding = '0px 8px';
				dropdown.content.append(...options);

				scriptDropdowns.push(dropdown);
			}
		}

		/** 窗口是否最小化 */
		const isMinimize = () => this.config.store.getVisual() === 'minimize';
		/** 窗口状态切换按钮 */
		const visualSwitcher = $creator.tooltip(
			h('div', {
				className: 'switch ',
				title: isMinimize() ? '点击展开窗口' : '点击最小化窗口',
				innerHTML: isMinimize() ? expandSvg : minimizeSvg,
				onclick: () => {
					this.setVisual(isMinimize() ? 'normal' : 'minimize');
					visualSwitcher.title = isMinimize() ? '点击展开窗口' : '点击最小化窗口';
					visualSwitcher.innerHTML = isMinimize() ? expandSvg : minimizeSvg;
				}
			})
		);
		this.container.header.visualSwitcher = visualSwitcher;

		this.container.header.replaceChildren();
		this.container.header.append(
			h('div', { style: { width: '100%' } }, [
				h('div', { style: { display: 'flex', width: '100%' } }, [
					profile,
					...scriptDropdowns,
					this.container.header.visualSwitcher || ''
				]),
				h('div', { style: { display: 'flex', width: '100%' } }, [this.extraMenuBar])
			])
		);
	}

	private async renderBody(currentPanelName: string) {
		for (const project of this.projects) {
			for (const key in project.scripts) {
				if (Object.prototype.hasOwnProperty.call(project.scripts, key)) {
					const script = project.scripts[key];

					if (isCurrentPanel(project.name, script, currentPanelName)) {
						// 生成脚本面板
						const panel = $creator.scriptPanel(script, this.inputStoreProvider);
						script.projectName = project.name;
						script.panel = panel;
						script.header = this.container.header;

						this.container.body.replaceChildren(panel);

						// 执行重新渲染钩子
						script.onrender?.({ panel: panel, header: this.container.header });
						script.emit('render', { panel: panel, header: this.container.header });
					}
				}
			}
		}
	}

	setFontSize(fontsize: number) {
		this.container.style.font = `${fontsize}px  Menlo, Monaco, Consolas, 'Courier New', monospace`;
	}

	setVisual(value: VisualType) {
		this.container.className = '';
		// 最小化
		if (value === 'minimize') {
			this.container.classList.add('minimize');
		}
		// 关闭
		else if (value === 'close') {
			this.container.classList.add('close');
		}
		// 展开
		else {
			this.container.classList.add('normal');
		}
		this.config.store.setVisual(value);
	}

	async changeRenderURLs(urls: string[]) {
		const currentPanelName = await this.config.store.getCurrentPanelName();
		await this.rerender(this.defaults.urls(urls), this.defaults.panelName(currentPanelName));
	}

	async changePanel(currentPanelName: string) {
		const urls = (await this.config.store.getRenderURLs()) || [location.href];
		await this.rerender(this.defaults.urls(urls), this.defaults.panelName(currentPanelName));
	}

	/**
	 * 判断当前脚本是否置顶
	 * 因为在 4.2.x 版本之后，所有面板都会进行显示，某些脚本可以根据这个方法是否已显示在页面中
	 * @param script 脚本
	 */
	async isPinned(script: ScriptIdentify) {
		const currentPanelName = await this.config.store.getCurrentPanelName();
		return isCurrentPanel(script.projectName, script, currentPanelName);
	}

	/**
	 * 将当前的脚本置顶
	 * @param script 脚本
	 */
	async pin(script: ScriptIdentify) {
		if (script.projectName) {
			await this.config.store.setCurrentPanelName(`${script.projectName}-${script.name}`);
		} else if (script.namespace) {
			await this.config.store.setCurrentPanelName(script.namespace);
		} else {
			console.warn('[ERROR]', `${script.name} 无法置顶， projectName 与 namespace 都为 undefined`);
		}
	}

	/**
	 * 将窗口最小化，并移动至窗口边缘
	 */
	moveToEdge() {
		this.setVisual('minimize');
		this.config.store.setPosition(80, 60);
	}

	/**
	 * 最小化窗口
	 */
	minimize() {
		this.setVisual('minimize');
	}

	normal() {
		this.setVisual('normal');
	}

	/**
	 * 创建一个模态框代替原生的 alert, confirm, prompt
	 */
	modal(type: ModalElement['type'], attrs: ModalAttrs) {
		const {
			maskCloseable = true,
			onConfirm,
			onCancel,
			onClose,
			notification: notify,
			notificationOptions,
			duration,
			..._attrs
		} = attrs;

		if (notify) {
			$gm.notification(
				typeof _attrs.content === 'string' ? _attrs.content : _attrs.content.textContent || '',
				notificationOptions
			);
		}

		const wrapper = h('div', { className: 'modal-wrapper' }, (wrapper) => {
			const modal = h('modal-element', {
				async onConfirm(val) {
					const isClose: any = await onConfirm?.apply(modal, [val]);
					if (isClose !== false) {
						wrapper.remove();
					}

					return isClose;
				},
				onCancel() {
					onCancel?.apply(modal);
					wrapper.remove();
				},
				onClose(val) {
					onClose?.apply(modal, [val]);
					wrapper.remove();
				},
				type,
				..._attrs
			});
			wrapper.append(modal);

			modal.addEventListener('click', (e) => {
				e.stopPropagation();
			});
			if (maskCloseable) {
				/** 点击遮罩层关闭模态框 */
				wrapper.addEventListener('click', () => {
					onClose?.apply(modal);
					wrapper.remove();
				});
			}
		});

		if (duration) {
			setTimeout(() => {
				wrapper.remove();
			}, duration * 1000);
		}

		this.root.append(wrapper);

		return wrapper;
	}

	/**
	 * 消息推送
	 */
	message(type: MessageElement['type'], attrs: MessageAttrs) {
		if(typeof attrs === 'string'){
			attrs = { content: attrs }; 
		}
		const message = h('message-element', { type, ...attrs });
		this.messageContainer.append(message);
		return message;
	}

	/**
	 * 注册额外菜单栏
	 * @param label	名称
	 * @param config 设置
	 */
	menu(label: string, config: { scriptPanelLink?: ScriptIdentify }) {
		this.extraMenuBar.style.display = 'flex';

		const btn = h('button', label);
		btn.addEventListener('click', () => {
			if (config.scriptPanelLink) {
				// 置顶脚本页面
				this.pin(config.scriptPanelLink)
					.then(() => {
						// 最大化窗口
						this.normal();
					})
					.catch(console.error);
			}
		});
		if (config.scriptPanelLink) {
			const full_name =
				(config.scriptPanelLink.projectName ? config.scriptPanelLink.projectName + ' -> ' : '') +
				config.scriptPanelLink.name;
			btn.title = '快捷跳转：' + full_name;
			btn.classList.add('script-panel-link');
		}
		this.extraMenuBar.append(btn);
		return btn;
	}

	/**
	 * 随机挂载到指定的父元素
	 * @param parent 挂载的父元素
	 */
	mount(parent: Element | HTMLElement | Document) {
		// 随机位置插入操作面板到页面
		parent.children[$.random(0, parent.children.length - 1)].after(this.wrapper);
	}
}

/** 判断这个脚本是否为当前显示页面 */
function isCurrentPanel(projectName: string | undefined, script: ScriptIdentify, currentPanelName: string) {
	return projectName + '-' + script.name === currentPanelName || script.namespace === currentPanelName;
}

/** 兼容低版本浏览器 */
function handleLowLevelBrowser() {
	if (typeof Element.prototype.replaceChildren === 'undefined') {
		Element.prototype.replaceChildren = function (...nodes: (string | Node)[]) {
			this.innerHTML = '';
			for (const node of nodes) {
				this.append(node);
			}
		};
	}
}
