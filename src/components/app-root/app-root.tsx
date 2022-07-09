import { Component, Host, h, Element, State, Method } from '@stencil/core';
import type { SlDialog } from '@shoelace-style/shoelace';
import type { FileDropEvent } from 'file-drop-element';
import 'file-drop-element';

import '@shoelace-style/shoelace/dist/components/button-group/button-group.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/avatar/avatar.js';

@Component({
	tag: 'app-root',
	shadow: true,
	styleUrl: 'app-root.less',
})
export class AppRoot {
	private detectorElement: HTMLDoremiDetectorElement;
	private browseElement: HTMLInputElement;
	private aboutElement: SlDialog;
	private errorElement: SlDialog;

	private filename: string;
	private downloadUrl: string = null;

	@Element() host: HTMLAppRootElement;

	@State()
	trigger = 1;

	@State()
	showSplash = true;

	@State()
	disableFirstAction = true;

	@State()
	disableSecondAction = true;

	@State()
	showFrame = false;

	@State()
	detectorError = '';

	connectedCallback() {
		this.handleDetectorChange = this.handleDetectorChange.bind(this);
		this.handleDetectorError = this.handleDetectorError.bind(this);

		this.handleBrowseButtonClick = this.handleBrowseButtonClick.bind(this);
		this.handleAddButtonClick = this.handleAddButtonClick.bind(this);
		this.handleDeleteButtonClick = this.handleDeleteButtonClick.bind(this);
		this.handleFrameButtonClick = this.handleFrameButtonClick.bind(this);
		this.handleSaveButtonClick = this.handleSaveButtonClick.bind(this);
		this.handleAboutButtonClick = this.handleAboutButtonClick.bind(this);

		this.handleFiledrop = this.handleFiledrop.bind(this);
		this.handleFileSelect = this.handleFileSelect.bind(this);

		this.handleDetectorChange();
	}

	disconnectedCallback() {}

	componentWillLoad() {}

	handleDetectorChange() {
		this.disableFirstAction = this.detectorElement == null || this.detectorElement.loading;
		this.disableSecondAction = this.disableFirstAction || this.detectorElement.src === '';
		this.showFrame = this.detectorElement != null && this.detectorElement.showFrame;
		this.showSplash = this.detectorElement == null || (!this.detectorElement.loading && this.detectorElement.src === '');
	}

	handleDetectorError(e: CustomEvent<Error>) {
		this.showError(e.detail);
	}

	handleBrowseButtonClick() {
		if (this.disableFirstAction) return;
		this.browseElement?.click();
	}

	handleAddButtonClick() {
		if (this.disableSecondAction) return;
		this.detectorElement.addCover();
	}

	handleDeleteButtonClick() {
		if (this.disableSecondAction) return;
		this.detectorElement.deleteCover();
	}

	handleFrameButtonClick() {
		if (this.disableSecondAction) return;
		this.detectorElement.showFrame = !this.detectorElement.showFrame;
	}

	async handleSaveButtonClick() {
		if (this.disableSecondAction) return;

		const blob = await this.detectorElement.exportImage();
		if (blob) {
			const hf = document.createElement('a');
			hf.href = URL.createObjectURL(blob);
			if (hf.href !== '') {
				hf.download = this.filename;
				hf.click();
			}
		} else {
			this.showError(new Error('invalid-save'));
		}
	}

	handleAboutButtonClick() {
		this.aboutElement?.show();
	}

	handleFiledrop(e: FileDropEvent) {
		if (this.disableFirstAction) return;
		const { files } = e;
		if (!files || files.length === 0 || !(files[0] instanceof File)) return;
		const file = files[0];

		this.changeFile(file);
	}

	handleFileSelect(e: InputEvent) {
		if (this.disableFirstAction) return;
		const file = this.browseElement?.files?.[0];
		if (!(file instanceof File)) return;

		this.browseElement.value = '';
		this.changeFile(file);
	}

	private changeFile(file: File) {
		if (this.downloadUrl) {
			URL.revokeObjectURL(this.downloadUrl);
			this.downloadUrl = null;
		}
		this.filename = file.name;
		this.detectorElement.src = URL.createObjectURL(file);
	}

	private showError(error: Error) {
		if (error instanceof Error) {
			let { message } = error;
			if (message === 'invalid-image') message = `无法读取图片：${this.filename}`;
			else if (message === 'invalid-save') message = `无法生成图片`;
			else if (message === 'face-not-found') message = `没有侦测到脸部`;
			this.detectorError = message;
		} else {
			this.detectorError = '发生了错误';
		}
		this.errorElement?.show();
	}

	private preventDefault(e: Event) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	@Method()
	async update() {
		this.trigger++;
	}

	render() {
		return (
			<Host onDragStart={this.preventDefault} onDrop={this.preventDefault} onDragOver={this.preventDefault}>
				<div part="controls-container" class="app__controls-container">
					<sl-button-group part="controls" class="app__controls">
						<sl-button class="app__button-index" href="./" variant="neutral">
							<sl-icon slot="prefix" class="app__logo"></sl-icon>AI接头工具
						</sl-button>
						<sl-button class="app__button-browse" onClick={this.handleBrowseButtonClick} disabled={this.disableFirstAction}>
							<sl-icon slot="prefix" name="folder2-open"></sl-icon>选取图片
						</sl-button>
						<sl-button class="app__button-add" onClick={this.handleAddButtonClick} disabled={this.disableSecondAction}>
							<sl-icon slot="prefix" name="plus-circle"></sl-icon>添加<sl-icon slot="suffix" class="app__logo"></sl-icon>
						</sl-button>
						<sl-button class="app__button-delete" onClick={this.handleDeleteButtonClick} disabled={this.disableSecondAction}>
							<sl-icon slot="prefix" name="trash"></sl-icon>删除<sl-icon slot="suffix" class="app__logo"></sl-icon>
						</sl-button>
						<sl-button class="app__button-frame" onClick={this.handleFrameButtonClick} disabled={this.disableSecondAction}>
							<sl-icon slot="prefix" name={this.showFrame ? 'x-square' : 'square'}></sl-icon>
							{this.showFrame ? '隐藏' : '显示'}特征
						</sl-button>
						<sl-button class="app__button-save" onClick={this.handleSaveButtonClick} disabled={this.disableSecondAction}>
							<sl-icon slot="prefix" name="download"></sl-icon>保存图片
						</sl-button>
						<sl-button class="app__button-about" variant="neutral" onClick={this.handleAboutButtonClick}>
							<sl-icon slot="prefix" name="info-circle"></sl-icon>关于
						</sl-button>
					</sl-button-group>
				</div>
				<file-drop part="drop" class="app__drop" onFiledrop={this.handleFiledrop} accept="image/*">
					<doremi-detector
						ref={(el) => (this.detectorElement = el)}
						onSrcChange={this.handleDetectorChange}
						onLoadingChange={this.handleDetectorChange}
						onShowFrameChange={this.handleDetectorChange}
						onDetectorError={this.handleDetectorError}
					></doremi-detector>
				</file-drop>
				{this.showSplash && (
					<div class="app__splash">
						<div class="app__splash-content">
							<sl-icon slot="prefix" class="app__logo" style={{ 'font-size': '200px' }}></sl-icon>
							<sl-button class="app__button-browse" size="large" type="primary" onClick={this.handleBrowseButtonClick}>
								<sl-icon slot="prefix" name="folder2-open"></sl-icon>选取图片
							</sl-button>
							<div class="app__splash-line">或</div>
							<div class="app__splash-message">拖放图片至空白处</div>
						</div>
					</div>
				)}
				<input
					part="browse"
					class="app__browse"
					ref={(el) => (this.browseElement = el)}
					type="file"
					accept="image/*"
					onChange={this.handleFileSelect}
				/>
				<sl-dialog ref={(el: SlDialog) => (this.aboutElement = el)} class="app__about">
					<div slot="label" class="app__about-label">
						<sl-icon slot="prefix" class="app__logo"></sl-icon> 关于AI接头工具
					</div>
					<app-about></app-about>
				</sl-dialog>
				<sl-dialog ref={(el: SlDialog) => (this.errorElement = el)} class="app__error">
					<div slot="label" class="app__error-label">
						<sl-icon slot="prefix" name="exclamation-triangle"></sl-icon> 错误
					</div>
					{this.detectorError?.toString()}
				</sl-dialog>
			</Host>
		);
	}
}
