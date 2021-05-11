import Flatten from '@flatten-js/core';
import Doremi from '../../utils/types';

declare global {
	interface globalThis {
		cv: any;
	}
}

let loaded = false;
let CV: any = null;
let eyes_cascade: any = null;
let face_cascade: any = null;

interface Image {
	height: number;
	width: number;
	eyes: Doremi.Rect[];
	faces: Doremi.Rect[];
}

async function createFileFromUrl(path: string, url: string) {
	try {
		const data = new Uint8Array(await (await fetch(url, { method: 'GET' })).arrayBuffer());
		CV.FS_createDataFile('/', path, data, true, false, false);
		return true;
	} catch (e: unknown) {
		console.error(e);
		return false;
	}
}

async function loadCascadeClassifier(href: string) {
	await createFileFromUrl('eyes_cascade.xml', new URL('./opencv/anime-eyes-cascade.xml', href).href);
	await createFileFromUrl('faces_cascade.xml', new URL('./opencv/lbpcascade_animeface.xml', href).href);

	eyes_cascade = new CV.CascadeClassifier();
	face_cascade = new CV.CascadeClassifier();

	eyes_cascade.load('eyes_cascade.xml');
	face_cascade.load('faces_cascade.xml');

	return true;
}

export async function init(href: string) {
	if (loaded) return;

	globalThis.importScripts(new URL('./opencv/opencv-4.3.0.js', href).href);

	CV = globalThis.cv();

	if (CV.getBuildInformation) {
		loaded = await loadCascadeClassifier(href);
		return loaded;
	} else {
		return new Promise(
			resolve =>
				(CV['onRuntimeInitialized'] = async () => {
					loaded = await loadCascadeClassifier(href);
					resolve(loaded);
				}),
		);
	}
}

export async function detect(data: Uint8ClampedArray, width: number, height: number) {
	const gray = CV.matFromImageData({
		data,
		width,
		height,
	});

	CV.cvtColor(gray, gray, CV.COLOR_RGBA2GRAY);

	CV.equalizeHist(gray, gray);

	const eyesVector = new CV.RectVector();
	const facesVector = new CV.RectVector();

	const msize = new CV.Size(20, 20);
	eyes_cascade.detectMultiScale(gray, eyesVector, 1.1, 5, CV.CASCADE_SCALE_IMAGE, msize);
	face_cascade.detectMultiScale(gray, facesVector, 1.1, 5, CV.CASCADE_SCALE_IMAGE, msize);

	gray.delete();

	const eyes: Doremi.Rect[] = [];
	const faces: Doremi.Rect[] = [];

	for (let i = 0; i < eyesVector.size(); ++i) {
		eyes.push(eyesVector.get(i));
	}
	for (let i = 0; i < facesVector.size(); ++i) {
		faces.push(facesVector.get(i));
	}

	return preprocess({ width, height, faces, eyes });
}

function preprocess(image: Image): Doremi.Data {
	const covers: Doremi.Cover[] = [];

	const faces = image.faces.map(face => {
		return new Flatten.Box(face.x, face.y, face.x + face.width, face.y + face.height);
	});
	let eyes = image.eyes.map(eye => {
		return new Flatten.Box(eye.x, eye.y, eye.x + eye.width, eye.y + eye.height);
	});

	const centerX = faces.length <= 1 ? image.width / 2 : faces.map(face => face.center.x).reduce((a, b) => a + b, 0) / faces.length;

	const usedEyes = new WeakSet();

	faces.forEach(face => {
		const containEyes = eyes.filter(eye => !usedEyes.has(eye) && Flatten.Relations.inside(eye, face));
		const transform = [];

		if (containEyes.length === 0) {
			if (face.center.x < centerX) {
				transform.push('scaleX(-1)');
			}
		} else if (containEyes.length === 1) {
			if (containEyes[0].center.x < face.center.x) {
				transform.push('scaleX(-1)');
			}
			usedEyes.add(containEyes[0]);
		} else {
			if (containEyes.length > 2) {
				containEyes.sort((a, b) => b.xmax - b.xmin - (a.xmax - a.xmin));
			}
			const [leftEye, rightEye] =
				containEyes[0].center.x < containEyes[1].center.x ? [containEyes[0], containEyes[1]] : [containEyes[1], containEyes[0]];

			const dir = new Flatten.Vector(leftEye.center, rightEye.center);
			transform.push(`rotate(${dir.slope.toFixed(2)}rad)`);

			if (leftEye.xmax - leftEye.xmin > rightEye.xmax - rightEye.xmin) {
				transform.push('scaleX(-1)');
			}
			usedEyes.add(leftEye);
			usedEyes.add(rightEye);
		}

		covers.push({
			type: 'doremi',
			transform: transform.length === 0 ? 'none' : transform.join(' '),
			left: face.xmin,
			top: face.ymin,
			width: face.xmax - face.xmin,
			height: face.ymax - face.ymin,
		});
		//const containEyes = eyes.filter((eye) => face.intersect(eye));
	});

	eyes = eyes.filter(eye => !usedEyes.has(eye));

	if (eyes.length > 1) {
		const eyePairs = [];
		const eyePolys = eyes.map(eye => new Flatten.Polygon(eye.toPoints()));
		const eyeSizes = eyes.map(eye => Math.max(eye.xmax - eye.xmin, eye.ymax - eye.ymin));

		for (let i = 0; i < eyePolys.length; i++) {
			const eye1 = eyePolys[i];
			for (let j = i + 1; j < eyePolys.length; j++) {
				const eye2 = eyePolys[j];
				const [dist] = eye1.distanceTo(eye2);
				if (dist < Math.max(eyeSizes[j] + eyeSizes[i])) {
					eyePairs.push({
						i,
						j,
						dist,
						vdist: Math.abs(eyes[j].center.y - eyes[i].center.y),
						intersect: Flatten.Relations.intersect(eye1, eye2),
					});
				}
			}
		}
		eyePairs.sort((a, b) => (a.intersect ? 1 : b.intersect ? -1 : a.vdist - b.vdist));

		for (let index = 0; index < eyePairs.length; index++) {
			const { i, j } = eyePairs[index];
			if (usedEyes.has(eyes[i]) || usedEyes.has(eyes[j])) continue;
			const [leftEye, rightEye] = eyes[i].center.x < eyes[j].center.x ? [eyes[i], eyes[j]] : [eyes[j], eyes[i]];
			const transform = [];

			const dir = new Flatten.Vector(leftEye.center, rightEye.center);
			transform.push(`rotate(${dir.slope.toFixed(2)}rad)`);

			if (leftEye.xmax - leftEye.xmin > rightEye.xmax - rightEye.xmin) {
				transform.push('scaleX(-1)');
			}
			usedEyes.add(leftEye);
			usedEyes.add(rightEye);

			const face = new Flatten.Box(
				leftEye.xmin - dir.length / 2,
				Math.min(leftEye.ymin, rightEye.ymin),
				rightEye.xmax + dir.length / 2,
				Math.max(leftEye.ymax, rightEye.ymax),
			);
			const addHeight = face.xmax - face.xmin - (face.ymax - face.ymin);
			face.ymin -= addHeight * 0.3;
			face.ymax += addHeight * 0.7;

			covers.push({
				type: 'doremi',
				transform: transform.length === 0 ? 'none' : transform.join(' '),
				left: face.xmin,
				top: face.ymin,
				width: face.xmax - face.xmin,
				height: face.ymax - face.ymin,
			});
		}
	}

	return {
		id: 0,
		width: image.width,
		height: image.height,
		covers,
		eyes: image.eyes,
		faces: image.faces,
	};
}
