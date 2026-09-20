import { IElement } from './interface';
import { h } from '../utils/dom';

export class DropdownElement extends IElement {
	/** 触发元素 */
	triggerElement: HTMLElement = h('button');
	/** 下拉框内容 */
	content: HTMLDivElement = h('div', { className: 'dropdown-content' });
	trigger: 'hover' | 'click' = 'hover';
	/**
	 * 悬浮模式的隐藏延迟（毫秒）。
	 * 仅需覆盖触发元素与内容区之间小间隙的跨越时间，过大会导致下拉框停留过久。
	 */
	hideDelay: number = 50;
	/** 文档点击监听器（click 触发模式下用于点击外部区域时隐藏） */
	private documentClickHandler: ((e: MouseEvent) => void) | undefined;

	connectedCallback() {
		this.append(this.triggerElement, this.content);
		this.classList.add('dropdown');

		if (this.trigger === 'click') {
			this.triggerElement.onclick = () => {
				this.content.classList.toggle('show');
			};
			// 点击下拉框以外的区域时自动隐藏
			this.removeDocumentClickHandler();
			this.documentClickHandler = (e: MouseEvent) => {
				if (this.content.classList.contains('show') && e.composedPath().includes(this) === false) {
					this.content.classList.remove('show');
				}
			};
			document.addEventListener('click', this.documentClickHandler);
		} else {
			// 悬浮显示；隐藏采用延迟 + 取消的方式：
			// 触发元素与内容区之间只要存在间隙（如行盒基线空隙），
			// mouseout 立即隐藏会导致鼠标移向内容区时下拉框直接消失，永远无法移入。
			let hideTimer: ReturnType<typeof setTimeout> | undefined;
			const show = () => {
				if (hideTimer !== undefined) {
					clearTimeout(hideTimer);
					hideTimer = undefined;
				}
				this.content.classList.add('show');
			};
			const hide = () => {
				if (hideTimer !== undefined) {
					clearTimeout(hideTimer);
				}
				hideTimer = setTimeout(() => {
					this.content.classList.remove('show');
					hideTimer = undefined;
				}, this.hideDelay);
			};
			// 使用属性赋值（而非 addEventListener），避免元素被反复插入文档时重复绑定
			this.triggerElement.onmouseenter = show;
			this.triggerElement.onmouseleave = hide;
			this.content.onmouseenter = show;
			this.content.onmouseleave = hide;
		}

		this.content.onclick = () => {
			this.content.classList.remove('show');
		};
	}

	disconnectedCallback() {
		this.removeDocumentClickHandler();
	}

	private removeDocumentClickHandler() {
		if (this.documentClickHandler) {
			document.removeEventListener('click', this.documentClickHandler);
			this.documentClickHandler = undefined;
		}
	}
}
