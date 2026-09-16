import { ConfigElement } from '../elements/config';
import { ConfigTagMap } from '../elements/configs/interface';
import type { Script } from './script';

/** 插槽内容 */
export type ConfigSlotContent = string | HTMLElement;
/**
 * 插槽内容提供者，支持函数懒加载。
 * 函数内 this 指向所属 {@link Script} 实例（可访问 this.cfg / this.methods 等），
 * 第一个参数为脚本的响应式配置 cfg（供箭头函数使用）。
 */
export type ConfigSlotProvider = ConfigSlotContent | ((this: Script, cfg: any) => ConfigSlotContent);

export interface Config<T extends keyof ConfigTagMap = keyof ConfigTagMap, V = any>
	extends Partial<
		Pick<
			ConfigElement<T>,
			| 'tag'
			| 'attrs'
			| 'options'
			| 'showIf'
			| 'elementClassName'
			| 'labelClassName'
			| 'providerClassName'
			| 'enableForAttribute'
		>
	> {
	defaultValue: V;
	label?: string;
	/** 前置插槽，插入到输入元素之前，支持字符串（HTML）、元素或 (cfg) => 内容 的懒加载函数 */
	prefixSlot?: ConfigSlotProvider;
	/** 后置插槽，插入到输入元素之后，支持字符串（HTML）、元素或 (cfg) => 内容 的懒加载函数 */
	suffixSlot?: ConfigSlotProvider;
	/** 将本地修改后的值同步到元素中 */
	sync?: boolean;
	/** 在元素上方创建一个分隔元素 */
	separator?: string;
	/** 元素加载回调 */
	onload?: (this: ConfigTagMap[T], el: ConfigElement<T>) => void;
	/**
	 * 额外的数据，可以由程序自定义并解析
	 */
	extra?: any;
}
