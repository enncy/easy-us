import { Project, Script, StoreProvider } from '.';
import { ContainerElement, MessageElement, ModalElement } from '../elements';
export type ModalAttrs = Pick<ModalElement, 'content' | 'onConfirm' | 'onCancel' | 'onClose' | 'cancelButtonText' | 'confirmButtonText' | 'placeholder' | 'width' | 'cancelButton' | 'confirmButton' | 'inputDefaultValue' | 'profile' | 'modalInputType' | 'modalStyle'> & {
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
export type MessageAttrs = Pick<MessageElement, 'duration' | 'onClose' | 'content' | 'closeable'>;
/**
 * Script唯一识别码，通过 namespace 或者 projectName-name 来进行判断
 */
export type ScriptIdentify = {
    namespace?: string;
    projectName?: string;
    name?: string;
} | Script;
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
        getPosition: () => {
            x: number;
            y: number;
        };
        getRenderURLs: () => string[] | Promise<string[]>;
        setRenderURLs: (urls: string[]) => void | Promise<void>;
        getCurrentPanelName: () => string | Promise<string>;
        setCurrentPanelName: (name: string) => void | Promise<void>;
    };
};
export declare class CustomWindow {
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
    messageContainer: HTMLDivElement;
    /** 额外的菜单栏 */
    extraMenuBar: HTMLDivElement;
    /** 默认值 */
    defaults: {
        /** 当前页面存在默认页面 */
        urls: (urls: string[]) => string[];
        /** 默认面板名 */
        panelName: (name: string) => string;
    };
    constructor(projects: Project[], inputStoreProvider: StoreProvider, config: CustomWindowRenderConfig);
    private rerender;
    private initHeader;
    private renderBody;
    setFontSize(fontsize: number): void;
    setVisual(value: VisualType): void;
    changeRenderURLs(urls: string[]): Promise<void>;
    changePanel(currentPanelName: string): Promise<void>;
    /**
     * 判断当前脚本是否置顶
     * 因为在 4.2.x 版本之后，所有面板都会进行显示，某些脚本可以根据这个方法是否已显示在页面中
     * @param script 脚本
     */
    isPinned(script: ScriptIdentify): Promise<boolean>;
    /**
     * 将当前的脚本置顶
     * @param script 脚本
     */
    pin(script: ScriptIdentify): Promise<void>;
    /**
     * 将窗口最小化，并移动至窗口边缘
     */
    moveToEdge(): void;
    /**
     * 最小化窗口
     */
    minimize(): void;
    normal(): void;
    /**
     * 创建一个模态框代替原生的 alert, confirm, prompt
     */
    modal(type: ModalElement['type'], attrs: ModalAttrs): HTMLDivElement;
    /**
     * 消息推送
     */
    message(type: MessageElement['type'], attrs: MessageAttrs): MessageElement;
    /**
     * 注册额外菜单栏
     * @param label	名称
     * @param config 设置
     */
    menu(label: string, config: {
        scriptPanelLink?: ScriptIdentify;
    }): HTMLButtonElement;
    /**
     * 随机挂载到指定的父元素
     * @param parent 挂载的父元素
     */
    mount(parent: Element | HTMLElement | Document): void;
}
