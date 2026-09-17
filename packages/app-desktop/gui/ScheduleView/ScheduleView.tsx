import * as React from 'react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import { _, _n } from '@joplin/lib/locale';
import time from '@joplin/lib/time';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Note from '@joplin/lib/models/Note';
import Resource from '@joplin/lib/models/Resource';
import hasLockedNoteWhileSessionLocked from '@joplin/lib/services/noteLock/hasLockedNoteWhileSessionLocked';
import { AppState } from '../../app.reducer';
import { stateUtils } from '@joplin/lib/reducer';
import { WindowIdContext } from '../NewWindowOrIFrame';
import Button, { ButtonLevel, ButtonSize } from '../Button/Button';
import bridge from '../../services/bridge';

interface Props {
	notes: NoteEntity[];
}

interface ScheduleGroup {
	date: string;
	notes: NoteEntity[];
}

interface ScheduleImage {
	id: string;
	title: string;
	mime: string;
	file_extension: string;
}

const scheduleRangeDays = [3, 7, 30] as const;

const ScheduleView = ({ notes }: Props) => {
	const dispatch = useDispatch();
	const windowId = useContext(WindowIdContext);
	const [rangeDays, setRangeDays] = React.useState<number|null>(7);
	const [images, setImages] = useState<ScheduleImage[]>([]);
	const [imagesLoaded, setImagesLoaded] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const loadImages = async () => {
			try {
				const resources = await Resource.all({
					where: 'mime LIKE ?',
					whereParams: ['image/%'],
					order: [{ by: 'updated_time', dir: 'desc' }],
					limit: 1000,
					fields: ['id', 'title', 'mime', 'file_extension'],
				});

				if (!cancelled) {
					setImages(resources.filter(resource => !!resource.id && !!resource.mime) as ScheduleImage[]);
				}
			} catch (error) {
				console.error('Could not load images for the schedule view:', error);
			} finally {
				if (!cancelled) setImagesLoaded(true);
			}
		};

		void loadImages();
		return () => { cancelled = true; };
	}, []);
	const todos = useMemo(() => notes
		.filter(note => note.is_todo && !note.todo_completed && note.todo_due && note.todo_due > Date.now())
		.slice()
		.sort((a, b) => a.todo_due - b.todo_due), [notes]);
	const visibleTodos = useMemo(() => {
		if (rangeDays === null) return todos;

		const rangeEnd = new Date();
		rangeEnd.setHours(23, 59, 59, 999);
		rangeEnd.setDate(rangeEnd.getDate() + rangeDays - 1);
		return todos.filter(note => note.todo_due <= rangeEnd.getTime());
	}, [todos, rangeDays]);

	const groups = useMemo<ScheduleGroup[]>(() => {
		const result: ScheduleGroup[] = [];

		for (const note of visibleTodos) {
			const date = time.formatMsToLocal(note.todo_due, time.dateFormat());
			const group = result[result.length - 1];
			if (group?.date === date) {
				group.notes.push(note);
			} else {
				result.push({ date, notes: [note] });
			}
		}

		return result;
	}, [visibleTodos]);

	const openTodo = (noteId: string) => {
		dispatch({ type: 'NOTE_SELECT', id: noteId });
		dispatch({ type: 'SCHEDULE_VIEW_SET', windowId, value: false });
	};

	const onTodoCompletionChange = async (note: NoteEntity, event: React.ChangeEvent<HTMLInputElement>) => {
		const checkbox = event.currentTarget;
		if (await hasLockedNoteWhileSessionLocked([note.id])) {
			checkbox.checked = !checkbox.checked;
			bridge().showErrorMessageBox(_('Cannot change a locked note while the session is locked'));
			return;
		}

		try {
			await Note.save(Note.toggleTodoCompleted(note), { userSideValidation: true });
			dispatch({ type: 'NOTE_SORT' });
		} catch (error) {
			checkbox.checked = !!note.todo_completed;
			bridge().showErrorMessageBox(error instanceof Error ? error.message : String(error));
		}
	};

	const openImage = (image: ScheduleImage) => {
		const imagePath = Resource.fullPath(image);
		const ok = bridge().openItem(imagePath);
		if (!ok) bridge().showErrorMessageBox(_('This file could not be opened: %s', imagePath));
	};

	return <main className='schedule-view' aria-labelledby='schedule-view-title'>
		<div className='schedule-view-header'>
			<div className='schedule-view-heading'>
				<span className='far fa-calendar-alt schedule-view-heading-icon' aria-hidden='true' />
				<div>
					<h1 id='schedule-view-title'>{_('Schedule')}</h1>
					<p>{_('Your upcoming to-dos, arranged by due date.')}</p>
				</div>
			</div>
			<Button
				title={_('Back to editor')}
				iconName='fas fa-arrow-left'
				level={ButtonLevel.Secondary}
				size={ButtonSize.Small}
				onClick={() => dispatch({ type: 'SCHEDULE_VIEW_SET', windowId, value: false })}
			/>
		</div>
		<nav className='schedule-view-filters' aria-label={_('Schedule range')}>
			<span className='schedule-view-filter-label'>{_('Show')}</span>
			{scheduleRangeDays.map(days => <button
				className='schedule-view-filter'
				type='button'
				key={days}
				aria-pressed={rangeDays === days}
				onClick={() => setRangeDays(days)}
			>{_n('%d day', '%d days', days, days)}</button>)}
			<button
				className='schedule-view-filter'
				type='button'
				aria-pressed={rangeDays === null}
				onClick={() => setRangeDays(null)}
			>{_('All')}</button>
		</nav>
		<div className='schedule-view-content'>
			{groups.map((group, index) => {
				const headingId = `schedule-date-${index}`;
				return <section className='schedule-view-group' key={group.date} aria-labelledby={headingId}>
					<h2 className='schedule-view-date' id={headingId}>{group.date}</h2>
					<div className='schedule-view-items'>
						{group.notes.map(note => {
							const title = note.title || _('Untitled');
							return <article className='schedule-view-item' key={note.id}>
								<div className='schedule-view-time'>
									<time>{time.formatMsToLocal(note.todo_due, time.timeFormat())}</time>
								</div>
								<button className='schedule-view-title' type='button' onClick={() => openTodo(note.id)}>{title}</button>
								<input
									className='schedule-view-checkbox'
									type='checkbox'
									defaultChecked={!!note.todo_completed}
									aria-label={_('Complete to-do: %s', title)}
									onChange={event => void onTodoCompletionChange(note, event)}
								/>
							</article>;
						})}
					</div>
				</section>;
			})}
			{!visibleTodos.length && <div className='schedule-view-empty'>
				<i className='far fa-calendar-check' aria-hidden='true' />
				<p>{todos.length ? _('No scheduled to-dos in this range') : _('No scheduled to-dos')}</p>
				<span>{todos.length ? _('Choose a longer range to see more to-dos.') : _('Add a due date to a to-do to see it here.')}</span>
			</div>}
			{imagesLoaded && !!images.length && <section className='schedule-view-gallery' aria-labelledby='schedule-view-gallery-title'>
				<div className='schedule-view-gallery-header'>
					<h2 id='schedule-view-gallery-title'>{_('Images')}</h2>
					<span>{_n('%d image', '%d images', images.length, images.length)}</span>
				</div>
				<div className='schedule-view-gallery-grid'>
					{images.map(image => {
						const imageTitle = image.title || _('Untitled');
						const imagePath = Resource.fullPath(image);
						return <button
							className='schedule-view-gallery-item'
							type='button'
							key={image.id}
							title={imageTitle}
							aria-label={_('Open image: %s', imageTitle)}
							onClick={() => openImage(image)}
						>
							<img src={`file://${encodeURI(imagePath)}`} alt={imageTitle} loading='lazy' />
							<span>{imageTitle}</span>
						</button>;
					})}
				</div>
			</section>}
		</div>
	</main>;
};

export default connect((state: AppState, ownProps: { windowId?: string }) => ({
	notes: stateUtils.windowStateById(state, ownProps.windowId || state.windowId).notes,
}))(ScheduleView);
