import { Component, Host, h, Element, State, Prop, Watch, Method, Event, EventEmitter } from '@stencil/core';
import Doremi from '../../utils/types';
import { init, detect } from './detector.worker';

@Component({
	tag: 'doremi-detector',
	shadow: true,
	styleUrl: 'detector.less',
})
export class DoremiDetector {
	private canvasElement: HTMLCanvasElement;
	private imageElement: HTMLImageElement;
	private editorElement: HTMLDoremiEditorElement;
	private resizeObserver: ResizeObserver;
	private width: number = 0;
	private height: number = 0;
	data: Doremi.Data = { id: 0, width: 1, height: 1, covers: [] };

	@Element() host: HTMLDoremiDetectorElement;

	@Prop({ reflect: true, mutable: true }) src = '';

	@Prop({ mutable: true })
	loading = false;

	@Prop({ mutable: true })
	showFrame = false;

	@State()
	scale = 1;

	@State()
	trigger = 1;

	@Watch('src')
	watchSrcChange() {
		this.srcChange.emit();
		this.handleImageChange();
	}

	@Watch('loading')
	watchLoadingChange() {
		this.loadingChange.emit();
	}

	@Watch('showFrame')
	watchShowFrameChange() {
		this.showFrameChange.emit();
	}

	/** Emitted when src changes. */
	@Event({ eventName: 'srcChange' }) srcChange: EventEmitter;

	/** Emitted when loading changes. */
	@Event({ eventName: 'loadingChange' }) loadingChange: EventEmitter;

	/** Emitted when show-frame changes. */
	@Event({ eventName: 'showFrameChange' }) showFrameChange: EventEmitter;

	/** Emitted when an error occurred. */
	@Event({ eventName: 'detectorError' }) error: EventEmitter;

	connectedCallback() {
		this.handleResize = this.handleResize.bind(this);

		this.resizeObserver = new ResizeObserver(this.handleResize);
		this.resizeObserver.observe(this.host);
	}

	disconnectedCallback() {
		this.resizeObserver.unobserve(this.host);
		this.resizeObserver.disconnect();
	}

	componentWillLoad() {
		this.watchSrcChange();
	}

	handleResize(entries?: ResizeObserverEntry[]) {
		let hostRect: Pick<DOMRect, 'height' | 'width'> = null;
		let contentRect: Pick<DOMRect, 'height' | 'width'> = null;
		if (entries != null && entries.length > 0) {
			for (let index = 0; index < entries.length; index++) {
				const entry = entries[index];
				if (entry.target === this.host) hostRect = entry.contentRect;
				else if (entry.target === this.canvasElement) contentRect = entry.contentRect;
			}
		}

		if (hostRect == null) {
			const styles = getComputedStyle(this.host);
			hostRect = {
				height: this.host.offsetHeight - (parseFloat(styles.paddingTop) || 0) - (parseFloat(styles.paddingBottom) || 0),
				width: this.host.offsetWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0),
			};
		}
		if (contentRect == null) {
			contentRect = {
				height: this.canvasElement.offsetHeight,
				width: this.canvasElement.offsetWidth,
			};
		}

		const scaleX = hostRect.width / Math.max(1, contentRect.width);
		const scaleY = hostRect.height / Math.max(1, contentRect.height);
		if ((scaleX === 0 || scaleY === 0) && entries != null) {
			requestAnimationFrame(() => this.handleResize());
		} else {
			const scale = Math.min(scaleY, scaleX);
			this.scale = scale;
		}
	}

	private async handleImageChange() {
		if (this.src === '') return;

		this.loading = true;
		const startTime = performance.now();

		this.data.covers = [];
		this.data.eyes = [];
		this.data.faces = [];
		if (this.editorElement) await this.editorElement.update();

		try {
			this.imageElement = await loadImage(this.src);
			let width = this.imageElement.width;
			let height = this.imageElement.height;

			const ratio = Math.ceil(Math.sqrt(width * height) / 1000);
			if (ratio > 1) {
				width = Math.round(width / ratio);
				height = Math.round(height / ratio);
			}

			this.width = width;
			this.height = height;

			this.canvasElement.width = this.width;
			this.canvasElement.height = this.height;

			await this.update();

			const context = this.canvasElement.getContext('2d');
			context.drawImage(this.imageElement, 0, 0, this.width, this.height);

			await init(location.href);
			const result = await detect(context.getImageData(0, 0, this.width, this.height).data, this.width, this.height);

			this.data.covers = result.covers;
			this.data.width = result.width;
			this.data.height = result.height;

			this.data.eyes = result.eyes;
			this.data.faces = result.faces;

			await this.editorElement.update();

			if (this.data.covers.length === 0) {
				this.error.emit(new Error('face-not-found'));
			}
			this.loading = false;
		} catch (e: unknown) {
			this.loading = false;
			this.error.emit(e);
			return;
		}
		console.log('time: ' + (performance.now() - startTime).toFixed(2) + 'ms');
	}

	private preventDefault(e: Event) {
		e.preventDefault();
		e.stopPropagation();
	}

	@Method()
	async addCover() {
		this.editorElement?.addCover();
	}

	@Method()
	async deleteCover() {
		this.editorElement?.deleteCover();
	}

	@Method()
	async exportImage() {
		if (this.loading || this.src === '' || this.imageElement == null || this.width === 0 || this.height === 0) return null;
		this.loading = true;

		try {
			const scaleWidth = this.imageElement.width / this.width;
			const scaleHeight = this.imageElement.height / this.height;

			const canvas = document.createElement('canvas');
			canvas.width = this.imageElement.width;
			canvas.height = this.imageElement.height;

			const context = canvas.getContext('2d');
			context.drawImage(this.imageElement, 0, 0);

			if (this.data?.covers?.length) {
				const doremiImageUrl = getComputedStyle(document.documentElement).getPropertyValue('--face');
				const start = doremiImageUrl.indexOf('data:');
				const end = doremiImageUrl.lastIndexOf('"');
				const doremiImage = await loadImage(doremiImageUrl.substring(start, end));

				for (const cover of this.data.covers) {
					const x = scaleWidth * cover.left;
					const y = scaleHeight * cover.top;
					const width = scaleWidth * cover.width;
					const height = scaleHeight * cover.height;
					const cx = x + width / 2;
					const cy = y + height / 2;

					context.save();
					context.translate(cx, cy);
					context.rotate(cover.rotate);
					if (cover.flip) context.scale(-1, 1);
					context.translate(-cx, -cy);
					context.drawImage(doremiImage, x, y, width, height);
					context.restore();
				}
			}

			this.loading = false;
			return new Promise<Blob>(resolve => {
				canvas.toBlob(blob => (resolve(blob), null), 'image/jpeg', 0.95);
			});
		} catch (e: unknown) {
			this.loading = false;
			this.error.emit(e);
			return null;
		}
	}

	@Method()
	async update() {
		this.trigger++;
	}

	render() {
		return (
			<Host onDragStart={this.preventDefault}>
				<div part="base" class="detector__base">
					<doremi-editor
						ref={el => {
							this.editorElement = el;
							el.setData(this.data);
						}}
						width={this.width * this.scale}
						height={this.height * this.scale}
					>
						<canvas
							class="detector__canvas"
							ref={el => {
								if (this.canvasElement && this.canvasElement !== el) this.resizeObserver.unobserve(this.canvasElement);
								this.canvasElement = el;
								this.resizeObserver.observe(this.canvasElement);
							}}
							style={{ transform: `scale(${this.scale})` }}
						></canvas>
						<svg class="detector__frames" viewBox={`0 0 ${this.width} ${this.height}`}>
							{this.showFrame &&
								this.data?.eyes?.map(eye => (
									<rect class="detector__frames-eye" x={eye.x} y={eye.y} height={eye.height} width={eye.width} />
								))}
							{this.showFrame &&
								this.data?.faces?.map(face => (
									<rect class="detector__frames-face" x={face.x} y={face.y} height={face.height} width={face.width} />
								))}
						</svg>
					</doremi-editor>
				</div>
				<sl-spinner class="detector__spinner" style={{ display: this.loading ? 'block' : 'none' }}></sl-spinner>
			</Host>
		);
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = function () {
			resolve(img);
		};
		img.onerror = function () {
			reject(new Error('invalid-image'));
		};
		img.crossOrigin = 'anonymous';
		img.src = src;
	});
}
