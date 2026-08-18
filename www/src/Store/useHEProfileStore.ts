import { create } from 'zustand';

import WebApi from '../Services/WebApi';

// Total binding profiles: the base set plus three alternates. Must match
// HE_PROFILE_COUNT in headers/addons/he_trigger.h.
export const HE_PROFILE_COUNT = 4;
export const HE_TRIGGER_COUNT = 32;

// Bindings only. Calibration and tuning live on the triggers themselves and are
// deliberately shared across profiles, to keep the config small.
export type HEProfile = {
	enabled: boolean;
	actions: number[];
};

type State = {
	profiles: HEProfile[];
	activeProfile: number;
	loadingProfiles: boolean;
};

type Actions = {
	fetchHEProfiles: () => Promise<void>;
	setProfileAction: (profileIndex: number, channel: number, action: number) => void;
	toggleProfileEnabled: (profileIndex: number) => void;
	setActiveProfile: (profileIndex: number) => void;
	saveHEProfiles: () => Promise<object>;
};

const emptyProfile = (): HEProfile => ({
	enabled: false,
	actions: Array.from({ length: HE_TRIGGER_COUNT }, () => -10),
});

const INITIAL_STATE: State = {
	profiles: Array.from({ length: HE_PROFILE_COUNT }, (_, index) => ({
		...emptyProfile(),
		// The base profile is always active; it cannot be disabled.
		enabled: index === 0,
	})),
	activeProfile: 0,
	loadingProfiles: false,
};

const useHEProfileStore = create<State & Actions>()((set, get) => ({
	...INITIAL_STATE,

	fetchHEProfiles: async () => {
		set({ loadingProfiles: true });
		const data = await WebApi.getHETriggerProfiles();
		set((state) => ({
			...state,
			// Tolerate a short or missing response rather than rendering undefined.
			profiles: Array.from({ length: HE_PROFILE_COUNT }, (_, index) => {
				const incoming = data?.profiles?.[index];
				if (!incoming) return { ...emptyProfile(), enabled: index === 0 };
				return {
					enabled: index === 0 ? true : Boolean(incoming.enabled),
					actions: Array.from(
						{ length: HE_TRIGGER_COUNT },
						(__, channel) => incoming.actions?.[channel] ?? -10,
					),
				};
			}),
			activeProfile: data?.activeProfile ?? 0,
			loadingProfiles: false,
		}));
	},

	setProfileAction: (profileIndex, channel, action) => {
		set((state) => {
			const profiles = state.profiles.map((profile, index) => {
				if (index !== profileIndex) return profile;
				const actions = [...profile.actions];
				actions[channel] = action;
				// Editing a profile enables it. Cycling skips disabled profiles, so a
				// profile that was configured but never explicitly switched on is
				// invisible at runtime -- which reads as "profile switching is
				// broken" rather than "this profile is off".
				return { ...profile, actions, enabled: true };
			});
			return { ...state, profiles };
		});
	},

	toggleProfileEnabled: (profileIndex) => {
		// The base profile is the fallback for every other profile, so it must
		// always remain enabled.
		if (profileIndex === 0) return;
		set((state) => ({
			...state,
			profiles: state.profiles.map((profile, index) =>
				index === profileIndex
					? { ...profile, enabled: !profile.enabled }
					: profile,
			),
		}));
	},

	setActiveProfile: (profileIndex) => set((state) => ({ ...state, activeProfile: profileIndex })),

	saveHEProfiles: async () => {
		const { profiles, activeProfile } = get();
		return WebApi.setHETriggerProfiles({ profiles, activeProfile });
	},
}));

export default useHEProfileStore;
