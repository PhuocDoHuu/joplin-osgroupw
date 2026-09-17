import * as React from 'react';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import styles_ from './styles';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import { AppState } from '../../app.reducer';

export enum Value {
	Markdown = 'markdown',
	RichText = 'richText',
}

export interface Props {
	themeId: number;
	value: Value;
	toolbarButtonInfo: ToolbarButtonInfo;
	tabIndex?: number;
	buttonRef?: React.Ref<HTMLButtonElement>;
	inlineRenderingEnabled?: boolean;
}

interface RenderMarkupPopoverProps {
	anchor: HTMLElement;
	checked: boolean;
	onMouseEnter: ()=> void;
	onMouseLeave: ()=> void;
}

const inlineRenderingSettingMetadata = Setting.settingMetadata('editor.inlineRendering');

const RenderMarkupPopover: React.FC<RenderMarkupPopoverProps> = props => {
	const popoverRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
	const checkboxId = 'toggle-editors-render-markup-checkbox';

	useLayoutEffect(() => {
		const anchorRect = props.anchor.getBoundingClientRect();
		const popoverRect = popoverRef.current.getBoundingClientRect();
		const margin = 8;
		let left = anchorRect.left;
		if (left + popoverRect.width > window.innerWidth - margin) {
			left = Math.max(margin, window.innerWidth - popoverRect.width - margin);
		}
		setPosition({ top: anchorRect.bottom, left });
	}, [props.anchor]);

	const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		Setting.setValue('editor.inlineRendering', event.target.checked);
	}, []);

	return createPortal(
		<div
			ref={popoverRef}
			className="render-markup-popover"
			style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
			onMouseEnter={props.onMouseEnter}
			onMouseLeave={props.onMouseLeave}
		>
			<input
				id={checkboxId}
				className="checkbox"
				type="checkbox"
				checked={props.checked}
				onChange={onChange}
			/>
			<label className="label" htmlFor={checkboxId}>{inlineRenderingSettingMetadata.label()}</label>
		</div>,
		document.body,
	);
};

function ToggleEditorsButtonComponent(props: Props) {
	const style = styles_(props);
	const containerRef = useRef<HTMLDivElement>(null);
	const [popoverVisible, setPopoverVisible] = useState(false);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const showPopover = useCallback(() => {
		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		}
		if (props.value === Value.Markdown) {
			setPopoverVisible(true);
		}
	}, [props.value]);

	const scheduleHidePopover = useCallback(() => {
		if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
		hideTimeoutRef.current = setTimeout(() => {
			setPopoverVisible(false);
			hideTimeoutRef.current = null;
		}, 150);
	}, []);

	return (
		<div
			ref={containerRef}
			style={style.container}
			onMouseEnter={showPopover}
			onMouseLeave={scheduleHidePopover}
			onFocus={showPopover}
			onBlur={scheduleHidePopover}
		>
			<button
				ref={props.buttonRef}
				style={style.button}
				disabled={!props.toolbarButtonInfo.enabled}
				aria-label={props.toolbarButtonInfo.tooltip}
				aria-description={_('Switch to the %s Editor', props.value !== Value.Markdown ? _('Markdown') : _('Rich Text'))}
				title={props.toolbarButtonInfo.tooltip}
				type="button"
				className={`tox-tbtn ${props.value}-active`}
				aria-pressed="false"
				onClick={props.toolbarButtonInfo.onClick}
				tabIndex={props.tabIndex}
			>
				<div style={style.leftInnerButton}>
					<i style={style.leftIcon} className="fab fa-markdown"></i>
				</div>
				<div style={style.rightInnerButton}>
					<i style={style.rightIcon} className="fas fa-edit"></i>
				</div>
			</button>
			{popoverVisible && containerRef.current ? (
				<RenderMarkupPopover
					anchor={containerRef.current}
					checked={!!props.inlineRenderingEnabled}
					onMouseEnter={showPopover}
					onMouseLeave={scheduleHidePopover}
				/>
			) : null}
		</div>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		inlineRenderingEnabled: !!state.settings['editor.inlineRendering'],
	};
};

export default connect(mapStateToProps)(ToggleEditorsButtonComponent);
