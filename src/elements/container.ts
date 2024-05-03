import { $ } from '../utils/common';
import { $ui } from '../utils/ui';
import { h } from '../utils/dom';
import { HeaderElement } from './header';
import { IElement } from './interface';

/** 面板主体元素 */
export class ContainerElement extends IElement {
	/** 头部 */
	header: HeaderElement = $ui.tooltip(h('header-element', { title: '菜单栏-可拖动区域' }));
	/** 内容 */
	body: HTMLDivElement = h('div', { className: 'body', clientHeight: window.innerHeight / 2 });
	/** 底部 */
	footer: HTMLDivElement = h('div', { className: 'footer' });

	connectedCallback() {
		this.append(this.header, this.body, this.footer);

		$.onresize(this, (cont) => {
			cont.body.style.maxHeight = window.innerHeight - this.header.clientHeight - 100 + 'px';
			cont.body.style.maxWidth = window.innerWidth - 50 + 'px';
		});
	}
}
