const { start, Project, Script, $, $message, createRenderScript } = EUS;

(function () {
	'use strict';

	/**
	 * 内置的渲染脚本，包含在内置的 RenderProject 类中。搭配 start 函数进行整个脚本的悬浮窗构成创建
	 *
	 * 可以不用悬浮窗也能执行脚本的生命周期，但是不会执行 render 这个生命周期
	 */
	const RenderScript = createRenderScript({
		name: 'aaa'
	});

	const TesProject = Project.create({
		name: 'test',
		scripts: {
			fav_list: new Script({
				name: 'fav_list',
				matches: [['首页', '.*']],
				namespace: 'test.fav_list',
				configs: {
					data: {
						defaultValue: []
					},
					add_to_fav: {
						label: '当前页面',
						defaultValue: '点击收藏',
						attrs: {
							type: 'button'
						},
						onload() {
							this.onclick = () => {
								const url = location.href;
								console.log(TesProject.scripts.fav_list.cfg.data);
								TesProject.scripts.fav_list.cfg.data = Array.from(
									new Set([url, ...TesProject.scripts.fav_list.cfg.data])
								);
							};
						}
					}
				},
				oncomplete() {
					console.log(this.cfg);
					$message.info('test');
				}
			}),
			render: RenderScript
		}
	});

	// 运行脚本
	start({
		projects: [TesProject],
		RenderScript,
		renderConfig: {
			styles: [GM_getResourceText('STYLE')],
			defaultPanelName: 'test.fav_list',
			title: 'test'
		}
	});
})();
