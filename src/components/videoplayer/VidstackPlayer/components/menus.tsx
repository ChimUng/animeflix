import React from "react";
import type { ReactNode } from 'react';
import {
  Menu,
  Tooltip,
  useCaptionOptions,
  type MenuPlacement,
  type TooltipPlacement,
  useVideoQualityOptions,
  useMediaState,
  usePlaybackRateOptions,
} from "@vidstack/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClosedCaptioning,
  FaCog,
  FaCircle,
  FaCheckCircle,
  FaTachometerAlt,
} from "react-icons/fa";
import { HiAdjustmentsHorizontal } from "react-icons/hi2";
import { BsFillSkipForwardCircleFill } from "react-icons/bs";
import { MdQueuePlayNext } from "react-icons/md";
import { IoMdTimer } from "react-icons/io";

import { IconType } from "react-icons";
import buttonStyles from '../styles/button.module.css';
import styles from '../styles/menu.module.css';
import tooltipStyles from '../styles/tooltip.module.css';
import { useSettings } from '@/lib/store';
import { useStore } from 'zustand';

export interface SettingsProps {
  placement: MenuPlacement;
  tooltipPlacement: TooltipPlacement;
  offset?: number;
  subtitles?: any;
}

export const menuClass =
  'z-30 flex cust-scroll h-[var(--menu-height)] max-h-[180px] lg:max-h-[400px] min-w-[260px] flex-col overflow-y-auto overscroll-y-contain rounded-md border border-white/10 bg-black p-1 font-sans text-[15px] font-medium outline-none backdrop-blur-sm transition-[height] duration-300 will-change-[height] data-[resizing]:overflow-hidden';

export function Settings({ placement, tooltipPlacement, subtitles }: SettingsProps) {
  return (
    <Menu.Root className="parent">
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Menu.Button className={`${styles.menuButton} ${buttonStyles.button}`}>
            <FaCog className={styles.rotateIcon} />
          </Menu.Button>
        </Tooltip.Trigger>
        <Tooltip.Content
          className={`${tooltipStyles.tooltip} parent-data-[open]:hidden`}
          placement={tooltipPlacement}
        >
          Settings
        </Tooltip.Content>
      </Tooltip.Root>
      <Menu.Content className={menuClass} placement={placement}>
        <AutoPlay />
        <AutoNext />
        <AutoSkip />
        <SpeedSubmenu />
        {subtitles?.length > 0 && <CaptionSubmenu />}
        <QualitySubmenu />
      </Menu.Content>
    </Menu.Root>
  );
}

function SpeedSubmenu() {
  const options = usePlaybackRateOptions(),
    hint = options.selectedValue === "1" ? "Normal" : options.selectedValue + "x";
  return (
    <Menu.Root>
      <SubmenuButton
        label="Tốc độ phát"
        hint={hint}
        icon={FaTachometerAlt}
        disabled={options.disabled}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup
          className="w-full flex flex-col"
          value={options.selectedValue}
        >
          {options.map(({ label, value, select }) => (
            <Radio value={value} onSelect={select} key={value}>
              {label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function CaptionSubmenu() {
  const options = useCaptionOptions(),
    hint = options.selectedTrack?.label ?? "Off";
  return (
    <Menu.Root>
      <SubmenuButton
        label="Phụ đề"
        hint={hint}
        disabled={options.disabled}
        icon={FaClosedCaptioning}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup className={styles.radioGroup} value={options.selectedValue}>
          {options.map(({ label, value, select }) => (
            <Radio value={value} onSelect={select} key={value}>
              {label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function AutoPlay() {
  const [options, setOptions] = React.useState([
    {
      label: "On",
      value: true,
      selected: false,
    },
    {
      label: "Off",
      value: false,
      selected: true,
    },
  ]);

  const settings = useStore(useSettings, (state) => state.settings);

  return (
    <Menu.Root>
      <SubmenuButton
        label="Autoplay Video"
        hint={
          settings?.autoplay !== undefined
            ? options.find((option) => option.value === settings?.autoplay)?.label
            : options.find((option) => option.selected)?.label
        }
        icon={IoMdTimer}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup
          className={styles.radioGroup}
          value={settings?.autoplay !== undefined ? settings?.autoplay.toString() : "true"}
          onChange={(value) => {
            const boolValue = value === "true";
            setOptions((options) =>
              options.map((option) =>
                option.value === boolValue
                  ? { ...option, selected: true }
                  : { ...option, selected: false }
              )
            );
            useSettings.setState({ settings: { ...useSettings.getState().settings, autoplay: boolValue } });
          }}
        >
          {options.map((option) => (
            <Radio key={option.label} value={option.value.toString()}>
              {option.label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function AutoNext() {
  const [options, setOptions] = React.useState([
    {
      label: "On",
      value: true,
      selected: false,
    },
    {
      label: "Off",
      value: false,
      selected: true,
    },
  ]);

  const settings = useStore(useSettings, (state) => state.settings);

  return (
    <Menu.Root>
      <SubmenuButton
        label="Autoplay Next"
        hint={
          settings?.autonext !== undefined
            ? options.find((option) => option.value === settings?.autonext)?.label
            : options.find((option) => option.selected)?.label
        }
        icon={MdQueuePlayNext}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup
          className={styles.radioGroup}
          value={settings?.autonext !== undefined ? settings?.autonext.toString() : "true"}
          onChange={(value) => {
            const boolValue = value === "true";
            setOptions((options) =>
              options.map((option) =>
                option.value === boolValue
                  ? { ...option, selected: true }
                  : { ...option, selected: false }
              )
            );
            useSettings.setState({ settings: { ...useSettings.getState().settings, autonext: boolValue } });
          }}
        >
          {options.map((option) => (
            <Radio key={option.label} value={option.value.toString()}>
              {option.label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function AutoSkip() {
  const [options, setOptions] = React.useState([
    {
      label: "On",
      value: true,
      selected: false,
    },
    {
      label: "Off",
      value: false,
      selected: true,
    },
  ]);

  const settings = useStore(useSettings, (state) => state.settings);

  return (
    <Menu.Root>
      <SubmenuButton
        label="AutoSkip"
        hint={
          settings?.autoskip !== undefined
            ? options.find((option) => option.value === settings?.autoskip)?.label
            : options.find((option) => option.selected)?.label
        }
        icon={BsFillSkipForwardCircleFill}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup
          className={styles.radioGroup}
          value={settings?.autoskip !== undefined ? settings?.autoskip.toString() : "true"}
          onChange={(value) => {
            const boolValue = value === "true";
            setOptions((options) =>
              options.map((option) =>
                option.value === boolValue
                  ? { ...option, selected: true }
                  : { ...option, selected: false }
              )
            );
            useSettings.setState({ settings: { ...useSettings.getState().settings, autoskip: boolValue } });
          }}
        >
          {options.map((option) => (
            <Radio key={option.label} value={option.value.toString()}>
              {option.label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

function QualitySubmenu() {
  const options = useVideoQualityOptions({ sort: "descending" }),
    autoQuality = useMediaState("autoQuality"),
    currentQualityText = options.selectedQuality ? `${options.selectedQuality.height}p` : "Auto";

  return (
    <Menu.Root>
      <SubmenuButton
        label="Chất lượng"
        hint={autoQuality ? `Auto (${currentQualityText})` : currentQualityText}
        disabled={options.disabled}
        icon={HiAdjustmentsHorizontal}
      />
      <Menu.Content className={styles.submenu}>
        <Menu.RadioGroup
          className={styles.radioGroup}
          value={options.selectedValue}
        >
          {options.map(({ label, value, bitrateText, select }) => (
            <Radio value={value} onSelect={select} key={value}>
              {label}
            </Radio>
          ))}
        </Menu.RadioGroup>
      </Menu.Content>
    </Menu.Root>
  );
}

export interface RadioProps extends Menu.RadioProps {}

function Radio({ children, ...props }: RadioProps) {
  return (
    <Menu.Radio
      className="ring-media-focus group relative flex w-full cursor-pointer select-none items-center justify-start rounded-sm p-2.5 outline-none data-[hocus]:bg-white/10 data-[focus]:ring-[3px]"
      {...props}
    >
      <FaCircle className="h-4 w-4 text-white group-data-[checked]:hidden" />
      <FaCheckCircle
        className="text-media-brand hidden h-4 w-4 group-data-[checked]:block"
      />
      <span className="ml-2">{children}</span>
    </Menu.Radio>
  );
}

export interface SubmenuButtonProps {
  label: string;
  hint: any;
  disabled?: boolean;
  icon: IconType;
}

function SubmenuButton({
  label,
  hint,
  icon: Icon,
  disabled,
}: SubmenuButtonProps) {
  return (
    <Menu.Button className={styles.submenuButton} disabled={disabled}>
      <FaChevronLeft className={styles.submenuCloseIcon} />
      <Icon className={styles.submenuIcon} />
      <span className={styles.submenuLabel}>{label}</span>
      <span className={styles.submenuHint}>{hint}</span>
      <FaChevronRight className={styles.submenuOpenIcon} />
    </Menu.Button>
  );
}