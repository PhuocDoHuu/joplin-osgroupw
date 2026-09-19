// This rule is used to add a media player for certain resource types below
// the link.

import { LinkRenderingType } from '../../MdToHtml';
import type { RuleOptions } from '../../MdToHtml';
import renderMedia, { Options as RenderMediaOptions } from '../renderMedia';
import type * as MarkdownIt from 'markdown-it';
import type Token = require('markdown-it/lib/token');
import type Renderer = require('markdown-it/lib/renderer');

export interface LinkIndexes {
	[key: string]: number;
}

function plugin(markdownIt: MarkdownIt, ruleOptions: RuleOptions) {
	const defaultRender: Renderer.RenderRule =
		markdownIt.renderer.rules.link_close ||
		function(tokens, idx, options, _env, self) {
			return self.renderToken(tokens, idx, options);
		};

	const linkIndexes: LinkIndexes = {};

	markdownIt.renderer.rules.link_close = function(
		tokens: Token[],
		idx: number,
		options: MarkdownIt.Options,
		env: unknown,
		self: Renderer,
	) {
		const defaultOutput = defaultRender(tokens, idx, options, env, self);
		const link = ruleOptions.context.currentLinks.pop();

		if (!link || ruleOptions.plainResourceRendering) return defaultOutput;

		// HrefHandler is used by Rich Text so ordinary resources stay as normal
		// links. PDF resources can additionally render an inline preview.
		if (ruleOptions.linkRenderingType === LinkRenderingType.HrefHandler && link.resource?.mime !== 'application/pdf') {
			return defaultOutput;
		}

		return [
			defaultOutput,
			renderMedia(link, ruleOptions as RenderMediaOptions, linkIndexes),
		].join('');
	};
}

export default { plugin };
