import * as React from 'react';
import { useCallback, useContext } from 'react';
import { Dispatch } from 'redux';
import { FocusNote } from './useFocusNote';
import { WindowIdContext } from '../../NewWindowOrIFrame';

const useOnNoteClick = (dispatch: Dispatch, focusNote: FocusNote) => {
	const windowId = useContext(WindowIdContext);
	const onNoteClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
		const noteId = event.currentTarget.getAttribute('data-id');

		const targetTagName = event.target ? (event.target as HTMLElement).tagName : '';

		// If we are for example on a checkbox, don't process the click since it
		// should be handled by the checkbox onChange handler.
		if (['INPUT'].includes(targetTagName)) return;

		focusNote(noteId);

		if (event.ctrlKey || event.metaKey) {
			event.preventDefault();
			dispatch({
				type: 'NOTE_SELECT_TOGGLE',
				id: noteId,
			});
		} else if (event.shiftKey) {
			event.preventDefault();
			dispatch({
				type: 'NOTE_SELECT_EXTEND',
				id: noteId,
			});
		} else {
			// Selecting a note from the list should always restore the standard editor.
			dispatch({ type: 'SCHEDULE_VIEW_SET', windowId, value: false });
			dispatch({
				type: 'NOTE_SELECT',
				id: noteId,
			});
		}
	}, [dispatch, focusNote, windowId]);

	return onNoteClick;
};

export default useOnNoteClick;
