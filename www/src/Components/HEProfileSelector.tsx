import { useEffect, useState } from 'react';
import { Alert, Button, Form, FormCheck, Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import CustomSelect from './CustomSelect';
import useHEProfileStore, {
	HE_PROFILE_COUNT,
} from '../Store/useHEProfileStore';
import useHETriggerStore, { Trigger } from '../Store/useHETriggerStore';
import { HE_PRESETS, getPreset, matchPreset } from '../Data/HEPresets';

type Option = { label: string; value: number };

type Props = {
	options: Option[];
	muxChannels: number;
	// ADC pin per multiplexer, in board order. An entry of -1 means that
	// multiplexer has no pin assigned and is therefore not connected.
	connectedMuxes: number[];
	getOptionLabel: (option: Option) => string;
	// Opens the single-channel calibration modal for a given channel.
	onCalibrateChannel: (channel: number) => void;
};

// The one place bindings are edited. The base profile lives on the triggers
// themselves and additionally carries the per-channel tuning (rapid trigger,
// calibration); the alternate profiles carry bindings only.
const HEProfileSelector = ({
	options,
	muxChannels,
	connectedMuxes,
	getOptionLabel,
	onCalibrateChannel,
}: Props) => {
	const { t } = useTranslation('');
	const {
		profiles,
		activeProfile,
		fetchHEProfiles,
		setProfileAction,
		toggleProfileEnabled,
		saveHEProfiles,
	} = useHEProfileStore();
	const { triggers, setHETrigger, saveHETriggers } = useHETriggerStore();
	const [saveMessage, setSaveMessage] = useState('');

	useEffect(() => {
		fetchHEProfiles();
	}, [fetchHEProfiles]);

	const handleSave = async () => {
		try {
			// Bindings and per-channel tuning live in two different stores but are
			// edited on one screen, so one button commits both.
			await Promise.all([saveHEProfiles(), saveHETriggers()]);
			setSaveMessage(t('Common:saved-success-message'));
		} catch (error) {
			setSaveMessage(t('Common:saved-error-message'));
		}
	};

	const channelLabel = (channel: number) => {
		if (muxChannels > 1) {
			return `${t('HETrigger:multiplexer-label')} ${Math.floor(
				channel / muxChannels,
			)} · ${t('HETrigger:channel-label')} ${channel % muxChannels}`;
		}
		return `${t('HETrigger:channel-label')} ${channel}`;
	};

	const toggleRapidTrigger = (channel: number) => {
		const trigger = triggers[channel] as Trigger;
		if (!trigger) return;
		setHETrigger({
			id: channel,
			...trigger,
			rapidTrigger: !trigger.rapidTrigger,
		});
	};

	// Applies a whole sensitivity level to one switch. The level itself is not
	// stored -- only the values it resolves to -- so hand tuning stays possible and
	// the firmware keeps a single code path.
	const setSensitivity = (channel: number, level: number) => {
		const trigger = triggers[channel] as Trigger;
		if (!trigger) return;
		const preset = getPreset(level);
		setHETrigger({
			id: channel,
			...trigger,
			actuationPoint: preset.actuationPoint,
			rtPressSensitivity: preset.rtPressSensitivity,
			rtReleaseSensitivity: preset.rtReleaseSensitivity,
			continuousRapidTrigger: preset.continuousRapidTrigger,
		});
	};

	// Which level a switch currently sits on, or 0 for hand-tuned values.
	const sensitivityLevel = (channel: number) => {
		const trigger = triggers[channel] as Trigger;
		if (!trigger) return 0;
		return matchPreset(trigger)?.level ?? 0;
	};

	const toggleAnalogProportional = (channel: number) => {
		const trigger = triggers[channel] as Trigger;
		if (!trigger) return;
		setHETrigger({
			id: channel,
			...trigger,
			analogProportional: !trigger.analogProportional,
		});
	};

	// Only the analog stick directions can be driven proportionally; for an
	// ordinary button action there is nothing to scale.
	const isAnalogAction = (action: number) => action >= 59 && action <= 66;

	// A channel with no measured travel has never been calibrated, and enabling
	// rapid trigger on it would do nothing useful.
	const isCalibrated = (channel: number) => {
		const trigger = triggers[channel] as Trigger;
		if (!trigger) return false;
		return Math.abs(trigger.pressed - trigger.idle) > 64;
	};

	return (
		<div className="mt-4">
			<h1>{t('HETrigger:profiles-header')}</h1>
			<Alert variant="info" className="py-2">
				{t('HETrigger:profiles-shared-tuning-note')}
			</Alert>

			<Tab.Container defaultActiveKey="he-profile-0">
				<Nav variant="pills" className="mb-3 flex-wrap gap-1">
					{Array.from({ length: HE_PROFILE_COUNT }, (_, index) => (
						<Nav.Item key={`he-profile-nav-${index}`}>
							<Nav.Link eventKey={`he-profile-${index}`}>
								{index === 0
									? t('HETrigger:profile-base-label')
									: t('HETrigger:profile-label', { number: index + 1 })}
								{index === activeProfile && ' ●'}
								{index > 0 && !profiles[index]?.enabled && ' ○'}
							</Nav.Link>
						</Nav.Item>
					))}
				</Nav>

				<Tab.Content>
					{profiles.map((profile, profileIndex) => (
						<Tab.Pane
							key={`he-profile-pane-${profileIndex}`}
							eventKey={`he-profile-${profileIndex}`}
						>
							{profileIndex > 0 && (
								<>
									<FormCheck
										type="switch"
										id={`he-profile-enabled-${profileIndex}`}
										label={t('HETrigger:profile-enabled-label')}
										checked={profile.enabled}
										onChange={() => toggleProfileEnabled(profileIndex)}
										className="mb-2"
									/>
									{!profile.enabled && (
										<Alert variant="warning" className="py-2">
											{t('HETrigger:profile-disabled-warning')}
										</Alert>
									)}
									<div className="text-muted mb-3">
										{t('HETrigger:profile-unbound-note')}
									</div>
								</>
							)}
							{profileIndex === 0 && (
								<div className="text-muted mb-3">
									{t('HETrigger:profile-base-note')}
								</div>
							)}

							{connectedMuxes.map((adcPin, muxIndex) =>
								adcPin === -1 ? null : (
									<div
										key={`he-profile-${profileIndex}-mux-${muxIndex}`}
										className="mb-3"
									>
										<div className="he-binding-mux-label">
											{muxChannels > 1
												? t('HETrigger:mux-group-label', {
														index: muxIndex,
														pin: adcPin,
													})
												: t('HETrigger:direct-group-label', { pin: adcPin })}
										</div>
										<div className="he-binding-grid">
											{Array.from({ length: muxChannels }, (_, offset) => {
												const channel = muxIndex * muxChannels + offset;
												return (
													<div
														key={`he-profile-${profileIndex}-ch-${channel}`}
														className="he-binding-row"
													>
														<div className="he-binding-label">
															{channelLabel(channel)}
														</div>
														<div className="he-binding-select">
															<CustomSelect
																inputId={`he-profile-${profileIndex}-select-${channel}`}
																isClearable
																isSearchable
																options={options}
																getOptionLabel={getOptionLabel}
																value={
																	options.find(
																		(option) =>
																			option.value === profile.actions[channel],
																	) || null
																}
																onChange={(change) =>
																	setProfileAction(
																		profileIndex,
																		channel,
																		change?.value === undefined
																			? -10
																			: change.value,
																	)
																}
															/>
														</div>
														{/* Rapid trigger and calibration are per switch, not per
										    profile, so they are only offered on the base tab. */}
														{profileIndex === 0 && (
															<>
																{/* Per-switch sensitivity: applies a level's worth of actuation
																    and rapid trigger values at once. */}
																<Form.Select
																	size="sm"
																	className="he-binding-sens"
																	value={sensitivityLevel(channel)}
																	disabled={!isCalibrated(channel)}
																	onChange={(e) =>
																		setSensitivity(
																			channel,
																			Number(e.target.value),
																		)
																	}
																	title={t('HETrigger:sensitivity-title')}
																>
																	{sensitivityLevel(channel) === 0 && (
																		<option value={0}>
																			{t('HETrigger:sensitivity-custom')}
																		</option>
																	)}
																	{HE_PRESETS.map((preset) => (
																		<option
																			key={`sens-${preset.level}`}
																			value={preset.level}
																		>
																			{t('HETrigger:sensitivity-option', {
																				level: preset.level,
																				percent: preset.actuationPoint,
																			})}
																		</option>
																	))}
																</Form.Select>
																{isAnalogAction(profile.actions[channel]) && (
																	<FormCheck
																		type="switch"
																		id={`he-analog-${channel}`}
																		label={t('HETrigger:analog-switch-label')}
																		checked={Boolean(
																			triggers[channel]?.analogProportional,
																		)}
																		onChange={() =>
																			toggleAnalogProportional(channel)
																		}
																		className="he-binding-rt"
																		title={t('HETrigger:analog-switch-title')}
																	/>
																)}
																<FormCheck
																	type="switch"
																	id={`he-rapid-${channel}`}
																	label={t(
																		'HETrigger:rapid-trigger-switch-label',
																	)}
																	checked={Boolean(
																		triggers[channel]?.rapidTrigger,
																	)}
																	disabled={!isCalibrated(channel)}
																	onChange={() => toggleRapidTrigger(channel)}
																	className="he-binding-rt"
																	title={
																		isCalibrated(channel)
																			? undefined
																			: t(
																					'HETrigger:rapid-trigger-needs-calibration',
																				)
																	}
																/>
																<Button
																	type="button"
																	size="sm"
																	variant="outline-secondary"
																	onClick={() => onCalibrateChannel(channel)}
																	disabled={profile.actions[channel] === -10}
																	title={t('HETrigger:calibrate-single-title')}
																>
																	🧲
																</Button>
															</>
														)}
													</div>
												);
											})}
										</div>
									</div>
								),
							)}
						</Tab.Pane>
					))}
				</Tab.Content>
			</Tab.Container>

			<Button type="button" onClick={handleSave} className="my-2">
				{t('HETrigger:profiles-save-button')}
			</Button>
			{saveMessage && <Alert variant="secondary">{saveMessage}</Alert>}
		</div>
	);
};

export default HEProfileSelector;
