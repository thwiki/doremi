import { Component, Host, h, Element, State, Prop, Method } from '@stencil/core';
import Doremi from '../../utils/types';

type ContentElement = HTMLImageElement | HTMLCanvasElement | SVGElement;

@Component({
	tag: 'doremi-editor',
	shadow: true,
	styleUrl: 'editor.less',
})
export class DoremiEditor {
	private imageElements: ContentElement[];

	@Element() host: HTMLDoremiEditorElement;

	@Prop()
	pid: number = 0;

	@Prop({ mutable: true })
	width: number = 0;

	@Prop({ mutable: true })
	height: number = 0;

	@State()
	data: Doremi.Data;

	@State()
	selected: Doremi.Cover = null;

	@State()
	cursor: string = null;

	@State()
	trigger = 1;

	connectedCallback() {
		this.handleSlotChange = this.handleSlotChange.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.handleSelect = this.handleSelect.bind(this);
		this.handleDrag = this.handleDrag.bind(this);
		this.handleDragRotate = this.handleDragRotate.bind(this);
	}

	componentWillLoad() {
		if (this.pid !== 0) {
			const data = window.dataMap[this.pid];
			this.formatData(data);
			this.data = data;
		}
	}

	handleSlotChange() {
		const slot = this.host.shadowRoot.querySelector('slot');
		this.imageElements = slot.assignedElements({ flatten: true }) as ContentElement[];
		const firstElement = this.imageElements.find(
			(imageElement): imageElement is Exclude<ContentElement, SVGElement> => !(imageElement instanceof SVGElement)
		);
		this.width = firstElement?.width ?? 0;
		this.height = firstElement?.height ?? 0;
	}

	handleClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		this.selected = null;
	}

	handleSelect(event: any, cover: Doremi.Cover) {
		event.preventDefault();
		event.stopPropagation();

		if (this.selected !== cover) {
			this.selected = cover;
		}
	}

	handleDrag(event: any, cover: Doremi.Cover) {
		event.stopPropagation();
		if (this.selected !== cover) return;
		event.preventDefault();

		let resizeCorner = (event.target as HTMLElement)?.hasAttribute('data-corner')
			? (event.target as HTMLElement)?.getAttribute('data-corner')
			: null;
		const anchor = { x: cover.left + cover.width / 2, y: cover.top + cover.height / 2 };

		const { width, height } = this;

		function drag(event: any, container: HTMLElement, onMove: (x: number, y: number) => void) {
			const move = (event: any) => {
				const dims = container.getBoundingClientRect();
				const offsetX = dims.left + container.ownerDocument.defaultView.pageXOffset;
				const offsetY = dims.top + container.ownerDocument.defaultView.pageYOffset;
				const x = (event.changedTouches ? event.changedTouches[0].pageX : event.pageX) - offsetX;
				const y = (event.changedTouches ? event.changedTouches[0].pageY : event.pageY) - offsetY;

				onMove(x, y);
			};

			// Move on init
			move(event);

			const stop = () => {
				document.removeEventListener('mousemove', move);
				document.removeEventListener('touchmove', move);
				document.removeEventListener('mouseup', stop);
				document.removeEventListener('touchend', stop);
			};

			document.addEventListener('mousemove', move);
			document.addEventListener('touchmove', move);
			document.addEventListener('mouseup', stop);
			document.addEventListener('touchend', stop);
		}

		event.preventDefault();

		drag(event, this.host, (x, y) => {
			x = (this.data.width * x) / width;
			y = (this.data.height * y) / height;

			if (resizeCorner) {
				let newWidth = resizeCorner.includes('left') ? anchor.x - x : x - anchor.x;
				let newHeight = Math.abs(anchor.y - y);
				if (newWidth < 0) {
					newWidth = -newWidth;
					cover.flip = !cover.flip;
					resizeCorner =
						resizeCorner === 'topleft'
							? 'topright'
							: resizeCorner === 'topright'
							? 'topleft'
							: resizeCorner === 'bottomright'
							? 'bottomleft'
							: 'bottomright';
					this.setTransform(cover);
				}
				const size = Math.min(newWidth, newHeight);
				cover.left = anchor.x - size;
				cover.top = anchor.y - size;
				cover.width = size * 2;
				cover.height = size * 2;
			} else {
				cover.left = x - cover.width / 2;
				cover.top = y - cover.height / 2;
			}
			this.trigger++;
		});
	}

	handleDragRotate(event: any, cover: Doremi.Cover) {
		event.preventDefault();
		event.stopPropagation();
		if (this.selected !== cover) return;

		const { width, height } = this;
		const self = this;

		function drag(event: any, container: HTMLElement, onMove: (x: number, y: number) => void) {
			const move = (event: any) => {
				const dims = container.getBoundingClientRect();
				const offsetX = dims.left + container.ownerDocument.defaultView.pageXOffset;
				const offsetY = dims.top + container.ownerDocument.defaultView.pageYOffset;
				const x = (event.changedTouches ? event.changedTouches[0].pageX : event.pageX) - offsetX;
				const y = (event.changedTouches ? event.changedTouches[0].pageY : event.pageY) - offsetY;

				onMove(x, y);
			};

			// Move on init
			move(event);

			const stop = () => {
				document.removeEventListener('mousemove', move);
				document.removeEventListener('touchmove', move);
				document.removeEventListener('mouseup', stop);
				document.removeEventListener('touchend', stop);
				self.cursor = null;
			};

			document.addEventListener('mousemove', move);
			document.addEventListener('touchmove', move);
			document.addEventListener('mouseup', stop);
			document.addEventListener('touchend', stop);
		}

		event.preventDefault();

		drag(event, this.host, (x, y) => {
			const midX = (width * (cover.left + cover.width / 2)) / this.data.width;
			const midY = (height * (cover.top + cover.height / 2)) / this.data.height;
			const angle = Math.atan2(midY - y, midX - x);
			const normalAngle = Math.PI / 2;
			cover.rotate = angle - normalAngle;
			this.setTransform(cover);
			this.cursor = 'grabbing';
			this.trigger++;
			//this.position = clamp((x / width) * 100, 0, 100);
		});
	}

	private preventDefault(e: Event) {
		e.preventDefault();
		e.stopPropagation();
	}

	private setTransform(cover) {
		cover.transform = `rotate(${cover.rotate}rad)${cover.flip ? ' scaleX(-1)' : ''}`;
	}

	private formatData(data: Doremi.Data) {
		data?.covers?.forEach((cover) => {
			cover.rotate = parseFloat(cover.transform?.match(/rotate\(([\-\d\.]+)/)?.[1] ?? '0');
			cover.flip = !!cover.transform?.includes('scaleX(-1)');
		});
	}

	@Method()
	async addCover() {
		if (this.data?.covers && this.data.covers.length < 20) {
			const size = 0.1 * Math.max(this.data.height, this.data.width);
			const newCover: Doremi.Cover = {
				type: 'doremi',
				transform: '',
				left: this.data.width / 2 - size,
				top: this.data.height / 2 - size,
				width: size * 2,
				height: size * 2,
				rotate: 0,
				flip: false,
			};
			this.setTransform(newCover);
			this.data.covers.push(newCover);
			this.selected = newCover;
		}
	}

	@Method()
	async deleteCover() {
		if (this.data?.covers && this.selected != null) {
			const index = this.data.covers.indexOf(this.selected);
			if (index !== -1) {
				this.data.covers.splice(index, 1);
				this.selected = null;
			}
		}
	}

	@Method()
	async update() {
		this.trigger++;
	}

	@Method()
	async setData(data: any) {
		this.formatData(data);
		this.data = data;
	}

	render() {
		return (
			<Host
				style={{ width: this.width + 'px', height: this.height + 'px', cursor: this.cursor }}
				onClick={this.preventDefault}
				onMousedown={this.handleClick}
				onTouchStart={this.handleClick}
				onDragStart={this.preventDefault}
			>
				<slot onSlotchange={this.handleSlotChange}></slot>
				{this.data?.covers.map((cover) => {
					return (
						<div
							class={
								cover.type +
								'-face' +
								(this.selected === cover ? ' active-face' : '') +
								(this.cursor == null ? ' allow-cursor' : '')
							}
							style={{
								transform: cover.transform,
								left: this.width * (cover.left / this.data.width) + 'px',
								top: this.height * (cover.top / this.data.height) + 'px',
								width: this.width * (cover.width / this.data.width) + 'px',
								height: this.height * (cover.height / this.data.height) + 'px',
							}}
							onClick={(e) => this.handleSelect(e, cover)}
							onMouseDown={(e) => this.handleDrag(e, cover)}
							onTouchStart={(e) => this.handleDrag(e, cover)}
						>
							<div
								class="resize-handles"
								style={{ transform: `${cover.flip ? 'scaleX(-1) ' : ''}rotate(${-cover.rotate}rad)` }}
							>
								<div class="resize-handle" data-corner="topleft"></div>
								<div class="resize-handle" data-corner="topright"></div>
								<div class="resize-handle" data-corner="bottomright"></div>
								<div class="resize-handle" data-corner="bottomleft"></div>
							</div>
							<div
								class="rotate-handle"
								onMouseDown={(e) => this.handleDragRotate(e, cover)}
								onTouchStart={(e) => this.handleDragRotate(e, cover)}
							></div>
						</div>
					);
				})}
			</Host>
		);
	}
}
