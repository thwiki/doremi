declare global {
	interface Window {
		dataMap: Record<string, Doremi.Data>;
	}
}

namespace Doremi {
	export interface Rect {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	export interface Cover {
		type: 'doremi' | 'koishi';
		transform: string;
		left: number;
		top: number;
		width: number;
		height: number;
		rotate?: number;
		flip?: boolean;
	}

	export interface Data {
		id: number;
		width: number;
		height: number;
		covers: Cover[];
		eyes?: Rect[];
		faces?: Rect[];
	}
}

export default Doremi;
