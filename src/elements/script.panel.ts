import { h } from '../utils/dom';
import { IElement } from './interface';

/**
 * 脚本的面板，创建于悬浮窗下，每当切换页面，或者展开时会重新渲染面板。
 *
 * 主要结构为：
 * 分隔符
 * 提示板块
 * 设置表单板块
 * 主体
 *
 */
export class ScriptPanelElement extends IElement {
	/** 分隔符 */
	separator: HTMLDivElement = h('div', { className: 'separator' });
	/** 创建提示板块 */
	notesContainer: HTMLDivElement = h('div', { className: 'notes card' });
	/** 提示板块头部，点击可收缩/展开 */
	notesHeader: HTMLDivElement = h('div', { className: 'notes-header' });
	/** 提示板块主体 */
	notesBody: HTMLDivElement = h('div', { className: 'notes-body' });
	/** 创建设置板块 */
	configsContainer: HTMLDivElement = h('div', { className: 'configs-container card' });
	/** 主体 */
	body: HTMLDivElement = h('div', { className: 'script-panel-body' });
	/** 锁定配置板块 */
	lockWrapper: HTMLDivElement = h('div', { className: 'lock-wrapper' });
	/** 面板名字 */
	name?: string;

	connectedCallback() {
		this.separator.innerText = this.name || '';
		this.notesHeader.append(
			h('span', { className: 'notes-title' }, '提示'),
			h('span', { className: 'notes-collapse-icon' }, '▼')
		);
		this.notesContainer.append(this.notesHeader);
		this.notesContainer.append(this.notesBody);
		this.append(this.separator);
		this.append(this.notesContainer);
		this.append(this.configsContainer);
		this.append(this.body);
	}

	/** 设置提示板块展开状态 */
	setNotesExpanded(expanded: boolean) {
		this.notesContainer.classList.toggle('collapsed', !expanded);
	}

	/** 当前提示板块是否处于展开状态 */
	isNotesExpanded() {
		return !this.notesContainer.classList.contains('collapsed');
	}
}
