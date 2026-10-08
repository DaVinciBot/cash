import type { SelectOption } from '@davincibot/lib';

export type FieldValue = string | number | boolean | File | DocumentPreview[] | null | undefined;

type MaybePromise<T> = T | Promise<T>;

export interface AutocompleteCompletion {
	id?: string | number;
	value: string;
	text: string;
	subtext?: string;
	image?: string | null;
}

export interface DocumentPreview {
	id?: string | number;
	name: string;
	type: string;
	value: string;
}

export interface CrudField {
	id?: string;
	name: string;
	type: string;
	wide?: boolean;
	data?: string | number;
	text?: string;
	required?: boolean;
	readonly?: boolean;
	autoselect?: boolean;
	value?: FieldValue;
	options?: SelectOption[];
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
	multiple?: boolean;
	onChange?: (event: Event) => MaybePromise<AutocompleteCompletion[] | undefined>;
	onRemove?: (event: MouseEvent, name: string) => void | Promise<void>;
	onSelect?: (value: string) => void | Promise<void>;
	completion?: AutocompleteCompletion[];
	image?: string | null;
	checked?: boolean;
}
