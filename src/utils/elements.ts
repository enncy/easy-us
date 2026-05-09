import { ScriptPanelElement } from '../elements';

/**
 * 全局元素 在调用 start 函数后自动挂载
 */
export const $elements = {
	tooltipContainer: undefined as HTMLDivElement | undefined,
	root: undefined as ShadowRoot | undefined,
	currentScriptPanel: undefined as ScriptPanelElement | undefined,
	wrapper: undefined as HTMLDivElement | undefined
};
