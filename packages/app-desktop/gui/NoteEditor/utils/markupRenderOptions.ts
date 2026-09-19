import { LinkRenderingType } from '@joplin/renderer/MdToHtml';
import { MarkupToHtmlOptions } from './types';
import { getGlobalSettings, ResourceInfos } from '@joplin/renderer/types';
import Setting from '@joplin/lib/models/Setting';

interface OptionOverride {
	bodyOnly: boolean;
	resourceInfos?: ResourceInfos;
	allowedFilePrefixes?: string[];
}

export default (override: OptionOverride = null): MarkupToHtmlOptions => {
	return {
		plugins: {
			checkbox: {
				checkboxRenderingType: 2,
			},
			link_open: {
				linkRenderingType: LinkRenderingType.HrefHandler,
			},
		},
		// Keep :/resourceId links until the renderer has resolved resourceInfos.
		// The renderer's itemIdToUrl handler still gives Rich Text a clickable URL,
		// while renderMedia needs the resource MIME type to create a PDF preview.
		replaceResourceInternalToExternalLinks: false,
		globalSettings: getGlobalSettings(Setting),
		...override,
	};
};
