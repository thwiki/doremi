import { Component, h } from '@stencil/core';

@Component({
	tag: 'app-about',
	shadow: false,
	styleUrl: 'app-about.less',
})
export class AppAbout {
	render() {
		return (
			<div class="about__base">
				<div class="about__title">工具作者</div>
				<div class="about__text">
					<sl-button type="text" href="https://thwiki.cc/%E7%94%A8%E6%88%B7:Arumi" target="blank">
						<sl-avatar slot="prefix" image="https://upload.thwiki.cc/avatars/thwikicc_wiki_234_l.jpg"></sl-avatar>
						桜有海@THBWiki
					</sl-button>
				</div>

				<div class="about__title">AI技术基于</div>
				<div class="about__text">
					<sl-button-group>
						<sl-button type="text" href="https://opencv.org/" target="blank">
							OpenCV
						</sl-button>
					</sl-button-group>
				</div>

				<div class="about__title">AI模型来自</div>
				<div class="about__text">
					<sl-button-group>
						<sl-button type="text" href="https://github.com/recette-lemon/Haar-Cascade-Anime-Eye-Detector" target="blank">
							眼部模型
						</sl-button>
						<sl-button type="text" href="https://github.com/nagadomi/lbpcascade_animeface" target="blank">
							脸部模型
						</sl-button>
					</sl-button-group>
				</div>

				<div class="about__title">UI技术基于</div>
				<div class="about__text">
					<sl-button-group>
						<sl-button type="text" href="https://stenciljs.com/" target="blank">
							Stencil
						</sl-button>
						<sl-button type="text" href="https://shoelace.style/" target="blank">
							Shoelace
						</sl-button>
					</sl-button-group>
				</div>

				<div class="about__title">推荐浏览器</div>
				<div class="about__text">
					<sl-button-group>
						<sl-button type="text" href="https://www.google.com/chrome/" target="blank">
							Chrome
						</sl-button>
						<sl-button type="text" href="https://www.microsoft.com/edge" target="blank">
							Edge
						</sl-button>
						<sl-button type="text" href="https://www.mozilla.org/firefox/new/" target="blank">
							Firefox
						</sl-button>
					</sl-button-group>
				</div>

				<div class="about__title">异变根源</div>
				<div class="about__text">
					<sl-button
						type="text"
						href="https://thwiki.cc/%E5%93%86%E6%9D%A5%E5%92%AA%C2%B7%E8%8B%8F%E4%BC%8A%E7%89%B9"
						target="blank"
					>
						哆来咪·苏伊特
					</sl-button>
				</div>

				<div class="about__title">原作</div>
				<div class="about__text">
					<sl-button type="text" href="https://www16.big.or.jp/~zun/" target="blank">
						上海アリス幻樂団
					</sl-button>
				</div>
			</div>
		);
	}
}
