import { Config } from '@stencil/core';
import { less } from '@stencil/less';

export const config: Config = {
	namespace: 'doremi',
	globalStyle: 'src/styles/global.less',
	buildEs5: false,
	extras: {
		cssVarsShim: false,
		dynamicImportShim: false,
		safari10: false,
		scriptDataOpts: false,
		shadowDomShim: false,
	},
	devServer: {
		reloadStrategy: 'pageReload',
	},
	outputTargets: [
		{
			type: 'dist',
			esmLoaderPath: '../loader',
		},
		{
			type: 'dist-custom-elements',
		},
		{
			type: 'docs-readme',
		},
		{
			type: 'www',
			serviceWorker: null, // disable service workers,
			copy: [
				{ src: 'favicon.ico' },
				{ src: 'opencv' },
				{ src: '../node_modules/@shoelace-style/shoelace/dist/assets', dest: 'assets' },
			],
		},
	],
	plugins: [
		less({
			injectGlobalPaths: ['src/styles/variables.less', 'src/styles/component.less'],
		}),
	],
};
