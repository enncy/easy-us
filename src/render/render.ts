import { ModalElement } from '../elements';
import { Script, ScriptConfigsProvider } from '../interfaces/script';
import { $creator } from '../utils/creator';
import { h } from '../utils/dom';
import { MessageAttrs, ModalAttrs, ScriptIdentify } from '../interfaces/custom-window';
import { $win } from '../utils/start';
import { cors } from '../interfaces';

export const createRenderScript = (config?: {
	name?: string;
	matches?: (string | RegExp)[];
	namespace?: string;
	configs?: ScriptConfigsProvider<any>;
}) =>
	new Script({
		name: config?.name || '🖼️ 窗口设置',
		matches: config?.matches || [['所有', /.*/]],
		namespace: config?.namespace || 'render.panel',
		configs: config?.configs || {
			notes: {
				defaultValue: $creator.notes([
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
			visual: { defaultValue: 'normal' as 'minimize' | 'normal' | 'close' },
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
				isPinned: (script) => $win?.isPinned(script),
				/**
				 * 将当前的脚本置顶
				 * @param script 脚本
				 */
				pin: (script) => $win?.pin(script),
				/**
				 * 最小化窗口
				 */
				minimize: () => $win?.minimize(),
				/**
				 * 将窗口最小化，并移动至窗口边缘
				 */
				moveToEdge: () => $win?.moveToEdge(),
				normal: () => {
					$win?.normal();
				}
			};
		},
		onrender({ panel }) {
			const closeBtn = h('button', { className: 'base-style-button' }, '隐藏窗口');
			closeBtn.onclick = () => {
				if (this.cfg.firstCloseAlert) {
					$win?.modal('confirm', {
						content: $creator.notes([
							'隐藏脚本页面后，快速点击页面三下（可以在悬浮窗设置中调整次数）即可重新显示脚本。如果三下无效，可以尝试删除脚本重新安装。',
							'请确认是否关闭。（此后不再显示此弹窗）'
						]),
						onConfirm: () => {
							this.cfg.visual = 'close';
							this.cfg.firstCloseAlert = false;
						}
					});
				} else {
					this.cfg.visual = 'close';
				}
			};

			panel.body.replaceChildren(h('hr'), closeBtn);
		},
		oncomplete(...args) {
			setTimeout(() => {
				console.log('$win', $win);
			}, 3000);
		}
	});

function _modal(type: ModalElement['type'], attrs: ModalAttrs) {
	if (self === top) {
		return $win?.modal(type, attrs);
	} else {
		cors.emit('modal', [type, attrs], (args) => {
			if (args) {
				attrs.onConfirm?.(args);
			} else {
				attrs.onCancel?.();
			}
			attrs.onClose?.(args);
		});
	}
}

/**
 * 打开弹窗，如果调用时不在顶级窗口，则会通过跨域通信发送消息
 */
export const $modal = {
	confirm: (attrs: ModalAttrs) => _modal('confirm', attrs),
	alert: (attrs: ModalAttrs) => _modal('alert', attrs),
	prompt: (attrs: ModalAttrs) => _modal('prompt', attrs),
	simple: (attrs: ModalAttrs) => _modal('simple', attrs)
};

function _message(type: 'info' | 'success' | 'warn' | 'error', attrs: MessageAttrs) {
	if (self === top) {
		return $win?.message(type, attrs);
	} else {
		if (typeof attrs === 'string') {
			attrs = { content: attrs };
		}
		// 跨域无法传递 HTMLElement，所以这里需要将 HTMLElement 转换为字符串
		else if (typeof attrs.content !== 'string') {
			attrs.content = (attrs.content as HTMLElement).innerHTML;
		}
		cors.emit('message', [type, attrs]);
	}
}

/**
 * 消息提示，如果调用时不在顶级窗口，则会通过跨域通信发送消息
 */
export const $message = {
	info: (attrs: MessageAttrs) => _message('info', attrs),
	success: (attrs: MessageAttrs) => _message('success', attrs),
	warn: (attrs: MessageAttrs) => _message('warn', attrs),
	error: (attrs: MessageAttrs) => _message('error', attrs)
};

/**
 * 注册菜单
 * @param label 菜单名称
 * @param config 菜单配置
 */
export function $menu(
	label: string,
	config: {
		scriptPanelLink?: ScriptIdentify;
	}
) {
	if (self !== top) {
		return;
	}
	return $win?.menu(label, config);
}
