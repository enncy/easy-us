import { ConfigElement } from './config';
import { ContainerElement } from './container';
import { DropdownElement } from './dropdown';
import { HeaderElement } from './header';
import { MessageElement } from './message';
import { ModalElement } from './modal';
import { ScriptPanelElement } from './script.panel';

export class IElement extends HTMLElement {
	/** 每次将元素添加到文档时调用。规范建议，开发人员应尽可能在此回调中而不是构造函数中实现自定义元素设置。 */
	connectedCallback() {}
	/** 每次从文档中删除元素时调用。 */
	disconnectedCallback() {}
	/** 每次将元素移动到新文档时调用 */
	adoptedCallback() {}
	/** ：在更改、添加、删除或替换属性时调用 */
	attributeChangedCallback(name: string, oldValue: any, newValue: any) {}
}

export interface CustomElementTagMap {
	'container-element': ContainerElement;
	'config-element': ConfigElement;
	'modal-element': ModalElement;
	'message-element': MessageElement;
	'script-panel-element': ScriptPanelElement;
	'header-element': HeaderElement;
	'dropdown-element': DropdownElement;
}
