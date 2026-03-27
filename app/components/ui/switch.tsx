import { forwardRef, useCallback } from "react";
import { Switch as RNSwitch, SwitchProps } from "react-native";
import { useHaptics, type HapticPreset } from "@/hooks/use-haptics";

type Props = SwitchProps & {
  value: boolean;
  onChange: (value: boolean) => void;
  hapticPreset?: "selection" | "impactLight";
};
export default forwardRef(function Switch(
  { value, onChange, hapticPreset = "selection", ...props }: Props,
  ref: React.Ref<RNSwitch>
) {
  const { trigger } = useHaptics();

  const handleValueChange = useCallback(
    (next: boolean) => {
      trigger(hapticPreset as HapticPreset);
      onChange(next);
    },
    [trigger, hapticPreset, onChange],
  );

  return (
    <RNSwitch {...props} value={value} onValueChange={handleValueChange} ref={ref} />
  );
});
