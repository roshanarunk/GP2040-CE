import { useEffect, useState } from 'react';
import { Alert, Button, FormCheck, Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import CustomSelect from './CustomSelect';
import useHEProfileStore, {
	HE_PROFILE_COUNT,
} from '../Store/useHEProfileStore';

type Option = { label: string; value: number };

type Props = {
	// Same option list the base binding grid uses, including the HE-local
	// profile-switch pseudo-actions.
	options: Option[];
	muxChannels: number;
	// Channels beyond this are not addressable with the current mux config.
	usableChannels: number;
	getOptionLabel: (option: Option) => string;
};

const HEProfileSelector = ({
	options,
	muxChannels,
	usableChannels,
	getOptionLabel,
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
	const [saveMessage, setSaveMessage] = useState('');

	useEffect(() => {
		fetchHEProfiles();
	}, [fetchHEProfiles]);

	const handleSave = async () => {
		try {
			await saveHEProfiles();
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
								<FormCheck
									type="switch"
									id={`he-profile-enabled-${profileIndex}`}
									label={t('HETrigger:profile-enabled-label')}
									checked={profile.enabled}
									onChange={() => toggleProfileEnabled(profileIndex)}
									className="mb-3"
								/>
							)}
							{profileIndex === 0 && (
								<div className="text-muted mb-3">
									{t('HETrigger:profile-base-note')}
								</div>
							)}

							<div className="he-profile-grid">
								{Array.from({ length: usableChannels }, (_, channel) => (
									<div
										key={`he-profile-${profileIndex}-ch-${channel}`}
										className="d-flex align-items-center gap-2 mb-2"
									>
										<div
											className="d-flex flex-shrink-0 he-profile-channel-label"
											style={{ width: '12rem' }}
										>
											<label>{channelLabel(channel)}</label>
										</div>
										<CustomSelect
											inputId={`he-profile-${profileIndex}-select-${channel}`}
											isClearable
											isSearchable
											options={options}
											getOptionLabel={getOptionLabel}
											value={
												options.find(
													(option) => option.value === profile.actions[channel],
												) || null
											}
											onChange={(change) =>
												setProfileAction(
													profileIndex,
													channel,
													change?.value === undefined ? -10 : change.value,
												)
											}
										/>
									</div>
								))}
							</div>
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
