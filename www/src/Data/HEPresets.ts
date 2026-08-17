// Actuation presets, expressed as percentages of the idle -> pressed travel.
//
// The firmware stores only the resolved numbers, never the preset name, so it has
// a single code path and per-button hand tuning stays first class. The UI infers
// which preset is active by matching stored values back against this table, and
// shows "Custom" when nothing matches.

export type HEPreset = {
	id: string;
	actuationPoint: number;
	rtPressSensitivity: number;
	rtReleaseSensitivity: number;
	continuousRapidTrigger: boolean;
};

export const HE_PRESETS: HEPreset[] = [
	{
		id: 'hairpin',
		actuationPoint: 8,
		rtPressSensitivity: 3,
		rtReleaseSensitivity: 3,
		continuousRapidTrigger: true,
	},
	{
		id: 'light',
		actuationPoint: 15,
		rtPressSensitivity: 5,
		rtReleaseSensitivity: 5,
		continuousRapidTrigger: true,
	},
	{
		id: 'standard',
		actuationPoint: 35,
		rtPressSensitivity: 10,
		rtReleaseSensitivity: 10,
		continuousRapidTrigger: false,
	},
	{
		id: 'deliberate',
		actuationPoint: 55,
		rtPressSensitivity: 15,
		rtReleaseSensitivity: 15,
		continuousRapidTrigger: false,
	},
	{
		id: 'heavy',
		actuationPoint: 75,
		rtPressSensitivity: 20,
		rtReleaseSensitivity: 20,
		continuousRapidTrigger: false,
	},
];

export const DEFAULT_PRESET_ID = 'standard';

export const getPreset = (id: string): HEPreset =>
	HE_PRESETS.find((preset) => preset.id === id) ||
	(HE_PRESETS.find((preset) => preset.id === DEFAULT_PRESET_ID) as HEPreset);

// Returns the preset whose values match, or null when the values were hand tuned.
export const matchPreset = (values: {
	actuationPoint: number;
	rtPressSensitivity: number;
	rtReleaseSensitivity: number;
	continuousRapidTrigger: boolean;
}): HEPreset | null =>
	HE_PRESETS.find(
		(preset) =>
			preset.actuationPoint === values.actuationPoint &&
			preset.rtPressSensitivity === values.rtPressSensitivity &&
			preset.rtReleaseSensitivity === values.rtReleaseSensitivity &&
			preset.continuousRapidTrigger === values.continuousRapidTrigger,
	) || null;
