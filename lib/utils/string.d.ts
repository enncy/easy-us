/**
 * 字符串工具库
 */
export declare const $string: {
    /**
     * 驼峰转目标字符串
     * @param value
     */
    humpToTarget(value: string, target: string): string;
};
export declare class StringUtils {
    _text: string;
    constructor(_text: string);
    /** 删除换行符 */
    static nowrap(str?: string): string;
    /** 删除换行符 */
    nowrap(): this;
    /** 删除空格，多个空格只留一个 */
    static nospace(str?: string): string;
    /** 删除空格，多个空格只留一个 */
    nospace(): this;
    /** 删除特殊字符 */
    static noSpecialChar(str?: string): string;
    /** 删除特殊字符 */
    noSpecialChar(): this;
    /** 最大长度，剩余显示省略号 */
    static max(str: string, len: number): string;
    /** 最大长度，剩余显示省略号 */
    max(len: number): this;
    /** 隐藏字符串 */
    static hide(str: string, start: number, end: number, replacer?: string): string;
    /** 隐藏字符串 */
    hide(start: number, end: number, replacer?: string): this;
    /**
     * 根据字符串创建 StringUtils 对象
     * @param text  字符串
     */
    static of(text: string): StringUtils;
    toString(): string;
}
